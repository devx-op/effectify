/**
 * @effectify/hatchet - Metrics Client
 *
 * Effect-first wrappers around Hatchet SDK metrics APIs.
 */

import * as Effect from "effect/Effect"
import type { HatchetClientService } from "../core/client.js"
import { getHatchetClient } from "../core/client.js"
import { HatchetObservabilityError } from "../core/error.js"

type QueueCounter = {
  readonly numQueued?: unknown
  readonly numRunning?: unknown
  readonly numPending?: unknown
}

type QueueCounterRecord = Record<string, QueueCounter>

type TaskMetricRow = {
  readonly status?: unknown
  readonly count?: unknown
}

export interface TaskMetrics {
  readonly byStatus: {
    readonly PENDING: number
    readonly RUNNING: number
    readonly COMPLETED: number
    readonly FAILED: number
    readonly CANCELLED: number
  }
}

type MutableTaskMetrics = {
  byStatus: {
    PENDING: number
    RUNNING: number
    COMPLETED: number
    FAILED: number
    CANCELLED: number
  }
}

export interface QueueMetricCounts {
  readonly queued: number
  readonly running: number
  readonly pending: number
}

export interface QueueMetrics {
  readonly total: QueueMetricCounts
  readonly workflowBreakdown: Record<string, QueueMetricCounts>
  readonly stepRun: Record<string, number>
}

export interface TaskMetricsQueryOptions {
  readonly since: string
  readonly until?: string
  readonly workflowIds?: readonly string[]
  readonly parentTaskExternalId?: string
  readonly triggeringEventExternalId?: string
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const asNumber = (value: unknown): number => typeof value === "number" && Number.isFinite(value) ? value : 0

const emptyTaskMetrics = (): MutableTaskMetrics => ({
  byStatus: {
    PENDING: 0,
    RUNNING: 0,
    COMPLETED: 0,
    FAILED: 0,
    CANCELLED: 0,
  },
})

export const emptyQueueMetrics = (): QueueMetrics => ({
  total: { queued: 0, running: 0, pending: 0 },
  workflowBreakdown: {},
  stepRun: {},
})

const normalizeTaskStatus = (
  status: unknown,
): keyof TaskMetrics["byStatus"] | undefined => {
  switch (status) {
    case "QUEUED":
    case "PENDING":
      return "PENDING"
    case "RUNNING":
      return "RUNNING"
    case "SUCCEEDED":
    case "COMPLETED":
      return "COMPLETED"
    case "FAILED":
      return "FAILED"
    case "CANCELLED":
    case "CANCELED":
      return "CANCELLED"
    default:
      return undefined
  }
}

const normalizeTaskMetrics = (payload: unknown): TaskMetrics => {
  const metrics = emptyTaskMetrics()
  const rows = Array.isArray(payload) ? payload : []

  for (const row of rows) {
    const status = normalizeTaskStatus((row as TaskMetricRow).status)

    if (status) {
      metrics.byStatus[status] = asNumber((row as TaskMetricRow).count)
    }
  }

  return metrics as TaskMetrics
}

const normalizeQueueCounts = (payload: unknown): QueueMetricCounts => {
  const row = isRecord(payload) ? (payload as QueueCounter) : {}

  return {
    queued: asNumber(row.numQueued),
    running: asNumber(row.numRunning),
    pending: asNumber(row.numPending),
  }
}

const normalizeStepRunQueueMetrics = (
  payload: unknown,
): Record<string, number> => {
  if (!isRecord(payload)) {
    return {}
  }

  return Object.entries(payload).reduce<Record<string, number>>(
    (acc, [key, value]) => {
      acc[key] = asNumber(value)
      return acc
    },
    {},
  )
}

const normalizeQueueMetrics = (
  queueMetrics: unknown,
  stepRunMetrics: unknown,
): QueueMetrics => {
  const queuePayload = isRecord(queueMetrics) ? queueMetrics : {}
  const workflow = isRecord(queuePayload.workflow)
    ? (queuePayload.workflow as QueueCounterRecord)
    : {}

  return {
    total: normalizeQueueCounts(queuePayload.total),
    workflowBreakdown: Object.entries(workflow).reduce<
      Record<string, QueueMetricCounts>
    >((acc, [key, value]) => {
      acc[key] = normalizeQueueCounts(value)
      return acc
    }, {}),
    stepRun: normalizeStepRunQueueMetrics(
      isRecord(stepRunMetrics) ? stepRunMetrics.queues : undefined,
    ),
  }
}

const toTaskMetricsQuery = (options: TaskMetricsQueryOptions) => ({
  since: options.since,
  until: options.until,
  workflow_ids: options.workflowIds ? [...options.workflowIds] : undefined,
  parent_task_external_id: options.parentTaskExternalId,
  triggering_event_external_id: options.triggeringEventExternalId,
})

export const getTaskMetrics = (
  options: TaskMetricsQueryOptions,
): Effect.Effect<
  TaskMetrics,
  HatchetObservabilityError,
  HatchetClientService
> =>
  Effect.gen(function*() {
    const client = yield* getHatchetClient()
    const response = yield* Effect.tryPromise({
      try: () =>
        client.api.v1TaskListStatusMetrics(
          client.tenantId,
          toTaskMetricsQuery(options),
        ),
      catch: (cause) =>
        new HatchetObservabilityError({
          message: `Failed to read task metrics for "${client.tenantId}"`,
          operation: "metrics",
          endpoint: "api.v1TaskListStatusMetrics",
          tenantId: client.tenantId,
          cause,
        }),
    })

    return normalizeTaskMetrics(response.data)
  })

export const getQueueMetrics = (): Effect.Effect<
  QueueMetrics,
  HatchetObservabilityError,
  HatchetClientService
> =>
  Effect.gen(function*() {
    const client = yield* getHatchetClient()

    const [queueResponse, stepRunResponse] = yield* Effect.all(
      [
        Effect.tryPromise({
          try: () => client.api.tenantGetQueueMetrics(client.tenantId),
          catch: (cause) =>
            new HatchetObservabilityError({
              message: `Failed to read queue metrics for "${client.tenantId}"`,
              operation: "metrics",
              endpoint: "api.tenantGetQueueMetrics",
              tenantId: client.tenantId,
              cause,
            }),
        }),
        Effect.tryPromise({
          try: () => client.api.tenantGetStepRunQueueMetrics(client.tenantId),
          catch: (cause) =>
            new HatchetObservabilityError({
              message: `Failed to read step run queue metrics for "${client.tenantId}"`,
              operation: "metrics",
              endpoint: "api.tenantGetStepRunQueueMetrics",
              tenantId: client.tenantId,
              cause,
            }),
        }),
      ],
      { concurrency: "unbounded" },
    )

    return normalizeQueueMetrics(queueResponse.data, stepRunResponse.data)
  })
