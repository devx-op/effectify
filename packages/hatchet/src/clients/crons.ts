/**
 * @effectify/hatchet - Crons Client
 *
 * Effect-first wrappers around the Hatchet SDK crons surface.
 */

import * as Effect from "effect/Effect"
import type { HatchetClientService } from "../core/client.js"
import { getHatchetClient } from "../core/client.js"
import { HatchetCronError } from "../core/error.js"

interface CronWorkflowMetadata {
  readonly id?: string
}

interface HatchetCronWorkflow {
  readonly metadata?: CronWorkflowMetadata
  readonly workflowName?: string
  readonly cron?: string
  readonly name?: string
  readonly input?: unknown
  readonly additionalMetadata?: unknown
  readonly enabled?: boolean
  readonly method?: "DEFAULT" | "API"
  readonly priority?: number
}

interface HatchetCronWorkflowList {
  readonly rows?: readonly HatchetCronWorkflow[]
}

export interface CreateCronOptions {
  readonly name: string
  readonly expression: string
  readonly input?: Record<string, unknown>
  readonly additionalMetadata?: Record<string, string>
  readonly priority?: number
}

export interface ListCronsOptions {
  readonly workflowName?: string
  readonly cronName?: string
  readonly offset?: number
  readonly limit?: number
}

export interface HatchetCronRecord<TInput = Record<string, unknown>> {
  readonly cronId: string
  readonly workflowName: string
  readonly cron: string
  readonly name?: string
  readonly input?: TInput
  readonly additionalMetadata?: Record<string, unknown>
  readonly enabled: boolean
  readonly method: "DEFAULT" | "API"
  readonly priority?: number
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const normalizeCron = <TInput = Record<string, unknown>>(
  cron: HatchetCronWorkflow,
  context: { readonly cronId?: string; readonly workflowName?: string },
): Effect.Effect<HatchetCronRecord<TInput>, HatchetCronError> =>
  Effect.gen(function*() {
    const cronId = cron.metadata?.id ?? context.cronId

    if (!cronId) {
      return yield* Effect.fail(
        HatchetCronError.of(
          `Cron workflow response did not include an id for workflow "${
            context.workflowName ?? cron.workflowName ?? "unknown"
          }"`,
          undefined,
          context.workflowName ?? cron.workflowName,
        ),
      )
    }

    const workflowName = cron.workflowName ?? context.workflowName

    if (!workflowName) {
      return yield* Effect.fail(
        HatchetCronError.of(
          `Cron workflow "${cronId}" did not include a workflow name`,
          cronId,
        ),
      )
    }

    if (!cron.cron) {
      return yield* Effect.fail(
        HatchetCronError.of(
          `Cron workflow "${cronId}" did not include a cron expression`,
          cronId,
          workflowName,
        ),
      )
    }

    if (typeof cron.enabled !== "boolean") {
      return yield* Effect.fail(
        HatchetCronError.of(
          `Cron workflow "${cronId}" did not include enabled status`,
          cronId,
          workflowName,
        ),
      )
    }

    if (cron.method !== "DEFAULT" && cron.method !== "API") {
      return yield* Effect.fail(
        HatchetCronError.of(
          `Cron workflow "${cronId}" did not include a supported method`,
          cronId,
          workflowName,
        ),
      )
    }

    return {
      cronId,
      workflowName,
      cron: cron.cron,
      name: cron.name,
      input: cron.input as TInput | undefined,
      additionalMetadata: isRecord(cron.additionalMetadata)
        ? cron.additionalMetadata
        : undefined,
      enabled: cron.enabled,
      method: cron.method,
      priority: cron.priority,
    }
  })

export const createCron = <TInput = Record<string, unknown>>(
  workflowName: string,
  options: CreateCronOptions,
): Effect.Effect<
  HatchetCronRecord<TInput>,
  HatchetCronError,
  HatchetClientService
> =>
  Effect.gen(function*() {
    const client = yield* getHatchetClient()
    const cron = yield* Effect.tryPromise({
      try: () => client.crons.create(workflowName, options),
      catch: (error) =>
        HatchetCronError.of(
          `Failed to create cron for workflow "${workflowName}"`,
          undefined,
          workflowName,
          error,
        ),
    })

    return yield* normalizeCron<TInput>(cron as HatchetCronWorkflow, {
      workflowName,
    })
  })

export const getCron = <TInput = Record<string, unknown>>(
  cronId: string,
): Effect.Effect<
  HatchetCronRecord<TInput>,
  HatchetCronError,
  HatchetClientService
> =>
  Effect.gen(function*() {
    const client = yield* getHatchetClient()
    const cron = yield* Effect.tryPromise({
      try: () => client.crons.get(cronId),
      catch: (error) =>
        HatchetCronError.of(
          `Failed to get cron "${cronId}"`,
          cronId,
          undefined,
          error,
        ),
    })

    return yield* normalizeCron<TInput>(cron as HatchetCronWorkflow, {
      cronId,
    })
  })

export const listCrons = <TInput = Record<string, unknown>>(
  options?: ListCronsOptions,
): Effect.Effect<
  readonly HatchetCronRecord<TInput>[],
  HatchetCronError,
  HatchetClientService
> =>
  Effect.gen(function*() {
    const client = yield* getHatchetClient()
    const workflowName = options?.workflowName
    const query: Parameters<typeof client.crons.list>[0] = {
      workflowName,
      cronName: options?.cronName,
      offset: options?.offset,
      limit: options?.limit,
      orderByField: "createdAt" as Parameters<
        typeof client.crons.list
      >[0]["orderByField"],
      orderByDirection: "DESC" as Parameters<
        typeof client.crons.list
      >[0]["orderByDirection"],
    }
    const response = yield* Effect.tryPromise({
      try: () => client.crons.list(query),
      catch: (error) =>
        HatchetCronError.of(
          workflowName
            ? `Failed to list crons for workflow "${workflowName}"`
            : "Failed to list crons",
          undefined,
          workflowName,
          error,
        ),
    })

    const rows = (response as HatchetCronWorkflowList).rows ?? []

    return yield* Effect.forEach(rows, (cron) => normalizeCron<TInput>(cron, { workflowName }))
  })

export const deleteCron = (
  cronId: string,
): Effect.Effect<void, HatchetCronError, HatchetClientService> =>
  Effect.gen(function*() {
    const client = yield* getHatchetClient()
    yield* Effect.tryPromise({
      try: () => client.crons.delete(cronId),
      catch: (error) =>
        HatchetCronError.of(
          `Failed to delete cron "${cronId}"`,
          cronId,
          undefined,
          error,
        ),
    })
  })
