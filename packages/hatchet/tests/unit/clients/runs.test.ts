/**
 * @effectify/hatchet - Runs Client Tests
 */

import { describe, expect, it, layer } from "@effect/vitest"
import * as Cause from "effect/Cause"
import { Effect, Layer } from "effect"
import {
  cancelRun,
  getRun,
  getRunStatus,
  getRunTaskId,
  listRuns,
  type ListRunsOpts,
  type RunOpts,
  runWorkflow,
  runWorkflowNoWait,
} from "../../../src/clients/runs"
import { HatchetClientService } from "../../../src/core/client"
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

describe("Runs Client - SDK compatibility", () => {
  const provideHatchet = (client: Record<string, unknown>) =>
    Effect.provide(
      Layer.mergeAll(
        TestHatchetConfigLayer,
        Layer.succeed(HatchetClientService, client as never),
      ),
    )

  it("runWorkflowNoWait uses client.runNoWait from the public SDK surface", async () => {
    const input = { orderId: "order-1" }
    const runRef = { workflowRunId: "run-123" }

    const result = await runWorkflowNoWait<typeof input, typeof runRef>(
      "orders.process",
      input,
      { priority: 2 },
    ).pipe(
      provideHatchet({
        runNoWait: async (
          workflow: string,
          providedInput: unknown,
          options?: unknown,
        ) => {
          expect(workflow).toBe("orders.process")
          expect(providedInput).toEqual(input)
          expect(options).toEqual({ priority: 2 })
          return runRef
        },
      }),
      Effect.runPromise,
    )

    expect(result).toEqual(runRef)
  })

  it("cancelRun forwards the run id through runs.cancel({ ids })", async () => {
    await cancelRun("run-456").pipe(
      provideHatchet({
        runs: {
          cancel: async (options: unknown) => {
            expect(options).toEqual({ ids: ["run-456"] })
            return { data: { cancelled: 1 } }
          },
        },
      }),
      Effect.runPromise,
    )
  })

  it("getRunStatus uses runs.get_status instead of reading status from getRun details", async () => {
    const status = await getRunStatus("run-789").pipe(
      provideHatchet({
        runs: {
          get_status: async (runId: unknown) => {
            expect(runId).toBe("run-789")
            return "COMPLETED"
          },
        },
      }),
      Effect.runPromise,
    )

    expect(status).toBe("COMPLETED")
  })

  it("getRunTaskId resolves task external ids from workflow run ids for task log lookups", async () => {
    const taskId = await getRunTaskId("run-789").pipe(
      provideHatchet({
        runs: {
          getTaskExternalId: async (runId: unknown) => {
            expect(runId).toBe("run-789")
            return "task-789"
          },
        },
      }),
      Effect.runPromise,
    )

    expect(taskId).toBe("task-789")
  })

  it("listRuns maps wrapper filters to the SDK list API and normalizes rows", async () => {
    const result = await listRuns<{ metadata: { status: string } }>({
      workflowName: "orders.process",
      status: "FAILED",
      limit: 5,
      offset: 10,
    }).pipe(
      provideHatchet({
        runs: {
          list: async (options: unknown) => {
            expect(options).toEqual({
              workflowNames: ["orders.process"],
              statuses: ["FAILED"],
              limit: 5,
              offset: 10,
              onlyTasks: false,
            })

            return {
              rows: [{ metadata: { status: "FAILED" } }],
            }
          },
        },
      }),
      Effect.runPromise,
    )

    expect(result).toEqual([{ metadata: { status: "FAILED" } }])
  })

  it("wraps typed SDK run errors with HatchetRunError context", async () => {
    const cause = new Error("runNoWait unavailable")

    const exit = await runWorkflowNoWait("orders.process", {
      orderId: "1",
    }).pipe(
      provideHatchet({
        runNoWait: async () => {
          throw cause
        },
      }),
      Effect.runPromiseExit,
    )

    expect(exit._tag).toBe("Failure")

    if (exit._tag === "Failure") {
      const error = Cause.squash(exit.cause) as HatchetRunError
      expect(error).toBeInstanceOf(HatchetRunError)
      expect(error).toMatchObject({
        _tag: "HatchetRunError",
        workflow: "orders.process",
      })
      expect(error.cause).toBe(cause)
    }
  })
})
