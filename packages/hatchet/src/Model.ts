import * as Schema from "effect/Schema"

export const RunId = Schema.NonEmptyString.pipe(Schema.brand("@effectify/hatchet/RunId"))
export type RunId = typeof RunId.Type

export const ScheduleId = Schema.String.pipe(Schema.brand("@effectify/hatchet/ScheduleId"))
export type ScheduleId = typeof ScheduleId.Type

export const CronId = Schema.String.pipe(Schema.brand("@effectify/hatchet/CronId"))
export type CronId = typeof CronId.Type

export const ScheduleRecord = Schema.Struct({
  id: ScheduleId,
  taskName: Schema.NonEmptyString,
  triggerAt: Schema.DateFromString,
})
export type ScheduleRecord = typeof ScheduleRecord.Type

export const CronRecord = Schema.Struct({
  id: CronId,
  taskName: Schema.NonEmptyString,
  name: Schema.optionalKey(Schema.NonEmptyString),
  expression: Schema.NonEmptyString,
  input: Schema.optionalKey(Schema.Unknown),
  additionalMetadata: Schema.optionalKey(Schema.Record(Schema.String, Schema.Unknown)),
  enabled: Schema.Boolean,
  method: Schema.Literals(["DEFAULT", "API"]),
  priority: Schema.optionalKey(Schema.Number),
})
export type CronRecord = typeof CronRecord.Type

export const makeRunId = Schema.decodeUnknownSync(RunId)
export const makeScheduleId = Schema.decodeUnknownSync(ScheduleId)
export const makeCronId = Schema.decodeUnknownSync(CronId)
