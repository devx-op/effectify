import type { ActionArgsContext as ActionArgsContextService } from "@effectify/react-router"
import type { ActionFunctionArgs } from "react-router"
import { RouterContextProvider } from "react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const hatchet = vi.hoisted(() => ({ run: vi.fn() }))
vi.mock("@effectify/hatchet", async () => {
  const actual = await vi.importActual<typeof import("@effectify/hatchet")>(
    "@effectify/hatchet",
  )
  const Effect = await import("effect/Effect")
  return {
    ...actual,
    Hatchet: {
      ...actual.Hatchet,
      run: (...args: ReadonlyArray<unknown>) => Effect.suspend(() => hatchet.run(...args)),
    },
  }
})
vi.mock("../../app/lib/runtime.server.js", async () => {
  const { ActionArgsContext } = await import("@effectify/react-router")
  const Effect = await import("effect/Effect")
  return {
    withActionEffect: <A, E>(self: Effect.Effect<A, E, ActionArgsContextService>) => (args: ActionFunctionArgs) =>
      Effect.runPromise(
        self.pipe(Effect.provideService(ActionArgsContext, args)),
      ).catch((error: unknown) => {
        if (error instanceof Response) return error
        throw error
      }),
  }
})

import * as Effect from "effect/Effect"
import { action } from "../../app/routes/api.hatchet.runs.js"

const args = (
  body: BodyInit,
  method: "POST" | "PUT" = "POST",
): ActionFunctionArgs => {
  const request = new Request("http://localhost/api/hatchet/runs", {
    body,
    headers: { "content-type": "application/json" },
    method,
  })
  const url = URL.parse(request.url)
  if (url === null) throw new Error("test request URL is invalid")
  return {
    context: new RouterContextProvider(),
    params: {},
    pattern: "/api/hatchet/runs",
    request,
    url,
  }
}
const read = async (response: Response): Promise<unknown> => response.json()

describe("POST /api/hatchet/runs", () => {
  beforeEach(() => {
    hatchet.run
      .mockReset()
      .mockReturnValue(Effect.succeed({ greeting: "Hello, Ada!" }))
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          session: { id: "session-1" },
          user: { id: "user-1", email: "user@example.test" },
        }),
      ),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("rejects unauthenticated requests before Hatchet.run", async () => {
    vi.mocked(fetch).mockResolvedValue(
      Response.json({ session: null, user: null }),
    )

    const response = await action(args(JSON.stringify({ name: "Ada" })))

    expect(response).toBeInstanceOf(Response)
    if (!(response instanceof Response)) throw new Error("expected Response")
    expect(response.status).toBe(302)
    expect(response.headers.get("Location")).toBe("/login")
    expect(hatchet.run).not.toHaveBeenCalled()
  })

  it.each([
    ["not-json"],
    [JSON.stringify({})],
    [JSON.stringify({ name: "" })],
    [JSON.stringify({ name: 42 })],
  ])("returns a safe error for invalid Schema input", async (body) => {
    const response = await action(args(body))
    expect(response).toBeInstanceOf(Response)
    if (!(response instanceof Response)) throw new Error("expected Response")
    expect(response.status).toBe(400)
    expect(await read(response)).toEqual({
      ok: false,
      errors: ["Request body must contain a non-empty name"],
    })
    expect(hatchet.run).not.toHaveBeenCalled()
  })

  it("rejects non-POST requests before any operation", async () => {
    const response = await action(args(JSON.stringify({ name: "Ada" }), "PUT"))
    expect(response).toBeInstanceOf(Response)
    if (!(response instanceof Response)) throw new Error("expected Response")
    expect(response.status).toBe(405)
    expect(hatchet.run).not.toHaveBeenCalled()
  })

  it("allows an authenticated request and returns its Schema output", async () => {
    const response = await action(args(JSON.stringify({ name: "Ada" })))
    expect(response).toBeInstanceOf(Response)
    if (!(response instanceof Response)) throw new Error("expected Response")
    expect(response.status).toBe(200)
    expect(await read(response)).toEqual({ greeting: "Hello, Ada!" })
    expect(hatchet.run).toHaveBeenCalledOnce()
    expect(hatchet.run.mock.calls[0]?.[1]).toEqual({ name: "Ada" })
  })
})
