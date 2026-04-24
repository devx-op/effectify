/**
 * @effectify/hatchet - Logging Tests
 */

import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Logger from "effect/Logger"
import * as TestConsole from "effect/testing/TestConsole"
import { afterEach, describe, expect, it, vi } from "vitest"
import {
  createHatchetLogger,
  createMockContext,
  HatchetLogger,
  HatchetStepContext,
  makeHatchetLogger,
  withHatchetLogger,
} from "@effectify/hatchet"

const runWithLogger = async <A, E, R>(
  effect: Effect.Effect<A, E, R>,
  logger: Logger.Logger<unknown, void>,
  extraLayer: Layer.Layer.Any = Layer.empty,
) => {
  const services = await Effect.scoped(
    Layer.build(Layer.mergeAll(Logger.layer([logger]), extraLayer)),
  ).pipe(Effect.runPromise)

  return effect.pipe(Effect.provideServices(services), Effect.runPromise)
}

const runWithLoggerCaptureConsole = async <E, R>(
  effect: Effect.Effect<unknown, E, R>,
  logger: Logger.Logger<unknown, void>,
  extraLayer: Layer.Layer.Any = Layer.empty,
) =>
  Effect.gen(function*() {
    yield* effect
    return yield* TestConsole.logLines
  }).pipe(
    Effect.provide(
      Layer.mergeAll(Logger.layer([logger]), TestConsole.layer, extraLayer),
    ),
    Effect.runPromise,
  )

afterEach(() => {
  vi.restoreAllMocks()
})

describe("HatchetLogger", () => {
  it("should be defined", () => {
    expect(HatchetLogger).toBeDefined()
  })
})

describe("makeHatchetLogger", () => {
  it("should create a logger instance", () => {
    const logger = makeHatchetLogger()
    expect(logger).toBeDefined()
  })

  it("forwards log messages to Hatchet when step context is available", async () => {
    const ctxLog = vi.fn()
    const logger = makeHatchetLogger()

    await runWithLogger(
      Effect.log("sync order"),
      logger,
      Layer.succeed(HatchetStepContext, {
        ...createMockContext(),
        log: ctxLog,
      } as never),
    )

    expect(ctxLog).toHaveBeenCalledWith("[Info] sync order")
  })

  it("falls back to console when no Hatchet step context exists", async () => {
    const logger = makeHatchetLogger()

    const logs = await runWithLoggerCaptureConsole(
      Effect.log("sync order"),
      logger,
    )

    expect(logs).toContain("[Info] sync order")
  })

  it("falls back to console when Hatchet logging throws", async () => {
    const logger = makeHatchetLogger()

    const logs = await runWithLoggerCaptureConsole(
      Effect.log("sync order"),
      logger,
      Layer.succeed(HatchetStepContext, {
        ...createMockContext(),
        log: () => {
          throw new Error("Hatchet UI offline")
        },
      } as never),
    )

    expect(logs).toContain("[Info] sync order")
  })
})

describe("withHatchetLogger", () => {
  it("should wrap an effect with the Hatchet logger", () => {
    const effect = Effect.succeed("test")
    const wrapped = withHatchetLogger(effect)
    expect(wrapped).toBeDefined()
  })

  it("should preserve the effect result", async () => {
    const effect = withHatchetLogger(Effect.succeed("hello"))
    const result = await Effect.runPromise(effect)
    expect(result).toBe("hello")
  })

  it("should work with Effect.gen", async () => {
    const effect = withHatchetLogger(
      Effect.gen(function*() {
        return yield* Effect.succeed("world")
      }),
    )
    const result = await Effect.runPromise(effect)
    expect(result).toBe("world")
  })

  it("should propagate failures", async () => {
    const error = new Error("test error")
    const effect = withHatchetLogger(Effect.fail(error))
    const exit = await Effect.runPromiseExit(effect)
    expect(exit._tag).toBe("Failure")
  })
})

describe("createHatchetLogger", () => {
  it("should create logger with default options", () => {
    const logger = createHatchetLogger()
    expect(logger).toBeDefined()
  })

  it("should create logger with custom format", () => {
    const formatFn = vi.fn((level, msg) => `[${level.toUpperCase()}] ${msg}`)
    const logger = createHatchetLogger({ format: formatFn })
    expect(logger).toBeDefined()
  })

  it("should create logger without console output", () => {
    const logger = createHatchetLogger({ console: false })
    expect(logger).toBeDefined()
  })

  it("applies the custom formatter to emitted messages", async () => {
    const logger = createHatchetLogger({
      format: (level, message) => `${level.toUpperCase()} :: ${message}`,
    })

    const logs = await runWithLoggerCaptureConsole(
      Effect.log("sync order"),
      logger,
    )

    expect(logs).toContain("INFO :: sync order")
  })

  it("silences console output when console=false and no Hatchet context exists", async () => {
    const logger = createHatchetLogger({ console: false })

    const logs = await runWithLoggerCaptureConsole(
      Effect.log("sync order"),
      logger,
    )

    expect(logs).toEqual([])
  })
})
