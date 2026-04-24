import * as Cause from "effect/Cause"
import * as Config from "effect/Config"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Logger from "effect/Logger"
import { beforeEach, describe, expect, it, vi } from "vitest"

const initMock = vi.hoisted(() => vi.fn())

vi.mock("@hatchet-dev/typescript-sdk", () => ({
  Hatchet: {
    init: initMock,
  },
}))

describe("Hatchet client bootstrap and config", () => {
  beforeEach(() => {
    initMock.mockReset()
  })

  it("initializes the SDK client from config and logs the successful bootstrap", async () => {
    const logEntries: Array<{
      level: string
      message: ReadonlyArray<unknown>
    }> = []
    const captureLogger = Logger.make<unknown, void>(
      ({ logLevel, message }) => {
        logEntries.push({
          level: String(logLevel),
          message: Array.isArray(message) ? message : [message],
        })
      },
    )
    const sdkClient = { tenantId: "tenant-1" }
    initMock.mockReturnValue(sdkClient)

    const { HatchetClientLive, HatchetClientService } = await import("../../src/core/client.js")
    const { HatchetConfigLayer } = await import("../../src/core/config.js")

    const client = await Effect.service(HatchetClientService).pipe(
      Effect.provide(
        Layer.provide(
          HatchetClientLive,
          Layer.mergeAll(
            HatchetConfigLayer({
              host: "https://hatchet.internal",
              token: "token-123",
              namespace: "demo",
            }),
            Logger.layer([captureLogger]),
          ),
        ),
      ),
      Effect.runPromise,
    )

    expect(initMock).toHaveBeenCalledWith({
      token: "token-123",
      host_port: "https://hatchet.internal",
    })
    expect(client).toBe(sdkClient)
    expect(logEntries).toContainEqual({
      level: "Info",
      message: [
        "[Hatchet] Initializing with host:",
        "https://hatchet.internal",
      ],
    })
    expect(logEntries).toContainEqual({
      level: "Info",
      message: ["[Hatchet] Token present:", true],
    })
    expect(logEntries).toContainEqual({
      level: "Info",
      message: ["[Hatchet] Client initialized successfully!"],
    })
  })

  it("propagates SDK init failures through the Effect exit", async () => {
    const sdkError = new Error("invalid token")
    initMock.mockImplementation(() => {
      throw sdkError
    })

    const { HatchetClientLive, HatchetClientService } = await import("../../src/core/client.js")
    const { HatchetConfigLayer } = await import("../../src/core/config.js")

    const exit = await Effect.service(HatchetClientService).pipe(
      Effect.provide(
        Layer.provide(
          HatchetClientLive,
          HatchetConfigLayer({
            host: "https://hatchet.internal",
            token: "bad-token",
            namespace: undefined,
          }),
        ),
      ),
      Effect.runPromiseExit,
    )

    expect(exit._tag).toBe("Failure")

    if (exit._tag === "Failure") {
      expect(Cause.squash(exit.cause)).toBe(sdkError)
    }
  })

  it("getHatchetClient reads the client from context", async () => {
    const { getHatchetClient, HatchetClientService } = await import("../../src/core/client.js")
    const sdkClient = { tenantId: "tenant-1" }

    const result = await getHatchetClient().pipe(
      Effect.provideService(HatchetClientService, sdkClient as never),
      Effect.runPromise,
    )

    expect(result).toBe(sdkClient)
  })

  it("applies default host values when the wrapped config omits host", async () => {
    const { HatchetConfig, HatchetConfigLayerFromEnv } = await import("../../src/core/config.js")

    const config = await Effect.service(HatchetConfig).pipe(
      Effect.provide(
        HatchetConfigLayerFromEnv({
          host: Config.succeed(undefined),
          token: Config.succeed("token-123"),
          namespace: Config.succeed(undefined),
        }),
      ),
      Effect.runPromise,
    )

    expect(config).toEqual({
      host: "http://localhost:8080",
      token: "token-123",
      namespace: undefined,
    })
  })

  it("unwraps wrapped config values into the provided Hatchet config service", async () => {
    const { HatchetConfig, HatchetConfigLayerFromEnv } = await import("../../src/core/config.js")

    const config = await Effect.service(HatchetConfig).pipe(
      Effect.provide(
        HatchetConfigLayerFromEnv({
          host: Config.succeed("https://hatchet.internal"),
          token: Config.succeed("token-123"),
          namespace: Config.succeed("ops"),
        }),
      ),
      Effect.runPromise,
    )

    expect(config).toEqual({
      host: "https://hatchet.internal",
      token: "token-123",
      namespace: "ops",
    })
  })
})
