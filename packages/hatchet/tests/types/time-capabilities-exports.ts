import type * as EffectCron from "effect/Cron"
import type {
  CreateCronOptions,
  CronExpression,
  CronRecord,
  ListCronOptions,
  ScheduleRecord,
  ScheduleTiming,
} from "../../src/index.js"

declare const cronSchedule: CronExpression.CronExpression
declare const effectCron: EffectCron.Cron

const schedule: ScheduleTiming = { _tag: "After", delay: "1 second" }
const scheduleRecord: ScheduleRecord = {
  id: "schedule-1" as ScheduleRecord["id"],
  taskName: "greet",
  triggerAt: new Date(),
}
const cronOptions: CreateCronOptions = {
  name: "daily",
  schedule: cronSchedule,
  input: {},
}
const rawCronOptions: CreateCronOptions = {
  name: "raw-cron",
  // @ts-expect-error A Cron.Cron can contain seconds and has no source to serialize.
  schedule: effectCron,
  input: {},
}
const cronRecord: CronRecord = {
  id: "cron-1" as CronRecord["id"],
  taskName: "greet",
  expression: "0 0 * * *",
  enabled: true,
  method: "DEFAULT",
}
const listOptions: ListCronOptions = { offset: 0, limit: 10 }

void schedule
void scheduleRecord
void cronOptions
void rawCronOptions
void cronRecord
void listOptions
