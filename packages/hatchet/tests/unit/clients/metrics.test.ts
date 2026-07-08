/**
 * @effectify/hatchet - Metrics Client Tests
 */

import { describe, expect, it } from "vitest"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { getQueueMetrics, getTaskMetrics } from "../../../src/clients/metrics.js"
import { HatchetObservabilityError } from "../../../src/core/error.js"
import { createMockHatchetClientLayer, TestHatchetConfigLayer } from "../../../src/testing/mock-client.js"

const provideHatchet = (
  layer: ReturnType<typeof createMockHatchetClientLayer>,
) => Effect.provide(Layer.mergeAll(TestHatchetConfigLayer, layer))

describe("Metrics Client", () => {
  it("getTaskMetrics folds SDK status rows into a stable byStatus record", async () => {
    const result = await getTaskMetrics({
      since: "2026-04-11T00:00:00.000Z",
      until: "2026-04-11T23:59:59.999Z",
    }).pipe(
      provideHatchet(
        createMockHatchetClientLayer({
          tenantId: "tenant-123",
          api: {
            v1TaskListStatusMetrics: async (tenantId, query) => {
              expect(tenantId).toBe("tenant-123")
              expect(query).toEqual({
                since: "2026-04-11T00:00:00.000Z",
                until: "2026-04-11T23:59:59.999Z",
              })

              return {
                data: [
                  { status: "QUEUED", count: 2 },
                  { status: "RUNNING", count: 3 },
                  { status: "SUCCEEDED", count: 5 },
                  { status: "FAILED", count: 1 },
                  { status: "CANCELLED", count: 4 },
                ],
              }
            },
          },
        }),
      ),
      Effect.runPromise,
    )

    expect(result).toEqual({
      byStatus: {
        PENDING: 2,
        RUNNING: 3,
        COMPLETED: 5,
        FAILED: 1,
        CANCELLED: 4,
      },
    })
  })

  it("getQueueMetrics combines workflow and step-run queue metrics into a stable shape", async () => {
    const result = await getQueueMetrics().pipe(
      provideHatchet(
        createMockHatchetClientLayer({
          tenantId: "tenant-123",
          api: {
            tenantGetQueueMetrics: async (tenantId) => {
              expect(tenantId).toBe("tenant-123")
              return {
                data: {
                  total: {
                    numQueued: 7,
                    numRunning: 2,
                    numPending: 1,
                  },
                  workflow: {
                    orders: {
                      numQueued: 5,
                      numRunning: 1,
                      numPending: 0,
                    },
                  },
                },
              }
            },
            tenantGetStepRunQueueMetrics: async (tenantId) => {
              expect(tenantId).toBe("tenant-123")
              return {
                data: {
                  queues: {
                    email: 3,
                  },
                },
              }
            },
          },
        }),
      ),
      Effect.runPromise,
    )

    expect(result).toEqual({
      total: {
        queued: 7,
        running: 2,
        pending: 1,
      },
      workflowBreakdown: {
        orders: {
          queued: 5,
          running: 1,
          pending: 0,
        },
      },
      stepRun: {
        email: 3,
      },
    })
  })

  it("getQueueMetrics wraps SDK failures with HatchetObservabilityError", async () => {
    const cause = new Error("metrics unavailable")

    const exit = await getQueueMetrics().pipe(
      provideHatchet(
        createMockHatchetClientLayer({
          api: {
            tenantGetQueueMetrics: async () => {
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
        operation: "metrics",
        endpoint: "api.tenantGetQueueMetrics",
        cause,
      })
    }
  })
})
