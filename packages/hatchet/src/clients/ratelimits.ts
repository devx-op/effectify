/**
 * @effectify/hatchet - Rate Limits Client
 *
 * Effect-first wrappers around the Hatchet SDK rate-limits surface.
 */

import * as HatchetSDK from "@hatchet-dev/typescript-sdk"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import type { HatchetClientService } from "../core/client.js"
import { getHatchetClient } from "../core/client.js"
import { HatchetRateLimitError } from "../core/error.js"

const RateLimitDuration = HatchetSDK.RateLimitDuration
const RateLimitOrderByDirection = HatchetSDK.RateLimitOrderByDirection
const RateLimitOrderByField = HatchetSDK.RateLimitOrderByField

export { RateLimitDuration, RateLimitOrderByDirection, RateLimitOrderByField }
export type RateLimitDuration = HatchetSDK.RateLimitDuration

interface HatchetSdkRateLimit {
  readonly key?: string
  readonly tenantId?: string
  readonly limitValue?: number
  readonly value?: number
  readonly window?: string
  readonly lastRefill?: string
}

interface HatchetSdkRateLimitList {
  readonly rows?: readonly HatchetSdkRateLimit[]
}

export interface HatchetRateLimitRecord {
  readonly key: string
  readonly tenantId: string
  readonly limitValue: number
  readonly value: number
  readonly window: string
  readonly lastRefill: string
}

export interface ListRateLimitsOptions {
  readonly limit?: number
  readonly offset?: number
  readonly orderByField?: HatchetSDK.RateLimitOrderByField
  readonly orderByDirection?: HatchetSDK.RateLimitOrderByDirection
}

export interface UpsertRateLimitOptions {
  readonly key: string
  readonly limit: number
  readonly duration?: Duration.Input | HatchetSDK.RateLimitDuration
}

const rateLimitDurationMillisMap = new Map<
  number,
  HatchetSDK.RateLimitDuration
>([
  [1_000, RateLimitDuration.SECOND],
  [60_000, RateLimitDuration.MINUTE],
  [3_600_000, RateLimitDuration.HOUR],
  [86_400_000, RateLimitDuration.DAY],
  [604_800_000, RateLimitDuration.WEEK],
])

const toRateLimitDuration = (
  input: UpsertRateLimitOptions["duration"],
  key: string,
): Effect.Effect<
  HatchetSDK.RateLimitDuration | undefined,
  HatchetRateLimitError
> => {
  if (input === undefined) {
    return Effect.succeed(undefined)
  }

  if (
    typeof input === "number" &&
    Object.values(RateLimitDuration).includes(
      input as HatchetSDK.RateLimitDuration,
    )
  ) {
    return Effect.succeed(input as HatchetSDK.RateLimitDuration)
  }

  if (typeof input === "string") {
    const normalized = input.trim().toUpperCase()

    if (normalized in RateLimitDuration) {
      return Effect.succeed(
        RateLimitDuration[normalized as keyof typeof RateLimitDuration],
      )
    }
  }

  return Effect.try({
    try: () => {
      const decoded = Duration.fromInputUnsafe(input as Duration.Input)
      const millis = Duration.toMillis(decoded)
      const duration = rateLimitDurationMillisMap.get(millis)

      if (duration === undefined) {
        throw new Error(
          "Rate limit duration must map exactly to 1 second, 1 minute, 1 hour, 1 day, or 1 week",
        )
      }

      return duration
    },
    catch: (cause) =>
      new HatchetRateLimitError({
        message: `Failed to normalize rate limit duration for key "${key}"`,
        operation: "upsert",
        key,
        cause,
      }),
  })
}

const failMissingField = (field: string) =>
  new HatchetRateLimitError({
    message: `Rate limit response did not include ${field}`,
    operation: "list",
  })

const normalizeRateLimit = (
  ratelimit: HatchetSdkRateLimit,
): Effect.Effect<HatchetRateLimitRecord, HatchetRateLimitError> =>
  Effect.gen(function*() {
    if (!ratelimit.key) {
      return yield* Effect.fail(failMissingField("key"))
    }

    if (!ratelimit.tenantId) {
      return yield* Effect.fail(failMissingField("tenantId"))
    }

    if (typeof ratelimit.limitValue !== "number") {
      return yield* Effect.fail(failMissingField("limitValue"))
    }

    if (typeof ratelimit.value !== "number") {
      return yield* Effect.fail(failMissingField("value"))
    }

    if (!ratelimit.window) {
      return yield* Effect.fail(failMissingField("window"))
    }

    if (!ratelimit.lastRefill) {
      return yield* Effect.fail(failMissingField("lastRefill"))
    }

    return {
      key: ratelimit.key,
      tenantId: ratelimit.tenantId,
      limitValue: ratelimit.limitValue,
      value: ratelimit.value,
      window: ratelimit.window,
      lastRefill: ratelimit.lastRefill,
    }
  })

export const listRateLimits = (
  options?: ListRateLimitsOptions,
): Effect.Effect<
  readonly HatchetRateLimitRecord[],
  HatchetRateLimitError,
  HatchetClientService
> =>
  Effect.gen(function*() {
    const client = yield* getHatchetClient()
    const response = yield* Effect.tryPromise({
      try: () => client.ratelimits.list(options),
      catch: (cause) =>
        new HatchetRateLimitError({
          message: "Failed to list rate limits",
          operation: "list",
          cause,
        }),
    })

    return yield* Effect.forEach(
      (response as HatchetSdkRateLimitList).rows ?? [],
      normalizeRateLimit,
    )
  })

export const upsertRateLimit = (
  options: UpsertRateLimitOptions,
): Effect.Effect<string, HatchetRateLimitError, HatchetClientService> =>
  Effect.gen(function*() {
    const client = yield* getHatchetClient()
    const duration = yield* toRateLimitDuration(options.duration, options.key)

    return yield* Effect.tryPromise({
      try: () => client.ratelimits.upsert({ ...options, duration }),
      catch: (cause) =>
        new HatchetRateLimitError({
          message: `Failed to upsert rate limit "${options.key}"`,
          operation: "upsert",
          key: options.key,
          cause,
        }),
    })
  })
