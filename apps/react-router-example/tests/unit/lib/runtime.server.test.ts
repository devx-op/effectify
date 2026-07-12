import { Runtime } from "@effectify/react-router"
import { type ActionFunctionArgs, type LoaderFunctionArgs, RouterContextProvider } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { adapterConfigMock, authHandlerMock, prismaLayerMock } = vi.hoisted(
  () => {
    process.env.DATABASE_URL = "file:./runtime-contract.db"

    return {
      adapterConfigMock: vi.fn(),
      authHandlerMock: vi.fn(),
      prismaLayerMock: vi.fn(),
    }
  },
)

vi.mock("../../../app/lib/better-auth-options.server.js", () => ({
  authOptions: {
    baseURL: "http://localhost:4200",
    secret: "runtime-test-secret",
  },
}))

vi.mock("@effectify/node-better-auth", async () => {
  const Context = await import("effect/Context")
  const Layer = await import("effect/Layer")

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

vi.mock("../../../prisma/generated/effect/index.js", async () => {
  const Context = await import("effect/Context")
  const Layer = await import("effect/Layer")

  class MockPrismaService extends Context.Service<
    MockPrismaService,
    { readonly label: "prisma" }
  >()("Prisma") {}

  return {
    Prisma: Object.assign(MockPrismaService, {
      layer: (options: unknown) => {
        prismaLayerMock(options)
        return Layer.succeed(MockPrismaService, { label: "prisma" as const })
      },
    }),
  }
})

vi.mock("@prisma/adapter-better-sqlite3", () => ({
  PrismaBetterSqlite3: class PrismaBetterSqlite3 {
    constructor(options: unknown) {
      adapterConfigMock(options)
    }
  },
}))

import { action, loader } from "../../../app/routes/api.auth.js"
import { AppLayer, withActionEffect, withLoaderEffect } from "../../../app/lib/runtime.server.js"

const makeLoaderArgs = (request: Request): LoaderFunctionArgs => ({
  context: new RouterContextProvider(),
  params: {},
  pattern: "/api/auth",
  request,
  url: new URL(request.url),
})

const makeActionArgs = (request: Request): ActionFunctionArgs => ({
  context: new RouterContextProvider(),
  params: {},
  pattern: "/api/auth",
  request,
  url: new URL(request.url),
})

describe("runtime.server runtime contract", () => {
  beforeEach(() => {
    authHandlerMock.mockReset()
  })

  it("builds an AppLayer that Runtime.make accepts without Hatchet services", () => {
    const runtime = Runtime.make(AppLayer)

    expect(runtime.withLoaderEffect).toBeTypeOf("function")
    expect(runtime.withActionEffect).toBeTypeOf("function")
    expect(withLoaderEffect).toBeTypeOf("function")
    expect(withActionEffect).toBeTypeOf("function")
  })

  it("executes the auth loader through withLoaderEffect and preserves the response", async () => {
    authHandlerMock.mockResolvedValueOnce(
      new Response("loader ok", {
        headers: {
          "set-cookie": "session=loader",
          "x-runtime": "loader",
        },
        status: 200,
      }),
    )

    const request = new Request("https://example.com/api/auth")
    const response = await loader(makeLoaderArgs(request)).catch(
      (error) => error,
    )

    expect(response).toBeInstanceOf(Response)
    expect(response.status).toBe(200)
    expect(response.headers.get("set-cookie")).toBe("session=loader")
    expect(response.headers.get("x-runtime")).toBe("loader")
    expect(await response.text()).toBe("loader ok")
    expect(authHandlerMock).toHaveBeenCalledWith(request)
    expect(prismaLayerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        log: ["query", "info", "warn", "error"],
      }),
    )
    expect(adapterConfigMock).toHaveBeenCalledWith({
      url: "file:./runtime-contract.db",
    })
  })

  it("executes the auth action through withActionEffect", async () => {
    authHandlerMock.mockResolvedValueOnce(
      new Response("action ok", {
        headers: {
          "set-cookie": "session=action",
          "x-runtime": "action",
        },
        status: 201,
      }),
    )

    const request = new Request("https://example.com/api/auth", {
      body: new URLSearchParams({ intent: "sign-in" }),
      method: "POST",
    })
    const response = await action(makeActionArgs(request)).catch(
      (error) => error,
    )

    expect(response).toBeInstanceOf(Response)
    expect(response.status).toBe(201)
    expect(response.headers.get("set-cookie")).toBe("session=action")
    expect(response.headers.get("x-runtime")).toBe("action")
    expect(await response.text()).toBe("action ok")
    expect(authHandlerMock).toHaveBeenCalledWith(request)
  })
})
