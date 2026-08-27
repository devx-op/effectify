import { AuthService } from "@effectify/node-better-auth"
import { ActionArgsContext, LoaderArgsContext } from "@effectify/react-router"
import * as Effect from "effect/Effect"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { withBetterAuthGuard, withBetterAuthGuardAction } from "../src/lib/auth-guard.js"
import { betterAuthAction, betterAuthLoader } from "../src/lib/handlers.js"

const request = new Request("https://example.test/todo-app", {
  headers: { cookie: "session=abc123" },
})

const sessionResponse = (session: unknown) =>
  new Response(JSON.stringify({ session, user: session ? { id: "user-1" } : null }), {
    headers: { "Content-Type": "application/json" },
  })

const loaderArgs = { request, params: {}, context: {} }
const actionArgs = { request, params: {}, context: {} }

const runLoaderGuard = () =>
  Effect.runPromise(
    Effect.provideService(
      withBetterAuthGuard.with({
        redirectOnFail: "/login",
        redirectInit: { headers: { "Set-Cookie": "returnTo=/todo-app" } },
      })(Effect.succeed(new Response("loader-ok", { status: 201 }))),
      LoaderArgsContext,
      loaderArgs,
    ),
  )

const runActionGuard = () =>
  Effect.runPromise(
    Effect.provideService(
      withBetterAuthGuardAction.with({
        redirectOnFail: "/login",
        redirectInit: { headers: { "Set-Cookie": "returnTo=/todo-app" } },
      })(Effect.succeed(new Response("action-ok", { status: 202 }))),
      ActionArgsContext,
      actionArgs,
    ),
  )

const createAuth = () =>
  Effect.runPromise(
    AuthService.AuthServiceContext.pipe(
      Effect.provide(AuthService.AuthServiceContext.layer({ baseURL: "https://example.test" })),
    ),
  )

describe("Better Auth guard compatibility", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it.each([
    ["loader", runLoaderGuard],
    ["action", runActionGuard],
  ] as const)("preserves redirect status, location, and cookies for an unauthorized %s", async (_name, run) => {
    vi.mocked(fetch).mockResolvedValue(sessionResponse(null))

    const result = await run()

    expect(result.status).toBe(302)
    expect(result.headers.get("Location")).toBe("/login")
    expect(result.headers.get("Set-Cookie")).toBe("returnTo=/todo-app")
  })

  it.each([
    ["loader", runLoaderGuard, 201, "loader-ok"],
    ["action", runActionGuard, 202, "action-ok"],
  ] as const)("preserves successful %s responses", async (_name, run, status, body) => {
    vi.mocked(fetch).mockResolvedValue(sessionResponse({ id: "session-1" }))

    const result = await run()

    expect(result.status).toBe(status)
    await expect(result.text()).resolves.toBe(body)
  })

  it("forwards the exact typed loader context request to auth.handler", async () => {
    const request = new Request("https://example.test/api/auth/loader", {
      headers: { cookie: "loader=session" },
    })
    const auth = await createAuth()
    const authHandler = vi.spyOn(auth.auth, "handler").mockResolvedValue(new Response("loader"))

    const response = await Effect.runPromise(
      betterAuthLoader.pipe(
        Effect.provideService(LoaderArgsContext, { request, params: {}, context: {} }),
        Effect.provideService(AuthService.AuthServiceContext, auth),
      ),
    )

    expect(authHandler).toHaveBeenCalledTimes(1)
    expect(authHandler).toHaveBeenCalledWith(request)
    expect(authHandler.mock.calls[0]?.[0]).toBe(request)
    await expect(response.text()).resolves.toBe("loader")
  })

  it("forwards the exact typed action context request to auth.handler", async () => {
    const request = new Request("https://example.test/api/auth/action", {
      headers: { cookie: "action=session" },
    })
    const auth = await createAuth()
    const authHandler = vi.spyOn(auth.auth, "handler").mockResolvedValue(new Response("action"))

    const response = await Effect.runPromise(
      betterAuthAction.pipe(
        Effect.provideService(ActionArgsContext, { request, params: {}, context: {} }),
        Effect.provideService(AuthService.AuthServiceContext, auth),
      ),
    )

    expect(authHandler).toHaveBeenCalledTimes(1)
    expect(authHandler).toHaveBeenCalledWith(request)
    expect(authHandler.mock.calls[0]?.[0]).toBe(request)
    await expect(response.text()).resolves.toBe("action")
  })
})
