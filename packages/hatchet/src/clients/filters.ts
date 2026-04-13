/**
 * @effectify/hatchet - Filters Client
 *
 * Effect-first wrappers around the Hatchet SDK filters surface.
 */

import * as Effect from "effect/Effect"
import type { HatchetClientService } from "../core/client.js"
import { getHatchetClient } from "../core/client.js"
import { HatchetFilterError } from "../core/error.js"

interface HatchetSdkFilter {
  readonly metadata?: {
    readonly id?: string
  }
  readonly tenantId?: string
  readonly workflowId?: string
  readonly scope?: string
  readonly expression?: string
  readonly payload?: unknown
  readonly isDeclarative?: boolean
}

export interface HatchetFilterRecord {
  readonly filterId: string
  readonly tenantId: string
  readonly workflowId: string
  readonly scope: string
  readonly expression: string
  readonly payload: Record<string, unknown>
  readonly isDeclarative?: boolean
}

export interface ListFiltersOptions {
  readonly limit?: number
  readonly offset?: number
  readonly workflowIds?: readonly string[]
  readonly scopes?: readonly string[]
}

export interface CreateFilterInput {
  readonly workflowId: string
  readonly scope: string
  readonly expression: string
  readonly payload?: Record<string, unknown>
}

type FilterOperation = "list" | "create" | "get" | "delete"

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const failFilter = (
  message: string,
  context: {
    readonly operation: FilterOperation
    readonly filterId?: string
    readonly workflowId?: string
    readonly cause?: unknown
  },
) =>
  new HatchetFilterError({
    message,
    operation: context.operation,
    filterId: context.filterId,
    workflowId: context.workflowId,
    cause: context.cause,
  })

export const normalizeFilter = (
  filter: HatchetSdkFilter,
  context: {
    readonly operation: FilterOperation
    readonly filterId?: string
    readonly workflowId?: string
  },
): Effect.Effect<HatchetFilterRecord, HatchetFilterError> =>
  Effect.gen(function*() {
    const filterId = filter.metadata?.id

    if (!filterId) {
      return yield* failFilter(
        "Filter response did not include metadata.id",
        context,
      )
    }

    if (!filter.tenantId) {
      return yield* failFilter("Filter response did not include tenantId", {
        ...context,
        filterId,
      })
    }

    if (!filter.workflowId) {
      return yield* failFilter("Filter response did not include workflowId", {
        ...context,
        filterId,
      })
    }

    if (!filter.scope) {
      return yield* failFilter("Filter response did not include scope", {
        ...context,
        filterId,
        workflowId: filter.workflowId,
      })
    }

    if (!filter.expression) {
      return yield* failFilter("Filter response did not include expression", {
        ...context,
        filterId,
        workflowId: filter.workflowId,
      })
    }

    if (!isRecord(filter.payload)) {
      return yield* failFilter("Filter response payload must be an object", {
        ...context,
        filterId,
        workflowId: filter.workflowId,
      })
    }

    return {
      filterId,
      tenantId: filter.tenantId,
      workflowId: filter.workflowId,
      scope: filter.scope,
      expression: filter.expression,
      payload: filter.payload,
      isDeclarative: typeof filter.isDeclarative === "boolean"
        ? filter.isDeclarative
        : undefined,
    }
  })

const validateCreateInput = (
  input: CreateFilterInput,
): Effect.Effect<CreateFilterInput, HatchetFilterError> =>
  Effect.gen(function*() {
    if (!input.workflowId.trim()) {
      return yield* failFilter("Workflow ID is required", {
        operation: "create",
        workflowId: input.workflowId,
      })
    }

    if (!input.scope.trim()) {
      return yield* failFilter("Filter scope is required", {
        operation: "create",
        workflowId: input.workflowId,
      })
    }

    if (!input.expression.trim()) {
      return yield* failFilter("Filter expression is required", {
        operation: "create",
        workflowId: input.workflowId,
      })
    }

    return input
  })

export const listFilters = (
  options?: ListFiltersOptions,
): Effect.Effect<
  readonly HatchetFilterRecord[],
  HatchetFilterError,
  HatchetClientService
> =>
  Effect.gen(function*() {
    const client = yield* getHatchetClient()
    const query = options
      ? ({
        limit: options.limit,
        offset: options.offset,
        workflowIds: options.workflowIds
          ? [...options.workflowIds]
          : undefined,
        scopes: options.scopes ? [...options.scopes] : undefined,
      } as Parameters<typeof client.filters.list>[0])
      : undefined
    const response = yield* Effect.tryPromise({
      try: () => client.filters.list(query),
      catch: (cause) =>
        failFilter("Failed to list filters", {
          operation: "list",
          cause,
        }),
    })

    return yield* Effect.forEach(response.rows ?? [], (filter) =>
      normalizeFilter(filter, {
        operation: "list",
        filterId: filter.metadata?.id,
        workflowId: filter.workflowId,
      }))
  })

export const createFilter = (
  input: CreateFilterInput,
): Effect.Effect<
  HatchetFilterRecord,
  HatchetFilterError,
  HatchetClientService
> =>
  Effect.gen(function*() {
    const validInput = yield* validateCreateInput(input)
    const client = yield* getHatchetClient()
    const filter = yield* Effect.tryPromise({
      try: () => client.filters.create(validInput),
      catch: (cause) =>
        failFilter("Failed to create filter", {
          operation: "create",
          workflowId: validInput.workflowId,
          cause,
        }),
    })

    return yield* normalizeFilter(filter, {
      operation: "create",
      filterId: filter.metadata?.id,
      workflowId: validInput.workflowId,
    })
  })

export const getFilter = (
  filterId: string,
): Effect.Effect<
  HatchetFilterRecord,
  HatchetFilterError,
  HatchetClientService
> =>
  Effect.gen(function*() {
    const client = yield* getHatchetClient()
    const filter = yield* Effect.tryPromise({
      try: () => client.filters.get(filterId),
      catch: (cause) =>
        failFilter(`Failed to get filter "${filterId}"`, {
          operation: "get",
          filterId,
          cause,
        }),
    })

    return yield* normalizeFilter(filter, {
      operation: "get",
      filterId,
      workflowId: filter.workflowId,
    })
  })

export const deleteFilter = (
  filterId: string,
): Effect.Effect<void, HatchetFilterError, HatchetClientService> =>
  Effect.gen(function*() {
    const client = yield* getHatchetClient()
    yield* Effect.tryPromise({
      try: () => client.filters.delete(filterId),
      catch: (cause) =>
        failFilter(`Failed to delete filter "${filterId}"`, {
          operation: "delete",
          filterId,
          cause,
        }),
    })
  })
