import { RateLimitDuration } from "@hatchet-dev/typescript-sdk"
import type * as RateLimit from "../RateLimit.js"
import * as CronExpression from "../CronExpression.js"
import type * as Trigger from "../Trigger.js"

export const rateLimitDuration = (
  duration: RateLimit.Duration,
): RateLimitDuration => {
  switch (duration) {
    case "second":
      return RateLimitDuration.SECOND
    case "minute":
      return RateLimitDuration.MINUTE
    case "hour":
      return RateLimitDuration.HOUR
    case "day":
      return RateLimitDuration.DAY
    case "week":
      return RateLimitDuration.WEEK
    case "month":
      return RateLimitDuration.MONTH
    case "year":
      return RateLimitDuration.YEAR
  }
}

export const rateLimits = (
  values: ReadonlyArray<RateLimit.RateLimit>,
): Array<{
  readonly units: string | number
  readonly key?: string
  readonly staticKey?: string
  readonly dynamicKey?: string
  readonly limit?: string | number
  readonly duration?: RateLimitDuration
}> =>
  values.map((value) => ({
    units: value.units,
    ...(value.key === undefined ? {} : { key: value.key }),
    ...(value.staticKey === undefined ? {} : { staticKey: value.staticKey }),
    ...(value.dynamicKey === undefined ? {} : { dynamicKey: value.dynamicKey }),
    ...(value.limit === undefined ? {} : { limit: value.limit }),
    ...(value.duration === undefined
      ? {}
      : { duration: rateLimitDuration(value.duration) }),
  }))

export const on = (
  values: ReadonlyArray<Trigger.Trigger>,
):
  | { readonly event?: Array<string>; readonly cron?: Array<string> }
  | undefined =>
{
  const event: Array<string> = []
  const cron: Array<string> = []
  for (const value of values) {
    if (value._tag === "Event") event.push(value.event)
    else if (value._tag === "Cron") {
      cron.push(CronExpression.source(value.expression))
    }
  }
  return event.length === 0 && cron.length === 0
    ? undefined
    : {
      ...(event.length === 0 ? {} : { event }),
      ...(cron.length === 0 ? {} : { cron }),
    }
}
