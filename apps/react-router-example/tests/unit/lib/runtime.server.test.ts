import { HatchetClientService } from "@effectify/hatchet"
import { Runtime } from "@effectify/react-router"
import * as Effect from "effect/Effect"
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { adapterConfigMock, authHandlerMock, hatchetInitMock, prismaLayerMock } = vi.hoisted(() => {
  process.env.DATABASE_URL = "file:./runtime-contract.db"
  process.env.HATCHET_HOST = "hatchet.example:7077"
  process.env.HATCHET_CLIENT_TOKEN = "runtime-client-token"
  delete process.env.HATCHET_TOKEN
  process.env.HATCHET_NAMESPACE = "runtime-namespace"

  return {
    adapterConfigMock: vi.fn(),
    authHandlerMock: vi.fn(),
    hatchetInitMock: vi.fn(),
    prismaLayerMock: vi.fn(),
  }
})

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

vi.mock("@effectify/hatchet", async () => {
  const Context = await import("effect/Context")
  const Effect = await import("effect/Effect")
  const Layer = await import("effect/Layer")

  class MockHatchetConfig extends Context.Service<
    MockHatchetConfig,
    {
      readonly host: string
      readonly token: string
      readonly namespace?: string
    }
  >()("HatchetConfig") {}

  class MockHatchetClientService extends Context.Service<
    MockHatchetClientService,
    {
      readonly initializedWith: {
        readonly host: string
        readonly token: string
        readonly namespace?: string
      }
    }
  >()("HatchetClient") {}

  return {
    HatchetConfig: MockHatchetConfig,
    HatchetConfigLayer: (config: {
      host: string
      token: string
      namespace?: string
    }) => Layer.succeed(MockHatchetConfig, config),
    HatchetClientService: MockHatchetClientService,
    HatchetClientLive: Layer.effect(MockHatchetClientService)(
      Effect.gen(function*() {
        const config = yield* MockHatchetConfig
        hatchetInitMock(config)
        return { initializedWith: config }
      }),
    ),
  }
})

vi.mock("../../../prisma/generated/effect/index.js", async () => {
  const Context = await import("effect/Context")
  const Layer = await import("effect/Layer")

  class MockPrismaService extends Context.Service<
    MockPrismaService,
    {
      readonly label: "prisma"
    }
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
  context: {},
  params: {},
  request,
  unstable_pattern: "/api/auth",
})

const makeActionArgs = (request: Request): ActionFunctionArgs => ({
  context: {},
  params: {},
  request,
  unstable_pattern: "/api/auth",
})

describe("runtime.server runtime contract", () => {
  beforeEach(() => {
    authHandlerMock.mockReset()
  })

  it("builds an AppLayer that Runtime.make accepts without casts", () => {
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

  it("executes the auth action through withActionEffect and initializes hatchet with env config", async () => {
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

    const hatchetResponse = await withLoaderEffect(
      Effect.gen(function*() {
        yield* HatchetClientService
        return new Response(JSON.stringify({ initialized: true }), {
          headers: { "content-type": "application/json" },
          status: 200,
        })
      }),
    )(makeLoaderArgs(new Request("https://example.com/hatchet"))).catch(
      (error) => error,
    )

    expect(hatchetResponse).toBeInstanceOf(Response)
    expect(await hatchetResponse.json()).toEqual({ initialized: true })
    expect(hatchetInitMock).toHaveBeenCalledWith({
      host: "hatchet.example:7077",
      namespace: "runtime-namespace",
      token: "runtime-client-token",
    })
  })
})
