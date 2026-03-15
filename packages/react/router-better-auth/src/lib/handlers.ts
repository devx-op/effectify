import { AuthService } from "@effectify/node-better-auth"
import { ActionArgsContext, LoaderArgsContext } from "@effectify/react-router"
import * as Effect from "effect/Effect"

// v4 Pattern: Use yield* ServiceClass directly to access context values
const getRequest = Effect.gen(function*() {
  const args = yield* LoaderArgsContext
  return args.request
})

const getRequestFromAction = Effect.gen(function*() {
  const args = yield* ActionArgsContext
  return args.request
})

const withAuthHandler = Effect.gen(function*() {
  const request = yield* getRequest
  const auth = yield* AuthService.AuthServiceContext
  return yield* Effect.promise(() => auth.auth.handler(request))
})

const withAuthHandlerFromAction = Effect.gen(function*() {
  const request = yield* getRequestFromAction
  const auth = yield* AuthService.AuthServiceContext
  return yield* Effect.promise(() => auth.auth.handler(request))
})

// Export Effects that can be used with react-router's runtime
export const betterAuthLoader = withAuthHandler
export const betterAuthAction = withAuthHandlerFromAction
