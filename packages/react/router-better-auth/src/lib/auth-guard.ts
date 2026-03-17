import { AuthService } from "@effectify/node-better-auth"
import { ActionArgsContext, type HttpResponse, LoaderArgsContext } from "@effectify/react-router"
import * as Effect from "effect/Effect"
import { redirect } from "react-router"

const mapHeaders = (args: { request: Request }) => {
  const headers = new Headers(args.request.headers)
  if (!headers.has("origin")) {
    headers.set("origin", "http://localhost:3000")
  }
  return headers
}

// Default auth server URL - can be overridden with BETTER_AUTH_URL env var
const getAuthServerOrigin = () =>
  process.env.BETTER_AUTH_URL?.replace(/\/api\/auth\/?$/, "") ||
  "http://localhost:3001"

const verifySessionWithContext = (context: typeof LoaderArgsContext) =>
  Effect.gen(function*() {
    const args = yield* context
    const forwardedHeaders = mapHeaders(args)
    const cookieValue = forwardedHeaders.get("cookie") || ""
    const authOrigin = getAuthServerOrigin()

    // Make direct fetch call to auth server
    const response = yield* Effect.tryPromise({
      try: () =>
        fetch(`${authOrigin}/api/auth/get-session`, {
          headers: {
            cookie: cookieValue,
            "Content-Type": "application/json",
            origin: "http://localhost:3000",
          },
        }),
      catch: () => null as any,
    })

    if (!response) {
      return yield* Effect.fail(
        new AuthService.Unauthorized({ details: "Auth server unreachable" }),
      )
    }

    const fetchResult = yield* Effect.tryPromise({
      try: () => response.json(),
      catch: () => ({ session: null }),
    })

    if (fetchResult?.session) {
      return yield* Effect.succeed(
        {
          user: fetchResult.user,
          session: fetchResult.session,
        } as const,
      )
    }

    return yield* Effect.fail(
      new AuthService.Unauthorized({
        details: "Missing or invalid authentication",
      }),
    )
  })

const verifySessionWithActionContext = (context: typeof ActionArgsContext) =>
  Effect.gen(function*() {
    const args = yield* context
    const forwardedHeaders = mapHeaders(args)
    const cookieValue = forwardedHeaders.get("cookie") || ""
    const authOrigin = getAuthServerOrigin()

    const response = yield* Effect.tryPromise({
      try: () =>
        fetch(`${authOrigin}/api/auth/get-session`, {
          headers: {
            cookie: cookieValue,
            "Content-Type": "application/json",
            origin: "http://localhost:3000",
          },
        }),
      catch: () => null as any,
    })

    if (!response) {
      return yield* Effect.fail(
        new AuthService.Unauthorized({ details: "Auth server unreachable" }),
      )
    }

    const fetchResult = yield* Effect.tryPromise({
      try: () => response.json(),
      catch: () => ({ session: null }),
    })

    if (fetchResult?.session) {
      return yield* Effect.succeed(
        {
          user: fetchResult.user,
          session: fetchResult.session,
        } as const,
      )
    }

    return yield* Effect.fail(
      new AuthService.Unauthorized({
        details: "Missing or invalid authentication",
      }),
    )
  })

const verifySession = () => verifySessionWithContext(LoaderArgsContext)
const verifySessionFromAction = () => verifySessionWithActionContext(ActionArgsContext)

export type AuthGuardOptions = {
  redirectOnFail?: string
  redirectInit?: ResponseInit
}

type WithBetterAuthGuard = {
  <A, E, R>(eff: Effect.Effect<A, E, R>): Effect.Effect<
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
      Effect.gen(function*() {
        return yield* verifySession().pipe(
          Effect.flatMap((authResult) => Effect.provideService(eff, AuthService.AuthContext, authResult)),
          Effect.catchTag("Unauthorized", () => Effect.sync(() => redirect(opts.redirectOnFail!, opts.redirectInit))),
        )
      }),
  },
)

type WithBetterAuthGuardAction = {
  <A, E, R>(eff: Effect.Effect<A, E, R>): Effect.Effect<
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
      Effect.gen(function*() {
        return yield* verifySessionFromAction().pipe(
          Effect.flatMap((authResult) => Effect.provideService(eff, AuthService.AuthContext, authResult)),
          Effect.catchTag("Unauthorized", () => Effect.sync(() => redirect(opts.redirectOnFail!, opts.redirectInit))),
        )
      }),
  },
)
