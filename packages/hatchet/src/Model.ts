declare const RunIdTypeId: unique symbol
declare const ScheduleIdTypeId: unique symbol
declare const CronIdTypeId: unique symbol

/** Backend-issued identifiers. Values are created by Hatchet layers. */
export type RunId = string & { readonly [RunIdTypeId]: typeof RunIdTypeId }
export type ScheduleId = string & {
  readonly [ScheduleIdTypeId]: typeof ScheduleIdTypeId
}
export type CronId = string & { readonly [CronIdTypeId]: typeof CronIdTypeId }

export const makeRunId = (value: string): RunId => value as RunId
export const makeScheduleId = (value: string): ScheduleId => value as ScheduleId
export const makeCronId = (value: string): CronId => value as CronId
