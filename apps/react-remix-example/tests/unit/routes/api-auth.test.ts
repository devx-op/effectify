import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { describe, expect, it, vi } from "vitest"

const { authHandlerMock } = vi.hoisted(() => ({
  authHandlerMock: vi.fn(),
}))

vi.mock("../../../app/lib/better-auth-options.server.js", () => ({
  authOptions: {
    baseURL: "http://localhost:3000",
    secret: "test-secret",
  },
}))

vi.mock("@effectify/node-better-auth", () => {
  class MockAuthServiceContext extends Context.Service<
    MockAuthServiceContext,
    {
      readonly auth: {
        readonly handler: (request: Request) => Promise<Response>
      }
    }
  >()("AuthServiceContext") {}

  return {
    AuthService: {
      AuthServiceContext: Object.assign(MockAuthServiceContext, {
        layer: () =>
          Layer.succeed(MockAuthServiceContext, {
            auth: {
              handler: authHandlerMock,
            },
          }),
      }),
    },
  }
})

vi.mock("@effectify/react-router-better-auth", () => ({
  betterAuthLoader: Effect.succeed(
    new Response("loader ok", {
      status: 200,
      headers: {
        "set-cookie": "session=loader",
        "x-runtime": "loader",
      },
    }),
  ),
  betterAuthAction: Effect.succeed(
    new Response("action ok", {
      status: 201,
      headers: {
        "set-cookie": "session=action",
        "x-runtime": "action",
      },
    }),
  ),
}))

import { action, loader } from "../../../app/routes/api.auth.$.js"

const makeLoaderArgs = (request: Request): LoaderFunctionArgs => ({
  context: {},
  params: { "*": "session" },
  request,
})

const makeActionArgs = (request: Request): ActionFunctionArgs => ({
  context: {},
  params: { "*": "session" },
  request,
})

describe("api.auth route runtime integration", () => {
  it("preserves auth loader responses through withLoaderEffect", async () => {
    const response = await loader(
      makeLoaderArgs(new Request("https://example.com/api/auth/session")),
    ).catch((error) => error)

    expect(response).toBeInstanceOf(Response)
    expect(response.status).toBe(200)
    expect(response.headers.get("set-cookie")).toBe("session=loader")
    expect(response.headers.get("x-runtime")).toBe("loader")
    await expect(response.text()).resolves.toBe("loader ok")
  })

  it("preserves auth action responses through withActionEffect", async () => {
    const response = await action(
      makeActionArgs(
        new Request("https://example.com/api/auth/session", {
          method: "POST",
        }),
      ),
    ).catch((error) => error)

    expect(response).toBeInstanceOf(Response)
    expect(response.status).toBe(201)
    expect(response.headers.get("set-cookie")).toBe("session=action")
    expect(response.headers.get("x-runtime")).toBe("action")
    await expect(response.text()).resolves.toBe("action ok")
  })
})
