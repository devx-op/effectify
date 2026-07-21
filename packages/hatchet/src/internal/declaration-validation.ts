import type { Duration as RateLimitDuration, RateLimit as RateLimitValue } from "../RateLimit.js"
import type * as Trigger from "../Trigger.js"
import { TaskDeclarationError } from "../Error.js"
import type * as Task from "../Task.js"

const invalid = (
  taskName: string,
  field: string,
  index?: number,
): TaskDeclarationError =>
  new TaskDeclarationError({
    taskName,
    field,
    reason: "InvalidMetadata",
    ...(index === undefined ? {} : { index }),
  })

const isPositiveSafeInteger = (value: number): boolean => Number.isSafeInteger(value) && value > 0

const isNonEmpty = (value: string): boolean => value.trim().length > 0

const isDuration = (value: unknown): value is RateLimitDuration =>
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
    throw invalid(taskName, field, index)
  }
}

const validateText = (
  taskName: string,
  index: number,
  field: "key" | "staticKey" | "dynamicKey",
  value: string | undefined,
): void => {
  if (value !== undefined && !isNonEmpty(value)) {
    throw invalid(taskName, field, index)
  }
}

export const rateLimits = (
  taskName: string,
  values: ReadonlyArray<RateLimitValue>,
): ReadonlyArray<RateLimitValue> => {
  for (const [index, value] of values.entries()) {
    validateNumberOrExpression(taskName, index, "units", value.units)
    if (value.limit !== undefined) {
      validateNumberOrExpression(taskName, index, "limit", value.limit)
    }
    if (value.duration !== undefined && !isDuration(value.duration)) {
      throw invalid(taskName, "duration", index)
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
        throw invalid(taskName, "event", index)
      }
      continue
    }
    if (value._tag !== "Cron") {
      throw invalid(taskName, "trigger", index)
    }
  }
  return values
}

export const declarations = <Requirements>(
  values: ReadonlyArray<Task.Any<Requirements>>,
): ReadonlyArray<Task.Any<Requirements>> => {
  const names = new Set<string>()
  for (const [index, value] of values.entries()) {
    const taskName = typeof value?.name === "string" ? value.name : "<unknown>"
    if (value?._tag !== "Ordinary" && value?._tag !== "Durable") {
      throw new TaskDeclarationError({
        taskName,
        field: "_tag",
        reason: "InvalidKind",
        index,
      })
    }
    if (taskName.trim().length === 0) throw invalid(taskName, "name", index)
    if (names.has(taskName)) {
      throw new TaskDeclarationError({
        taskName,
        field: "name",
        reason: "DuplicateIdentity",
        index,
      })
    }
    if (!Array.isArray(value.rateLimits)) {
      throw invalid(taskName, "rateLimits", index)
    }
    if (!Array.isArray(value.triggers)) {
      throw invalid(taskName, "triggers", index)
    }
    rateLimits(taskName, value.rateLimits)
    triggers(taskName, value.triggers)
    names.add(taskName)
  }
  return values
}
