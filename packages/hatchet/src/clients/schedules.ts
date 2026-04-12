/**
 * @effectify/hatchet - Schedules Client
 *
 * Effect-first wrappers around the Hatchet SDK schedules surface.
 */

import * as Effect from "effect/Effect"
import type { HatchetClientService } from "../core/client.js"
import { getHatchetClient } from "../core/client.js"
import { HatchetScheduleError } from "../core/error.js"

interface ScheduledWorkflowMetadata {
  readonly id?: string
}

interface HatchetScheduledWorkflow {
  readonly metadata?: ScheduledWorkflowMetadata
  readonly workflowName?: string
  readonly triggerAt?: string
  readonly input?: unknown
  readonly additionalMetadata?: unknown
  readonly priority?: number
}

interface HatchetScheduledWorkflowList {
  readonly rows?: readonly HatchetScheduledWorkflow[]
}

export interface CreateScheduleOptions {
  readonly triggerAt: Date
  readonly input?: Record<string, unknown>
  readonly additionalMetadata?: Record<string, string>
  readonly priority?: number
}

export interface ListSchedulesOptions {
  readonly workflowName?: string
}

export interface HatchetScheduleRecord<TInput = Record<string, unknown>> {
  readonly scheduleId: string
  readonly workflowName: string
  readonly triggerAt: Date
  readonly input?: TInput
  readonly additionalMetadata?: Record<string, unknown>
  readonly priority?: number
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const parseTriggerAt = (
  triggerAt: string | undefined,
  context: { readonly scheduleId?: string; readonly workflowName?: string },
): Effect.Effect<Date, HatchetScheduleError> => {
  if (!triggerAt) {
    return Effect.fail(
      new HatchetScheduleError({
        message: "Scheduled workflow response did not include triggerAt",
        scheduleId: context.scheduleId,
        workflowName: context.workflowName,
      }),
    )
  }

  const parsed = new Date(triggerAt)

  if (Number.isNaN(parsed.getTime())) {
    return Effect.fail(
      new HatchetScheduleError({
        message: `Scheduled workflow response included an invalid triggerAt value: ${triggerAt}`,
        scheduleId: context.scheduleId,
        workflowName: context.workflowName,
      }),
    )
  }

  return Effect.succeed(parsed)
}

const normalizeSchedule = <TInput = Record<string, unknown>>(
  schedule: HatchetScheduledWorkflow,
  context: { readonly scheduleId?: string; readonly workflowName?: string },
): Effect.Effect<HatchetScheduleRecord<TInput>, HatchetScheduleError> =>
  Effect.gen(function*() {
    const scheduleId = schedule.metadata?.id ?? context.scheduleId

    if (!scheduleId) {
      return yield* Effect.fail(
        new HatchetScheduleError({
          message: `Scheduled workflow response did not include an id for workflow "${
            context.workflowName ?? schedule.workflowName ?? "unknown"
          }"`,
          workflowName: context.workflowName ?? schedule.workflowName,
        }),
      )
    }

    const workflowName = schedule.workflowName ?? context.workflowName

    if (!workflowName) {
      return yield* Effect.fail(
        new HatchetScheduleError({
          message: `Scheduled workflow "${scheduleId}" did not include a workflow name`,
          scheduleId,
        }),
      )
    }

    const triggerAt = yield* parseTriggerAt(schedule.triggerAt, {
      scheduleId,
      workflowName,
    })

    return {
      scheduleId,
      workflowName,
      triggerAt,
      input: schedule.input as TInput | undefined,
      additionalMetadata: isRecord(schedule.additionalMetadata)
        ? schedule.additionalMetadata
        : undefined,
      priority: schedule.priority,
    }
  })

export const createSchedule = <TInput = Record<string, unknown>>(
  workflowName: string,
  options: CreateScheduleOptions,
): Effect.Effect<
  HatchetScheduleRecord<TInput>,
  HatchetScheduleError,
  HatchetClientService
> =>
  Effect.gen(function*() {
    const client = yield* getHatchetClient()
    const schedule = yield* Effect.tryPromise({
      try: () => client.scheduled.create(workflowName, options),
      catch: (error) =>
        new HatchetScheduleError({
          message: `Failed to create schedule for workflow "${workflowName}"`,
          workflowName,
          cause: error,
        }),
    })

    return yield* normalizeSchedule<TInput>(
      schedule as HatchetScheduledWorkflow,
      {
        workflowName,
      },
    )
  })

export const getSchedule = <TInput = Record<string, unknown>>(
  scheduleId: string,
): Effect.Effect<
  HatchetScheduleRecord<TInput>,
  HatchetScheduleError,
  HatchetClientService
> =>
  Effect.gen(function*() {
    const client = yield* getHatchetClient()
    const schedule = yield* Effect.tryPromise({
      try: () => client.scheduled.get(scheduleId),
      catch: (error) =>
        new HatchetScheduleError({
          message: `Failed to get schedule "${scheduleId}"`,
          scheduleId,
          cause: error,
        }),
    })

    return yield* normalizeSchedule<TInput>(
      schedule as HatchetScheduledWorkflow,
      {
        scheduleId,
      },
    )
  })

export const listSchedules = <TInput = Record<string, unknown>>(
  options?: ListSchedulesOptions,
): Effect.Effect<
  readonly HatchetScheduleRecord<TInput>[],
  HatchetScheduleError,
  HatchetClientService
> =>
  Effect.gen(function*() {
    const client = yield* getHatchetClient()
    const workflowName = options?.workflowName
    const response = yield* Effect.tryPromise({
      try: () => client.scheduled.list(workflowName ? { workflow: workflowName } : {}),
      catch: (error) =>
        new HatchetScheduleError({
          message: workflowName
            ? `Failed to list schedules for workflow "${workflowName}"`
            : "Failed to list schedules",
          workflowName,
          cause: error,
        }),
    })

    const rows = (response as HatchetScheduledWorkflowList).rows ?? []

    return yield* Effect.forEach(rows, (schedule) => normalizeSchedule<TInput>(schedule, { workflowName }))
  })

export const deleteSchedule = (
  scheduleId: string,
): Effect.Effect<void, HatchetScheduleError, HatchetClientService> =>
  Effect.gen(function*() {
    const client = yield* getHatchetClient()
    yield* Effect.tryPromise({
      try: () => client.scheduled.delete(scheduleId),
      catch: (error) =>
        new HatchetScheduleError({
          message: `Failed to delete schedule "${scheduleId}"`,
          scheduleId,
          cause: error,
        }),
    })
  })
