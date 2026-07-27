import type * as CronExpression from "./CronExpression.js"

export interface Event {
  readonly _tag: "Event"
  readonly event: string
}

export interface Cron {
  readonly _tag: "Cron"
  readonly expression: CronExpression.CronExpression
}

export type Trigger = Event | Cron

export const event = (value: string): Event => Object.freeze({ _tag: "Event" as const, event: value })

export const cron = (expression: CronExpression.CronExpression): Cron =>
  Object.freeze({ _tag: "Cron" as const, expression })

export * as Trigger from "./Trigger.js"
