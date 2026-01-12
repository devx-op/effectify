import type { Route } from "./+types/about.js"
import * as Effect from "effect/Effect"
import { httpSuccess } from "@effectify/react-router"
import { withLoaderEffect } from "../lib/runtime.server.js"
import { withBetterAuthGuard } from "@effectify/react-router-better-auth"
import { AuthService } from "@effectify/node-better-auth"
import { Prisma } from "@prisma/effect/index.js"
import { redirect } from "react-router"

export const loader = Effect.gen(function* () {
  const { user } = yield* AuthService.AuthContext
  const prisma = yield* Prisma

  yield* prisma.todo.deleteMany({})

  const todoCreated = yield* prisma.todo.create({
    data: {
      id: 30,
      title: 'Test Todo',
      content: 'Test Content',
      published: false,
      authorId: 1,
    },
  })

  const todosCreated = yield* prisma.todo.createManyAndReturn({
    data: [{
      id: 31,
      title: 'Test Todo',
      content: 'Test Content',
      published: false,
      authorId: 1,
    },
    {
      id: 32,
      title: 'Test Todo 2',
      content: 'Test Content 2',
      published: false,
      authorId: 1,
    }],
  })

  const todoFindUnique = yield* prisma.todo.findUnique({
    where: {
      id: 30,
    },
  })

  yield* Effect.log('todoFindUnique')
  yield* Effect.log(todoFindUnique)

  yield* Effect.log('todosCreated')
  yield* Effect.log(todosCreated)

  yield* Effect.log('todoCreated')
  yield* Effect.log(todoCreated.id.toString())

  const todos = yield* prisma.todo.findMany({})

  yield* Effect.log('todos')
  yield* Effect.log(todos)

  // Use the new httpSuccess helper for better DX
  return yield* httpSuccess({
    user: user.id,
    todos,
  })
}).pipe(
  withBetterAuthGuard.with({ redirectOnFail: '/login' }),
  withLoaderEffect
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
          {loaderData.data.todos.map((todo: { id: number; title: string }) => (
            <li key={todo.id}>{todo.title}</li>
          ))}
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
