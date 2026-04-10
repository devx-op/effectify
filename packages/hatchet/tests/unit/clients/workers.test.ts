/**
 * @effectify/hatchet - Workers Client Tests
 */

import { describe, expect, it, layer } from "@effect/vitest"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { vi } from "vitest"
import { registerWorker, type RegisterWorkerOpts } from "../../../src/clients/workers"
import { HatchetClientService } from "../../../src/core/client"
import { HatchetWorkerError } from "../../../src/core/error"
import { MockHatchetClientLayer, TestHatchetConfigLayer } from "../../../src/testing/mock-client"

describe("Workers Client - Type Exports", () => {
  layer(Layer.mergeAll(TestHatchetConfigLayer, MockHatchetClientLayer))(() => {
    it("should export registerWorker function", () => {
      expect(registerWorker).toBeDefined()
      expect(typeof registerWorker).toBe("function")
    })

    it("should export RegisterWorkerOpts interface", () => {
      const opts: RegisterWorkerOpts = {
        maxConcurrent: 5,
        maxWorkflows: 10,
        timeout: "30s",
      }
      expect(opts.maxConcurrent).toBe(5)
      expect(opts.maxWorkflows).toBe(10)
      expect(opts.timeout).toBe("30s")
    })

    it("should allow undefined options", () => {
      const opts: RegisterWorkerOpts | undefined = undefined
      expect(opts).toBeUndefined()
    })
  })
})

describe("Workers Client - Function Signatures", () => {
  layer(Layer.mergeAll(TestHatchetConfigLayer, MockHatchetClientLayer))(() => {
    it("registerWorker should accept name, workflows, and opts", () => {
      const name = "my-worker"
      const workflows = [{ name: "workflow-1" }]
      const opts: RegisterWorkerOpts = { maxConcurrent: 3 }

      // Just verify the types are correct - actual execution needs mock
      expect(typeof registerWorker).toBe("function")
    })
  })
})

describe("HatchetWorkerError", () => {
  layer(Layer.mergeAll(TestHatchetConfigLayer, MockHatchetClientLayer))(() => {
    it("should create error with worker name", () => {
      const error = HatchetWorkerError.of(
        "Worker registration failed",
        "my-worker",
      )
      expect(error.message).toBe("Worker registration failed")
      expect(error.workerName).toBe("my-worker")
    })

    it("should create error with cause", () => {
      const cause = new Error("Original error")
      const error = HatchetWorkerError.of("Worker failed", "my-worker", cause)
      expect(error.cause).toBe(cause)
    })
  })
})

describe("Workers Client - SDK compatibility", () => {
  const provideHatchet = (client: Record<string, unknown>) =>
    Effect.provide(
      Layer.mergeAll(
        TestHatchetConfigLayer,
        Layer.succeed(HatchetClientService, client as never),
      ),
    )

  it("registerWorker creates a worker via client.worker and registers workflows", async () => {
    const registerWorkflows = vi.fn(async () => undefined)
    const start = vi.fn(async () => undefined)

    const worker = await registerWorker(
      "orders-worker",
      [{ name: "orders.process" }],
      {
        maxConcurrent: 5,
      },
    ).pipe(
      provideHatchet({
        worker: async (name: unknown, options?: unknown) => {
          expect(name).toBe("orders-worker")
          expect(options).toEqual({ slots: 5 })
          return {
            registerWorkflows,
            start,
          }
        },
      }),
      Effect.runPromise,
    )

    expect(registerWorkflows).toHaveBeenCalledWith([
      { name: "orders.process" },
    ])
    expect(start).toHaveBeenCalled()
    expect(worker).toMatchObject({ registerWorkflows, start })
  })

  it("registerWorker wraps SDK worker creation failures with HatchetWorkerError", async () => {
    const cause = new Error("worker unavailable")

    const exit = await registerWorker("orders-worker", []).pipe(
      provideHatchet({
        worker: async () => {
          throw cause
        },
      }),
      Effect.runPromiseExit,
    )

    expect(exit._tag).toBe("Failure")

    if (exit._tag === "Failure") {
      const error = Cause.squash(exit.cause) as HatchetWorkerError
      expect(error).toBeInstanceOf(HatchetWorkerError)
      expect(error).toMatchObject({
        _tag: "HatchetWorkerError",
        workerName: "orders-worker",
      })
      expect(error.cause).toBe(cause)
    }
  })
})
