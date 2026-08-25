import { AuthService } from "@effectify/node-better-auth"
import { ActionArgsContext, LoaderArgsContext, Runtime, httpSuccess } from "@effectify/react-remix"
import {
  ActionArgsContext as Router8ActionArgsContext,
  LoaderArgsContext as Router8LoaderArgsContext,
} from "../../../../packages/react/router/src/lib/context.js"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  betterAuthAction,
  betterAuthLoader,
  withBetterAuthGuard,
  withBetterAuthGuardAction,
} from "../../app/lib/react-router7-better-auth.server.js"

class LookalikeLoaderArgsContext extends Context.Service<
  LookalikeLoaderArgsContext,
  { readonly request: Request; readonly params: Record<string, string> }
>()("LoaderArgsContext") {}

class LookalikeActionArgsContext extends Context.Service<
  LookalikeActionArgsContext,
  { readonly request: Request; readonly params: Record<string, string> }
>()("ActionArgsContext") {}

const authLayer = AuthService.AuthServiceContext.layer({
  baseURL: "https://example.test",
  secret: "test-secret",
})
const runtime = Runtime.make(authLayer)

const makeLoaderArgs = (request: Request) => ({
  context: {},
  params: { "*": "session" },
  pattern: "/api/auth/*",
  request,
  url: new URL(request.url),
})

const makeActionArgs = (request: Request) => ({
  context: {},
  params: { "*": "session" },
  pattern: "/api/auth/*",
  request,
  url: new URL(request.url),
})

const createAuth = () => Effect.runPromise(AuthService.AuthServiceContext.pipe(Effect.provide(authLayer)))

const authResponse = () => {
  const headers = new Headers({
    Location: "/account",
    "X-Auth": "preserved",
  })
  headers.append("Set-Cookie", "session=one; Path=/; HttpOnly")
  headers.append("Set-Cookie", "csrf=two; Path=/; SameSite=Lax")
  return new Response("auth body", {
    status: 307,
    headers,
  })
}

const sessionResponse = (session: unknown) =>
  Response.json({
    session,
    user: session ? { id: "user-1" } : null,
  })

const runtimeWithAuth = (auth: Awaited<ReturnType<typeof createAuth>>) =>
  Runtime.make(Layer.succeed(AuthService.AuthServiceContext, auth))

