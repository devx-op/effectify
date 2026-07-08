/**
 * @effectify/hatchet - Crons Client Tests
 */

import { describe, expect, it } from "vitest"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { createCron, deleteCron, getCron, type HatchetCronRecord, listCrons } from "../../../src/clients/crons.js"
import * as publicApi from "../../../src/index.js"
import { HatchetCronError } from "../../../src/core/error.js"
import { createMockHatchetClientLayer, TestHatchetConfigLayer } from "../../../src/testing/mock-client.js"

const provideHatchet = (
  layer: ReturnType<typeof createMockHatchetClientLayer>,
) => Effect.provide(Layer.mergeAll(TestHatchetConfigLayer, layer))

describe("Crons Client", () => {
  it("createCron normalizes SDK cron responses through the public API", async () => {
    const input = { orderId: "order-123" }

    const result = await publicApi
      .createCron("orders.process", {
        name: "orders-daily",
        expression: "0 0 * * *",
        input,
        additionalMetadata: { source: "test" },
        priority: 2,
      })
      .pipe(
        provideHatchet(
          createMockHatchetClientLayer({
            crons: {
              create: async (workflowName, providedOptions) => {
                expect(workflowName).toBe("orders.process")
                expect(providedOptions).toEqual({
                  name: "orders-daily",
                  expression: "0 0 * * *",
                  input,
                  additionalMetadata: { source: "test" },
                  priority: 2,
                })

                return {
                  metadata: { id: "cron-123" },
                  workflowName,
                  cron: "0 0 * * *",
                  name: "orders-daily",
                  input,
                  additionalMetadata: { source: "test" },
                  enabled: true,
                  method: "API",
                  priority: 2,
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

    expect(result).toEqual<HatchetCronRecord<typeof input>>({
      cronId: "cron-123",
      workflowName: "orders.process",
      cron: "0 0 * * *",
      name: "orders-daily",
      input,
      additionalMetadata: { source: "test" },
      enabled: true,
      method: "API",
      priority: 2,
    })
  })

  it("getCron normalizes fetched cron details", async () => {
    const result = await getCron<{ userId: string }>("cron-456").pipe(
      provideHatchet(
        createMockHatchetClientLayer({
          crons: {
            get: async (cronId) => {
              expect(cronId).toBe("cron-456")

              return {
                metadata: { id: "cron-456" },
                workflowName: "users.notify",
                cron: "*/5 * * * *",
                name: "notify-every-5m",
                input: { userId: "user-1" },
                additionalMetadata: { origin: "api" },
                enabled: false,
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
      cronId: "cron-456",
      workflowName: "users.notify",
      cron: "*/5 * * * *",
      name: "notify-every-5m",
      input: { userId: "user-1" },
      additionalMetadata: { origin: "api" },
      enabled: false,
      method: "DEFAULT",
    })
  })

  it("listCrons forwards filters and createdAt descending ordering", async () => {
    const result = await listCrons<{ invoiceId: string }>({
      workflowName: "billing.charge",
      cronName: "nightly-billing",
      limit: 10,
      offset: 20,
    }).pipe(
      provideHatchet(
        createMockHatchetClientLayer({
          crons: {
            list: async (query) => {
              expect(query).toEqual({
                workflowName: "billing.charge",
                cronName: "nightly-billing",
                limit: 10,
                offset: 20,
                orderByField: "createdAt",
                orderByDirection: "DESC",
              })

              return {
                rows: [
                  {
                    metadata: { id: "cron-1" },
                    workflowName: "billing.charge",
                    cron: "0 0 * * *",
                    name: "nightly-billing",
                    input: { invoiceId: "inv-1" },
                    additionalMetadata: { source: "list" },
                    enabled: true,
                    method: "API",
                    priority: 1,
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
        cronId: "cron-1",
        workflowName: "billing.charge",
        cron: "0 0 * * *",
        name: "nightly-billing",
        input: { invoiceId: "inv-1" },
        additionalMetadata: { source: "list" },
        enabled: true,
        method: "API",
        priority: 1,
      },
    ])
  })

  it("deleteCron forwards the cron id to the SDK surface", async () => {
    await deleteCron("cron-789").pipe(
      provideHatchet(
        createMockHatchetClientLayer({
          crons: {
            delete: async (cronId) => {
              expect(cronId).toBe("cron-789")
            },
          },
        }),
      ),
      Effect.runPromise,
    )
  })

  it("fails when the SDK omits the cron id, workflow name, or cron expression", async () => {
    const missingId = await createCron("orders.process", {
      name: "orders-daily",
      expression: "0 0 * * *",
    }).pipe(
      provideHatchet(
        createMockHatchetClientLayer({
          crons: {
            create: async () => ({
              metadata: {},
              workflowName: "orders.process",
              cron: "0 0 * * *",
              enabled: true,
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

    const missingWorkflow = await getCron("cron-missing-workflow").pipe(
      provideHatchet(
        createMockHatchetClientLayer({
          crons: {
            get: async () => ({
              metadata: { id: "cron-missing-workflow" },
              cron: "*/5 * * * *",
              enabled: true,
              method: "DEFAULT",
              tenantId: "tenant-1",
              workflowId: "workflow-1",
              workflowVersionId: "workflow-version-1",
            }),
          },
        }),
      ),
      Effect.runPromiseExit,
    )

    const missingExpression = await getCron("cron-missing-expression").pipe(
      provideHatchet(
        createMockHatchetClientLayer({
          crons: {
            get: async () => ({
              metadata: { id: "cron-missing-expression" },
              workflowName: "users.notify",
              enabled: true,
              method: "DEFAULT",
              tenantId: "tenant-1",
              workflowId: "workflow-1",
              workflowVersionId: "workflow-version-1",
            }),
          },
        }),
      ),
      Effect.runPromiseExit,
    )

    expect(missingId._tag).toBe("Failure")
    expect(missingWorkflow._tag).toBe("Failure")
    expect(missingExpression._tag).toBe("Failure")

    if (missingId._tag === "Failure") {
      expect(Cause.squash(missingId.cause)).toMatchObject({
        _tag: "HatchetCronError",
        workflowName: "orders.process",
      })
    }

    if (missingWorkflow._tag === "Failure") {
      expect(Cause.squash(missingWorkflow.cause)).toMatchObject({
        _tag: "HatchetCronError",
        cronId: "cron-missing-workflow",
      })
    }

    if (missingExpression._tag === "Failure") {
      expect(Cause.squash(missingExpression.cause)).toMatchObject({
        _tag: "HatchetCronError",
        cronId: "cron-missing-expression",
      })
    }
  })

  it("wraps SDK cron failures with typed context for every operation", async () => {
    const createCause = new Error("create unavailable")
    const getCause = new Error("get unavailable")
    const listCause = new Error("list unavailable")
    const deleteCause = new Error("delete unavailable")

    const createExit = await createCron("orders.process", {
      name: "orders-daily",
      expression: "0 0 * * *",
    }).pipe(
      provideHatchet(
        createMockHatchetClientLayer({
          crons: {
            create: async () => {
              throw createCause
            },
          },
        }),
      ),
      Effect.runPromiseExit,
    )

    const getExit = await getCron("cron-404").pipe(
      provideHatchet(
        createMockHatchetClientLayer({
          crons: {
            get: async () => {
              throw getCause
            },
          },
        }),
      ),
      Effect.runPromiseExit,
    )

    const listExit = await listCrons({ workflowName: "orders.process" }).pipe(
      provideHatchet(
        createMockHatchetClientLayer({
          crons: {
            list: async () => {
              throw listCause
            },
          },
        }),
      ),
      Effect.runPromiseExit,
    )

    const deleteExit = await deleteCron("cron-404").pipe(
      provideHatchet(
        createMockHatchetClientLayer({
          crons: {
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
      const error = Cause.squash(createExit.cause)
      expect(error).toBeInstanceOf(HatchetCronError)
      expect(error).toMatchObject({
        _tag: "HatchetCronError",
        workflowName: "orders.process",
        cause: createCause,
      })
    }

    if (getExit._tag === "Failure") {
      expect(Cause.squash(getExit.cause)).toMatchObject({
        _tag: "HatchetCronError",
        cronId: "cron-404",
        cause: getCause,
      })
    }

    if (listExit._tag === "Failure") {
      expect(Cause.squash(listExit.cause)).toMatchObject({
        _tag: "HatchetCronError",
        workflowName: "orders.process",
        cause: listCause,
      })
    }

    if (deleteExit._tag === "Failure") {
      expect(Cause.squash(deleteExit.cause)).toMatchObject({
        _tag: "HatchetCronError",
        cronId: "cron-404",
        cause: deleteCause,
      })
    }
  })
})
