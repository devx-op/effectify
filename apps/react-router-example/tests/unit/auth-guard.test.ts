import { ActionArgsContext, LoaderArgsContext } from "@effectify/react-router"
import * as Effect from "effect/Effect"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  withBetterAuthGuard,
  withBetterAuthGuardAction,
} from "../../../../packages/react/router-better-auth/src/lib/auth-guard.js"

const makeRequest = (pathname: string) =>
  new Request(`https://example.test${pathname}`, {
    headers: {
      cookie: "session=abc123",
    },
  })

const makeLoaderArgs = (request: Request) => ({
  request,
  params: {},
  context: {},
})

const makeActionArgs = (request: Request) => ({
  request,
  params: {},
  context: {},
})

describe("withBetterAuthGuard redirect behavior", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("redirects loader effects to /login when the auth session is missing", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ session: null, user: null }), {
        headers: { "Content-Type": "application/json" },
      }),
    )

    const result = await Effect.runPromise(
      Effect.provideService(
        withBetterAuthGuard.with({ redirectOnFail: "/login" })(
          Effect.succeed(new Response("ok")),
        ),
        LoaderArgsContext,
        makeLoaderArgs(makeRequest("/todo-app")),
      ),
    )

    expect(result.status).toBe(302)
    expect(result.headers.get("Location")).toBe("/login")
  })

  it("passes loader effects through when the auth session is valid", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          session: { id: "session-1" },
          user: { id: "user-1", email: "user@example.test" },
        }),
        {
          headers: { "Content-Type": "application/json" },
        },
      ),
    )

    const result = await Effect.runPromise(
      Effect.provideService(
        withBetterAuthGuard.with({ redirectOnFail: "/login" })(
          Effect.succeed(new Response("ok", { status: 201 })),
        ),
        LoaderArgsContext,
        makeLoaderArgs(makeRequest("/todo-app")),
      ),
    )

    expect(result.status).toBe(201)
    await expect(result.text()).resolves.toBe("ok")
  })

  it("redirects action effects to /login when the auth session is missing", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ session: null, user: null }), {
        headers: { "Content-Type": "application/json" },
      }),
    )

    const result = await Effect.runPromise(
      Effect.provideService(
        withBetterAuthGuardAction.with({ redirectOnFail: "/login" })(
          Effect.succeed(new Response("ok")),
        ),
        ActionArgsContext,
        makeActionArgs(makeRequest("/todo-app")),
      ),
    )

    expect(result.status).toBe(302)
    expect(result.headers.get("Location")).toBe("/login")
  })

  it("passes action effects through when the auth session is valid", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          session: { id: "session-1" },
          user: { id: "user-1", email: "user@example.test" },
        }),
        {
          headers: { "Content-Type": "application/json" },
        },
      ),
    )

    const result = await Effect.runPromise(
      Effect.provideService(
        withBetterAuthGuardAction.with({ redirectOnFail: "/login" })(
          Effect.succeed(new Response("ok", { status: 202 })),
        ),
        ActionArgsContext,
        makeActionArgs(makeRequest("/todo-app")),
      ),
    )

    expect(result.status).toBe(202)
    await expect(result.text()).resolves.toBe("ok")
  })
})
