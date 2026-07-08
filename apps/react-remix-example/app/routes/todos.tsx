import { ActionArgsContext, httpFailure, httpRedirect, httpSuccess, LoaderArgsContext } from "@effectify/react-remix"
import { Form, useActionData, useLoaderData, useSubmit } from "@remix-run/react"
import * as Effect from "effect/Effect"
import { useState } from "react"
import { createTodo, deleteTodo, getTodos, type Todo, toggleTodo, updateTodo } from "~/lib/mockStore.js"
import { withActionEffect, withLoaderEffect } from "~/lib/runtime.server.js"

import { withBetterAuthGuard, withBetterAuthGuardAction } from "@effectify/react-router-better-auth"

export const loader = Effect.gen(function*() {
  const todos = getTodos()
  return yield* httpSuccess({ todos })
}).pipe(withBetterAuthGuard.with({ redirectOnFail: "/login" }))
  .pipe(withLoaderEffect)

export const action = Effect.gen(function*() {
  const { request } = yield* ActionArgsContext
  const formData = yield* Effect.tryPromise(() => request.formData())

  const intent = String(formData.get("intent") ?? "create")
  const id = String(formData.get("id") ?? "")
  const title = String(formData.get("title") ?? "")
  const content = String(formData.get("content") ?? "")

  if (intent === "delete") {
    if (!id) {
      return yield* httpFailure("Missing todo ID")
    }
    deleteTodo(id)
    return yield* httpRedirect("/todos")
  }

  if (intent === "update") {
    if (!id) {
      return yield* httpFailure("Missing todo ID")
    }
    if (!title.trim()) {
      return yield* httpFailure("Title is required")
    }
    updateTodo(id, { title, content })
    return yield* httpRedirect("/todos")
  }

  if (intent === "toggle") {
    if (!id) {
      return yield* httpFailure("Missing todo ID")
    }
    toggleTodo(id)
    return yield* httpRedirect("/todos")
  }

  // Create intent (default)
  if (!title.trim()) {
    return yield* httpFailure("Title is required")
  }

  createTodo({
    title,
    content,
    status: "PENDING",
  })

  return yield* httpRedirect("/todos")
})
  .pipe(withBetterAuthGuardAction.with({ redirectOnFail: "/login" }))
  .pipe(withActionEffect)

export default function TodosRoute() {
  const loaderData = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  const submit = useSubmit()
  const [editingId, setEditingId] = useState<string | null>(null)

  if (!loaderData.ok) {
    return (
      <article>
        <h2>Todos</h2>
        <p
          role="alert"
          aria-live="assertive"
          style={{ color: "var(--pico-color-red-500)" }}
        >
          Error loading todos: {loaderData.errors.join(", ")}
        </p>
      </article>
    )
  }

  const { todos } = loaderData.data

  return (
    <article>
      <h2>Todo App</h2>
      <p>{todos.length} items</p>

      {/* Create Form */}
      <Form method="post">
        <fieldset>
          <label htmlFor="title">Title</label>
          <input
            id="title"
            name="title"
            type="text"
            placeholder="Enter todo title..."
          />

          <label htmlFor="content">Content</label>
          <textarea
            id="content"
            name="content"
            placeholder="Enter description... (optional)"
            rows={3}
          />
        </fieldset>

        <input type="hidden" name="intent" value="create" />

        {actionData && !actionData.ok && actionData.errors?.length > 0 && (
          <small
            role="alert"
            aria-live="assertive"
            style={{ color: "var(--pico-color-red-500)" }}
          >
            {String(actionData.errors[0])}
          </small>
        )}

        <button type="submit">Add Todo</button>
      </Form>

      {/* Todo List */}
      {todos.length > 0 ?
        (
          <ul>
            {todos.map((todo: Todo) => (
              <li key={todo.id}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                  }}
                >
                  {/* Toggle Checkbox */}
                  <input
                    type="checkbox"
                    aria-label={todo.status === "COMPLETED"
                      ? "Mark as pending"
                      : "Mark as completed"}
                    checked={todo.status === "COMPLETED"}
                    onChange={() =>
                      submit(
                        { intent: "toggle", id: todo.id },
                        { method: "post" },
                      )}
                  />

                  {/* Todo Content */}
                  <div style={{ flex: 1 }}>
                    <strong
                      style={{
                        textDecoration: todo.status === "COMPLETED" ? "line-through" : "none",
                      }}
                    >
                      {todo.title}
                    </strong>
                    {todo.content && (
                      <span
                        style={{
                          textDecoration: todo.status === "COMPLETED" ? "line-through" : "none",
                        }}
                      >
                        {" "}
                        — {todo.content}
                      </span>
                    )}
                  </div>

                  {/* Update Button */}
                  <button type="button" onClick={() => setEditingId(todo.id)}>
                    Update
                  </button>

                  {/* Delete Form */}
                  <Form method="post" style={{ display: "inline" }}>
                    <input type="hidden" name="intent" value="delete" />
                    <input type="hidden" name="id" value={todo.id} />
                    <button type="submit" aria-label={`Delete ${todo.title}`}>
                      Delete
                    </button>
                  </Form>
                </div>

                {/* Edit Form (shown when editing) */}
                {editingId === todo.id && (
                  <Form
                    method="post"
                    style={{
                      marginTop: "0.5rem",
                      padding: "0.75rem",
                      backgroundColor: "var(--pico-background-color)",
                      borderRadius: "0.25rem",
                    }}
                  >
                    <input type="hidden" name="intent" value="update" />
                    <input type="hidden" name="id" value={todo.id} />

                    <div style={{ display: "grid", gap: "0.5rem" }}>
                      <label>
                        Title
                        <input
                          name="title"
                          type="text"
                          defaultValue={todo.title}
                          placeholder="Todo title"
                          required
                        />
                      </label>

                      <label>
                        Content
                        <input
                          name="content"
                          type="text"
                          defaultValue={todo.content ?? ""}
                          placeholder="Description (optional)"
                        />
                      </label>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: "0.5rem",
                        marginTop: "0.75rem",
                      }}
                    >
                      <button type="submit">Save Changes</button>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </Form>
                )}
              </li>
            ))}
          </ul>
        ) :
        (
          <p>
            <em>No todos yet. Add one above!</em>
          </p>
        )}
    </article>
  )
}
