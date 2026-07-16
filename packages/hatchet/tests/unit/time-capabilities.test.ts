import { describe, expect, it } from "vitest"
import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import type * as Scope from "effect/Scope"
import { TestClock } from "effect/testing"
import { Hatchet, type RunId, Task } from "@effectify/hatchet"

class Prefix extends Context.Service<Prefix, { readonly value: string }>()(
  "@effectify/hatchet/test/ScheduledPrefix",
) {}

const testLayer = Layer.merge(Hatchet.layerInMemory, TestClock.layer())

const run = <A, E>(
  effect: Effect.Effect<A, E, Hatchet.Hatchet | Scope.Scope>,
) => Effect.runPromise(Effect.scoped(effect).pipe(Effect.provide(testLayer)))

describe("time capabilities", () => {
  it("treats explicit in-memory worker startup as an idempotent ready no-op", async () => {
    const task = Task.make({
      name: "in-memory-explicit-start",
      fn: () => Effect.succeed("ready"),
    })

    await expect(
      run(
        Effect.gen(function*() {
          const registered = yield* Hatchet.register(task)
          yield* Hatchet.startWorker
          yield* Hatchet.startWorker
          return yield* Hatchet.run(registered, undefined)
        }),
      ),
    ).resolves.toBe("ready")
  })

  it("creates deterministic pending schedules through the in-memory service", async () => {
    const task = Task.make({
      name: "scheduled-greeting",
      fn: (name: string) => Effect.succeed(`hello ${name}`),
    })
    const record = await run(
      Effect.gen(function*() {
        const registered = yield* Hatchet.register(task)
        return yield* Hatchet.schedule(registered, "Ada", {
          _tag: "After",
          delay: "1 second",
        })
      }),
    )

    expect(record).toMatchObject({
      id: "schedule-1",
      taskName: "scheduled-greeting",
    })
  })

  it("does not run before its boundary and runs exactly at it", async () => {
    const events: string[] = []
    const task = Task.make({
      name: "boundary-task",
      fn: () => Effect.sync(() => events.push("ran")),
    })

    await run(
      Effect.gen(function*() {
        const registered = yield* Hatchet.register(task)
        yield* Hatchet.schedule(registered, undefined, {
          _tag: "After",
          delay: "1 second",
        })
        yield* TestClock.adjust("999 millis")
        expect(events).toEqual([])
        yield* TestClock.adjust("1 millis")
        expect(events).toEqual(["ran"])
      }),
    )
  })

  it("runs with captured dependencies and deterministic task context", async () => {
    const events: string[] = []
    const task = Task.make({
      name: "captured-scheduled-task",
      fn: (_: undefined, context) =>
        Effect.map(Prefix, (prefix) => {
          events.push(
            `${prefix.value}:${Option.getOrThrow(context.workflowRunId)}`,
          )
        }),
    })

    await run(
      Effect.gen(function*() {
        const registered = yield* Hatchet.register(task).pipe(
          Effect.provide(Layer.succeed(Prefix, { value: "captured" })),
        )
        yield* Hatchet.schedule(registered, undefined, {
          _tag: "After",
          delay: "1 second",
        })
        yield* TestClock.adjust("1 second")
        expect(events).toEqual(["captured:run-1"])
      }),
    )
  })

  it("deleting a pending schedule prevents its emission and is idempotent", async () => {
    const events: string[] = []
    const task = Task.make({
      name: "deleted-before-emission",
      fn: () => Effect.sync(() => events.push("ran")),
    })

    await run(
      Effect.gen(function*() {
        const registered = yield* Hatchet.register(task)
        const schedule = yield* Hatchet.schedule(registered, undefined, {
          _tag: "After",
          delay: "1 second",
        })
        expect(yield* Hatchet.deleteSchedule(schedule.id)).toBe(true)
        expect(yield* Hatchet.deleteSchedule(schedule.id)).toBe(false)
        expect(yield* Hatchet.getSchedule(schedule.id)).toEqual(Option.none())
        yield* TestClock.adjust("1 second")
        expect(events).toEqual([])
      }),
    )
  })

  it("does not cancel an already emitted run when its trigger is deleted", async () => {
    const events: string[] = []
    const task = Task.make({
      name: "emitted-run",
      fn: () => Effect.sync(() => events.push("ran")),
    })

    await run(
      Effect.gen(function*() {
        const registered = yield* Hatchet.register(task)
        const schedule = yield* Hatchet.schedule(registered, undefined, {
          _tag: "After",
          delay: "1 second",
        })
        yield* TestClock.adjust("1 second")
        expect(yield* Hatchet.deleteSchedule(schedule.id)).toBe(false)
        expect(yield* Hatchet.getSchedule(schedule.id)).toEqual(Option.none())
        expect(events).toEqual(["ran"])
      }),
    )
  })

  it("cancels pending schedule fibers when their scope closes", async () => {
    const events: string[] = []
    const task = Task.make({
      name: "scope-closed-schedule",
      fn: () => Effect.sync(() => events.push("ran")),
    })

    await run(
      Effect.gen(function*() {
        const registered = yield* Hatchet.register(task)
        yield* Effect.scoped(
          Hatchet.schedule(registered, undefined, {
            _tag: "After",
            delay: "1 second",
          }),
        )
        yield* TestClock.adjust("1 second")
        expect(events).toEqual([])
      }),
    )
  })

  it("uses the exact Effect Clock instant for an absolute At schedule", async () => {
    const events: string[] = []
    const task = Task.make({
      name: "absolute-schedule",
      fn: () => Effect.sync(() => events.push("ran")),
    })

    await run(
      Effect.gen(function*() {
        const registered = yield* Hatchet.register(task)
        const schedule = yield* Hatchet.schedule(registered, undefined, {
          _tag: "At",
          at: new Date(1_000),
        })
        expect(schedule.triggerAt.getTime()).toBe(1_000)
        yield* TestClock.adjust("999 millis")
        expect(events).toEqual([])
        yield* TestClock.adjust("1 millis")
        expect(events).toEqual(["ran"])
      }),
    )
  })

  it("rejects invalid, past, and unsupported time inputs", async () => {
    const task = Task.make({
      name: "invalid-schedule",
      fn: () => Effect.void,
    })

    await run(
      Effect.gen(function*() {
        const registered = yield* Hatchet.register(task)
        for (
          const timing of [
            { _tag: "At" as const, at: new Date(Number.NaN) },
            { _tag: "At" as const, at: new Date(0) },
            { _tag: "After" as const, delay: 0 },
            { _tag: "After" as const, delay: -1 },
            { _tag: "After" as const, delay: Number.POSITIVE_INFINITY },
          ]
        ) {
          const exit = yield* Hatchet.schedule(
            registered,
            undefined,
            timing,
          ).pipe(Effect.exit)
          expect(exit._tag).toBe("Failure")
        }
      }),
    )
  })

  it("does not cancel an emitted run when its trigger is deleted", async () => {
    const events: string[] = []
    let runId: string | undefined
    const task = Task.make({
      name: "emitted-cancellable-run",
      fn: (_: undefined, context) =>
        Effect.sync(() => {
          runId = Option.getOrThrow(context.workflowRunId)
        }).pipe(
          Effect.andThen(Effect.never),
          Effect.onInterrupt(() => Effect.sync(() => events.push("interrupted"))),
        ),
    })

    await run(
      Effect.gen(function*() {
        const registered = yield* Hatchet.register(task)
        const schedule = yield* Hatchet.schedule(registered, undefined, {
          _tag: "After",
          delay: "1 second",
        })
        yield* TestClock.adjust("1 second")
        expect(yield* Hatchet.deleteSchedule(schedule.id)).toBe(false)
        expect(events).toEqual([])
        expect(runId).toBe("run-1")
        yield* Hatchet.cancelRun(runId as RunId)
        expect(events).toEqual(["interrupted"])
      }),
    )
  })

  it("fails cancellation of an unknown local run with the run.cancel error", async () => {
    const exit = await run(
      Hatchet.cancelRun("run-missing" as RunId).pipe(Effect.exit),
    )

    expect(exit._tag).toBe("Failure")
    if (exit._tag === "Failure") {
      expect(
        Option.getOrThrow(Cause.findErrorOption(exit.cause)),
      ).toMatchObject({
        _tag: "HatchetSdkError",
        operation: "run.cancel",
        resourceId: "run-missing",
      })
    }
  })

  it("cancels a local run without deleting its schedule trigger", async () => {
    const events: string[] = []
    const task = Task.make({
      name: "cancellable-run",
      fn: () =>
        Effect.never.pipe(
          Effect.onInterrupt(() => Effect.sync(() => events.push("interrupted"))),
        ),
    })

    await run(
      Effect.gen(function*() {
        const registered = yield* Hatchet.register(task)
        const handle = yield* Hatchet.runNoWait(registered, undefined)
        yield* Effect.yieldNow
        yield* Hatchet.cancelRun(handle.id)
        expect(events).toEqual(["interrupted"])
        yield* Hatchet.cancelRun(handle.id)
        expect(events).toEqual(["interrupted"])
      }),
    )
  })

  it("stores crons deterministically without firing them when virtual time advances", async () => {
    const events: string[] = []
    const task = Task.make({
      name: "cron-storage-task",
      fn: () => Effect.sync(() => events.push("ran")),
    })

    await run(
      Effect.gen(function*() {
        const registered = yield* Hatchet.register(task)
        const first = yield* Hatchet.createCron(registered, {
          name: "daily",
          expression: "0 0 * * *",
          input: {},
        })
        const second = yield* Hatchet.createCron(registered, {
          name: "hourly",
          expression: "0 * * * *",
          input: {},
          priority: 2,
        })
        expect(first).toMatchObject({
          id: "cron-1",
          taskName: "cron-storage-task",
          enabled: true,
          method: "DEFAULT",
        })
        expect(second.id).toBe("cron-2")
        expect(yield* Hatchet.getCron(first.id)).toEqual(Option.some(first))
        expect(yield* Hatchet.listCrons({ name: "hourly" })).toEqual([second])
        yield* TestClock.adjust("365 days")
        expect(events).toEqual([])
      }),
    )
  })

  it("validates cron input and pagination, filters in creation order, and makes deletion idempotent", async () => {
    const task = Task.make({
      name: "cron-validation-task",
      fn: () => Effect.void,
    })

    await run(
      Effect.gen(function*() {
        const registered = yield* Hatchet.register(task)
        for (
          const options of [
            { name: "", expression: "0 0 * * *", input: {} },
            { name: "valid", expression: "0 0 * *", input: {} },
            { name: "valid", expression: "0 0 * * *", input: [] },
            { name: "valid", expression: "0 0 * * *", input: {}, priority: 4 },
          ]
        ) {
          const exit = yield* Hatchet.createCron(registered, options).pipe(
            Effect.exit,
          )
          expect(exit._tag).toBe("Failure")
        }
        const first = yield* Hatchet.createCron(registered, {
          name: "first",
          expression: "0 0 * * *",
          input: {},
        })
        const second = yield* Hatchet.createCron(registered, {
          name: "second",
          expression: "0 1 * * *",
          input: {},
        })
        expect(yield* Hatchet.listCrons({ offset: 1, limit: 1 })).toEqual([
          second,
        ])
        for (
          const options of [
            { offset: -1 },
            { limit: 0 },
            { offset: 0.5 },
            { limit: 1.5 },
          ]
        ) {
          const exit = yield* Hatchet.listCrons(options).pipe(Effect.exit)
          expect(exit._tag).toBe("Failure")
        }
        expect(yield* Hatchet.deleteCron(first.id)).toBe(true)
        expect(yield* Hatchet.deleteCron(first.id)).toBe(false)
        expect(yield* Hatchet.getCron(first.id)).toEqual(Option.none())
      }),
    )
  })
})
