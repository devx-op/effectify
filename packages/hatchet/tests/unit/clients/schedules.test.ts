/**
 * @effectify/hatchet - Schedules Client Tests
 */

import { describe, expect, it } from "vitest"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import {
  createSchedule,
  type CreateScheduleOptions,
  deleteSchedule,
  getSchedule,
  type HatchetScheduleRecord,
  listSchedules,
} from "../../../src/clients/schedules.js"
import * as publicApi from "../../../src/index.js"
import { HatchetScheduleError } from "../../../src/core/error.js"
import { createMockHatchetClientLayer, TestHatchetConfigLayer } from "../../../src/testing/mock-client.js"

const provideHatchet = (
  layer: ReturnType<typeof createMockHatchetClientLayer>,
) => Effect.provide(Layer.mergeAll(TestHatchetConfigLayer, layer))

describe("Schedules Client", () => {
  it("createSchedule normalizes scheduled workflow responses through the public API", async () => {
    const triggerAt = new Date("2026-04-11T12:30:00.000Z")
    const input = { orderId: "order-123" }
    const options: CreateScheduleOptions = {
      triggerAt,
      input,
      additionalMetadata: { source: "test" },
      priority: 2,
    }

    const result = await publicApi
      .createSchedule("orders.process", options)
      .pipe(
        provideHatchet(
          createMockHatchetClientLayer({
            scheduled: {
              create: async (workflowName, providedOptions) => {
                expect(workflowName).toBe("orders.process")
                expect(providedOptions).toEqual(options)

                return {
                  metadata: { id: "schedule-123" },
                  workflowName,
                  triggerAt: triggerAt.toISOString(),
                  input,
                  additionalMetadata: { source: "test" },
                  priority: 2,
                  method: "API",
                  tenantId: "tenant-1",
                  workflowId: "workflow-1",
                  workflowVersionId: "workflow-version-1",
                }
              },
            },
          }),
        ),
        Effect.runPromise,
      )

    expect(result).toEqual<HatchetScheduleRecord<typeof input>>({
      scheduleId: "schedule-123",
      workflowName: "orders.process",
      triggerAt,
      input,
      additionalMetadata: { source: "test" },
      priority: 2,
    })
  })

  it("getSchedule normalizes fetched schedule details", async () => {
    const result = await getSchedule<{ userId: string }>("schedule-456").pipe(
      provideHatchet(
        createMockHatchetClientLayer({
          scheduled: {
            get: async (scheduleId) => {
              expect(scheduleId).toBe("schedule-456")

              return {
                metadata: { id: "schedule-456" },
                workflowName: "users.notify",
                triggerAt: "2026-04-12T08:00:00.000Z",
                input: { userId: "user-1" },
                additionalMetadata: { origin: "api" },
                method: "DEFAULT",
                tenantId: "tenant-1",
                workflowId: "workflow-1",
                workflowVersionId: "workflow-version-1",
              }
            },
          },
        }),
      ),
      Effect.runPromise,
    )

    expect(result).toEqual({
      scheduleId: "schedule-456",
      workflowName: "users.notify",
      triggerAt: new Date("2026-04-12T08:00:00.000Z"),
      input: { userId: "user-1" },
      additionalMetadata: { origin: "api" },
    })
  })

  it("listSchedules forwards the workflow filter and normalizes rows", async () => {
    const result = await listSchedules<{ invoiceId: string }>({
      workflowName: "billing.charge",
    }).pipe(
      provideHatchet(
        createMockHatchetClientLayer({
          scheduled: {
            list: async (query) => {
              expect(query).toEqual({ workflow: "billing.charge" })

              return {
                rows: [
                  {
                    metadata: { id: "schedule-1" },
                    workflowName: "billing.charge",
                    triggerAt: "2026-04-13T09:00:00.000Z",
                    input: { invoiceId: "inv-1" },
                    additionalMetadata: { source: "list" },
                    method: "API",
                    tenantId: "tenant-1",
                    workflowId: "workflow-1",
                    workflowVersionId: "workflow-version-1",
                  },
                ],
              }
            },
          },
        }),
      ),
      Effect.runPromise,
    )

    expect(result).toEqual([
      {
        scheduleId: "schedule-1",
        workflowName: "billing.charge",
        triggerAt: new Date("2026-04-13T09:00:00.000Z"),
        input: { invoiceId: "inv-1" },
        additionalMetadata: { source: "list" },
      },
    ])
  })

  it("deleteSchedule forwards the schedule id to the SDK surface", async () => {
    await deleteSchedule("schedule-789").pipe(
      provideHatchet(
        createMockHatchetClientLayer({
          scheduled: {
            delete: async (scheduleId) => {
              expect(scheduleId).toBe("schedule-789")
            },
          },
        }),
      ),
      Effect.runPromise,
    )
  })

  it("createSchedule fails when the SDK omits the scheduled run id", async () => {
    const exit = await createSchedule("orders.process", {
      triggerAt: new Date("2026-04-11T12:30:00.000Z"),
    }).pipe(
      provideHatchet(
        createMockHatchetClientLayer({
          scheduled: {
            create: async () => ({
              metadata: {},
              workflowName: "orders.process",
              triggerAt: "2026-04-11T12:30:00.000Z",
              method: "API",
              tenantId: "tenant-1",
              workflowId: "workflow-1",
              workflowVersionId: "workflow-version-1",
            }),
          },
        }),
      ),
      Effect.runPromiseExit,
    )

    expect(exit._tag).toBe("Failure")

    if (exit._tag === "Failure") {
      const error = Cause.squash(exit.cause)
      expect(error).toBeInstanceOf(HatchetScheduleError)
      expect(error).toMatchObject({
        _tag: "HatchetScheduleError",
        workflowName: "orders.process",
      })
      expect(error.message).toContain("orders.process")
    }
  })

  it("wraps SDK schedule failures with typed context for every operation", async () => {
    const createCause = new Error("create unavailable")
    const getCause = new Error("get unavailable")
    const listCause = new Error("list unavailable")
    const deleteCause = new Error("delete unavailable")

    const createExit = await createSchedule("orders.process", {
      triggerAt: new Date("2026-04-11T12:30:00.000Z"),
    }).pipe(
      provideHatchet(
        createMockHatchetClientLayer({
          scheduled: {
            create: async () => {
              throw createCause
            },
          },
        }),
      ),
      Effect.runPromiseExit,
    )

    const getExit = await getSchedule("schedule-404").pipe(
      provideHatchet(
        createMockHatchetClientLayer({
          scheduled: {
            get: async () => {
              throw getCause
            },
          },
        }),
      ),
      Effect.runPromiseExit,
    )

    const listExit = await listSchedules({
      workflowName: "orders.process",
    }).pipe(
      provideHatchet(
        createMockHatchetClientLayer({
          scheduled: {
            list: async () => {
              throw listCause
            },
          },
        }),
      ),
      Effect.runPromiseExit,
    )

    const deleteExit = await deleteSchedule("schedule-404").pipe(
      provideHatchet(
        createMockHatchetClientLayer({
          scheduled: {
            delete: async () => {
              throw deleteCause
            },
          },
        }),
      ),
      Effect.runPromiseExit,
    )

    expect(createExit._tag).toBe("Failure")
    expect(getExit._tag).toBe("Failure")
    expect(listExit._tag).toBe("Failure")
    expect(deleteExit._tag).toBe("Failure")

    if (createExit._tag === "Failure") {
      expect(Cause.squash(createExit.cause)).toMatchObject({
        _tag: "HatchetScheduleError",
        workflowName: "orders.process",
        cause: createCause,
      })
    }

    if (getExit._tag === "Failure") {
      expect(Cause.squash(getExit.cause)).toMatchObject({
        _tag: "HatchetScheduleError",
        scheduleId: "schedule-404",
        cause: getCause,
      })
    }

    if (listExit._tag === "Failure") {
      expect(Cause.squash(listExit.cause)).toMatchObject({
        _tag: "HatchetScheduleError",
        workflowName: "orders.process",
        cause: listCause,
      })
    }

    if (deleteExit._tag === "Failure") {
      expect(Cause.squash(deleteExit.cause)).toMatchObject({
        _tag: "HatchetScheduleError",
        scheduleId: "schedule-404",
        cause: deleteCause,
      })
    }
  })
})
