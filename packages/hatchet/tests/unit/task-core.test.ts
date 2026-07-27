import { describe, expect, expectTypeOf, it } from "vitest"
import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import { Hatchet, Task } from "@effectify/hatchet"
import { makeRunId } from "../../src/Model.js"

class Prefix extends Context.Service<Prefix, { readonly value: string }>()(
  "@effectify/hatchet/test/Prefix",
) {}
class TypedFailure {
  readonly _tag = "TypedFailure" as const
}

describe("Task public type contracts", () => {
  it("infers Schema input/output and preserves typed error and requirements", () => {
    const task = Task.make({
      name: "typed-contract",
      input: Schema.Struct({ value: Schema.Number }),
      output: Schema.String,
      fn: (input): Effect.Effect<string, TypedFailure, Prefix> =>
        input.value > 0
          ? Effect.succeed(String(input.value))
          : Effect.fail(new TypedFailure()),
    })

    expectTypeOf(task.name).toEqualTypeOf<"typed-contract">()
    expectTypeOf(task.execute).parameters.toMatchTypeOf<
      [{ readonly value: number }, Task.Context]
    >()
    expectTypeOf(task.execute).returns.toEqualTypeOf<
      Effect.Effect<string, TypedFailure, Prefix>
    >()
  })
})

describe("Task.make direct Effect execution", () => {
  it("runs a Schema-free task with deterministic context IDs", async () => {
    const task = Task.make({
      name: "greet",
      fn: (name: string, context) => Effect.succeed(`${name}:${Option.getOrThrow(context.workflowRunId)}`),
    })
    const program = Effect.gen(function*() {
      const first = yield* Hatchet.run(task, "Ada")
      const second = yield* Hatchet.run(task, "Grace")
      return [first, second]
    }).pipe(Effect.provide(Hatchet.layerInMemory))

    await expect(Effect.runPromise(Effect.scoped(program))).resolves.toEqual([
      "Ada:run-1",
      "Grace:run-2",
    ])
  })

  it("captures task requirements from the native Effect program", async () => {
    const task = Task.make({
      name: "captured-context",
      fn: () => Effect.map(Prefix, (prefix) => prefix.value),
    })
    const program = Hatchet.run(task, undefined).pipe(
      Effect.provide(Layer.succeed(Prefix, { value: "captured" })),
      Effect.provide(Hatchet.layerInMemory),
    )

    await expect(Effect.runPromise(Effect.scoped(program))).resolves.toBe(
      "captured",
    )
  })

  it("dispatches a durable task through the in-memory registry exactly once", async () => {
    let invocations = 0
    const task = Task.durable({
      name: "durable-local",
      input: Schema.Struct({ value: Schema.Number }),
      fn: ({ value }, context) =>
        Effect.sync(() => {
          invocations += 1
          return `${value}:${context.invocationCount}`
        }),
    })

    await expect(
      Effect.runPromise(
        Effect.scoped(
          Hatchet.run(task, { value: 3 }).pipe(
            Effect.provide(Hatchet.layerInMemory),
          ),
        ),
      ),
    ).resolves.toBe("3:0")
    expect(invocations).toBe(1)
  })

  it("preserves typed failures and leaves defects in the defect channel", async () => {
    const typed = Task.make({
      name: "typed-failure",
      fn: () => Effect.fail(new TypedFailure()),
    })
    const defective = Task.make({
      name: "defect",
      fn: () => Effect.die("unexpected defect"),
    })
    const program = Effect.gen(function*() {
      const typedExit = yield* Effect.exit(Hatchet.run(typed, undefined))
      const defectExit = yield* Effect.exit(Hatchet.run(defective, undefined))
      return { defectExit, typedExit }
    }).pipe(Effect.provide(Hatchet.layerInMemory))

    const { defectExit, typedExit } = await Effect.runPromise(
      Effect.scoped(program),
    )
    expect(Exit.isFailure(typedExit)).toBe(true)
    expect(Exit.isFailure(defectExit)).toBe(true)
    if (Exit.isFailure(typedExit)) {
      expect(
        typedExit.cause.reasons
          .filter(Cause.isFailReason)
          .map((reason) => reason.error),
      ).toEqual([new TypedFailure()])
    }
    if (Exit.isFailure(defectExit)) {
      expect(Cause.hasDies(defectExit.cause)).toBe(true)
    }
  })
})

