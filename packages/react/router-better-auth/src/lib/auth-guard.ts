import { AuthService } from "@effectify/node-better-auth"
import { ActionArgsContext, type HttpResponse, LoaderArgsContext } from "@effectify/react-router"
import * as Effect from "effect/Effect"
import { redirect } from "react-router"

const getRequestOrigin = (request: Request) => new URL(request.url).origin

const mapHeaders = (args: { request: Request }) => {
  const headers = new Headers(args.request.headers)
  if (!headers.has("origin")) {
    headers.set("origin", getRequestOrigin(args.request))
  }
  return headers
}

const getAuthServerOrigin = (request: Request) =>
  process.env.BETTER_AUTH_URL?.replace(/\/api\/auth\/?$/, "") ||
  getRequestOrigin(request)

const failUnauthorized = (details: string) =>
  Effect.fail(
    new AuthService.Unauthorized({
      details,
    }),
  )

const verifySessionWithContext = (context: typeof LoaderArgsContext) =>
  Effect.gen(function*() {
    const args = yield* context
    const forwardedHeaders = mapHeaders(args)
    const cookieValue = forwardedHeaders.get("cookie") || ""
    const requestOrigin = getRequestOrigin(args.request)
    const authOrigin = getAuthServerOrigin(args.request)

    // Make direct fetch call to auth server
    const response = yield* Effect.tryPromise({
      try: () =>
        fetch(`${authOrigin}/api/auth/get-session`, {
          headers: {
            cookie: cookieValue,
            "Content-Type": "application/json",
            origin: requestOrigin,
          },
        }),
      catch: (cause) =>
        new AuthService.Unauthorized({
          details: `Auth server unreachable: ${String(cause)}`,
        }),
    })

    const fetchResult = yield* Effect.tryPromise({
      try: () => response.json(),
      catch: (cause) =>
        new AuthService.Unauthorized({
          details: `Failed to parse session: ${String(cause)}`,
        }),
    })

    if (fetchResult?.session) {
      return {
        user: fetchResult.user,
        session: fetchResult.session,
      } as const
    }

    return yield* failUnauthorized("Missing or invalid authentication")
  })

const verifySessionWithActionContext = (context: typeof ActionArgsContext) =>
  Effect.gen(function*() {
    const args = yield* context
    const forwardedHeaders = mapHeaders(args)
    const cookieValue = forwardedHeaders.get("cookie") || ""
    const requestOrigin = getRequestOrigin(args.request)
    const authOrigin = getAuthServerOrigin(args.request)

    const response = yield* Effect.tryPromise({
      try: () =>
        fetch(`${authOrigin}/api/auth/get-session`, {
          headers: {
            cookie: cookieValue,
            "Content-Type": "application/json",
            origin: requestOrigin,
          },
        }),
      catch: (cause) =>
        new AuthService.Unauthorized({
          details: `Auth server unreachable: ${String(cause)}`,
        }),
    })

    const fetchResult = yield* Effect.tryPromise({
      try: () => response.json(),
      catch: (cause) =>
        new AuthService.Unauthorized({
          details: `Failed to parse session: ${String(cause)}`,
        }),
    })

    if (fetchResult?.session) {
      return {
        user: fetchResult.user,
        session: fetchResult.session,
      } as const
    }

    return yield* failUnauthorized("Missing or invalid authentication")
  })

const verifySession = () => verifySessionWithContext(LoaderArgsContext)
const verifySessionFromAction = () => verifySessionWithActionContext(ActionArgsContext)

export type AuthGuardOptions = {
  redirectOnFail?: string
  redirectInit?: ResponseInit
}

type WithBetterAuthGuard = {
  <A, E, R>(
    eff: Effect.Effect<A, E, R>,
  ): Effect.Effect<
    A,
    E | AuthService.Unauthorized,
    | Exclude<R, AuthService.AuthContext>
    | AuthService.AuthServiceContext
    | LoaderArgsContext
  >
  with: (
    options: AuthGuardOptions,
  ) => <A, E, R>(
    eff: Effect.Effect<HttpResponse<A> | Response, E, R>,
  ) => Effect.Effect<
    HttpResponse<A> | Response,
    E,
    | Exclude<R, AuthService.AuthContext>
    | AuthService.AuthServiceContext
    | LoaderArgsContext
  >
}

export const withBetterAuthGuard: WithBetterAuthGuard = Object.assign(
  <A, E, R>(
    eff: Effect.Effect<A, E, R>,
  ): Effect.Effect<
    A,
    E | AuthService.Unauthorized,
    | Exclude<R, AuthService.AuthContext>
    | AuthService.AuthServiceContext
    | LoaderArgsContext
  > =>
    Effect.gen(function*() {
      const authResult = yield* verifySession()
      return yield* Effect.provideService(
        eff,
        AuthService.AuthContext,
        authResult,
      )
    }),
  {
    with: (opts: AuthGuardOptions) =>
    <A, E, R>(
      eff: Effect.Effect<HttpResponse<A> | Response, E, R>,
    ): Effect.Effect<
      HttpResponse<A> | Response,
      E,
      | Exclude<R, AuthService.AuthContext>
      | AuthService.AuthServiceContext
      | LoaderArgsContext
    > =>
      verifySession().pipe(
        Effect.flatMap((authResult) => Effect.provideService(eff, AuthService.AuthContext, authResult)),
        Effect.catchTag("Unauthorized", () => Effect.sync(() => redirect(opts.redirectOnFail!, opts.redirectInit))),
      ),
  },
)

type WithBetterAuthGuardAction = {
  <A, E, R>(
    eff: Effect.Effect<A, E, R>,
  ): Effect.Effect<
    A,
    E | AuthService.Unauthorized,
    | Exclude<R, AuthService.AuthContext>
    | AuthService.AuthServiceContext
    | ActionArgsContext
  >
  with: (
    options: AuthGuardOptions,
  ) => <A, E, R>(
    eff: Effect.Effect<HttpResponse<A> | Response, E, R>,
  ) => Effect.Effect<
    HttpResponse<A> | Response,
    E,
    | Exclude<R, AuthService.AuthContext>
    | AuthService.AuthServiceContext
    | ActionArgsContext
  >
}

export const withBetterAuthGuardAction: WithBetterAuthGuardAction = Object.assign(
  <A, E, R>(
    eff: Effect.Effect<A, E, R>,
  ): Effect.Effect<
    A,
    E | AuthService.Unauthorized,
    | Exclude<R, AuthService.AuthContext>
    | AuthService.AuthServiceContext
    | ActionArgsContext
  > =>
    Effect.gen(function*() {
      const authResult = yield* verifySessionFromAction()
      return yield* Effect.provideService(
        eff,
        AuthService.AuthContext,
        authResult,
      )
    }),
  {
    with: (opts: AuthGuardOptions) =>
    <A, E, R>(
      eff: Effect.Effect<HttpResponse<A> | Response, E, R>,
    ): Effect.Effect<
      HttpResponse<A> | Response,
      E,
      | Exclude<R, AuthService.AuthContext>
      | AuthService.AuthServiceContext
      | ActionArgsContext
    > =>
      verifySessionFromAction().pipe(
        Effect.flatMap((authResult) => Effect.provideService(eff, AuthService.AuthContext, authResult)),
        Effect.catchTag("Unauthorized", () => Effect.sync(() => redirect(opts.redirectOnFail!, opts.redirectInit))),
      ),
  },
)
