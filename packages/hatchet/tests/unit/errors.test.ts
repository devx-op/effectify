/**
 * @effectify/hatchet - Error Tests
 */

import { describe, expect, it } from "vitest"
import * as Effect from "effect/Effect"
import * as Data from "effect/Data"
import {
  HatchetContextError,
  HatchetError,
  HatchetExecutionError,
  HatchetInitError,
  HatchetWorkerError,
} from "@effectify/hatchet"

describe("HatchetError", () => {
  it("should create a basic error", () => {
    const error = new HatchetError({ message: "Something went wrong" })
    expect(error.message).toBe("Something went wrong")
  })

  it("should create error with cause", () => {
    const cause = new Error("Original error")
    const error = new HatchetError({ message: "Failed", cause })
    expect(error.cause).toBe(cause)
  })

  it("should be a Data.TaggedError", () => {
    const error = new HatchetError({ message: "Test" })
    expect(error._tag).toBe("HatchetError")
  })
})

describe("HatchetInitError", () => {
  it("should create initialization error", () => {
    const error = new HatchetInitError({ message: "Failed to initialize" })
    expect(error.message).toBe("Failed to initialize")
    expect(error._tag).toBe("HatchetInitError")
  })
})

describe("HatchetExecutionError", () => {
  it("should create execution error", () => {
    const error = new HatchetExecutionError({ message: "Execution failed" })
    expect(error.message).toBe("Execution failed")
    expect(error._tag).toBe("HatchetExecutionError")
  })
})

describe("HatchetWorkerError", () => {
  it("should create worker error", () => {
    const error = new HatchetWorkerError({ message: "Worker failed" })
    expect(error.message).toBe("Worker failed")
    expect(error._tag).toBe("HatchetWorkerError")
  })
})

describe("HatchetContextError", () => {
  it("should create context error", () => {
    const error = new HatchetContextError({
      message: "Context error",
      operation: "input",
    })
    expect(error.message).toBe("Context error")
    expect(error._tag).toBe("HatchetContextError")
  })
})

describe("Error yielding in Effects", () => {
  it("should yield HatchetError directly", async () => {
    const effect = Effect.gen(function*() {
      yield* new HatchetError({ message: "Error in effect" })
    })

    const exit = await Effect.runPromiseExit(effect)
    expect(exit._tag).toBe("Failure")
  })

  it("should yield specific error types", async () => {
    const effect = Effect.gen(function*() {
      yield* new HatchetExecutionError({ message: "Task failed" })
    })

    const exit = await Effect.runPromiseExit(effect)
    expect(exit._tag).toBe("Failure")
  })
})
