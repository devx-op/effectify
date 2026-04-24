import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import { readSelectedRunId, readSelectedTaskId } from "./params.js"
import { type HatchetModule, loadHatchetModule } from "./module.js"
import type { HatchetWorkflowRunDetailsRecord, HatchetWorkflowRunRecord } from "./run-models.js"

export interface HatchetDemoObservabilityFallback {
  readonly selectedRunId?: string
  readonly selectedTaskId?: string
  readonly taskMetrics: {
    readonly byStatus: {
      readonly PENDING: number
      readonly RUNNING: number
      readonly COMPLETED: number
      readonly FAILED: number
      readonly CANCELLED: number
    }
  }
  readonly queueMetrics: {
    readonly total: {
      readonly queued: number
      readonly running: number
      readonly pending: number
    }
    readonly workflowBreakdown: Record<
      string,
      { queued: number; running: number; pending: number }
    >
    readonly stepRun: Record<string, number>
  }
  readonly error?: string
}

export interface HatchetDemoObservabilityRunData {
  readonly selectedRunId: string
  readonly selectedTaskId: string
  readonly run: HatchetWorkflowRunRecord
  readonly status: string
  readonly logs: Awaited<ReturnType<HatchetModule["listTaskLogs"]>> extends Effect.Effect<
    infer A,
    never,
    never
  > ? A
    : never
  readonly taskMetrics: Awaited<
    ReturnType<HatchetModule["getTaskMetrics"]>
  > extends Effect.Effect<infer A, never, never> ? A
    : never
  readonly queueMetrics: Awaited<
    ReturnType<HatchetModule["getQueueMetrics"]>
  > extends Effect.Effect<infer A, never, never> ? A
    : never
}

export interface HatchetDemoObservabilityTaskData {
  readonly selectedRunId?: string
  readonly selectedTaskId: string
  readonly logs: Awaited<ReturnType<HatchetModule["listTaskLogs"]>> extends Effect.Effect<
    infer A,
    never,
    never
  > ? A
    : never
  readonly taskMetrics: Awaited<
    ReturnType<HatchetModule["getTaskMetrics"]>
  > extends Effect.Effect<infer A, never, never> ? A
    : never
  readonly queueMetrics: Awaited<
    ReturnType<HatchetModule["getQueueMetrics"]>
  > extends Effect.Effect<infer A, never, never> ? A
    : never
}

export interface HatchetDemoObservabilityMetricsData {
  readonly selectedRunId?: string
  readonly selectedTaskId?: string
  readonly taskMetrics: Awaited<
    ReturnType<HatchetModule["getTaskMetrics"]>
  > extends Effect.Effect<infer A, never, never> ? A
    : never
  readonly queueMetrics: Awaited<
    ReturnType<HatchetModule["getQueueMetrics"]>
  > extends Effect.Effect<infer A, never, never> ? A
    : never
}

export const defaultObservability = (input?: {
  readonly selectedRunId?: string
  readonly selectedTaskId?: string
  readonly error?: string
}): HatchetDemoObservabilityFallback => ({
  selectedRunId: input?.selectedRunId,
  selectedTaskId: input?.selectedTaskId,
  taskMetrics: {
    byStatus: {
      PENDING: 0,
      RUNNING: 0,
      COMPLETED: 0,
      FAILED: 0,
      CANCELLED: 0,
    },
  },
  queueMetrics: {
    total: { queued: 0, running: 0, pending: 0 },
    workflowBreakdown: {},
    stepRun: {},
  },
  error: input?.error,
})

export const loadObservability = (requestUrl: string) =>
  Effect.gen(function*() {
    const hatchet = yield* loadHatchetModule()
    const selectedRunId = readSelectedRunId(requestUrl)
    const selectedTaskId = readSelectedTaskId(requestUrl)
    const taskMetricsEffect = hatchet.getTaskMetrics({
      since: new Date(0).toISOString(),
    })
    const queueMetricsEffect = hatchet.getQueueMetrics()

    if (selectedRunId) {
      const { run, status, taskId, taskMetrics, queueMetrics } = yield* Effect.all(
        {
          run: hatchet.getRun<HatchetWorkflowRunDetailsRecord>(selectedRunId),
          status: hatchet.getRunStatus(selectedRunId),
          taskId: hatchet.getRunTaskId(selectedRunId),
          taskMetrics: taskMetricsEffect,
          queueMetrics: queueMetricsEffect,
        },
        { concurrency: "unbounded" },
      )

      const logs = yield* hatchet.listTaskLogs(taskId)

      return {
        selectedRunId,
        selectedTaskId: taskId,
        run: run.run,
        status,
        logs,
        taskMetrics,
        queueMetrics,
      }
    }

    if (selectedTaskId) {
      const { logs, taskMetrics, queueMetrics } = yield* Effect.all(
        {
          logs: hatchet.listTaskLogs(selectedTaskId),
          taskMetrics: taskMetricsEffect,
          queueMetrics: queueMetricsEffect,
        },
        { concurrency: "unbounded" },
      )

      return {
        selectedRunId,
        selectedTaskId,
        logs,
        taskMetrics,
        queueMetrics,
      }
    }

    const { taskMetrics, queueMetrics } = yield* Effect.all(
      {
        taskMetrics: taskMetricsEffect,
        queueMetrics: queueMetricsEffect,
      },
      { concurrency: "unbounded" },
    )

    return {
      selectedRunId,
      selectedTaskId,
      taskMetrics,
      queueMetrics,
    }
  })

export const loadObservabilityWithFallback = (requestUrl: string) =>
  Effect.gen(function*() {
    const observabilityResult = yield* Effect.exit(
      loadObservability(requestUrl),
    )
    const observabilityCause = observabilityResult._tag === "Failure"
      ? Cause.squash(observabilityResult.cause)
      : undefined

    if (observabilityResult._tag === "Success") {
      return observabilityResult.value
    }

    return defaultObservability({
      selectedRunId: readSelectedRunId(requestUrl),
      selectedTaskId: readSelectedTaskId(requestUrl),
      error: observabilityCause instanceof Error
        ? observabilityCause.message
        : observabilityCause
        ? String(observabilityCause)
        : "Observability is temporarily unavailable",
    })
  })
