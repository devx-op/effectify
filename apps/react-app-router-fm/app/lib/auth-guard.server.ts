/** biome-ignore-all lint/complexity/noExcessiveCognitiveComplexity: Session verification requires multiple checks */
/** biome-ignore-all lint/performance/useTopLevelRegex: Regex is only used conditionally for cookie parsing */
import { ActionArgsContext, HttpResponseFailure, httpFailure, LoaderArgsContext } from '@effectify/react-router'
import * as Effect from 'effect/Effect'
import * as Match from 'effect/Match'
import { AuthContext, AuthService, Unauthorized } from './auth.server.js'

const extractHeaders = (args: { request: Request }) => {
  // Better Auth expects the original request headers, not a new Headers object
  // Pass all headers from the original request
  return args.request.headers
}

const verifySessionWithContext = (context: typeof LoaderArgsContext) =>
  Effect.gen(function* () {
    const args = yield* context
    const auth = yield* AuthService
    const forwardedHeaders = extractHeaders(args)

    const session = yield* Effect.tryPromise({
      try: () => auth.api.getSession({ headers: forwardedHeaders }),
      catch: (cause) => {
        const errorMessage = cause instanceof Error ? cause.message : String(cause)
        return new Unauthorized({ details: errorMessage })
      },
    })

    if (!session) {
      return yield* httpFailure(new Unauthorized({ details: 'Missing or invalid authentication' }))
    }

    return yield* Effect.succeed({ user: session.user, session: session.session } as const)
  })

const verifySessionWithActionContext = (context: typeof ActionArgsContext) =>
  Effect.gen(function* () {
    const args = yield* context
    const auth = yield* AuthService
    const forwardedHeaders = extractHeaders(args)

    const session = yield* Effect.tryPromise({
      try: () => auth.api.getSession({ headers: forwardedHeaders }),
      catch: (cause) => {
        const errorMessage = cause instanceof Error ? cause.message : String(cause)
        return new Unauthorized({ details: errorMessage })
      },
    })

    if (!session) {
      return yield* httpFailure(new Unauthorized({ details: 'Missing or invalid authentication' }))
    }

    return yield* Effect.succeed({ user: session.user, session: session.session } as const)
  })

const verifySession = () => verifySessionWithContext(LoaderArgsContext)
const verifySessionFromAction = () => verifySessionWithActionContext(ActionArgsContext)

export const withAuthGuardMiddleware = <A, E>(effect: Effect.Effect<A, E, LoaderArgsContext | AuthContext>) =>
  Effect.gen(function* () {
    const authResult = yield* verifySession()

    return yield* Match.value(authResult).pipe(
      Match.when(
        (result): result is HttpResponseFailure<Unauthorized> => result instanceof HttpResponseFailure,
        (failure) => Effect.succeed(failure),
      ),
      Match.orElse((userContext) => Effect.provideService(effect, AuthContext, userContext)),
    )
  })

export const withAuthGuardMiddlewareFromAction = <A, E>(effect: Effect.Effect<A, E, ActionArgsContext | AuthContext>) =>
  Effect.gen(function* () {
    const authResult = yield* verifySessionFromAction()

    return yield* Match.value(authResult).pipe(
      Match.when(
        (result): result is HttpResponseFailure<Unauthorized> => result instanceof HttpResponseFailure,
        (failure) => Effect.succeed(failure),
      ),
      Match.orElse((userContext) => Effect.provideService(effect, AuthContext, userContext)),
    )
  })
