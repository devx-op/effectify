import type * as RateLimit from "../RateLimit.js"
import type * as Trigger from "../Trigger.js"

export class InvalidRateLimitError extends Error {
  readonly _tag = "InvalidRateLimitError"

  constructor(
    readonly taskName: string,
    readonly index: number,
    readonly field: string,
  ) {
    super(`Invalid rate limit ${field} for task ${taskName} at index ${index}`)
  }
}

const isPositiveSafeInteger = (value: number): boolean => Number.isSafeInteger(value) && value > 0

const isNonEmpty = (value: string): boolean => value.trim().length > 0

const isDuration = (value: unknown): value is RateLimit.Duration =>
  value === "second" ||
  value === "minute" ||
  value === "hour" ||
  value === "day" ||
  value === "week" ||
  value === "month" ||
  value === "year"

const validateNumberOrExpression = (
  taskName: string,
  index: number,
  field: "units" | "limit",
  value: unknown,
): void => {
  if (
    (typeof value !== "number" && typeof value !== "string") ||
    (typeof value === "number" && !isPositiveSafeInteger(value)) ||
    (typeof value === "string" && !isNonEmpty(value))
  ) {
    throw new InvalidRateLimitError(taskName, index, field)
  }
}

const validateText = (
  taskName: string,
  index: number,
  field: "key" | "staticKey" | "dynamicKey",
  value: string | undefined,
): void => {
  if (value !== undefined && !isNonEmpty(value)) {
    throw new InvalidRateLimitError(taskName, index, field)
  }
}

export const rateLimits = (
  taskName: string,
  values: ReadonlyArray<RateLimit.RateLimit>,
): ReadonlyArray<RateLimit.RateLimit> => {
  for (const [index, value] of values.entries()) {
    validateNumberOrExpression(taskName, index, "units", value.units)
    if (value.limit !== undefined) {
      validateNumberOrExpression(taskName, index, "limit", value.limit)
    }
    if (value.duration !== undefined && !isDuration(value.duration)) {
      throw new InvalidRateLimitError(taskName, index, "duration")
    }
    validateText(taskName, index, "key", value.key)
    validateText(taskName, index, "staticKey", value.staticKey)
    validateText(taskName, index, "dynamicKey", value.dynamicKey)
  }
  return values
}

export const triggers = (
  taskName: string,
  values: ReadonlyArray<Trigger.Trigger>,
): ReadonlyArray<Trigger.Trigger> => {
  for (const [index, value] of values.entries()) {
    if (value._tag === "Event") {
      if (
        value.event.trim().length === 0 ||
        /[\u0000-\u001f\u007f]/.test(value.event)
      ) {
        throw new InvalidRateLimitError(taskName, index, "event")
      }
      continue
    }
    if (value._tag !== "Cron") {
      throw new InvalidRateLimitError(taskName, index, "trigger")
    }
  }
  return values
}
