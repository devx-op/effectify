/**
 * @effectify/hatchet - Filters Client Tests
 */

import { describe, expect, it, vi } from "vitest"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import {
  createFilter,
  type CreateFilterInput,
  deleteFilter,
  getFilter,
  type HatchetFilterRecord,
  listFilters,
  type ListFiltersOptions,
  normalizeFilter,
} from "../../../src/clients/filters.js"
import * as publicApi from "../../../src/index.js"
import { HatchetFilterError } from "../../../src/core/error.js"
import { createMockHatchetClientLayer, TestHatchetConfigLayer } from "../../../src/testing/mock-client.js"

const provideHatchet = (
  layer: ReturnType<typeof createMockHatchetClientLayer>,
) => Effect.provide(Layer.mergeAll(TestHatchetConfigLayer, layer))

describe("Filters Client", () => {
  it("exports the filter client surface through the public API", () => {
    const listOptions: ListFiltersOptions = {
      limit: 10,
      offset: 5,
      workflowIds: ["workflow-1"],
      scopes: ["tenant:demo"],
    }
    const createInput: CreateFilterInput = {
      workflowId: "workflow-1",
      scope: "tenant:demo",
      expression: "input.kind == 'demo'",
      payload: { feature: "filters" },
    }

    expect(publicApi.listFilters).toBe(listFilters)
    expect(publicApi.createFilter).toBe(createFilter)
    expect(publicApi.getFilter).toBe(getFilter)
    expect(publicApi.deleteFilter).toBe(deleteFilter)
    expect(listOptions.workflowIds).toEqual(["workflow-1"])
    expect(createInput.payload).toEqual({ feature: "filters" })
  })

  it("creates HatchetFilterError values without helper factories", () => {
    const cause = new Error("invalid expression")
    const error = new HatchetFilterError({
      message: "Failed to create filter",
      operation: "create",
      workflowId: "workflow-1",
      cause,
    })

    expect(error._tag).toBe("HatchetFilterError")
    expect(error.workflowId).toBe("workflow-1")
    expect(error.cause).toBe(cause)
  })

  it("listFilters forwards verified SDK query options and normalizes rows", async () => {
    const result = await listFilters({
      limit: 5,
      offset: 10,
      workflowIds: ["workflow-1"],
      scopes: ["tenant:demo"],
    }).pipe(
      provideHatchet(
        createMockHatchetClientLayer({
          filters: {
            list: async (query) => {
              expect(query).toEqual({
                limit: 5,
                offset: 10,
                workflowIds: ["workflow-1"],
                scopes: ["tenant:demo"],
              })

              return {
                rows: [
                  {
                    metadata: { id: "filter-1" },
                    tenantId: "tenant-1",
                    workflowId: "workflow-1",
                    scope: "tenant:demo",
                    expression: "input.kind == 'demo'",
                    payload: { feature: "filters" },
                    isDeclarative: true,
                  },
                ],
              }
            },
          },
        }),
      ),
      Effect.runPromise,
    )

    expect(result).toEqual<readonly HatchetFilterRecord[]>([
      {
        filterId: "filter-1",
        tenantId: "tenant-1",
        workflowId: "workflow-1",
        scope: "tenant:demo",
        expression: "input.kind == 'demo'",
        payload: { feature: "filters" },
        isDeclarative: true,
      },
    ])
  })

  it("createFilter maps inputs to the SDK surface and normalizes the response", async () => {
    const payload = { feature: "filters" }

    const result = await createFilter({
      workflowId: "workflow-1",
      scope: "tenant:demo",
      expression: "input.kind == 'demo'",
      payload,
    }).pipe(
      provideHatchet(
        createMockHatchetClientLayer({
          filters: {
            create: async (input) => {
              expect(input).toEqual({
                workflowId: "workflow-1",
                scope: "tenant:demo",
                expression: "input.kind == 'demo'",
                payload,
              })

              return {
                metadata: { id: "filter-2" },
                tenantId: "tenant-1",
                workflowId: "workflow-1",
                scope: "tenant:demo",
                expression: "input.kind == 'demo'",
                payload,
                isDeclarative: false,
              }
            },
          },
        }),
      ),
      Effect.runPromise,
    )

    expect(result).toEqual<HatchetFilterRecord>({
      filterId: "filter-2",
      tenantId: "tenant-1",
      workflowId: "workflow-1",
      scope: "tenant:demo",
      expression: "input.kind == 'demo'",
      payload,
      isDeclarative: false,
    })
  })

  it("getFilter normalizes selected filter details by filter id", async () => {
    const result = await getFilter("filter-3").pipe(
      provideHatchet(
        createMockHatchetClientLayer({
          filters: {
            get: async (filterId) => {
              expect(filterId).toBe("filter-3")

              return {
                metadata: { id: filterId },
                tenantId: "tenant-1",
                workflowId: "workflow-2",
                scope: "tenant:demo",
                expression: "input.priority > 1",
                payload: { severity: "high" },
              }
            },
          },
        }),
      ),
      Effect.runPromise,
    )

    expect(result).toEqual<HatchetFilterRecord>({
      filterId: "filter-3",
      tenantId: "tenant-1",
      workflowId: "workflow-2",
      scope: "tenant:demo",
      expression: "input.priority > 1",
      payload: { severity: "high" },
    })
  })

  it("deleteFilter forwards the filter id and ignores the SDK response body", async () => {
    await deleteFilter("filter-4").pipe(
      provideHatchet(
        createMockHatchetClientLayer({
          filters: {
            delete: async (filterId) => {
              expect(filterId).toBe("filter-4")

              return {
                metadata: { id: "filter-4" },
                tenantId: "tenant-1",
                workflowId: "workflow-1",
                scope: "tenant:demo",
                expression: "input.kind == 'demo'",
                payload: {},
              }
            },
          },
        }),
      ),
      Effect.runPromise,
    )
  })

  it("normalizeFilter rejects malformed SDK payloads and missing fields", async () => {
    const malformedPayload = await normalizeFilter(
      {
        metadata: { id: "filter-5" },
        tenantId: "tenant-1",
        workflowId: "workflow-1",
        scope: "tenant:demo",
        expression: "input.kind == 'demo'",
        payload: "bad-payload",
      },
      { operation: "get", filterId: "filter-5" },
    ).pipe(Effect.runPromiseExit)

    const missingId = await normalizeFilter(
      {
        metadata: {},
        tenantId: "tenant-1",
        workflowId: "workflow-1",
        scope: "tenant:demo",
        expression: "input.kind == 'demo'",
        payload: {},
      },
      { operation: "list" },
    ).pipe(Effect.runPromiseExit)

    expect(malformedPayload._tag).toBe("Failure")
    expect(missingId._tag).toBe("Failure")

    if (malformedPayload._tag === "Failure") {
      const error = Cause.squash(malformedPayload.cause) as HatchetFilterError
      expect(error.message).toContain("payload")
      expect(error.filterId).toBe("filter-5")
    }

    if (missingId._tag === "Failure") {
      const error = Cause.squash(missingId.cause) as HatchetFilterError
      expect(error.message).toContain("metadata.id")
      expect(error.operation).toBe("list")
    }
  })

  it("normalizeFilter rejects missing tenant, workflow, scope, and expression fields", async () => {
    const missingTenant = await normalizeFilter(
      {
        metadata: { id: "filter-tenant" },
        workflowId: "workflow-1",
        scope: "tenant:demo",
        expression: "input.kind == 'demo'",
        payload: {},
      },
      { operation: "list" },
    ).pipe(Effect.runPromiseExit)

    const missingWorkflow = await normalizeFilter(
      {
        metadata: { id: "filter-workflow" },
        tenantId: "tenant-1",
        scope: "tenant:demo",
        expression: "input.kind == 'demo'",
        payload: {},
      },
      { operation: "get", filterId: "filter-workflow" },
    ).pipe(Effect.runPromiseExit)

    const missingScope = await normalizeFilter(
      {
        metadata: { id: "filter-scope" },
        tenantId: "tenant-1",
        workflowId: "workflow-1",
        expression: "input.kind == 'demo'",
        payload: {},
      },
      { operation: "create", workflowId: "workflow-1" },
    ).pipe(Effect.runPromiseExit)

    const missingExpression = await normalizeFilter(
      {
        metadata: { id: "filter-expression" },
        tenantId: "tenant-1",
        workflowId: "workflow-1",
        scope: "tenant:demo",
        payload: {},
      },
      { operation: "get", filterId: "filter-expression" },
    ).pipe(Effect.runPromiseExit)

    expect(missingTenant._tag).toBe("Failure")
    expect(missingWorkflow._tag).toBe("Failure")
    expect(missingScope._tag).toBe("Failure")
    expect(missingExpression._tag).toBe("Failure")

    if (missingTenant._tag === "Failure") {
      const error = Cause.squash(missingTenant.cause) as HatchetFilterError
      expect(error.message).toContain("tenantId")
      expect(error.filterId).toBe("filter-tenant")
    }

    if (missingWorkflow._tag === "Failure") {
      const error = Cause.squash(missingWorkflow.cause) as HatchetFilterError
      expect(error.message).toContain("workflowId")
      expect(error.filterId).toBe("filter-workflow")
    }

    if (missingScope._tag === "Failure") {
      const error = Cause.squash(missingScope.cause) as HatchetFilterError
      expect(error.message).toContain("scope")
      expect(error.workflowId).toBe("workflow-1")
    }

    if (missingExpression._tag === "Failure") {
      const error = Cause.squash(missingExpression.cause) as HatchetFilterError
      expect(error.message).toContain("expression")
      expect(error.filterId).toBe("filter-expression")
    }
  })

  it("createFilter rejects blank workflow, scope, and expression before calling the SDK", async () => {
    const createMock = vi.fn(async () => ({
      metadata: { id: "filter-never" },
      tenantId: "tenant-1",
      workflowId: "workflow-1",
      scope: "tenant:demo",
      expression: "input.kind == 'demo'",
      payload: {},
    }))
    const layer = provideHatchet(
      createMockHatchetClientLayer({
        filters: {
          create: createMock,
        },
      }),
    )

    const missingWorkflow = await createFilter({
      workflowId: "   ",
      scope: "tenant:demo",
      expression: "input.kind == 'demo'",
    }).pipe(layer, Effect.runPromiseExit)

    const missingScope = await createFilter({
      workflowId: "workflow-1",
      scope: "   ",
      expression: "input.kind == 'demo'",
    }).pipe(layer, Effect.runPromiseExit)

    const missingExpression = await createFilter({
      workflowId: "workflow-1",
      scope: "tenant:demo",
      expression: "   ",
    }).pipe(layer, Effect.runPromiseExit)

    expect(createMock).not.toHaveBeenCalled()

    if (missingWorkflow._tag === "Failure") {
      expect(
        (Cause.squash(missingWorkflow.cause) as HatchetFilterError).message,
      ).toBe("Workflow ID is required")
    }

    if (missingScope._tag === "Failure") {
      expect(
        (Cause.squash(missingScope.cause) as HatchetFilterError).message,
      ).toBe("Filter scope is required")
    }

    if (missingExpression._tag === "Failure") {
      expect(
        (Cause.squash(missingExpression.cause) as HatchetFilterError).message,
      ).toBe("Filter expression is required")
    }
  })

  it("wraps SDK failures with HatchetFilterError context", async () => {
    const cause = new Error("invalid CEL expression")

    const exit = await createFilter({
      workflowId: "workflow-1",
      scope: "tenant:demo",
      expression: "input.",
    }).pipe(
      provideHatchet(
        createMockHatchetClientLayer({
          filters: {
            create: async () => {
              throw cause
            },
          },
        }),
      ),
      Effect.runPromiseExit,
    )

    expect(exit._tag).toBe("Failure")

    if (exit._tag === "Failure") {
      const error = Cause.squash(exit.cause) as HatchetFilterError
      expect(error).toBeInstanceOf(HatchetFilterError)
      expect(error).toMatchObject({
        _tag: "HatchetFilterError",
        operation: "create",
        workflowId: "workflow-1",
      })
      expect(error.cause).toBe(cause)
    }
  })

  it("wraps list, get, and delete SDK failures with HatchetFilterError context", async () => {
    const listCause = new Error("list failed")
    const getCause = new Error("get failed")
    const deleteCause = new Error("delete failed")

    const listExit = await listFilters().pipe(
      provideHatchet(
        createMockHatchetClientLayer({
          filters: {
            list: async () => {
              throw listCause
            },
          },
        }),
      ),
      Effect.runPromiseExit,
    )

    const getExit = await getFilter("filter-7").pipe(
      provideHatchet(
        createMockHatchetClientLayer({
          filters: {
            get: async () => {
              throw getCause
            },
          },
        }),
      ),
      Effect.runPromiseExit,
    )

    const deleteExit = await deleteFilter("filter-8").pipe(
      provideHatchet(
        createMockHatchetClientLayer({
          filters: {
            delete: async () => {
              throw deleteCause
            },
          },
        }),
      ),
      Effect.runPromiseExit,
    )

    expect(listExit._tag).toBe("Failure")
    expect(getExit._tag).toBe("Failure")
    expect(deleteExit._tag).toBe("Failure")

    if (listExit._tag === "Failure") {
      const error = Cause.squash(listExit.cause) as HatchetFilterError
      expect(error.message).toBe("Failed to list filters")
      expect(error.operation).toBe("list")
      expect(error.cause).toBe(listCause)
    }

    if (getExit._tag === "Failure") {
      const error = Cause.squash(getExit.cause) as HatchetFilterError
      expect(error.message).toBe('Failed to get filter "filter-7"')
      expect(error.filterId).toBe("filter-7")
      expect(error.cause).toBe(getCause)
    }

    if (deleteExit._tag === "Failure") {
      const error = Cause.squash(deleteExit.cause) as HatchetFilterError
      expect(error.message).toBe('Failed to delete filter "filter-8"')
      expect(error.operation).toBe("delete")
      expect(error.filterId).toBe("filter-8")
      expect(error.cause).toBe(deleteCause)
    }
  })
})