describe("Schema input and output boundaries", () => {
  it("decodes transformed domain input before invoking the task", async () => {
    const Input = Schema.Struct({ at: Schema.DateFromString })
    const task = Task.make({
      name: "domain-input",
      input: Input,
      output: Schema.String,
      fn: ({ at }) => Effect.succeed(at.toISOString()),
    })

    await expect(
      Effect.runPromise(
        Effect.scoped(
          Hatchet.run(task, { at: "2030-01-01T00:00:00.000Z" }).pipe(
            Effect.provide(Hatchet.layerInMemory),
          ),
        ),
      ),
    ).resolves.toBe("2030-01-01T00:00:00.000Z")
  })

  it("rejects invalid input before invoking the task", async () => {
    let invocations = 0
    const task = Task.make({
      name: "schema-input",
      input: Schema.Struct({ value: Schema.Number }),
      fn: ({ value }) =>
        Effect.sync(() => {
          invocations += 1
          return value * 2
        }),
    })
    const result = Hatchet.run(task, { value: "wrong" }).pipe(
      Effect.catchTag("TaskSchemaError", Effect.succeed),
      Effect.provide(Hatchet.layerInMemory),
    )

    await expect(
      Effect.runPromise(Effect.scoped(result)),
    ).resolves.toMatchObject({
      _tag: "TaskSchemaError",
      phase: "input",
      taskName: "schema-input",
    })
    expect(invocations).toBe(0)
  })

  it("encodes output and reports an invalid output phase", async () => {
    const valid = Task.make({
      name: "schema-output-valid",
      output: Schema.Struct({ at: Schema.DateFromString }),
      fn: () => Effect.succeed({ at: new Date("2030-01-01T00:00:00.000Z") }),
    })
    const invalid = Task.make({
      name: "schema-output-invalid",
      output: Schema.Struct({
        value: Schema.Number.check(Schema.isGreaterThan(0)),
      }),
      fn: () => Effect.succeed({ value: -1 }),
    })
    const program = Effect.gen(function*() {
      const value = yield* Hatchet.run(valid, undefined)
      const failure = yield* Hatchet.run(invalid, undefined).pipe(
        Effect.catchTag("TaskSchemaError", Effect.succeed),
      )
      return { failure, value }
    }).pipe(Effect.provide(Hatchet.layerInMemory))

    await expect(
      Effect.runPromise(Effect.scoped(program)),
    ).resolves.toMatchObject({
      failure: {
        _tag: "TaskSchemaError",
        phase: "output",
        taskName: "schema-output-invalid",
      },
      value: { at: new Date("2030-01-01T00:00:00.000Z") },
    })
  })
})

describe("no-wait execution", () => {
  it("releases a successful fire-and-forget run after completion", async () => {
    const completed = Deferred.makeUnsafe<void>()
    const task = Task.make({
      name: "fire-and-forget-success",
      fn: () => Deferred.succeed(completed, undefined),
    })
    const program = Effect.gen(function*() {
      const handle = yield* Hatchet.runNoWait(task, undefined)
      yield* Deferred.await(completed)
      yield* Effect.yieldNow
      return yield* Hatchet.cancelRun(handle.id).pipe(
        Effect.catchTag("HatchetSdkError", Effect.succeed),
      )
    }).pipe(Effect.provide(Hatchet.layerInMemory))

    await expect(
      Effect.runPromise(Effect.scoped(program)),
    ).resolves.toMatchObject({
      _tag: "HatchetSdkError",
      operation: "run.cancel",
    })
  })

  it("releases a failed fire-and-forget run after completion", async () => {
    const completed = Deferred.makeUnsafe<void>()
    const task = Task.make({
      name: "fire-and-forget-failure",
      fn: () =>
        Deferred.succeed(completed, undefined).pipe(
          Effect.andThen(Effect.fail(new TypedFailure())),
        ),
    })
    const program = Effect.gen(function*() {
      const handle = yield* Hatchet.runNoWait(task, undefined)
      yield* Deferred.await(completed)
      yield* Effect.yieldNow
      return yield* Hatchet.cancelRun(handle.id).pipe(
        Effect.catchTag("HatchetSdkError", Effect.succeed),
      )
    }).pipe(Effect.provide(Hatchet.layerInMemory))

    await expect(
      Effect.runPromise(Effect.scoped(program)),
    ).resolves.toMatchObject({
      _tag: "HatchetSdkError",
      operation: "run.cancel",
    })
  })

  it("does not retain immediately interrupted submissions", async () => {
    const task = Task.make({
      name: "interrupted-submission",
      fn: () => Effect.never,
    })
    const program = Effect.gen(function*() {
      for (let index = 1; index <= 64; index += 1) {
        const submission = yield* Effect.forkChild(
          Hatchet.runNoWait(task, undefined),
        )
        yield* Fiber.interrupt(submission)
      }
      return yield* Effect.forEach(
        Array.from({ length: 64 }, (_, index) => makeRunId(`run-${index + 1}`)),
        (id) =>
          Hatchet.cancelRun(id).pipe(
            Effect.match({
              onFailure: (error) => error._tag,
              onSuccess: () => "retained" as const,
            }),
          ),
      )
    }).pipe(Effect.provide(Hatchet.layerInMemory))

    await expect(
      Effect.runPromise(Effect.scoped(program)),
    ).resolves.not.toContain("retained")
  })

  it("returns an observable handle whose cancellation interrupts work", async () => {
    const started = Deferred.makeUnsafe<void>()
    const task = Task.make({
      name: "wait",
      fn: () => Deferred.succeed(started, undefined).pipe(Effect.andThen(Effect.never)),
    })
    const program = Effect.gen(function*() {
      const handle = yield* Hatchet.runNoWait(task, undefined)
      yield* Deferred.await(started)
      yield* handle.cancel
      return yield* Effect.exit(handle.await)
    }).pipe(Effect.provide(Hatchet.layerInMemory))

    const exit = await Effect.runPromise(Effect.scoped(program))
    expect(Exit.isFailure(exit)).toBe(true)
    if (Exit.isFailure(exit)) {
      expect(Cause.hasInterruptsOnly(exit.cause)).toBe(true)
    }
  })
})
