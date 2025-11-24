import { AuthService } from '@effectify/node-better-auth'
import { ActionArgsContext, HttpResponseFailure, httpFailure, LoaderArgsContext } from '@effectify/react-router'
import * as Effect from 'effect/Effect'

const mapHeaders = (args: { request: Request }) => args.request.headers

const verifySessionWithContext = (context: typeof LoaderArgsContext) =>
  Effect.gen(function* () {
    const args = yield* context
    const { auth } = yield* AuthService.AuthServiceContext
    const forwardedHeaders = mapHeaders(args)

    const session = yield* Effect.tryPromise({
      try: () => auth.api.getSession({ headers: forwardedHeaders }),
      catch: (cause) => {
        const errorMessage = cause instanceof Error ? cause.message : String(cause)
        return new AuthService.Unauthorized({ details: errorMessage })
      },
    })

    if (!session) {
      return yield* httpFailure(new AuthService.Unauthorized({ details: 'Missing or invalid authentication' }))
    }

    return yield* Effect.succeed({ user: session.user, session: session.session } as const)
  })

const verifySessionWithActionContext = (context: typeof ActionArgsContext) =>
  Effect.gen(function* () {
    const args = yield* context
    const { auth } = yield* AuthService.AuthServiceContext
    const forwardedHeaders = mapHeaders(args)

    const session = yield* Effect.tryPromise({
      try: () => auth.api.getSession({ headers: forwardedHeaders }),
      catch: (cause) => {
        const errorMessage = cause instanceof Error ? cause.message : String(cause)
        return new AuthService.Unauthorized({ details: errorMessage })
      },
    })

    if (!session) {
      return yield* httpFailure(new AuthService.Unauthorized({ details: 'Missing or invalid authentication' }))
    }

    return yield* Effect.succeed({ user: session.user, session: session.session } as const)
  })

const verifySession = () => verifySessionWithContext(LoaderArgsContext)
const verifySessionFromAction = () => verifySessionWithActionContext(ActionArgsContext)

export const withAuthGuardMiddleware = <A, E>(
  effect: Effect.Effect<A, E, LoaderArgsContext | AuthService.AuthContext>,
): Effect.Effect<
  A | HttpResponseFailure<AuthService.Unauthorized>,
  E | AuthService.Unauthorized,
  LoaderArgsContext | AuthService.AuthServiceContext
> =>
  Effect.gen(function* () {
    const authResult = yield* verifySession()

    if (authResult instanceof HttpResponseFailure) {
      return authResult
    }

    return yield* Effect.provideService(effect, AuthService.AuthContext, authResult)
  })

export const withAuthGuardMiddlewareFromAction = <A, E>(
  effect: Effect.Effect<A, E, ActionArgsContext | AuthService.AuthContext>,
): Effect.Effect<
  A | HttpResponseFailure<AuthService.Unauthorized>,
  E | AuthService.Unauthorized,
  ActionArgsContext | AuthService.AuthServiceContext
> =>
  Effect.gen(function* () {
    const authResult = yield* verifySessionFromAction()

    if (authResult instanceof HttpResponseFailure) {
      return authResult
    }

    return yield* Effect.provideService(effect, AuthService.AuthContext, authResult)
  })
