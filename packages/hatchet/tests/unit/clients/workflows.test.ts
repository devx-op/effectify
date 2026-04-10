/**
 * @effectify/hatchet - Workflows Client Tests
 */

import { describe, expect, it, layer } from "@effect/vitest"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import {
  createWorkflow,
  type CreateWorkflowOpts,
  getWorkflow,
  listWorkflows,
  type ListWorkflowsOpts,
} from "../../../src/clients/workflows"
import { HatchetClientService } from "../../../src/core/client"
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

describe("Workflows Client - SDK compatibility", () => {
  const provideHatchet = (client: Record<string, unknown>) =>
    Effect.provide(
      Layer.mergeAll(
        TestHatchetConfigLayer,
        Layer.succeed(HatchetClientService, client as never),
      ),
    )

  it("getWorkflow uses the public workflows.get method", async () => {
    const workflow = await getWorkflow<{ metadata: { name: string } }>(
      "orders.process",
    ).pipe(
      provideHatchet({
        workflows: {
          get: async (name: unknown) => {
            expect(name).toBe("orders.process")
            return { metadata: { name } }
          },
        },
      }),
      Effect.runPromise,
    )

    expect(workflow).toEqual({ metadata: { name: "orders.process" } })
  })

  it("listWorkflows normalizes the SDK workflow list response", async () => {
    const workflows = await listWorkflows<{ name: string }>({
      limit: 2,
      offset: 1,
    }).pipe(
      provideHatchet({
        workflows: {
          list: async (options: unknown) => {
            expect(options).toEqual({ limit: 2, offset: 1 })
            return { workflows: [{ name: "orders.process" }] }
          },
        },
      }),
      Effect.runPromise,
    )

    expect(workflows).toEqual([{ name: "orders.process" }])
  })

  it("createWorkflow fails with a clear unsupported error because SDK 1.21 has no workflows.create", async () => {
    const exit = await createWorkflow(
      { name: "orders.process" },
      { name: "orders.process" },
    ).pipe(provideHatchet({}), Effect.runPromiseExit)

    expect(exit._tag).toBe("Failure")

    if (exit._tag === "Failure") {
      const error = Cause.squash(exit.cause) as HatchetWorkflowError
      expect(error).toBeInstanceOf(HatchetWorkflowError)
      expect(error).toMatchObject({
        _tag: "HatchetWorkflowError",
        workflowName: "orders.process",
      })
      expect(error.message).toContain("not supported")
    }
  })
})
