/**
 * @effectify/hatchet - Effectifier Tests
 *
 * Unit tests for the effectifier module that converts Effect → Promise for Hatchet
 */

import { describe, expect, it, vi } from "vitest"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as ManagedRuntime from "effect/ManagedRuntime"
import * as ServiceMap from "effect/ServiceMap"
import type { Context as HatchetContext } from "@hatchet-dev/typescript-sdk"
import { HatchetStepContext } from "@effectify/hatchet"
import { createMockContext } from "@effectify/hatchet"
import {
  createEffectifierFromLayer,
  createEffectifierFromServiceMap,
  effectifyTask,
} from "../../src/effectifier/execute.js"

// Sample service for testing using ServiceMap pattern
class TestService extends ServiceMap.Service<TestService, string>()(
  "TestService",
) {}

// Layer that provides TestService
const TestServiceLayer = Layer.effect(
  TestService,
  Effect.succeed("test-service-value"),
)

// Effect that uses TestService
const effectWithService = Effect.gen(function*() {
  const service = yield* TestService
  return `service: ${service}`
})

// Effect that uses both TestService and HatchetStepContext
const effectWithServiceAndContext = Effect.gen(function*() {
  const service = yield* TestService
  const ctx = yield* HatchetStepContext
  return `service: ${service}, task: ${ctx.taskName()}`
})

describe("effectifyTask", () => {
  it("should execute Effect successfully and return value", async () => {
    // Create a simple effect that succeeds
    const simpleEffect = Effect.succeed("hello-world")

    // Create runtime with empty layer
    const runtime = ManagedRuntime.make(Layer.empty)

    // Create the effectified task function
    const taskFn = effectifyTask(simpleEffect, runtime)

    // Execute with mock context
    const mockCtx = createMockContext()
    const result = await taskFn({}, mockCtx)

    expect(result).toBe("hello-world")

    await runtime.dispose()
  })

  it("should pass HatchetContext as HatchetStepContext service", async () => {
    const effect = Effect.gen(function*() {
      const ctx = yield* HatchetStepContext
      return ctx.taskName()
    })

    const runtime = ManagedRuntime.make(Layer.empty)
    const taskFn = effectifyTask(effect, runtime)

    const mockCtx = createMockContext({ taskName: "my-custom-task" })
    const result = await taskFn({}, mockCtx)

    expect(result).toBe("my-custom-task")

    await runtime.dispose()
  })

  it("should inject service dependencies from runtime", async () => {
    const runtime = ManagedRuntime.make(TestServiceLayer)
    const taskFn = effectifyTask(effectWithService, runtime)

    const mockCtx = createMockContext()
    const result = await taskFn({}, mockCtx)

    expect(result).toBe("service: test-service-value")

    await runtime.dispose()
  })

  it("should work with both service and context", async () => {
    const runtime = ManagedRuntime.make(TestServiceLayer)
    const taskFn = effectifyTask(effectWithServiceAndContext, runtime)

    const mockCtx = createMockContext({ taskName: "context-task" })
    const result = await taskFn({}, mockCtx)

    expect(result).toBe("service: test-service-value, task: context-task")

    await runtime.dispose()
  })

  it("should throw error when Effect fails", async () => {
    const failingEffect = Effect.fail(new Error("task failed"))

    const runtime = ManagedRuntime.make(Layer.empty)
    const taskFn = effectifyTask(failingEffect, runtime)

    const mockCtx = createMockContext()

    await expect(taskFn({}, mockCtx)).rejects.toThrow("task failed")

    await runtime.dispose()
  })

  it("should throw non-Error failures as Error with string", async () => {
    const failingEffect = Effect.fail("string error")

    const runtime = ManagedRuntime.make(Layer.empty)
    const taskFn = effectifyTask(failingEffect, runtime)

    const mockCtx = createMockContext()

    // Should throw an Error with the string value
    await expect(taskFn({}, mockCtx)).rejects.toThrow("string error")

    await runtime.dispose()
  })

  it("should receive input from Hatchet", async () => {
    const effect = Effect.gen(function*() {
      const ctx = yield* HatchetStepContext
      return ctx.input as { value: string }
    })

    const runtime = ManagedRuntime.make(Layer.empty)
    const taskFn = effectifyTask(effect, runtime)

    const mockCtx = createMockContext({ input: { value: "test-input" } })
    const result = await taskFn({ value: "test-input" }, mockCtx)

    expect(result).toEqual({ value: "test-input" })

    await runtime.dispose()
  })

  it("should provide workflow name to effect", async () => {
    const effect = Effect.gen(function*() {
      const ctx = yield* HatchetStepContext
      return ctx.workflowName()
    })

    const runtime = ManagedRuntime.make(Layer.empty)
    const taskFn = effectifyTask(effect, runtime)

    const mockCtx = createMockContext({ workflowName: "my-workflow" })
    const result = await taskFn({}, mockCtx)

    expect(result).toBe("my-workflow")

    await runtime.dispose()
  })

  it("should provide workflow run ID to effect", async () => {
    const effect = Effect.gen(function*() {
      const ctx = yield* HatchetStepContext
      return ctx.workflowRunId()
    })

    const runtime = ManagedRuntime.make(Layer.empty)
    const taskFn = effectifyTask(effect, runtime)

    const mockCtx = createMockContext({ workflowRunId: "run-123" })
    const result = await taskFn({}, mockCtx)

    expect(result).toBe("run-123")

    await runtime.dispose()
  })

  it("should handle retry count from context", async () => {
    const effect = Effect.gen(function*() {
      const ctx = yield* HatchetStepContext
      return ctx.retryCount()
    })

    const runtime = ManagedRuntime.make(Layer.empty)
    const taskFn = effectifyTask(effect, runtime)

    const mockCtx = createMockContext({ retryCount: 3 })
    const result = await taskFn({}, mockCtx)

    expect(result).toBe(3)

    await runtime.dispose()
  })

  it("should propagate typed errors from Effect", async () => {
    class CustomError extends Error {
      readonly _tag = "CustomError"
      constructor(message: string) {
        super(message)
        this.name = "CustomError"
      }
    }

    const failingEffect = Effect.fail(new CustomError("custom error"))

    const runtime = ManagedRuntime.make(Layer.empty)
    const taskFn = effectifyTask(failingEffect, runtime)

    const mockCtx = createMockContext()

    // Should throw the original error
    await expect(taskFn({}, mockCtx)).rejects.toThrow("custom error")

    await runtime.dispose()
  })
})

