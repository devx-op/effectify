import { describe, expect, it } from "vitest"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Logger from "effect/Logger"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import type * as Scope from "effect/Scope"
import { TestClock } from "effect/testing"
import { Hatchet, Task } from "@effectify/hatchet"

const layer = Layer.merge(Hatchet.layerInMemory, TestClock.layer())
const run = <A, E>(effect: Effect.Effect<A, E, Hatchet.Hatchet | Scope.Scope>) =>
  Effect.runPromise(Effect.scoped(effect.pipe(Effect.provide(layer))))

describe("Hatchet scheduling lifecycle", () => {
  it("rejects invalid timing and schema input before storing", async () => {
    let executions = 0
    const task = Task.make({
      name: "validated-schedule",
      input: Schema.Struct({ name: Schema.NonEmptyString }),
      fn: () => Effect.sync(() => (executions += 1)),
    })
    const result = await run(
      Effect.gen(function* () {
        const timings = yield* Effect.forEach(
          [
            { _tag: "At" as const, at: new Date(Number.NaN) },
            { _tag: "At" as const, at: new Date(0) },
            { _tag: "After" as const, delay: Number.POSITIVE_INFINITY },
          ],
          (timing) => Effect.exit(Hatchet.schedule(task, { name: "Ada" }, timing)),
        )
        const invalidInput = yield* Effect.exit(
          Hatchet.schedule(task, { name: "" }, { _tag: "After", delay: "1 second" }),
        )
        yield* TestClock.adjust("1 second")
        const valid = yield* Hatchet.schedule(task, { name: "Ada" }, { _tag: "After", delay: "1 second" })
        return { timings, invalidInput, valid }
      }),
    )
    expect(result.timings.every((exit) => String(exit).includes("InvalidTimeError"))).toBe(true)
    expect(String(result.invalidInput)).toContain("TaskSchemaError")
    expect(result.valid.id).toBe("schedule-1")
    expect(executions).toBe(0)
  })

  it("decodes once without growing synthetic task names", async () => {
    let decodes = 0
    let executions = 0
    let collisions = 0
    const input = Schema.Struct({ value: Schema.Number }).check(Schema.makeFilter(() => (decodes += 1) > 0))
    const task = Task.make({
      name: "registry-stable",
      input,
      fn: ({ value }) => Effect.sync(() => (executions += value)),
    })
    const collision = Task.make({
      name: "registry-stable:schedule-1",
      fn: () => Effect.sync(() => (collisions += 1)),
    })
    await run(
      Effect.gen(function* () {
        yield* Hatchet.run(collision, undefined)
        const handle = yield* Hatchet.runNoWait(task, { value: 1 })
        yield* handle.await
        yield* Effect.forEach([1, 2, 3], (value) =>
          Hatchet.schedule(task, { value }, { _tag: "After", delay: "1 second" }),
        )
        yield* TestClock.adjust("1 second")
      }),
    )
    expect(collisions).toBe(1)
    expect(decodes).toBe(4)
    expect(executions).toBe(7)
  })

  it("is dormant before its deadline, then executes once and disappears", async () => {
    const fired = Deferred.makeUnsafe<void>()
    let executions = 0
    const task = Task.make({
      name: "deadline-schedule",
      fn: () => Effect.sync(() => (executions += 1)).pipe(Effect.andThen(Deferred.succeed(fired, undefined))),
    })
    await run(
      Effect.gen(function* () {
        const record = yield* Hatchet.schedule(task, undefined, {
          _tag: "After",
          delay: "1 second",
        })
        yield* TestClock.adjust("999 millis")
        expect(yield* Hatchet.getSchedule(record.id)).toEqual(Option.some(record))
        expect(executions).toBe(0)
        yield* TestClock.adjust("1 millis")
        yield* Deferred.await(fired)
        expect(yield* Hatchet.getSchedule(record.id)).toEqual(Option.none())
        yield* TestClock.adjust("10 seconds")
        expect(executions).toBe(1)
      }),
    )
  })

  it("returns true and interrupts while executing, then false after removal", async () => {
    const started = Deferred.makeUnsafe<void>()
    const finalized = Deferred.makeUnsafe<void>()
    let interrupted = false
    let completions = 0
    const task = Task.make({
      name: "running-schedule",
      fn: () =>
        Deferred.succeed(started, undefined).pipe(
          Effect.andThen(Effect.never),
          Effect.onInterrupt(() => Effect.sync(() => (interrupted = true))),
          Effect.ensuring(Deferred.succeed(finalized, undefined)),
          Effect.andThen(Effect.sync(() => (completions += 1))),
        ),
    })
    await run(
      Effect.gen(function* () {
        const record = yield* Hatchet.schedule(task, undefined, {
          _tag: "After",
          delay: "1 second",
        })
        yield* TestClock.adjust("1 second")
        yield* Deferred.await(started)
        expect(yield* Hatchet.getSchedule(record.id)).toEqual(Option.some(record))
        expect(yield* Hatchet.deleteSchedule(record.id)).toBe(true)
        yield* Deferred.await(finalized)
        expect(interrupted).toBe(true)
        expect(completions).toBe(0)
        expect(yield* Hatchet.getSchedule(record.id)).toEqual(Option.none())
        expect(yield* Hatchet.deleteSchedule(record.id)).toBe(false)
      }),
    )
  })

  it("emits one sanitized failure signal before removing the schedule", async () => {
    const secret = "token=do-not-log"
    const logs: string[] = []
    const logger = Logger.make(({ cause, message }) => logs.push(JSON.stringify({ cause: String(cause), message })))
    const task = Task.make({
      name: "failing-schedule",
      fn: () => Effect.fail(new Error(secret)),
    })
    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const record = yield* Hatchet.schedule(task, undefined, {
            _tag: "After",
            delay: "1 second",
          })
          yield* TestClock.adjust("1 second")
          expect(yield* Hatchet.getSchedule(record.id)).toEqual(Option.none())
        }).pipe(Effect.provide(Layer.mergeAll(layer, Logger.layer([logger])))),
      ),
    )
    const rendered = logs.join()
    expect(logs).toHaveLength(1)
    expect(rendered).toContain("schedule-1")
    expect(rendered).toContain(task.name)
    expect(rendered).toContain("ScheduledTaskFailure")
    expect(rendered).not.toContain(secret)
  })

  it("returns true while waiting and false after deletion or absence", async () => {
    let executions = 0
    const task = Task.make({
      name: "deleted-schedule",
      fn: () => Effect.sync(() => (executions += 1)),
    })
    await run(
      Effect.gen(function* () {
        const after = yield* Hatchet.schedule(task, undefined, {
          _tag: "After",
          delay: "2 seconds",
        })
        const at = yield* Hatchet.schedule(task, undefined, {
          _tag: "At",
          at: new Date(3_000),
        })
        expect(after.triggerAt.getTime()).toBe(2_000)
        expect(at.triggerAt.getTime()).toBe(3_000)
        expect(yield* Hatchet.deleteSchedule(after.id)).toBe(true)
        expect(yield* Hatchet.deleteSchedule(after.id)).toBe(false)
        expect(yield* Hatchet.deleteSchedule(at.id)).toBe(true)
        yield* TestClock.adjust("10 seconds")
        expect(executions).toBe(0)
      }),
    )
  })
})
