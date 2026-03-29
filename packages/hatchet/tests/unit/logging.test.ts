/**
 * @effectify/hatchet - Logging Tests
 */

import { describe, expect, it, vi } from "vitest"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { createHatchetLogger, HatchetLogger, makeHatchetLogger, withHatchetLogger } from "@effectify/hatchet"
import { createMockContext, testTask } from "@effectify/hatchet"
import { HatchetStepContext } from "@effectify/hatchet"

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
})
