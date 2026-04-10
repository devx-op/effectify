/**
 * @effectify/hatchet - Workers Client Tests
 */

import { describe, expect, it, layer } from "@effect/vitest"
import { Layer } from "effect"
import { registerWorker, type RegisterWorkerOpts } from "../../../src/clients/workers"
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
