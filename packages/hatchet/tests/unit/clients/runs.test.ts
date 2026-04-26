/**
 * @effectify/hatchet - Runs Client Tests
 */

import { describe, expect, expectTypeOf, it, layer } from "@effect/vitest"
import * as Cause from "effect/Cause"
import { Effect, Layer } from "effect"
import {
  branchDurableTask,
  type BranchDurableTaskResult,
  cancelRun,
  getRun,
  getRunStatus,
  getRunTaskId,
  listRuns,
  type ListRunsOpts,
  replayRun,
  type ReplayRunOpts,
  type ReplayRunResult,
  restoreTask,
  type RestoreTaskResult,
  type RunDetails,
  type RunOpts,
  type RunSummary,
  runWorkflow,
  runWorkflowNoWait,
} from "../../../src/clients/runs"
import { HatchetClientService } from "../../../src/core/client"
import { HatchetRunError, HatchetWorkflowError } from "../../../src/core/error"
import { MockHatchetClientLayer, TestHatchetConfigLayer } from "../../../src/testing/mock-client"
import type { ReplayRunOpts as SdkReplayRunOpts } from "@hatchet-dev/typescript-sdk"

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

    it("should export replayRun function", () => {
      expect(replayRun).toBeDefined()
      expect(typeof replayRun).toBe("function")
    })

    it("should export restoreTask function", () => {
      expect(restoreTask).toBeDefined()
      expect(typeof restoreTask).toBe("function")
    })

    it("should export branchDurableTask function", () => {
      expect(branchDurableTask).toBeDefined()
      expect(typeof branchDurableTask).toBe("function")
    })

    it("should export RunOpts interface", () => {
      const opts: RunOpts = {
        additionalMetadata: { source: "test" },
        priority: 1,
        sticky: true,
        desiredWorkerLabels: {
          region: {
            value: "us-east-1",
          },
        },
      }
      expect(opts.additionalMetadata).toBeDefined()
      expect(opts.priority).toBe(1)
      expect(opts.sticky).toBe(true)
      expect(opts.desiredWorkerLabels?.region?.value).toBe("us-east-1")
    })

    it("should export ListRunsOpts interface", () => {
      const opts: ListRunsOpts = {
        workflowName: "test-workflow",
        status: "COMPLETED",
        workflowNames: ["test-workflow", "backup-workflow"],
        limit: 10,
        offset: 0,
        parentTaskRunExternalId: "550e8400-e29b-41d4-a716-446655440000",
      }
      expect(opts.workflowName).toBe("test-workflow")
      expect(opts.status).toBe("COMPLETED")
      expect(opts.workflowNames).toEqual(["test-workflow", "backup-workflow"])
      expect(opts.parentTaskRunExternalId).toBe(
        "550e8400-e29b-41d4-a716-446655440000",
      )
    })

    it("should export ReplayRunOpts interface compatible with the SDK shape", () => {
      const opts: ReplayRunOpts = {
        ids: ["run-123"],
        filters: {
          workflowName: "orders.process",
          statuses: ["FAILED"],
        },
      }

      const sdkOpts: SdkReplayRunOpts = {
        ids: opts.ids ? [...opts.ids] : undefined,
        filters: opts.filters
          ? {
            workflowNames: opts.filters.workflowNames?.length
              ? [...opts.filters.workflowNames]
              : opts.filters.workflowName
              ? [opts.filters.workflowName]
              : undefined,
            statuses: opts.filters.statuses?.length
              ? [...opts.filters.statuses]
              : opts.filters.status
              ? [opts.filters.status]
              : undefined,
            since: opts.filters.since,
            until: opts.filters.until,
            additionalMetadata: opts.filters.additionalMetadata,
          }
          : undefined,
      }

      expect(opts.filters?.workflowName).toBe("orders.process")
      expect(sdkOpts.filters?.workflowNames).toEqual(["orders.process"])
      expect(sdkOpts.filters?.statuses).toEqual(["FAILED"])
    })

    it("should export SDK-derived run result aliases", () => {
      expectTypeOf<RunDetails>().toMatchTypeOf<{ metadata?: object }>()
      expectTypeOf<RunSummary>().toMatchTypeOf<{ metadata?: object }>()
      expectTypeOf<ReplayRunResult>().toMatchTypeOf<{ ids?: string[] }>()
      expectTypeOf<RestoreTaskResult>().toMatchTypeOf<object>()
      expectTypeOf<BranchDurableTaskResult>().toMatchTypeOf<object>()
    })

    it("should export ReplayRunOpts interface compatible with the SDK shape", () => {
      const opts: ReplayRunOpts = {
        ids: ["run-123"],
        filters: {
          workflowName: "orders.process",
          statuses: ["FAILED"],
        },
      }

      const sdkOpts: SdkReplayRunOpts = {
        ids: opts.ids ? [...opts.ids] : undefined,
        filters: opts.filters
          ? {
            workflowNames: opts.filters.workflowNames?.length
              ? [...opts.filters.workflowNames]
              : opts.filters.workflowName
              ? [opts.filters.workflowName]
              : undefined,
            statuses: opts.filters.statuses?.length
              ? [...opts.filters.statuses]
              : opts.filters.status
              ? [opts.filters.status]
              : undefined,
            since: opts.filters.since,
            until: opts.filters.until,
            additionalMetadata: opts.filters.additionalMetadata,
          }
          : undefined,
      }

      expect(opts.filters?.workflowName).toBe("orders.process")
      expect(sdkOpts.filters?.workflowNames).toEqual(["orders.process"])
      expect(sdkOpts.filters?.statuses).toEqual(["FAILED"])
    })
  })
})

