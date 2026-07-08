import { AuthService } from "@effectify/node-better-auth"
import { ActionArgsContext, LoaderArgsContext } from "@effectify/react-router"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"

const withAuthHandler = (request: Request) =>
  Effect.gen(function*() {
    const auth = yield* AuthService.AuthServiceContext
    return yield* Effect.promise(() => auth.auth.handler(request))
  })

const getLoaderRequest = Effect.gen(function*() {
  const ctx = yield* LoaderArgsContext
  return (ctx as any).request
})

const getActionRequest = Effect.gen(function*() {
  const ctx = yield* ActionArgsContext
  return (ctx as any).request
})

export const betterAuthLoader = pipe(
  getLoaderRequest,
  Effect.flatMap(withAuthHandler),
)

export const betterAuthAction = pipe(
  getActionRequest,
  Effect.flatMap(withAuthHandler),
)
