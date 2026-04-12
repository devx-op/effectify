/**
 * @effectify/hatchet - Events Client
 *
 * Effect-first wrappers around the Hatchet SDK events surface.
 */

import * as Effect from "effect/Effect"
import type { HatchetClientService } from "../core/client.js"
import { getHatchetClient } from "../core/client.js"
import { HatchetEventError } from "../core/error.js"

interface HatchetSdkEvent {
  readonly eventId: string
  readonly key: string
  readonly payload: unknown
  readonly additionalMetadata?: unknown
  readonly scope?: string
}

export interface HatchetEventWorkflowRunSummary {
  readonly running: number
  readonly queued: number
  readonly succeeded: number
  readonly failed: number
  readonly cancelled: number
}

export interface HatchetEventTriggeredRun {
  readonly workflowRunId: string
  readonly filterId?: string
}

interface RestEventMetadata {
  readonly id?: string
}

interface HatchetRestEvent {
  readonly metadata: RestEventMetadata
  readonly key: string
  readonly payload?: unknown
  readonly additionalMetadata?: unknown
  readonly scope?: string
  readonly seenAt?: string
  readonly triggeredRuns?: readonly HatchetEventTriggeredRun[]
  readonly workflowRunSummary: HatchetEventWorkflowRunSummary
}

export interface PushEventOptions {
  readonly additionalMetadata?: Record<string, string>
  readonly priority?: number
  readonly scope?: string
}

export interface HatchetEventRecord<TPayload = Record<string, unknown>> {
  readonly eventId: string
  readonly key: string
  readonly payload: TPayload
  readonly additionalMetadata?: Record<string, unknown>
  readonly scope?: string
  readonly seenAt?: string
  readonly triggeredRuns?: readonly HatchetEventTriggeredRun[]
  readonly workflowRunSummary?: HatchetEventWorkflowRunSummary
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const parseJsonRecord = (
  value: unknown,
): Record<string, unknown> | undefined => {
  if (typeof value !== "string") {
    return isRecord(value) ? value : undefined
  }

  try {
    const parsed = JSON.parse(value)
    return isRecord(parsed) ? parsed : undefined
  } catch {
    return undefined
  }
}

const normalizePushedEvent = <TPayload extends Record<string, unknown>>(
  key: string,
  payload: TPayload,
  event: HatchetSdkEvent,
): HatchetEventRecord<TPayload> => ({
  eventId: event.eventId,
  key: event.key || key,
  payload: (parseJsonRecord(event.payload) as TPayload | undefined) ?? payload,
  additionalMetadata: parseJsonRecord(event.additionalMetadata),
  scope: event.scope,
})

const normalizeFetchedEvent = <TPayload = Record<string, unknown>>(
  eventId: string,
  event: HatchetRestEvent,
): HatchetEventRecord<TPayload> => ({
  eventId: event.metadata.id || eventId,
  key: event.key,
  payload: (event.payload as TPayload | undefined) ?? ({} as TPayload),
  additionalMetadata: isRecord(event.additionalMetadata)
    ? event.additionalMetadata
    : undefined,
  scope: event.scope,
  seenAt: event.seenAt,
  triggeredRuns: event.triggeredRuns,
  workflowRunSummary: event.workflowRunSummary,
})

export const pushEvent = <TPayload extends Record<string, unknown>>(
  key: string,
  payload: TPayload,
  options?: PushEventOptions,
): Effect.Effect<
  HatchetEventRecord<TPayload>,
  HatchetEventError,
  HatchetClientService
> =>
  Effect.gen(function*() {
    const client = yield* getHatchetClient()
    const event = yield* Effect.tryPromise({
      try: () => client.events.push(key, payload, options),
      catch: (error) =>
        new HatchetEventError({
          message: `Failed to push event "${key}"`,
          key,
          cause: error,
        }),
    })

    return normalizePushedEvent(key, payload, event as HatchetSdkEvent)
  })

export const getEvent = <TPayload = Record<string, unknown>>(
  eventId: string,
): Effect.Effect<
  HatchetEventRecord<TPayload>,
  HatchetEventError,
  HatchetClientService
> =>
  Effect.gen(function*() {
    const client = yield* getHatchetClient()
    const response = yield* Effect.tryPromise({
      try: () => client.api.v1EventGet(client.tenantId, eventId),
      catch: (error) =>
        new HatchetEventError({
          message: `Failed to get event "${eventId}"`,
          eventId,
          cause: error,
        }),
    })

    if (!response.data) {
      return yield* new HatchetEventError({
        message: `Event "${eventId}" was not found`,
        eventId,
      })
    }

    return normalizeFetchedEvent<TPayload>(
      eventId,
      response.data as HatchetRestEvent,
    )
  })
