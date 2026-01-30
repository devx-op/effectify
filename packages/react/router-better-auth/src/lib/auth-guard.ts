import { AuthService } from "@effectify/node-better-auth"
import { ActionArgsContext, type HttpResponse, LoaderArgsContext } from "@effectify/react-router"
import * as Effect from "effect/Effect"
import { redirect } from "react-router"

const mapHeaders = (args: { request: Request }) => args.request.headers

const verifySessionWithContext = (context: typeof LoaderArgsContext) =>
  Effect.gen(function*() {
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
      return yield* Effect.fail(new AuthService.Unauthorized({ details: "Missing or invalid authentication" }))
    }

    return yield* Effect.succeed({ user: session.user, session: session.session } as const)
  })

const verifySessionWithActionContext = (context: typeof ActionArgsContext) =>
  Effect.gen(function*() {
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
      return yield* Effect.fail(new AuthService.Unauthorized({ details: "Missing or invalid authentication" }))
    }

    return yield* Effect.succeed({ user: session.user, session: session.session } as const)
  })

const verifySession = () => verifySessionWithContext(LoaderArgsContext)
const verifySessionFromAction = () => verifySessionWithActionContext(ActionArgsContext)

export type AuthGuardOptions = {
  redirectOnFail?: string
  redirectInit?: ResponseInit
}

type WithBetterAuthGuard = {
  // Use generic R and Exclude<R, AuthService.AuthContext>
  <A, E, R>(
    eff: Effect.Effect<A, E, R>,
  ): Effect.Effect<
    A,
    E | AuthService.Unauthorized,
    Exclude<R, AuthService.AuthContext> | AuthService.AuthServiceContext | LoaderArgsContext
  >
  with: (
    options: AuthGuardOptions,
  ) => <A, E, R>(
    eff: Effect.Effect<HttpResponse<A> | Response, E, R>,
  ) => Effect.Effect<
    HttpResponse<A> | Response,
    E,
    Exclude<R, AuthService.AuthContext> | AuthService.AuthServiceContext | LoaderArgsContext
  >
}

export const withBetterAuthGuard: WithBetterAuthGuard = Object.assign(
  <A, E, R>(
    eff: Effect.Effect<A, E, R>,
  ): Effect.Effect<
    A,
    E | AuthService.Unauthorized,
    Exclude<R, AuthService.AuthContext> | AuthService.AuthServiceContext | LoaderArgsContext
  > =>
    Effect.gen(function*() {
      const authResult = yield* verifySession()
      return yield* Effect.provideService(eff, AuthService.AuthContext, authResult)
    }),
  {
    with: (opts: AuthGuardOptions) =>
    <A, E, R>(
      eff: Effect.Effect<HttpResponse<A> | Response, E, R>,
    ): Effect.Effect<
      HttpResponse<A> | Response,
      E,
      Exclude<R, AuthService.AuthContext> | AuthService.AuthServiceContext | LoaderArgsContext
    > =>
      Effect.gen(function*() {
        return yield* verifySession().pipe(
          Effect.flatMap((authResult) => Effect.provideService(eff, AuthService.AuthContext, authResult)),
          Effect.catchTag("Unauthorized", () => Effect.sync(() => redirect(opts.redirectOnFail!, opts.redirectInit))),
        )
      }),
  },
)

type WithBetterAuthGuardAction = {
  // Use generic R and Exclude<R, AuthService.AuthContext>
  <A, E, R>(
    eff: Effect.Effect<A, E, R>,
  ): Effect.Effect<
    A,
    E | AuthService.Unauthorized,
    Exclude<R, AuthService.AuthContext> | AuthService.AuthServiceContext | ActionArgsContext
  >

  with: (
    options: AuthGuardOptions,
  ) => <A, E, R>(
    eff: Effect.Effect<HttpResponse<A> | Response, E, R>,
  ) => Effect.Effect<
    HttpResponse<A> | Response,
    E,
    Exclude<R, AuthService.AuthContext> | AuthService.AuthServiceContext | ActionArgsContext
  >
}

export const withBetterAuthGuardAction: WithBetterAuthGuardAction = Object.assign(
  <A, E, R>(
    eff: Effect.Effect<A, E, R>,
  ): Effect.Effect<
    A,
    E | AuthService.Unauthorized,
    Exclude<R, AuthService.AuthContext> | AuthService.AuthServiceContext | ActionArgsContext
  > =>
    Effect.gen(function*() {
      const authResult = yield* verifySessionFromAction()
      return yield* Effect.provideService(eff, AuthService.AuthContext, authResult)
    }),
  {
    with: (opts: AuthGuardOptions) =>
    <A, E, R>(
      eff: Effect.Effect<HttpResponse<A> | Response, E, R>,
    ): Effect.Effect<
      HttpResponse<A> | Response,
      E,
      Exclude<R, AuthService.AuthContext> | AuthService.AuthServiceContext | ActionArgsContext
    > =>
      Effect.gen(function*() {
        return yield* verifySessionFromAction().pipe(
          Effect.flatMap((authResult) => Effect.provideService(eff, AuthService.AuthContext, authResult)),
          Effect.catchTag("Unauthorized", () => Effect.sync(() => redirect(opts.redirectOnFail!, opts.redirectInit))),
        )
      }),
  },
)