describe("createEffectifierFromLayer", () => {
  it("should create effectifier from Layer", async () => {
    const effectify = createEffectifierFromLayer(TestServiceLayer)

    const taskFn = effectify(effectWithService)

    const mockCtx = createMockContext()
    const result = await taskFn({}, mockCtx)

    expect(result).toBe("service: test-service-value")
  })

  it("should return a function that can be called multiple times", async () => {
    const effectify = createEffectifierFromLayer(TestServiceLayer)

    const taskFn1 = effectify(Effect.succeed("result-1"))
    const taskFn2 = effectify(Effect.succeed("result-2"))

    const mockCtx = createMockContext()

    const result1 = await taskFn1({}, mockCtx)
    const result2 = await taskFn2({}, mockCtx)

    expect(result1).toBe("result-1")
    expect(result2).toBe("result-2")
  })

  it("should preserve context in created function", async () => {
    const effect = Effect.gen(function*() {
      const ctx = yield* HatchetStepContext
      return ctx.taskName()
    })

    const effectify = createEffectifierFromLayer(Layer.empty)
    const taskFn = effectify(effect)

    const mockCtx = createMockContext({ taskName: "layer-task" })
    const result = await taskFn({}, mockCtx)

    expect(result).toBe("layer-task")
  })
})

describe("createEffectifierFromServiceMap", () => {
  it("should create effectifier from ServiceMap (Layer)", async () => {
    const services = Layer.succeed(TestService, "from-service-map")

    const effect = Effect.gen(function*() {
      const service = yield* TestService
      return service
    })

    const effectify = createEffectifierFromServiceMap(services)
    const taskFn = effectify(effect)

    const mockCtx = createMockContext()
    const result = await taskFn({}, mockCtx)

    expect(result).toBe("from-service-map")
  })

  it("should behave the same as createEffectifierFromLayer", async () => {
    const effect = Effect.succeed("test")

    const effectify1 = createEffectifierFromLayer(Layer.empty)
    const effectify2 = createEffectifierFromServiceMap(Layer.empty)

    const mockCtx = createMockContext()

    const result1 = await effectify1(effect)({}, mockCtx)
    const result2 = await effectify2(effect)({}, mockCtx)

    expect(result1).toBe(result2)
  })
})