describe("HatchetRunError", () => {
  layer(Layer.mergeAll(TestHatchetConfigLayer, MockHatchetClientLayer))(() => {
    it("should create error with workflow", () => {
      const error = new HatchetRunError({
        message: "Workflow failed",
        workflow: "my-workflow",
      })
      expect(error.message).toBe("Workflow failed")
      expect(error.workflow).toBe("my-workflow")
    })

    it("should create error with runId", () => {
      const error = new HatchetRunError({
        message: "Run failed",
        runId: "run-123",
      })
      expect(error.message).toBe("Run failed")
      expect(error.runId).toBe("run-123")
    })

    it("should create error with cause", () => {
      const cause = new Error("Original error")
      const error = new HatchetRunError({
        message: "Workflow failed",
        workflow: "my-workflow",
        cause,
      })
      expect(error.cause).toBe(cause)
    })
  })
})

describe("HatchetWorkflowError", () => {
  layer(Layer.mergeAll(TestHatchetConfigLayer, MockHatchetClientLayer))(() => {
    it("should create error with workflow name", () => {
      const error = new HatchetWorkflowError({
        message: "Workflow operation failed",
        workflowName: "my-workflow",
      })
      expect(error.message).toBe("Workflow operation failed")
      expect(error.workflowName).toBe("my-workflow")
    })

    it("should create error without workflow name", () => {
      const error = new HatchetWorkflowError({ message: "List failed" })
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

  it("runWorkflow uses client.run from the public SDK surface", async () => {
    const input = { orderId: "order-1" }

    const result = await runWorkflow<typeof input, { ok: boolean }>(
      "orders.process",
      input,
      { priority: 1 },
    ).pipe(
      provideHatchet({
        run: async (
          workflow: string,
          providedInput: unknown,
          options?: unknown,
        ) => {
          expect(workflow).toBe("orders.process")
          expect(providedInput).toEqual(input)
          expect(options).toEqual({ priority: 1 })
          return { ok: true }
        },
      }),
      Effect.runPromise,
    )

    expect(result).toEqual({ ok: true })
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

  it("cancelRun yields HatchetRunError when cancellation fails", async () => {
    const cause = new Error("cancel unavailable")

    const exit = await cancelRun("run-456").pipe(
      provideHatchet({
        runs: {
          cancel: async () => {
            throw cause
          },
        },
      }),
      Effect.runPromiseExit,
    )

    expect(exit._tag).toBe("Failure")

    if (exit._tag === "Failure") {
      const error = Cause.squash(exit.cause) as HatchetRunError
      expect(error).toBeInstanceOf(HatchetRunError)
      expect(error.runId).toBe("run-456")
      expect(error.cause).toBe(cause)
    }
  })

  it("getRun returns workflow run details from runs.get", async () => {
    const result = await getRun<{ run: { metadata: { id: string } } }>(
      "run-789",
    ).pipe(
      provideHatchet({
        runs: {
          get: async (runId: unknown) => {
            expect(runId).toBe("run-789")
            return { run: { metadata: { id: "run-789" } } }
          },
        },
      }),
      Effect.runPromise,
    )

    expect(result).toEqual({ run: { metadata: { id: "run-789" } } })
  })

  it("getRun yields HatchetRunError when the SDK get request fails", async () => {
    const cause = new Error("get unavailable")

    const exit = await getRun("run-789").pipe(
      provideHatchet({
        runs: {
          get: async () => {
            throw cause
          },
        },
      }),
      Effect.runPromiseExit,
    )

    expect(exit._tag).toBe("Failure")

    if (exit._tag === "Failure") {
      const error = Cause.squash(exit.cause) as HatchetRunError
      expect(error).toBeInstanceOf(HatchetRunError)
      expect(error.runId).toBe("run-789")
      expect(error.cause).toBe(cause)
    }
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

  it("getRunStatus yields HatchetRunError when the SDK status request fails", async () => {
    const cause = new Error("status unavailable")

    const exit = await getRunStatus("run-789").pipe(
      provideHatchet({
        runs: {
          get_status: async () => {
            throw cause
          },
        },
      }),
      Effect.runPromiseExit,
    )

    expect(exit._tag).toBe("Failure")

    if (exit._tag === "Failure") {
      const error = Cause.squash(exit.cause) as HatchetRunError
      expect(error).toBeInstanceOf(HatchetRunError)
      expect(error.runId).toBe("run-789")
      expect(error.cause).toBe(cause)
    }
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

  it("getRunTaskId yields HatchetRunError when the task id lookup fails", async () => {
    const cause = new Error("task lookup unavailable")

    const exit = await getRunTaskId("run-789").pipe(
      provideHatchet({
        runs: {
          getTaskExternalId: async () => {
            throw cause
          },
        },
      }),
      Effect.runPromiseExit,
    )

    expect(exit._tag).toBe("Failure")

    if (exit._tag === "Failure") {
      const error = Cause.squash(exit.cause) as HatchetRunError
      expect(error).toBeInstanceOf(HatchetRunError)
      expect(error.runId).toBe("run-789")
      expect(error.cause).toBe(cause)
    }
  })

  it("listRuns maps wrapper filters to the SDK list API and normalizes rows", async () => {
    const result = await listRuns<{ metadata: { status: string } }>({
      workflowName: "orders.process",
      status: "FAILED",
      since: new Date("2026-04-12T18:45:00.000Z"),
      until: new Date("2026-04-12T19:00:00.000Z"),
      additionalMetadata: { source: "demo", kind: "filter" },
      workerId: "worker-123",
      includePayloads: false,
      limit: 5,
      offset: 10,
    }).pipe(
      provideHatchet({
        runs: {
          list: async (options: unknown) => {
            expect(options).toEqual({
              workflowNames: ["orders.process"],
              statuses: ["FAILED"],
              since: new Date("2026-04-12T18:45:00.000Z"),
              until: new Date("2026-04-12T19:00:00.000Z"),
              additionalMetadata: { source: "demo", kind: "filter" },
              workerId: "worker-123",
              includePayloads: false,
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

  it("listRuns supports plural workflow/status filters while keeping compatibility shims", async () => {
    await listRuns({
      workflowName: "legacy-workflow",
      workflowNames: ["orders.process", "emails.send"],
      status: "FAILED",
      statuses: ["COMPLETED", "FAILED"],
    }).pipe(
      provideHatchet({
        runs: {
          list: async (options: unknown) => {
            expect(options).toEqual({
              workflowNames: ["orders.process", "emails.send"],
              statuses: ["COMPLETED", "FAILED"],
              onlyTasks: false,
            })

            return { rows: [] }
          },
        },
      }),
      Effect.runPromise,
    )
  })

  it("listRuns yields HatchetWorkflowError when the SDK list request fails", async () => {
    const cause = new Error("list unavailable")

    const exit = await listRuns().pipe(
      provideHatchet({
        runs: {
          list: async () => {
            throw cause
          },
        },
      }),
      Effect.runPromiseExit,
    )

    expect(exit._tag).toBe("Failure")

    if (exit._tag === "Failure") {
      const error = Cause.squash(exit.cause) as HatchetWorkflowError
      expect(error).toBeInstanceOf(HatchetWorkflowError)
      expect(error.message).toBe("Failed to list runs")
      expect(error.cause).toBe(cause)
    }
  })

  it("replayRun replays a single run id through runs.replay and returns response data", async () => {
    const result = await replayRun<{ ids?: string[] }>("run-456").pipe(
      provideHatchet({
        runs: {
          replay: async (options: unknown) => {
            expect(options).toEqual({ ids: ["run-456"] })

            return {
              data: { ids: ["replayed-task-1"] },
            }
          },
        },
      }),
      Effect.runPromise,
    )

    expect(result).toEqual({ ids: ["replayed-task-1"] })
  })

  it("replayRun normalizes filter input to the SDK replay shape", async () => {
    const result = await replayRun<{ ids?: string[] }>({
      filters: {
        workflowName: "orders.process",
        status: "FAILED",
        additionalMetadata: { source: "demo" },
      },
    }).pipe(
      provideHatchet({
        runs: {
          replay: async (options: unknown) => {
            expect(options).toEqual({
              filters: {
                workflowNames: ["orders.process"],
                statuses: ["FAILED"],
                additionalMetadata: { source: "demo" },
              },
            })

            return {
              data: { ids: ["replayed-task-2"] },
            }
          },
        },
      }),
      Effect.runPromise,
    )

    expect(result).toEqual({ ids: ["replayed-task-2"] })
  })

  it("replayRun yields HatchetRunError when the SDK replay request fails", async () => {
    const cause = new Error("replay unavailable")

    const exit = await replayRun("run-456").pipe(
      provideHatchet({
        runs: {
          replay: async () => {
            throw cause
          },
        },
      }),
      Effect.runPromiseExit,
    )

    expect(exit._tag).toBe("Failure")

    if (exit._tag === "Failure") {
      const error = Cause.squash(exit.cause) as HatchetRunError
      expect(error).toBeInstanceOf(HatchetRunError)
      expect(error.message).toContain('Failed to replay run "run-456"')
      expect(error.runId).toBe("run-456")
      expect(error.cause).toBe(cause)
    }
  })

  it("restoreTask returns the normalized SDK restore payload", async () => {
    const result = await restoreTask<{ requeued: boolean }>("task-123").pipe(
      provideHatchet({
        runs: {
          restoreTask: async (taskExternalId: unknown) => {
            expect(taskExternalId).toBe("task-123")

            return {
              data: { requeued: true },
            }
          },
        },
      }),
      Effect.runPromise,
    )

    expect(result).toEqual({ requeued: true })
  })

  it("restoreTask yields HatchetRunError when the SDK restore request fails", async () => {
    const cause = new Error("restore unavailable")

    const exit = await restoreTask("task-123").pipe(
      provideHatchet({
        runs: {
          restoreTask: async () => {
            throw cause
          },
        },
      }),
      Effect.runPromiseExit,
    )

    expect(exit._tag).toBe("Failure")

    if (exit._tag === "Failure") {
      const error = Cause.squash(exit.cause) as HatchetRunError
      expect(error).toBeInstanceOf(HatchetRunError)
      expect(error.message).toContain('Failed to restore task "task-123"')
      expect(error.runId).toBe("task-123")
      expect(error.cause).toBe(cause)
    }
  })

  it("branchDurableTask forwards the task external id and node id", async () => {
    const result = await branchDurableTask<{
      taskExternalId: string
      nodeId: number
      branchId: number
    }>("task-123", 17).pipe(
      provideHatchet({
        runs: {
          branchDurableTask: async (
            taskExternalId: unknown,
            nodeId: unknown,
            branchId?: unknown,
          ) => {
            expect(taskExternalId).toBe("task-123")
            expect(nodeId).toBe(17)
            expect(branchId).toBeUndefined()

            return {
              data: {
                taskExternalId: "task-123",
                nodeId: 18,
                branchId: 2,
              },
            }
          },
        },
      }),
      Effect.runPromise,
    )

    expect(result).toEqual({
      taskExternalId: "task-123",
      nodeId: 18,
      branchId: 2,
    })
  })

  it("branchDurableTask passes the optional branch id when provided", async () => {
    await branchDurableTask("task-123", 17, 9).pipe(
      provideHatchet({
        runs: {
          branchDurableTask: async (
            taskExternalId: unknown,
            nodeId: unknown,
            branchId?: unknown,
          ) => {
            expect(taskExternalId).toBe("task-123")
            expect(nodeId).toBe(17)
            expect(branchId).toBe(9)

            return {
              data: {
                taskExternalId: "task-123",
                nodeId: 17,
                branchId: 9,
              },
            }
          },
        },
      }),
      Effect.runPromise,
    )
  })

  it("branchDurableTask yields HatchetRunError when the SDK branch request fails", async () => {
    const cause = new Error("branch unavailable")

    const exit = await branchDurableTask("task-123", 17).pipe(
      provideHatchet({
        runs: {
          branchDurableTask: async () => {
            throw cause
          },
        },
      }),
      Effect.runPromiseExit,
    )

    expect(exit._tag).toBe("Failure")

    if (exit._tag === "Failure") {
      const error = Cause.squash(exit.cause) as HatchetRunError
      expect(error).toBeInstanceOf(HatchetRunError)
      expect(error.message).toContain(
        'Failed to branch durable task "task-123" from node 17',
      )
      expect(error.runId).toBe("task-123")
      expect(error.cause).toBe(cause)
    }
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

  it("wraps typed SDK run execution errors from runWorkflow", async () => {
    const cause = new Error("run unavailable")

    const exit = await runWorkflow("orders.process", {
      orderId: "1",
    }).pipe(
      provideHatchet({
        run: async () => {
          throw cause
        },
      }),
      Effect.runPromiseExit,
    )

    expect(exit._tag).toBe("Failure")

    if (exit._tag === "Failure") {
      const error = Cause.squash(exit.cause) as HatchetRunError
      expect(error).toBeInstanceOf(HatchetRunError)
      expect(error.workflow).toBe("orders.process")
      expect(error.cause).toBe(cause)
    }
  })
})
