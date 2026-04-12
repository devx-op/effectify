/**
 * @effectify/hatchet - Error Tests
 */

import { describe, expect, it } from "vitest"
import * as Effect from "effect/Effect"
import * as Data from "effect/Data"
import {
  HatchetContextError,
  HatchetError,
  HatchetEventError,
  HatchetExecutionError,
  HatchetInitError,
  HatchetObservabilityError,
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

describe("HatchetEventError", () => {
  it("should create event errors with key context", () => {
    const cause = new Error("publish failed")
    const error = new HatchetEventError({
      message: 'Failed to push event "user.created"',
      key: "user.created",
      cause,
    })

    expect(error.message).toBe('Failed to push event "user.created"')
    expect(error.key).toBe("user.created")
    expect(error.cause).toBe(cause)
    expect(error._tag).toBe("HatchetEventError")
  })

  it("should create event errors with event id context", () => {
    const error = new HatchetEventError({
      message: 'Failed to get event "event-123"',
      eventId: "event-123",
    })

    expect(error.message).toContain("event-123")
    expect(error.eventId).toBe("event-123")
    expect(error.key).toBeUndefined()
  })
})

describe("HatchetObservabilityError", () => {
  it("should create observability errors with endpoint and task context", () => {
    const cause = new Error("grpc unavailable")
    const error = new HatchetObservabilityError({
      message: 'Failed to list task logs for "task-123"',
      operation: "logs",
      endpoint: "api.v1LogLineList",
      taskId: "task-123",
      cause,
    })

    expect(error.message).toContain("task-123")
    expect(error.operation).toBe("logs")
    expect(error.endpoint).toBe("api.v1LogLineList")
    expect(error.taskId).toBe("task-123")
    expect(error.cause).toBe(cause)
    expect(error._tag).toBe("HatchetObservabilityError")
  })

  it("should create observability errors with tenant context", () => {
    const error = new HatchetObservabilityError({
      message: 'Failed to read tenant metrics for "tenant-123"',
      operation: "metrics",
      endpoint: "api.tenantGetQueueMetrics",
      tenantId: "tenant-123",
    })

    expect(error.operation).toBe("metrics")
    expect(error.tenantId).toBe("tenant-123")
    expect(error.taskId).toBeUndefined()
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
