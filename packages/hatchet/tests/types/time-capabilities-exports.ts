import type { CreateCronOptions, CronRecord, ListCronOptions, ScheduleRecord, ScheduleTiming } from "../../src/index.js"

const schedule: ScheduleTiming = { _tag: "After", delay: "1 second" }
const scheduleRecord: ScheduleRecord = {
  id: "schedule-1" as ScheduleRecord["id"],
  taskName: "greet",
  triggerAt: new Date(),
}
const cronOptions: CreateCronOptions = {
  name: "daily",
  expression: "0 0 * * *",
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
void cronRecord
void listOptions
