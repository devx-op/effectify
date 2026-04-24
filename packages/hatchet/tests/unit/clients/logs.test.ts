/**
 * @effectify/hatchet - Logs Client Tests
 */

import { describe, expect, it } from "vitest"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { V1LogLineLevel } from "@hatchet-dev/typescript-sdk"
import { listTaskLogs, listTenantLogs, type LogList } from "../../../src/clients/logs.js"
import * as publicApi from "../../../src/index.js"
import { HatchetObservabilityError } from "../../../src/core/error.js"
import { createMockHatchetClientLayer, TestHatchetConfigLayer } from "../../../src/testing/mock-client.js"

const provideHatchet = (
  layer: ReturnType<typeof createMockHatchetClientLayer>,
) => Effect.provide(Layer.mergeAll(TestHatchetConfigLayer, layer))

describe("Logs Client", () => {
  it("listTaskLogs normalizes task log responses through the public API", async () => {
    const result = await publicApi
      .listTaskLogs("task-123", {
        limit: 20,
        since: new Date("2026-04-11T16:00:00.000Z"),
        until: new Date("2026-04-11T18:00:00.000Z"),
        levels: [V1LogLineLevel.INFO, V1LogLineLevel.ERROR],
        search: "payment",
      })
      .pipe(
        provideHatchet(
          createMockHatchetClientLayer({
            api: {
              v1LogLineList: async (taskId, query) => {
                expect(taskId).toBe("task-123")
                expect(query).toEqual({
                  limit: 20,
                  since: "2026-04-11T16:00:00.000Z",
                  until: "2026-04-11T18:00:00.000Z",
                  levels: ["INFO", "ERROR"],
                  search: "payment",
                })

                return {
                  data: {
                    rows: [
                      {
                        createdAt: "2026-04-11T17:00:00.000Z",
                        message: "payment started",
                        metadata: {
                          workflow_run_id: "run-123",
                          step_run_id: "step-123",
                        },
                        taskExternalId: "task-123",
                        level: "INFO",
                      },
                    ],
                  },
                }
              },
            },
          }),
        ),
        Effect.runPromise,
      )

    expect(result).toEqual<LogList>({
      rows: [
        {
          message: "payment started",
          level: "INFO",
          timestamp: "2026-04-11T17:00:00.000Z",
          taskId: "task-123",
          runId: "run-123",
          stepRunId: "step-123",
          metadata: {
            workflow_run_id: "run-123",
            step_run_id: "step-123",
          },
        },
      ],
    })
  })

  it("listTenantLogs normalizes tenant logs and tolerates mixed snake_case or camelCase payloads", async () => {
    const result = await listTenantLogs({
      workflowIds: ["workflow-1"],
      taskIds: ["task-456"],
    }).pipe(
      provideHatchet(
        createMockHatchetClientLayer({
          tenantId: "tenant-123",
          api: {
            v1TenantLogLineList: async (tenantId, query) => {
              expect(tenantId).toBe("tenant-123")
              expect(query).toEqual({
                workflow_ids: ["workflow-1"],
                taskExternalIds: ["task-456"],
              })

              return {
                data: {
                  rows: [
                    {
                      createdAt: "2026-04-11T18:00:00.000Z",
                      message: "tenant log",
                      metadata: {
                        runId: "run-456",
                        step_run_id: "step-456",
                      },
                      taskId: "task-456",
                      level: "WARN",
                    },
                  ],
                },
              }
            },
          },
        }),
      ),
      Effect.runPromise,
    )

    expect(result.rows).toEqual([
      {
        message: "tenant log",
        level: "WARN",
        timestamp: "2026-04-11T18:00:00.000Z",
        taskId: "task-456",
        runId: "run-456",
        stepRunId: "step-456",
        metadata: {
          runId: "run-456",
          step_run_id: "step-456",
        },
      },
    ])
  })

  it("listTaskLogs wraps SDK failures with HatchetObservabilityError", async () => {
    const cause = new Error("503 unavailable")

    const exit = await listTaskLogs("task-fail").pipe(
      provideHatchet(
        createMockHatchetClientLayer({
          api: {
            v1LogLineList: async () => {
              throw cause
            },
          },
        }),
      ),
      Effect.runPromiseExit,
    )

    expect(exit._tag).toBe("Failure")

    if (exit._tag === "Failure") {
      const error = Cause.squash(exit.cause)
      expect(error).toBeInstanceOf(HatchetObservabilityError)
      expect(error).toMatchObject({
        _tag: "HatchetObservabilityError",
        operation: "logs",
        endpoint: "api.v1LogLineList",
        taskId: "task-fail",
        cause,
      })
    }
  })
})
