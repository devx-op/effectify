import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node"
import * as Context from "effect/Context"
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

import { action, loader } from "../../../app/routes/test.js"

const makeLoaderArgs = (request: Request): LoaderFunctionArgs => ({
  context: {},
  params: {},
  request,
})

const makeActionArgs = (request: Request): ActionFunctionArgs => ({
  context: {},
  params: {},
  request,
})

describe("test route runtime integration", () => {
  it("returns loader data through withLoaderEffect", async () => {
    const response = await loader(makeLoaderArgs(new Request("https://example.com/test")))

    expect(response).toEqual({
      ok: true,
      data: {
        message: "Test route works!",
      },
    })
  })

  it("returns a validation response when the form input is blank", async () => {
    const response = await action(
      makeActionArgs(
        new Request("https://example.com/test", {
          method: "POST",
          body: new URLSearchParams({ inputValue: "" }),
        }),
      ),
    )

    expect(response).toBeInstanceOf(Response)
    if (!(response instanceof Response)) {
      throw new Error("Expected a Remix validation Response")
    }

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      ok: false,
      errors: ["Input value is required"],
    })
  })

  it("returns processed action data through withActionEffect", async () => {
    const response = await action(
      makeActionArgs(
        new Request("https://example.com/test", {
          method: "POST",
          body: new URLSearchParams({ inputValue: "Effectify" }),
        }),
      ),
    )

    expect(response).toEqual({
      ok: true,
      response: {
        message: "Received successfully!",
        inputValue: "Effectify",
      },
    })
  })
})
