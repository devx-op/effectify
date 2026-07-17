import { describe, expect, it } from "vitest"
import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import { Hatchet, Task } from "@effectify/hatchet"

class Prefix extends Context.Service<Prefix, { readonly value: string }>()(
  "@effectify/hatchet/test/RunNoWaitPrefix",
) {}

class TaskFailure {
  readonly _tag = "TaskFailure" as const
}

describe("Hatchet.runNoWait in-memory", () => {
  it("returns before completion and permits independent Effect work", async () => {
    const started = Deferred.makeUnsafe<void>()
    const release = Deferred.makeUnsafe<void>()
    const completed = Deferred.makeUnsafe<void>()
    let independentWork = false
    const task = Task.make({
      name: "no-wait-latched",
      input: Schema.Struct({ value: Schema.Number }),
      output: Schema.Struct({ doubled: Schema.Number }),
      fn: ({ value }) =>
        Deferred.succeed(started, undefined).pipe(
          Effect.andThen(Deferred.await(release)),
          Effect.as({ doubled: value * 2 }),
          Effect.tap(() => Deferred.succeed(completed, undefined)),
        ),
    })
    const program = Effect.gen(function*() {
      const handle = yield* Hatchet.runNoWait(task, { value: 21 })
      yield* Deferred.await(started)
      const completedAtDispatch = yield* Deferred.poll(completed)
      yield* Effect.sync(() => {
        independentWork = true
      })
      yield* Deferred.succeed(release, undefined)
      const output = yield* handle.await
      return { completedAtDispatch, handle, output }
    }).pipe(Effect.provide(Hatchet.layerInMemory))

    const result = await Effect.runPromise(Effect.scoped(program))

    expect(Option.isNone(result.completedAtDispatch)).toBe(true)
    expect(independentWork).toBe(true)
    expect(result.handle.id).toMatch(/^run-[1-9]\d*$/)
    expect(result.output).toEqual({ doubled: 42 })
  })

  it("awaits the same decoded domain output as Hatchet.run", async () => {
    const task = Task.make({
      name: "no-wait-decoded-output",
      output: Schema.Struct({ at: Schema.DateFromString }),
      fn: () => Effect.succeed({ at: new Date("2030-01-01T00:00:00.000Z") }),
    })
    const program = Effect.gen(function*() {
      const handle = yield* Hatchet.runNoWait(task, undefined)
      const noWait = yield* handle.await
      const waited = yield* Hatchet.run(task, undefined)
      return { noWait, waited }
    }).pipe(Effect.provide(Hatchet.layerInMemory))

    const result = await Effect.runPromise(Effect.scoped(program))

    expect(result.noWait).toEqual(result.waited)
    expect(result.noWait.at).toBeInstanceOf(Date)
  })

  it("reports input Schema errors before dispatch and output Schema errors from await", async () => {
    let invocations = 0
    const invalidInput = Task.make({
      name: "no-wait-invalid-input",
      input: Schema.Struct({ value: Schema.Number }),
      fn: ({ value }) =>
        Effect.sync(() => {
          invocations += 1
          return value
        }),
    })
    const invalidOutput = Task.make({
      name: "no-wait-invalid-output",
      output: Schema.Struct({
        value: Schema.Number.check(Schema.isGreaterThan(0)),
      }),
      fn: () => Effect.succeed({ value: -1 }),
    })
    const program = Effect.gen(function*() {
      const inputExit = yield* Effect.exit(
        Hatchet.runNoWait(invalidInput, { value: "wrong" }),
      )
      const handle = yield* Hatchet.runNoWait(invalidOutput, undefined)
      const outputExit = yield* Effect.exit(handle.await)
      return { inputExit, outputExit }
    }).pipe(Effect.provide(Hatchet.layerInMemory))

    const { inputExit, outputExit } = await Effect.runPromise(
      Effect.scoped(program),
    )

    expect(invocations).toBe(0)
    expect(Exit.isFailure(inputExit)).toBe(true)
    expect(Exit.isFailure(outputExit)).toBe(true)
    if (Exit.isFailure(inputExit)) {
      expect(
        inputExit.cause.reasons
          .filter(Cause.isFailReason)
          .map((reason) => reason.error),
      ).toEqual([
        expect.objectContaining({
          _tag: "TaskSchemaError",
          phase: "input",
          taskName: "no-wait-invalid-input",
        }),
      ])
    }
    if (Exit.isFailure(outputExit)) {
      expect(
        outputExit.cause.reasons
          .filter(Cause.isFailReason)
          .map((reason) => reason.error),
      ).toEqual([
        expect.objectContaining({
          _tag: "TaskSchemaError",
          phase: "output",
          taskName: "no-wait-invalid-output",
        }),
      ])
    }
  })

  it("captures task Effect requirements supplied alongside Hatchet.layerInMemory", async () => {
    const task = Task.make({
      name: "no-wait-requirement",
      fn: (value: number): Effect.Effect<string, TaskFailure, Prefix> =>
        value > 0
          ? Effect.map(Prefix, ({ value: prefix }) => `${prefix}${value}`)
          : Effect.fail(new TaskFailure()),
    })
    const program = Effect.gen(function*() {
      const handle = yield* Hatchet.runNoWait(task, 7)
      return yield* handle.await
    }).pipe(
      Effect.provide(Layer.succeed(Prefix, { value: "captured-" })),
      Effect.provide(Hatchet.layerInMemory),
    )

    await expect(Effect.runPromise(Effect.scoped(program))).resolves.toBe(
      "captured-7",
    )
  })

  it("interrupts outstanding work through the handle and runs its finalizer", async () => {
    const started = Deferred.makeUnsafe<void>()
    const finalized = Deferred.makeUnsafe<void>()
    const task = Task.make({
      name: "no-wait-cancel",
      fn: () =>
        Effect.acquireRelease(Deferred.succeed(started, undefined), () => Deferred.succeed(finalized, undefined)).pipe(
          Effect.andThen(Effect.never),
        ),
    })
    const program = Effect.gen(function*() {
      const handle = yield* Hatchet.runNoWait(task, undefined)
      yield* Deferred.await(started)
      yield* handle.cancel
      yield* Deferred.await(finalized)
      return yield* Effect.exit(handle.await)
    }).pipe(Effect.provide(Hatchet.layerInMemory))

    const exit = await Effect.runPromise(Effect.scoped(program))

    expect(Exit.isFailure(exit)).toBe(true)
    if (Exit.isFailure(exit)) {
      expect(Cause.hasInterruptsOnly(exit.cause)).toBe(true)
    }
  })

  it("interrupts outstanding work when the in-memory Layer scope closes", async () => {
    const started = Deferred.makeUnsafe<void>()
    const finalized = Deferred.makeUnsafe<void>()
    const task = Task.make({
      name: "no-wait-scope-owned",
      fn: () =>
        Effect.acquireRelease(Deferred.succeed(started, undefined), () => Deferred.succeed(finalized, undefined)).pipe(
          Effect.andThen(Effect.never),
        ),
    })
    const dispatch = Effect.gen(function*() {
      const handle = yield* Hatchet.runNoWait(task, undefined)
      yield* Deferred.await(started)
      return handle.id
    }).pipe(Effect.provide(Hatchet.layerInMemory))

    await Effect.runPromise(Effect.scoped(dispatch))
    await Effect.runPromise(Deferred.await(finalized))
  })
})
