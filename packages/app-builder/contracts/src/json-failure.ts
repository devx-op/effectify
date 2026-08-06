import * as Schema from "effect/Schema"

export const JsonFailureReason = Schema.Literals([
  "inspection-failed",
  "unsupported-value",
  "invalid-record",
  "invalid-array",
  "cycle",
  "depth-exceeded",
])
export type JsonFailureReason = typeof JsonFailureReason.Type

export class JsonFailure extends Schema.TaggedErrorClass<JsonFailure>()("JsonFailure", {
  reason: JsonFailureReason,
}) {}

export const jsonFailure = (reason: JsonFailureReason): JsonFailure => new JsonFailure({ reason })
