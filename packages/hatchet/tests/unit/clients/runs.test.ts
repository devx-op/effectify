/**
 * @effectify/hatchet - Runs Client Tests
 */

import { describe, expect, it, layer } from "@effect/vitest"
import { Effect, Layer } from "effect"
import {
  cancelRun,
  getRun,
  getRunStatus,
  listRuns,
  type ListRunsOpts,
  type RunOpts,
  runWorkflow,
  runWorkflowNoWait,
} from "../../../src/clients/runs"
import { HatchetRunError, HatchetWorkflowError } from "../../../src/core/error"
import { MockHatchetClientLayer, TestHatchetConfigLayer } from "../../../src/testing/mock-client"

describe("Runs Client - Type Exports", () => {
  layer(Layer.mergeAll(TestHatchetConfigLayer, MockHatchetClientLayer))(() => {
    it("should export runWorkflow function", () => {
      expect(runWorkflow).toBeDefined()
      expect(typeof runWorkflow).toBe("function")
    })

    it("should export runWorkflowNoWait function", () => {
      expect(runWorkflowNoWait).toBeDefined()
      expect(typeof runWorkflowNoWait).toBe("function")
    })

    it("should export cancelRun function", () => {
      expect(cancelRun).toBeDefined()
      expect(typeof cancelRun).toBe("function")
    })

    it("should export getRun function", () => {
      expect(getRun).toBeDefined()
      expect(typeof getRun).toBe("function")
    })

    it("should export getRunStatus function", () => {
      expect(getRunStatus).toBeDefined()
      expect(typeof getRunStatus).toBe("function")
    })

    it("should export listRuns function", () => {
      expect(listRuns).toBeDefined()
      expect(typeof listRuns).toBe("function")
    })

    it("should export RunOpts interface", () => {
      const opts: RunOpts = {
        additionalMetadata: { source: "test" },
        priority: 1,
      }
      expect(opts.additionalMetadata).toBeDefined()
      expect(opts.priority).toBe(1)
    })

    it("should export ListRunsOpts interface", () => {
      const opts: ListRunsOpts = {
        workflowName: "test-workflow",
        status: "COMPLETED",
        limit: 10,
        offset: 0,
      }
      expect(opts.workflowName).toBe("test-workflow")
      expect(opts.status).toBe("COMPLETED")
    })
  })
})

describe("HatchetRunError", () => {
  layer(Layer.mergeAll(TestHatchetConfigLayer, MockHatchetClientLayer))(() => {
    it("should create error with workflow", () => {
      const error = HatchetRunError.of("Workflow failed", "my-workflow")
      expect(error.message).toBe("Workflow failed")
      expect(error.workflow).toBe("my-workflow")
    })

    it("should create error with runId", () => {
      const error = HatchetRunError.of("Run failed", undefined, "run-123")
      expect(error.message).toBe("Run failed")
      expect(error.runId).toBe("run-123")
    })

    it("should create error with cause", () => {
      const cause = new Error("Original error")
      const error = HatchetRunError.of(
        "Workflow failed",
        "my-workflow",
        undefined,
        cause,
      )
      expect(error.cause).toBe(cause)
    })
  })
})

describe("HatchetWorkflowError", () => {
  layer(Layer.mergeAll(TestHatchetConfigLayer, MockHatchetClientLayer))(() => {
    it("should create error with workflow name", () => {
      const error = HatchetWorkflowError.of(
        "Workflow operation failed",
        "my-workflow",
      )
      expect(error.message).toBe("Workflow operation failed")
      expect(error.workflowName).toBe("my-workflow")
    })

    it("should create error without workflow name", () => {
      const error = HatchetWorkflowError.of("List failed")
      expect(error.message).toBe("List failed")
      expect(error.workflowName).toBeUndefined()
    })
  })
})
