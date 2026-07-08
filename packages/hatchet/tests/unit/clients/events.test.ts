/**
 * @effectify/hatchet - Events Client Tests
 */

import { describe, expect, it } from "vitest"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { getEvent, type HatchetEventRecord, pushEvent, type PushEventOptions } from "../../../src/clients/events.js"
import * as publicApi from "../../../src/index.js"
import { HatchetEventError } from "../../../src/core/error.js"
import { createMockHatchetClientLayer, TestHatchetConfigLayer } from "../../../src/testing/mock-client.js"

const provideHatchet = (
  layer: ReturnType<typeof createMockHatchetClientLayer>,
) => Effect.provide(Layer.mergeAll(TestHatchetConfigLayer, layer))

describe("Events Client", () => {
  it("pushEvent normalizes pushed protobuf events through the public API", async () => {
    const payload = { source: "signup", userId: "user-123" }
    const options: PushEventOptions = {
      additionalMetadata: { origin: "test" },
      priority: 3,
      scope: "demo",
    }

    const result = await publicApi
      .pushEvent("user.created", payload, options)
      .pipe(
        provideHatchet(
          createMockHatchetClientLayer({
            events: {
              push: async (key, input, providedOptions) => {
                expect(key).toBe("user.created")
                expect(input).toEqual(payload)
                expect(providedOptions).toEqual(options)

                return {
                  tenantId: "tenant-123",
                  eventId: "event-123",
                  key,
                  payload: JSON.stringify(input),
                  eventTimestamp: new Date("2026-04-09T00:00:00.000Z"),
                  additionalMetadata: JSON.stringify({ origin: "test" }),
                  scope: "demo",
                }
              },
            },
          }),
        ),
        Effect.runPromise,
      )

    expect(result).toEqual<HatchetEventRecord<typeof payload>>({
      eventId: "event-123",
      key: "user.created",
      payload,
      additionalMetadata: { origin: "test" },
      scope: "demo",
    })
  })

  it("pushEvent wraps SDK failures with HatchetEventError and event key context", async () => {
    const cause = new Error("grpc unavailable")

    const exit = await pushEvent("billing.failed", { invoiceId: "inv-1" }).pipe(
      provideHatchet(
        createMockHatchetClientLayer({
          events: {
            push: async () => {
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
      expect(error).toBeInstanceOf(HatchetEventError)
      expect(error).toMatchObject({
        _tag: "HatchetEventError",
        key: "billing.failed",
        cause,
      })
      expect(error.message).toContain("billing.failed")
    }
  })

  it("getEvent normalizes REST event responses", async () => {
    const result = await getEvent<{ orderId: string }>("event-456").pipe(
      provideHatchet(
        createMockHatchetClientLayer({
          tenantId: "tenant-456",
          api: {
            v1EventGet: async (tenantId, eventId) => {
              expect(tenantId).toBe("tenant-456")
              expect(eventId).toBe("event-456")

              return {
                data: {
                  metadata: {
                    id: "event-456",
                    createdAt: "2026-04-09T00:00:00.000Z",
                    updatedAt: "2026-04-09T00:00:00.000Z",
                  },
                  key: "order.created",
                  tenantId,
                  workflowRunSummary: {
                    running: 0,
                    queued: 0,
                    succeeded: 1,
                    failed: 0,
                    cancelled: 0,
                  },
                  additionalMetadata: { origin: "api" },
                  payload: { orderId: "order-1" },
                  scope: "orders",
                  seenAt: "2026-04-09T00:00:00.000Z",
                  triggeredRuns: [
                    { workflowRunId: "run-1", filterId: "filter-1" },
                  ],
                },
              }
            },
          },
        }),
      ),
      Effect.runPromise,
    )

    expect(result).toEqual({
      eventId: "event-456",
      key: "order.created",
      payload: { orderId: "order-1" },
      additionalMetadata: { origin: "api" },
      scope: "orders",
      seenAt: "2026-04-09T00:00:00.000Z",
      triggeredRuns: [{ workflowRunId: "run-1", filterId: "filter-1" }],
      workflowRunSummary: {
        running: 0,
        queued: 0,
        succeeded: 1,
        failed: 0,
        cancelled: 0,
      },
    })
  })

  it("getEvent fails when the REST API returns no event body", async () => {
    const exit = await getEvent("event-missing").pipe(
      provideHatchet(
        createMockHatchetClientLayer({
          api: {
            v1EventGet: async () => ({ data: undefined }),
          },
        }),
      ),
      Effect.runPromiseExit,
    )

    expect(exit._tag).toBe("Failure")

    if (exit._tag === "Failure") {
      const error = Cause.squash(exit.cause)
      expect(error).toBeInstanceOf(HatchetEventError)
      expect(error).toMatchObject({
        _tag: "HatchetEventError",
        eventId: "event-missing",
      })
      expect(error.message).toContain("event-missing")
    }
  })

  it("getEvent wraps HTTP failures with HatchetEventError and event id context", async () => {
    const cause = new Error("404 not found")

    const exit = await getEvent("event-404").pipe(
      provideHatchet(
        createMockHatchetClientLayer({
          api: {
            v1EventGet: async () => {
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
      expect(error).toBeInstanceOf(HatchetEventError)
      expect(error).toMatchObject({
        _tag: "HatchetEventError",
        eventId: "event-404",
        cause,
      })
      expect(error.message).toContain("event-404")
    }
  })
})