describe("app-local React Router 7 Better Auth adapter", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it.each([
    ["loader", makeLoaderArgs],
    ["action", makeActionArgs],
  ] as const)("uses the exact bridge %s context and preserves request identity", async (_name, makeArgs) => {
    const request = new Request("https://example.test/api/auth/session", {
      method: _name === "action" ? "POST" : "GET",
    })
    const response = authResponse()
    const auth = await createAuth()
    const handler = vi.spyOn(auth.auth, "handler").mockResolvedValue(response)

    const localRuntime = runtimeWithAuth(auth)
    const localRun =
      _name === "loader"
        ? localRuntime.withLoaderEffect(betterAuthLoader)
        : localRuntime.withActionEffect(betterAuthAction)
    const observed = await localRun(makeArgs(request)).catch((error) => error)

    expect(handler).toHaveBeenCalledOnce()
    expect(handler.mock.calls[0]?.[0]).toBe(request)
    expect(observed).toBe(response)
  })

  it("preserves auth body, status, Location, and every cookie value", async () => {
    const request = new Request("https://example.test/api/auth/session")
    const response = authResponse()
    const auth = await createAuth()
    vi.spyOn(auth.auth, "handler").mockResolvedValue(response)

    const observed = await runtimeWithAuth(auth)
      .withLoaderEffect(betterAuthLoader)(makeLoaderArgs(request))
      .catch((error) => error)

    expect(observed.status).toBe(307)
    expect(observed.headers.get("Location")).toBe("/account")
    expect(observed.headers.get("X-Auth")).toBe("preserved")
    expect(observed.headers.getSetCookie()).toEqual(["session=one; Path=/; HttpOnly", "csrf=two; Path=/; SameSite=Lax"])
    await expect(observed.text()).resolves.toBe("auth body")
  })

  it.each([
    ["RR8 loader context", Router8LoaderArgsContext, makeLoaderArgs(new Request("https://example.test/rr8"))],
    [
      "loader lookalike context",
      LookalikeLoaderArgsContext,
      makeLoaderArgs(new Request("https://example.test/lookalike")),
    ],
  ] as const)("rejects a %s instead of satisfying the bridge loader context", async (_name, context, args) => {
    const auth = await createAuth()
    const handler = vi.spyOn(auth.auth, "handler")

    const exit = await Effect.runPromiseExit(
      // @ts-expect-error A foreign context intentionally leaves LoaderArgsContext unsatisfied.
      betterAuthLoader.pipe(
        // @ts-expect-error A foreign context cannot remove the bridge requirement.
        Effect.provideService(context, args),
        Effect.provideService(AuthService.AuthServiceContext, auth),
      ),
    )

    expect(exit._tag).toBe("Failure")
    expect(handler).not.toHaveBeenCalled()
  })

  it.each([
    [
      "RR8 action context",
      Router8ActionArgsContext,
      makeActionArgs(new Request("https://example.test/rr8", { method: "POST" })),
    ],
    [
      "action lookalike context",
      LookalikeActionArgsContext,
      makeActionArgs(new Request("https://example.test/lookalike", { method: "POST" })),
    ],
  ] as const)("rejects an %s instead of satisfying the bridge action context", async (_name, context, args) => {
    const auth = await createAuth()
    const handler = vi.spyOn(auth.auth, "handler")

    const exit = await Effect.runPromiseExit(
      // @ts-expect-error A foreign context intentionally leaves ActionArgsContext unsatisfied.
      betterAuthAction.pipe(
        // @ts-expect-error A foreign context cannot remove the bridge requirement.
        Effect.provideService(context, args),
        Effect.provideService(AuthService.AuthServiceContext, auth),
      ),
    )

    expect(exit._tag).toBe("Failure")
    expect(handler).not.toHaveBeenCalled()
  })

  it.each([
    [
      "loader",
      (request: Request) =>
        Effect.runPromiseExit(
          withBetterAuthGuard(Effect.succeed("unreachable")).pipe(
            Effect.provideService(LoaderArgsContext, makeLoaderArgs(request)),
            Effect.provide(authLayer),
          ),
        ),
    ],
    [
      "action",
      (request: Request) =>
        Effect.runPromiseExit(
          withBetterAuthGuardAction(Effect.succeed("unreachable")).pipe(
            Effect.provideService(ActionArgsContext, makeActionArgs(request)),
            Effect.provide(authLayer),
          ),
        ),
    ],
  ] as const)("keeps Unauthorized typed for the default %s guard policy", async (_name, run) => {
    vi.mocked(fetch).mockResolvedValue(sessionResponse(null))
    const exit = await run(new Request("https://example.test/todos"))

    expect(exit._tag).toBe("Failure")
    if (exit._tag === "Failure") {
      expect(String(exit.cause)).toContain("Unauthorized")
    }
  })

  it.each([
    ["transport", () => Promise.reject(new Error("offline")), "Auth server unreachable"],
    ["parse", () => Promise.resolve(new Response("not json")), "Failed to parse session"],
  ] as const)("keeps %s failures as typed Unauthorized errors", async (_name, fetchResult, details) => {
    vi.mocked(fetch).mockImplementation(fetchResult)
    const request = new Request("https://example.test/todos")

    const error = await Effect.runPromise(
      Effect.flip(
        withBetterAuthGuard(Effect.succeed("unreachable")).pipe(
          Effect.provideService(LoaderArgsContext, makeLoaderArgs(request)),
          Effect.provide(authLayer),
        ),
      ),
    )

    expect(error).toBeInstanceOf(AuthService.Unauthorized)
    expect(error.details).toContain(details)
  })

  const redirectOptions = {
    redirectOnFail: "/login",
    redirectInit: {
      status: 303,
      headers: [
        ["Set-Cookie", "returnTo=/todos; Path=/"],
        ["Set-Cookie", "notice=login; Path=/"],
      ],
    },
  } satisfies Parameters<typeof withBetterAuthGuard.with>[0]

  it.each([
    [
      "loader",
      (request: Request) =>
        runtime.withLoaderEffect(withBetterAuthGuard.with(redirectOptions)(httpSuccess("unreachable")))(
          makeLoaderArgs(request),
        ),
    ],
    [
      "action",
      (request: Request) =>
        runtime.withActionEffect(withBetterAuthGuardAction.with(redirectOptions)(httpSuccess("unreachable")))(
          makeActionArgs(request),
        ),
    ],
  ] as const)("applies redirect status, Location, and cookies for the %s guard", async (_name, run) => {
    vi.mocked(fetch).mockResolvedValue(sessionResponse(null))
    const response = await run(new Request("https://example.test/todos"))

    expect(response).toBeInstanceOf(Response)
    if (!(response instanceof Response)) throw new Error("Expected redirect Response")
    expect(response.status).toBe(303)
    expect(response.headers.get("Location")).toBe("/login")
    expect(response.headers.getSetCookie()).toEqual(["returnTo=/todos; Path=/", "notice=login; Path=/"])
  })
})
