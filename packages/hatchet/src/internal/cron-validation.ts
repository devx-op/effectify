import type { JsonObject, JsonValue } from "@hatchet-dev/typescript-sdk"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import { InvalidCronError, InvalidCronFilterError } from "../Error.js"
import type { CreateCronOptions, ListCronOptions } from "../Hatchet.js"
const check = Schema.makeFilter
const NonBlank = Schema.String.check(check((value) => value.trim().length > 0))
const Priority = Schema.Literals([1, 2, 3])
const Offset = Schema.Int.check(Schema.isGreaterThanOrEqualTo(0))
const Limit = Schema.Int.check(Schema.isGreaterThan(0))
const isTransportValue = (value: unknown): value is JsonValue =>
  value === null ||
  typeof value === "string" ||
  typeof value === "number" ||
  typeof value === "boolean" ||
  (Array.isArray(value) && value.every(isTransportValue)) ||
  isTransportObject(value)
const isTransportObject = (value: unknown): value is JsonObject =>
  typeof value === "object" &&
  value !== null &&
  !Array.isArray(value) &&
  Object.getPrototypeOf(value) === Object.prototype &&
  Object.values(value).every(isTransportValue)
export const TransportObject = Schema.declare<JsonObject>(isTransportObject)
const cronError = (field: InvalidCronError["field"]) =>
  new InvalidCronError({ field, originalCause: "invalid cron value" })
const filterError = (field: InvalidCronFilterError["field"]) =>
  new InvalidCronFilterError({
    field,
    originalCause: "invalid cron filter value",
  })
export const validateCreate = (
  options: CreateCronOptions,
): Effect.Effect<void, InvalidCronError> => {
  const fields: ReadonlyArray<
    readonly [InvalidCronError["field"], Schema.Top, unknown]
  > = [
    ["name", NonBlank, options.name],
    ["priority", Priority, options.priority],
  ]
  for (const [field, schema, value] of fields) {
    if (value !== undefined && !Schema.is(schema)(value)) {
      return Effect.fail(cronError(field))
    }
  }
  return Effect.void
}
export const validateInput = (input: unknown) =>
  Schema.decodeUnknownEffect(TransportObject)(input).pipe(
    Effect.mapError(() => cronError("input")),
  )
export const validateList = (
  options: ListCronOptions,
): Effect.Effect<void, InvalidCronFilterError> => {
  const fields: ReadonlyArray<
    readonly [InvalidCronFilterError["field"], Schema.Top, unknown]
  > = [
    ["taskName", NonBlank, options.taskName],
    ["name", NonBlank, options.name],
    ["offset", Offset, options.offset],
    ["limit", Limit, options.limit],
  ]
  for (const [field, schema, value] of fields) {
    if (value !== undefined && !Schema.is(schema)(value)) {
      return Effect.fail(filterError(field))
    }
  }
  return Effect.void
}
