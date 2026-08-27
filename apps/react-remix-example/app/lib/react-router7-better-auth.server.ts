import { AuthService } from "@effectify/node-better-auth"
import { ActionArgsContext, type HttpResponse, LoaderArgsContext, httpRedirect } from "@effectify/react-remix"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"

const handleAuthRequest = (request: Request) =>
  Effect.gen(function* () {
    const auth = yield* AuthService.AuthServiceContext
    return yield* Effect.promise(() => auth.auth.handler(request))
  })

const loaderRequest = Effect.gen(function* () {
  const args = yield* LoaderArgsContext
  return args.request
})

const actionRequest = Effect.gen(function* () {
  const args = yield* ActionArgsContext
  return args.request
})

export const betterAuthLoader = pipe(loaderRequest, Effect.flatMap(handleAuthRequest))

export const betterAuthAction = pipe(actionRequest, Effect.flatMap(handleAuthRequest))

const requestOrigin = (request: Request) => new URL(request.url).origin

const authServerOrigin = (request: Request) =>
  process.env.BETTER_AUTH_URL?.replace(/\/api\/auth\/?$/, "") ?? requestOrigin(request)

const unauthorized = (details: string) => Effect.fail(new AuthService.Unauthorized({ details }))

const verifyRequestSession = (request: Request) =>
  Effect.gen(function* () {
    const response = yield* Effect.tryPromise({
      try: () =>
        fetch(`${authServerOrigin(request)}/api/auth/get-session`, {
          headers: {
            cookie: request.headers.get("cookie") ?? "",
            "Content-Type": "application/json",
            origin: requestOrigin(request),
          },
        }),
      catch: (cause) =>
        new AuthService.Unauthorized({
          details: `Auth server unreachable: ${String(cause)}`,
        }),
    })
    const result = yield* Effect.tryPromise({
      try: () => response.json(),
      catch: (cause) =>
        new AuthService.Unauthorized({
          details: `Failed to parse session: ${String(cause)}`,
        }),
    })

    if (
      typeof result === "object" &&
      result !== null &&
      "session" in result &&
      "user" in result &&
      result.session &&
      result.user
    ) {
      return {
        session: result.session,
        user: result.user,
      }
    }

    return yield* unauthorized("Missing or invalid authentication")
  })

const verifyLoaderSession = Effect.gen(function* () {
  const { request } = yield* LoaderArgsContext
  return yield* verifyRequestSession(request)
})

const verifyActionSession = Effect.gen(function* () {
  const { request } = yield* ActionArgsContext
  return yield* verifyRequestSession(request)
})

export type AuthGuardOptions = {
  readonly redirectOnFail: string
  readonly redirectInit?: number | ResponseInit
}

type LoaderGuard = {
  <A, E, R>(
    effect: Effect.Effect<A, E, R>,
  ): Effect.Effect<
    A,
    E | AuthService.Unauthorized,
    Exclude<R, AuthService.AuthContext> | AuthService.AuthServiceContext | LoaderArgsContext
  >
  readonly with: (
    options: AuthGuardOptions,
  ) => <A, E, R>(
    effect: Effect.Effect<HttpResponse<A> | Response, E, R>,
  ) => Effect.Effect<
    HttpResponse<A> | Response,
    E,
    Exclude<R, AuthService.AuthContext> | AuthService.AuthServiceContext | LoaderArgsContext
  >
}

export const withBetterAuthGuard: LoaderGuard = Object.assign(
  <A, E, R>(effect: Effect.Effect<A, E, R>) =>
    Effect.gen(function* () {
      const auth = yield* verifyLoaderSession
      return yield* Effect.provideService(effect, AuthService.AuthContext, auth)
    }),
  {
    with:
      (options: AuthGuardOptions) =>
      <A, E, R>(effect: Effect.Effect<HttpResponse<A> | Response, E, R>) =>
        verifyLoaderSession.pipe(
          Effect.flatMap((auth) => Effect.provideService(effect, AuthService.AuthContext, auth)),
          Effect.catchTag("Unauthorized", () => httpRedirect(options.redirectOnFail, options.redirectInit)),
        ),
  },
)

type ActionGuard = {
  <A, E, R>(
    effect: Effect.Effect<A, E, R>,
  ): Effect.Effect<
    A,
    E | AuthService.Unauthorized,
    Exclude<R, AuthService.AuthContext> | AuthService.AuthServiceContext | ActionArgsContext
  >
  readonly with: (
    options: AuthGuardOptions,
  ) => <A, E, R>(
    effect: Effect.Effect<HttpResponse<A> | Response, E, R>,
  ) => Effect.Effect<
    HttpResponse<A> | Response,
    E,
    Exclude<R, AuthService.AuthContext> | AuthService.AuthServiceContext | ActionArgsContext
  >
}

export const withBetterAuthGuardAction: ActionGuard = Object.assign(
  <A, E, R>(effect: Effect.Effect<A, E, R>) =>
    Effect.gen(function* () {
      const auth = yield* verifyActionSession
      return yield* Effect.provideService(effect, AuthService.AuthContext, auth)
    }),
  {
    with:
      (options: AuthGuardOptions) =>
      <A, E, R>(effect: Effect.Effect<HttpResponse<A> | Response, E, R>) =>
        verifyActionSession.pipe(
          Effect.flatMap((auth) => Effect.provideService(effect, AuthService.AuthContext, auth)),
          Effect.catchTag("Unauthorized", () => httpRedirect(options.redirectOnFail, options.redirectInit)),
        ),
  },
)
