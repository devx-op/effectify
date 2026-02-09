import type { Route } from "./+types/todo-app.js"
import * as Effect from "effect/Effect"
import { ActionArgsContext, httpFailure, httpRedirect, httpSuccess } from "@effectify/react-router"
import { withLoaderEffect } from "../lib/runtime.server.js"
import { withActionEffect } from "../lib/runtime.server.js"
import { randomUUID } from "node:crypto"
import * as PrismaRepository from "@prisma/effect/prisma-repository.js"
import { TodoId, TodoModel } from "@prisma/effect/models/Todo.js"
import { TodoStatus } from "@prisma/enums.js"
import { Form, useActionData, useSubmit } from "react-router"
import { useState } from "react"
import { withBetterAuthGuard, withBetterAuthGuardAction } from "@effectify/react-router-better-auth"
import { AuthService } from "@effectify/node-better-auth"

export const loader = Effect.gen(function*() {
  const todoRepo = yield* PrismaRepository.make(TodoModel, {
    modelName: "todo",
    spanPrefix: "todo",
  })

  const { user } = yield* AuthService.AuthContext
  const currentUserId = Number(user.id)
  if (!Number.isInteger(currentUserId)) {
    return yield* httpSuccess({ todos: [] })
  }
  const todos = yield* todoRepo.findMany({ where: { authorId: currentUserId } })
  return yield* httpSuccess({
    todos,
  })
})
  .pipe(withBetterAuthGuard.with({ redirectOnFail: "/login" }))
  .pipe(withLoaderEffect)

export const action = Effect.gen(function*() {
  const { request } = yield* ActionArgsContext
  const formData = yield* Effect.tryPromise(() => request.formData())
  const intent = String(formData.get("intent") ?? "create")
  const id = String(formData.get("id") ?? "")
  const title = String(formData.get("title") ?? "")
  const content = String(formData.get("content") ?? "")

  const todoRepo = yield* PrismaRepository.make(TodoModel, {
    modelName: "todo",
    spanPrefix: "todo",
  })

  const { user } = yield* AuthService.AuthContext
  const currentUserId = Number(user.id)
  if (!Number.isInteger(currentUserId)) {
    return yield* httpFailure("Invalid user id")
  }

  if (intent === "delete") {
    if (!id) {
      return yield* httpFailure("Missing id")
    }
    yield* todoRepo.deleteMany({
      where: { id: TodoId.make(id), authorId: currentUserId },
    })
    return yield* httpRedirect("/todo-app")
  }

  if (intent === "update") {
    if (!id) {
      return yield* httpFailure("Missing id")
    }
    if (!title.trim()) {
      return yield* httpFailure("Title is required")
    }
    yield* todoRepo.updateMany({
      where: { id: TodoId.make(id), authorId: currentUserId },
      data: { title, content },
    })
    return yield* httpRedirect("/todo-app")
  }

  if (intent === "toggle-status") {
    if (!id) {
      return yield* httpFailure("Missing id")
    }
    const statusStr = String(formData.get("status") ?? "")
    const status = statusStr === "COMPLETED" ? TodoStatus.COMPLETED : TodoStatus.PENDING
    yield* todoRepo.updateMany({
      where: { id: TodoId.make(id), authorId: currentUserId },
      data: { status },
    })
    return yield* httpRedirect("/todo-app")
  }

  if (!title.trim()) {
    return yield* httpFailure("Title is required")
  }

  yield* todoRepo.create({
    data: {
      id: TodoId.make(randomUUID()),
      title,
      content,
      published: false,
      authorId: currentUserId,
      status: TodoStatus.PENDING,
    },
  })

  return yield* httpRedirect("/todo-app")
})
  .pipe(withBetterAuthGuardAction.with({ redirectOnFail: "/login" }))
  .pipe(withActionEffect)

export default function TodoApp({
  loaderData,
}: Route.ComponentProps) {
  const actionData = useActionData<typeof action>()
  const submit = useSubmit()
  const [editingId, setEditingId] = useState<string | null>(null)
  if (loaderData.ok) {
    return (
      <main className="container">
        <article>
          <h2>Todo App</h2>
          <p>{loaderData.data?.todos?.length} items</p>
          <Form method="post">
            <fieldset>
              <label htmlFor="title">Title</label>
              <input id="title" name="title" type="text" required placeholder="Title" />
              <label htmlFor="content">Content</label>
              <textarea id="content" name="content" placeholder="Content" rows={3} />
            </fieldset>
            <input type="hidden" name="intent" value="create" />
            {actionData && actionData.ok === false && actionData.errors?.length ?
              (
                <small role="alert" aria-live="assertive" style={{ color: "var(--pico-color-red-500)" }}>
                  {String(actionData.errors[0])}
                </small>
              ) :
              null}
            <button type="submit">Add</button>
          </Form>
          <ul>
            {loaderData.data.todos.map((todo: any) => (
              <li key={String(todo.id)}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <input
                    type="checkbox"
                    aria-label="Done"
                    checked={String(todo.status) === "COMPLETED"}
                    onChange={(e) =>
                      submit(
                        {
                          intent: "toggle-status",
                          id: String(todo.id),
                          status: e.currentTarget.checked ? "COMPLETED" : "PENDING",
                        },
                        { method: "post" },
                      )}
                  />
                  <div style={{ flex: 1 }}>
                    <strong>{todo.title}</strong>
                    {todo.content ? <span>— {todo.content}</span> : null}
                  </div>
                  <button type="button" onClick={() => setEditingId(String(todo.id))}>Update</button>
                  <Form method="post">
                    <input type="hidden" name="intent" value="delete" />
                    <input type="hidden" name="id" value={String(todo.id)} />
                    <button type="submit" aria-label={`Delete ${todo.title}`}>Delete</button>
                  </Form>
                </div>
                {editingId === String(todo.id) ?
                  (
                    <Form
                      method="post"
                      style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginTop: "0.5rem" }}
                    >
                      <input type="hidden" name="intent" value="update" />
                      <input type="hidden" name="id" value={String(todo.id)} />
                      <input name="title" type="text" defaultValue={todo.title} placeholder="Title" />
                      <input name="content" type="text" defaultValue={todo.content ?? ""} placeholder="Content" />
                      <button
                        type="button"
                        onClick={(e) => {
                          const form = (e.currentTarget as HTMLButtonElement).form
                          if (form) {
                            const fd = new FormData(form)
                            submit(fd, { method: "post" })
                          }
                          setEditingId(null)
                        }}
                      >
                        Save
                      </button>
                      <button type="button" onClick={() => setEditingId(null)}>Cancel</button>
                    </Form>
                  ) :
                  null}
              </li>
            ))}
          </ul>
        </article>
      </main>
    )
  }
  return (
    <main className="container">
      <article>
        <h2>Todo App</h2>
      </article>
    </main>
  )
}
