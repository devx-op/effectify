import { AuthService } from '@effectify/node-better-auth'
import { ActionArgsContext, LoaderArgsContext } from '@effectify/react-router'
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
      return yield* Effect.fail(new AuthService.Unauthorized({ details: 'Missing or invalid authentication' }))
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
      return yield* Effect.fail(new AuthService.Unauthorized({ details: 'Missing or invalid authentication' }))
    }

    return yield* Effect.succeed({ user: session.user, session: session.session } as const)
  })

const verifySession = () => verifySessionWithContext(LoaderArgsContext)
const verifySessionFromAction = () => verifySessionWithActionContext(ActionArgsContext)

export const withBetterAuthGuard = <A, E, L>(
  effect: Effect.Effect<A, E, LoaderArgsContext | AuthService.AuthContext | L>,
): Effect.Effect<
  A,
  E | AuthService.Unauthorized,
  LoaderArgsContext | AuthService.AuthServiceContext | L
> =>
  Effect.gen(function* () {
    const authResult = yield* verifySession()

    return yield* Effect.provideService(effect, AuthService.AuthContext, authResult)
  })

export const withBetterAuthGuardAction = <A, E>(
  effect: Effect.Effect<A, E, ActionArgsContext | AuthService.AuthContext>,
): Effect.Effect<
  A,
  E | AuthService.Unauthorized,
  ActionArgsContext | AuthService.AuthServiceContext
> =>
  Effect.gen(function* () {
    const authResult = yield* verifySessionFromAction()
    return yield* Effect.provideService(effect, AuthService.AuthContext, authResult)
  })