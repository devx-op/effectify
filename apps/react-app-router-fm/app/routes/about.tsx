import type { Route } from "./+types/about.js"
import * as Effect from "effect/Effect"
import { LoaderArgsContext, httpFailure, httpSuccess } from "@effectify/react-router"
import { withLoaderEffect } from "../lib/runtime.server.js"
import { withAuthGuardMiddleware } from "@effectify/react-router-better-auth"
import { AuthService } from "@effectify/node-better-auth"
import { TodoModel } from "@prisma/effect/index.js"
import * as PrismaRepository from "@prisma/effect/prisma-repository.js"

export const loader = Effect.gen(function* () {
  const { request } = yield* LoaderArgsContext
  const { user } = yield* AuthService.AuthContext
  const todoRepo = yield* PrismaRepository.make(TodoModel, { modelName: 'todo', spanPrefix: 'todo' })

  yield* todoRepo.deleteMany({})

  const todoCreated = yield* todoRepo.create({
    data: {
      id: 30,
      title: 'Test Todo',
      content: 'Test Content',
      published: false,
      authorId: 1,
    },
  })

  const todosCreated = yield* todoRepo.createManyAndReturn({
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

  const todoFindUnique = yield* todoRepo.findUnique({
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

  const todos = yield* todoRepo.findMany({})

  yield* Effect.log('todos')
  yield* Effect.log(todos)

  // Use the new httpSuccess helper for better DX
  return yield* httpSuccess({
    message: 'Test route works! ' + request.url + ' ' + user.id,
    user: user.id,
    todos,
  })
}).pipe(
  Effect.catchAllDefect((error) => {
    console.error(error)
    return httpFailure(error as unknown as string)
  }),
  withAuthGuardMiddleware, withLoaderEffect)


export default function AboutComponent({
  loaderData,
}: Route.ComponentProps) {
  if (loaderData.ok) {
    return (
      <div>
        <h1>About!!!</h1>
        <p>{loaderData.data.message}</p>
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
