import type { Route } from "./+types/about.js"
import * as Effect from "effect/Effect"
import { httpSuccess } from "@effectify/react-router"
import { withLoaderEffect } from "../lib/runtime.server.js"
import { randomUUID } from "node:crypto"
// import { withBetterAuthGuard } from "@effectify/react-router-better-auth"
// import { AuthService } from "@effectify/node-better-auth"
import * as PrismaRepository from "@prisma/effect/prisma-repository.js"
import { Todo, TodoModel } from "@prisma/effect/models/Todo.js"

export const loader = Effect.gen(function*() {
  // const { user } = yield* AuthService.AuthContext

  const todoRepo = yield* PrismaRepository.make(TodoModel, {
    modelName: "todo",
    spanPrefix: "todo",
  })

  yield* todoRepo.deleteMany({})
  const todoCreated = yield* todoRepo.create({
    data: {
      id: randomUUID(),
      title: "Test Todo",
      content: "Test Content",
      published: false,
      authorId: 1,
    },
  })

  const todosCreated = yield* todoRepo.createManyAndReturn({
    data: [{
      id: randomUUID(),
      title: "Test Todo",
      content: "Test Content",
      published: false,
      authorId: 1,
    }, {
      id: randomUUID(),
      title: "Test Todo 2",
      content: "Test Content 2",
      published: false,
      authorId: 1,
    }],
  })

  const todoFindUnique = yield* todoRepo.findUnique({
    where: {
      id: todoCreated.id,
    },
  })

  yield* Effect.log("todoFindUnique")
  yield* Effect.log(todoFindUnique)

  yield* Effect.log("todosCreated")
  yield* Effect.log(todosCreated)

  yield* Effect.log("todoCreated")
  yield* Effect.log(todoCreated.id.toString())

  const todos = yield* todoRepo.findMany({})

  yield* Effect.log("todos")
  yield* Effect.log(todos)

  // Use the new httpSuccess helper for better DX
  return yield* httpSuccess({
    todos,
  })
}).pipe(
  // withBetterAuthGuard.with({ redirectOnFail: '/login' }),
  withLoaderEffect,
)

export default function AboutComponent({
  loaderData,
}: Route.ComponentProps) {
  if (loaderData.ok) {
    return (
      <div>
        <h1>About!!!</h1>
        <p>{loaderData.data?.todos?.length}</p>
        <ul>
          {loaderData.data.todos.map((todo: { id: string; title: string }) => <li key={todo.id}>{todo.title}</li>)}
        </ul>
      </div>
    )
  }
  return (
    <div>
      <h1>About!!!</h1>
    </div>
  )
}
