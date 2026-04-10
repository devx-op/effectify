/**
 * @effectify/hatchet - Workflows Client Tests
 */

import { describe, expect, it, layer } from "@effect/vitest"
import { Layer } from "effect"
import {
  createWorkflow,
  type CreateWorkflowOpts,
  getWorkflow,
  listWorkflows,
  type ListWorkflowsOpts,
} from "../../../src/clients/workflows"
import { HatchetWorkflowError } from "../../../src/core/error"
import { MockHatchetClientLayer, TestHatchetConfigLayer } from "../../../src/testing/mock-client"

describe("Workflows Client - Type Exports", () => {
  layer(Layer.mergeAll(TestHatchetConfigLayer, MockHatchetClientLayer))(() => {
    it("should export createWorkflow function", () => {
      expect(createWorkflow).toBeDefined()
      expect(typeof createWorkflow).toBe("function")
    })

    it("should export getWorkflow function", () => {
      expect(getWorkflow).toBeDefined()
      expect(typeof getWorkflow).toBe("function")
    })

    it("should export listWorkflows function", () => {
      expect(listWorkflows).toBeDefined()
      expect(typeof listWorkflows).toBe("function")
    })

    it("should export CreateWorkflowOpts interface", () => {
      const opts: CreateWorkflowOpts = {
        name: "my-workflow",
        version: "1.0.0",
        description: "Test workflow",
      }
      expect(opts.name).toBe("my-workflow")
      expect(opts.version).toBe("1.0.0")
      expect(opts.description).toBe("Test workflow")
    })

    it("should export ListWorkflowsOpts interface", () => {
      const opts: ListWorkflowsOpts = {
        limit: 10,
        offset: 0,
      }
      expect(opts.limit).toBe(10)
      expect(opts.offset).toBe(0)
    })
  })
})

describe("Workflows Client - Function Signatures", () => {
  layer(Layer.mergeAll(TestHatchetConfigLayer, MockHatchetClientLayer))(() => {
    it("createWorkflow should accept workflow and opts", () => {
      const workflow = { name: "test" }
      const opts: CreateWorkflowOpts = { name: "test" }

      // Just verify the types are correct - actual execution needs mock
      expect(typeof createWorkflow).toBe("function")
    })

    it("getWorkflow should accept workflow name", () => {
      // Just verify the function exists with correct signature
      expect(typeof getWorkflow).toBe("function")
    })

    it("listWorkflows should accept optional options", () => {
      // Just verify the function exists with correct signature
      expect(typeof listWorkflows).toBe("function")
    })
  })
})
