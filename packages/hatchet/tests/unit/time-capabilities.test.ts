import { describe, expect, it } from "vitest"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import type * as Scope from "effect/Scope"
import { CronExpression, Hatchet, Task } from "@effectify/hatchet"

const task = Task.make({
  name: "time-task",
  fn: (name: string | undefined, context) =>
    Effect.succeed({
      name,
      runId: Option.getOrThrow(context.workflowRunId),
    }),
})

const run = <A, E>(
  effect: Effect.Effect<A, E, Hatchet.Hatchet | Scope.Scope>,
) =>
  Effect.runPromise(
    Effect.scoped(effect.pipe(Effect.provide(Hatchet.layerInMemory))),
  )

describe("time capabilities with public Task identity", () => {
  it("creates, reads, and idempotently deletes a pending schedule", async () => {
    await run(
      Effect.gen(function*() {
        const schedule = yield* Hatchet.schedule(task, "Ada", {
          _tag: "After",
          delay: "5 minutes",
        })
        expect(yield* Hatchet.getSchedule(schedule.id)).toEqual(
          Option.some(schedule),
        )
        expect(yield* Hatchet.deleteSchedule(schedule.id)).toBe(true)
        expect(yield* Hatchet.deleteSchedule(schedule.id)).toBe(false)
      }),
    )
  })

  it("rejects invalid and past timing", async () => {
    const outcomes = await run(
      Effect.gen(function*() {
        const invalidDelay = yield* Effect.exit(
          Hatchet.schedule(task, undefined, {
            _tag: "After",
            delay: -1,
          }),
        )
        const past = yield* Effect.exit(
          Hatchet.schedule(task, undefined, {
            _tag: "At",
            at: new Date(0),
          }),
        )
        return { invalidDelay, past }
      }),
    )
    expect(String(outcomes.invalidDelay)).toContain("InvalidTimeError")
    expect(String(outcomes.past)).toContain("InvalidTimeError")
  })

  it("cancels a direct local run independently from schedules", async () => {
    const waiting = Task.make({ name: "waiting", fn: () => Effect.never })
    const exit = await run(
      Effect.gen(function*() {
        const handle = yield* Hatchet.runNoWait(waiting, undefined)
        yield* handle.cancel
        return yield* Effect.exit(handle.await)
      }),
    )
    expect(exit._tag).toBe("Failure")
  })
})

describe("storage-only cron", () => {
  const cronTask = Task.make({
    name: "cron-task",
    input: Schema.Struct({ recipient: Schema.NonEmptyString }),
    fn: ({ recipient }) => Effect.succeed(recipient),
  })

  it("stores, filters, and deletes cron records without firing tasks", async () => {
    let executions = 0
    const counted = Task.make({
      name: "counted-cron",
      input: Schema.Struct({ recipient: Schema.NonEmptyString }),
      fn: ({ recipient }) =>
        Effect.sync(() => {
          executions += 1
          return recipient
        }),
    })
    await run(
      Effect.gen(function*() {
        const daily = yield* CronExpression.parse("0 9 * * 1-5")
        const other = yield* CronExpression.parse("0 10 * * *")
        const first = yield* Hatchet.createCron(counted, {
          name: "daily",
          schedule: daily,
          input: { recipient: "Ada" },
        })
        yield* Hatchet.createCron(cronTask, {
          name: "other",
          schedule: other,
          input: { recipient: "Grace" },
        })
        expect(yield* Hatchet.listCrons({ name: "daily" })).toEqual([first])
        expect(executions).toBe(0)
        expect(yield* Hatchet.deleteCron(first.id)).toBe(true)
        expect(yield* Hatchet.deleteCron(first.id)).toBe(false)
      }),
    )
  })

  it("validates cron expressions, schema input, and pagination", async () => {
    const outcomes = await run(
      Effect.gen(function*() {
        const expression = yield* Effect.exit(CronExpression.parse("bad"))
        const schedule = yield* CronExpression.parse("0 9 * * *")
        const input = yield* Effect.exit(
          Hatchet.createCron(cronTask, {
            name: "bad-input",
            schedule,
            input: { recipient: "" },
          }),
        )
        const pagination = yield* Effect.exit(Hatchet.listCrons({ limit: 0 }))
        return { expression, input, pagination }
      }),
    )
    expect(String(outcomes.expression)).toContain("InvalidCronError")
    expect(String(outcomes.input)).toContain("TaskSchemaError")
    expect(String(outcomes.pagination)).toContain("InvalidCronFilterError")
  })
})