describe("Effect with complex error handling", () => {
  it("should handle Effect that catches and transforms errors", async () => {
    const effect = Effect.gen(function*() {
      const result = yield* Effect.tryPromise({
        try: async () => {
          throw new Error("async error")
        },
        catch: (error) => new Error(`caught: ${error}`),
      })
      return result
    })

    const runtime = ManagedRuntime.make(Layer.empty)
    const taskFn = effectifyTask(effect, runtime)

    const mockCtx = createMockContext()

    await expect(taskFn({}, mockCtx)).rejects.toThrow(
      "caught: Error: async error",
    )

    await runtime.dispose()
  })

  it("should handle Effect with flatMap/pipe", async () => {
    const effect = Effect.succeed(5).pipe(
      Effect.flatMap((n) => Effect.succeed(n * 2)),
      Effect.map((n) => `result: ${n}`),
    )

    const runtime = ManagedRuntime.make(Layer.empty)
    const taskFn = effectifyTask(effect, runtime)

    const mockCtx = createMockContext()
    const result = await taskFn({}, mockCtx)

    expect(result).toBe("result: 10")

    await runtime.dispose()
  })

  it("should handle async Effect with delay", async () => {
    const effect = Effect.gen(function*() {
      yield* Effect.sleep(10)
      return "delayed-result"
    })

    const runtime = ManagedRuntime.make(Layer.empty)
    const taskFn = effectifyTask(effect, runtime)

    const mockCtx = createMockContext()
    const result = await taskFn({}, mockCtx)

    expect(result).toBe("delayed-result")

    await runtime.dispose()
  })
})

describe("Context access patterns", () => {
  it("should allow accessing all context methods", async () => {
    const effect = Effect.gen(function*() {
      const ctx = yield* HatchetStepContext
      return {
        taskName: ctx.taskName(),
        workflowName: ctx.workflowName(),
        workflowRunId: ctx.workflowRunId(),
        retryCount: ctx.retryCount(),
        input: ctx.input,
      }
    })

    const runtime = ManagedRuntime.make(Layer.empty)
    const taskFn = effectifyTask(effect, runtime)

    const mockCtx = createMockContext({
      taskName: "test-task",
      workflowName: "test-workflow",
      workflowRunId: "run-abc",
      retryCount: 2,
      input: { key: "value" },
    })

    const result = await taskFn({}, mockCtx)

    expect(result).toEqual({
      taskName: "test-task",
      workflowName: "test-workflow",
      workflowRunId: "run-abc",
      retryCount: 2,
      input: { key: "value" },
    })

    await runtime.dispose()
  })

  it("should work with complex Effect patterns for context access", async () => {
    // Using Effect.gen with yield* to access context - standard pattern
    const effect = Effect.gen(function*() {
      const ctx = yield* HatchetStepContext
      return ctx.taskName()
    })

    const runtime = ManagedRuntime.make(Layer.empty)
    const taskFn = effectifyTask(effect, runtime)

    const mockCtx = createMockContext({ taskName: "request-task" })
    const result = await taskFn({}, mockCtx)

    expect(result).toBe("request-task")

    await runtime.dispose()
  })
})
