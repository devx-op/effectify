import { AuthService } from '@effectify/node-better-auth'
import { ActionArgsContext, HttpResponse, LoaderArgsContext } from '@effectify/react-router'
import * as Effect from 'effect/Effect'
import { redirect } from 'react-router'

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

export interface AuthGuardOptions {
  redirectOnFail?: string
  redirectInit?: ResponseInit
}

type WithBetterAuthGuard = {
  <A, E, L>(
    eff: Effect.Effect<A, E, LoaderArgsContext | AuthService.AuthContext | L>,
  ): Effect.Effect<A, E | AuthService.Unauthorized, LoaderArgsContext | AuthService.AuthServiceContext | L>
  with: (
    options: AuthGuardOptions,
  ) => <A, E, L>(
    eff: Effect.Effect<HttpResponse<A> | Response, E, LoaderArgsContext | AuthService.AuthContext | L>,
  ) => Effect.Effect<HttpResponse<A> | Response, E, LoaderArgsContext | AuthService.AuthServiceContext | L>
}

export const withBetterAuthGuard: WithBetterAuthGuard = Object.assign(
  (<A, E, L>(
    eff: Effect.Effect<A, E, LoaderArgsContext | AuthService.AuthContext | L>,
  ): Effect.Effect<A, E | AuthService.Unauthorized, LoaderArgsContext | AuthService.AuthServiceContext | L> =>
    Effect.gen(function* () {
      const authResult = yield* verifySession()
      return yield* Effect.provideService(eff, AuthService.AuthContext, authResult)
    })) as any,
  {
    with:
      (opts: AuthGuardOptions) =>
      <A, E, L>(
        eff: Effect.Effect<HttpResponse<A> | Response, E, LoaderArgsContext | AuthService.AuthContext | L>,
      ): Effect.Effect<HttpResponse<A> | Response, E, LoaderArgsContext | AuthService.AuthServiceContext | L> =>
        Effect.gen(function* () {
          return yield* verifySession().pipe(
            Effect.flatMap((authResult) => Effect.provideService(eff, AuthService.AuthContext, authResult)),
            Effect.catchTag('Unauthorized', () => Effect.sync(() => redirect(opts.redirectOnFail!, opts.redirectInit))),
          )
        }),
  },
)

type WithBetterAuthGuardAction = {
  <A, E>(
    eff: Effect.Effect<A, E, ActionArgsContext | AuthService.AuthContext>,
  ): Effect.Effect<A, E | AuthService.Unauthorized, ActionArgsContext | AuthService.AuthServiceContext>
  with: (
    options: AuthGuardOptions,
  ) => <A, E>(
    eff: Effect.Effect<HttpResponse<A> | Response, E, ActionArgsContext | AuthService.AuthContext>,
  ) => Effect.Effect<HttpResponse<A> | Response, E, ActionArgsContext | AuthService.AuthServiceContext>
}

export const withBetterAuthGuardAction: WithBetterAuthGuardAction = Object.assign(
  (<A, E>(
    eff: Effect.Effect<A, E, ActionArgsContext | AuthService.AuthContext>,
  ): Effect.Effect<A, E | AuthService.Unauthorized, ActionArgsContext | AuthService.AuthServiceContext> =>
    Effect.gen(function* () {
      const authResult = yield* verifySessionFromAction()
      return yield* Effect.provideService(eff, AuthService.AuthContext, authResult)
    })) as any,
  {
    with:
      (opts: AuthGuardOptions) =>
      <A, E>(
        eff: Effect.Effect<HttpResponse<A> | Response, E, ActionArgsContext | AuthService.AuthContext>,
      ): Effect.Effect<HttpResponse<A> | Response, E, ActionArgsContext | AuthService.AuthServiceContext> =>
        Effect.gen(function* () {
          return yield* verifySessionFromAction().pipe(
            Effect.flatMap((authResult) => Effect.provideService(eff, AuthService.AuthContext, authResult)),
            Effect.catchTag('Unauthorized', () => Effect.sync(() => redirect(opts.redirectOnFail!, opts.redirectInit))),
          )
        }),
  },
)
