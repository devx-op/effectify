import type { Route } from "./+types/about.js"
import * as Effect from "effect/Effect"
import { LoaderArgsContext, httpSuccess } from "@effectify/react-router"
import { withLoaderEffect } from "../lib/runtime.server.js"
import { withAuthGuardMiddleware } from "@effectify/react-router-better-auth"
import { AuthService } from "@effectify/node-better-auth"
import { PrismaService } from "../lib/prisma-effect.js"

export const loader = Effect.gen(function* () {
  const { request } = yield* LoaderArgsContext
  const { user } = yield* AuthService.AuthContext
  const prisma = yield* PrismaService

  const todos = yield* prisma.Todo.findMany({})

  yield* Effect.log(todos)

  // Use the new httpSuccess helper for better DX
  return yield* httpSuccess({
    message: 'Test route works! ' + request.url + ' ' + user.id,
    user: user.id,
    todos,
  })
}).pipe(withAuthGuardMiddleware, withLoaderEffect)


export default function AboutComponent({
  loaderData,
}: Route.ComponentProps) {
  if (loaderData.ok) {
    return (
      <div>
        <h1>About!!!</h1>
        <p>{loaderData.data.message}</p>
        <ul>
          {loaderData.data.todos.map((todo) => (
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
