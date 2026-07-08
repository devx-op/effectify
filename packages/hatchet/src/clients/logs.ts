/**
 * @effectify/hatchet - Logs Client
 *
 * Effect-first wrappers around Hatchet SDK log APIs.
 */

/**
 * - `LogQueryOptions` derives from the SDK logs client so task-log filters stay aligned with upstream contracts.
 * - `TenantLogQueryOptions` stays custom because the wrapper hides raw tenant-log transport keys behind friendlier names.
 * - `LogEntry` / `LogList` stay custom because normalization merges snake_case and camelCase payloads into a stable record.
 */

import * as Effect from "effect/Effect"
import type { LogsClient, V1LogLineLevel } from "@hatchet-dev/typescript-sdk"
import type { HatchetClientService } from "../core/client.js"
import { getHatchetClient } from "../core/client.js"
import { HatchetObservabilityError } from "../core/error.js"

type LogMetadata = Record<string, unknown>

type RawLogLine = {
  readonly message?: unknown
  readonly level?: unknown
  readonly createdAt?: unknown
  readonly created_at?: unknown
  readonly timestamp?: unknown
  readonly taskExternalId?: unknown
  readonly taskId?: unknown
  readonly task_id?: unknown
  readonly workflowRunId?: unknown
  readonly workflow_run_id?: unknown
  readonly runId?: unknown
  readonly run_id?: unknown
  readonly stepRunId?: unknown
  readonly step_run_id?: unknown
  readonly metadata?: unknown
  readonly attempt?: unknown
  readonly retryCount?: unknown
  readonly taskDisplayName?: unknown
}

type SdkLogQueryOptions = NonNullable<Parameters<LogsClient["list"]>[1]>

export type LogQueryOptions = SdkLogQueryOptions

export type TenantLogQueryOptions = LogQueryOptions & {
  readonly taskIds?: readonly string[]
  readonly workflowIds?: readonly string[]
  readonly stepIds?: readonly string[]
}

export interface LogEntry {
  readonly message: string
  readonly level?: string
  readonly timestamp: string
  readonly taskId?: string
  readonly runId?: string
  readonly stepRunId?: string
  readonly metadata?: LogMetadata
  readonly attempt?: number
  readonly retryCount?: number
  readonly taskDisplayName?: string
}

export interface LogList {
  readonly rows: LogEntry[]
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const asString = (value: unknown): string | undefined =>
  typeof value === "string" && value.length > 0 ? value : undefined

const asNumber = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined

const getRecordValue = (
  record: Record<string, unknown> | undefined,
  keys: readonly string[],
): string | undefined => {
  if (!record) {
    return undefined
  }

  for (const key of keys) {
    const value = asString(record[key])

    if (value) {
      return value
    }
  }

  return undefined
}

const normalizeLogEntry = (row: RawLogLine): LogEntry => {
  const metadata = isRecord(row.metadata) ? row.metadata : undefined

  return {
    message: asString(row.message) ?? "",
    level: asString(row.level),
    timestamp: asString(row.createdAt) ??
      asString(row.created_at) ??
      asString(row.timestamp) ??
      "",
    taskId: asString(row.taskExternalId) ??
      asString(row.taskId) ??
      asString(row.task_id) ??
      getRecordValue(metadata, ["taskExternalId", "taskId", "task_id"]),
    runId: asString(row.workflowRunId) ??
      asString(row.workflow_run_id) ??
      asString(row.runId) ??
      asString(row.run_id) ??
      getRecordValue(metadata, [
        "workflowRunId",
        "workflow_run_id",
        "runId",
        "run_id",
      ]),
    stepRunId: asString(row.stepRunId) ??
      asString(row.step_run_id) ??
      getRecordValue(metadata, ["stepRunId", "step_run_id"]),
    metadata,
    attempt: asNumber(row.attempt),
    retryCount: asNumber(row.retryCount),
    taskDisplayName: asString(row.taskDisplayName),
  }
}

const normalizeLogList = (payload: unknown): LogList => {
  const rows = isRecord(payload) && Array.isArray(payload.rows) ? payload.rows : []

  return {
    rows: rows.map((row) => normalizeLogEntry((isRecord(row) ? row : {}) as RawLogLine)),
  }
}

const toIsoString = (value: Date | undefined) => value?.toISOString()

const compactRecord = <T extends Record<string, unknown>>(record: T) =>
  Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined),
  ) as Partial<T>

const toTaskLogQuery = (options?: LogQueryOptions) =>
  compactRecord({
    limit: options?.limit,
    since: toIsoString(options?.since),
    until: toIsoString(options?.until),
    search: options?.search,
    levels: options?.levels
      ? ([...options.levels] as V1LogLineLevel[])
      : undefined,
    attempt: options?.attempt,
  })

const toTenantLogQuery = (options?: TenantLogQueryOptions) => ({
  ...toTaskLogQuery(options),
  taskExternalIds: options?.taskIds ? [...options.taskIds] : undefined,
  workflow_ids: options?.workflowIds ? [...options.workflowIds] : undefined,
  step_ids: options?.stepIds ? [...options.stepIds] : undefined,
})

export const listTaskLogs = (
  taskId: string,
  options?: LogQueryOptions,
): Effect.Effect<LogList, HatchetObservabilityError, HatchetClientService> =>
  Effect.gen(function*() {
    const client = yield* getHatchetClient()
    const response = yield* Effect.tryPromise({
      try: () => client.api.v1LogLineList(taskId, toTaskLogQuery(options) as never),
      catch: (cause) =>
        new HatchetObservabilityError({
          message: `Failed to list task logs for "${taskId}"`,
          operation: "logs",
          endpoint: "api.v1LogLineList",
          taskId,
          cause,
        }),
    })

    return normalizeLogList(response.data)
  })

export const listTenantLogs = (
  options?: TenantLogQueryOptions,
): Effect.Effect<LogList, HatchetObservabilityError, HatchetClientService> =>
  Effect.gen(function*() {
    const client = yield* getHatchetClient()
    const response = yield* Effect.tryPromise({
      try: () =>
        client.api.v1TenantLogLineList(
          client.tenantId,
          toTenantLogQuery(options) as never,
        ),
      catch: (cause) =>
        new HatchetObservabilityError({
          message: `Failed to list tenant logs for "${client.tenantId}"`,
          operation: "logs",
          endpoint: "api.v1TenantLogLineList",
          tenantId: client.tenantId,
          cause,
        }),
    })

    return normalizeLogList(response.data)
  })
