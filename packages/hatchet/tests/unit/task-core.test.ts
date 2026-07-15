import { describe, expect, expectTypeOf, it } from "vitest"
import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import { Hatchet, Task } from "@effectify/hatchet"

class Prefix extends Context.Service<Prefix, { readonly value: string }>()("@effectify/hatchet/test/Prefix") {}

class TypedFailure {
  readonly _tag = "TypedFailure" as const
}

describe("Task public type contracts", () => {
  it("infers schema input/output and preserves typed error and requirements", () => {
    const task = Task.make({
      name: "typed-contract",
      input: Schema.Struct({ value: Schema.Number }),
      output: Schema.String,
      fn: (input): Effect.Effect<string, TypedFailure, Prefix> =>
        input.value > 0 ? Effect.succeed(String(input.value)) : Effect.fail(new TypedFailure()),
    })

    expectTypeOf(task.name).toEqualTypeOf<"typed-contract">()
    expectTypeOf(task.execute).parameters.toMatchTypeOf<[
      { readonly value: number },
      Task.Context,
    ]>()
    expectTypeOf(task.execute).returns.toEqualTypeOf<Effect.Effect<string, TypedFailure, Prefix>>()

    // @ts-expect-error RegisteredTask is an opaque capability, not a name-shaped value.
    const forged: Hatchet.RegisteredTask<"typed-contract", { readonly value: number }, string, TypedFailure> = {
      name: "typed-contract",
    }
    expectTypeOf(forged).toEqualTypeOf<
      Hatchet.RegisteredTask<"typed-contract", { readonly value: number }, string, TypedFailure>
    >()
  })
})

describe("Task.make and in-memory execution", () => {
  it("registers and runs a schema-free task with deterministic context IDs", async () => {
    const task = Task.make({
      name: "greet",
      fn: (name: string, context) => Effect.succeed(`${name}:${Option.getOrThrow(context.workflowRunId)}`),
    })

    const program = Effect.gen(function*() {
      const registered = yield* Hatchet.register(task)
      return yield* Hatchet.run(registered, "Ada")
    }).pipe(Effect.provide(Hatchet.layerInMemory))

    await expect(Effect.runPromise(program)).resolves.toBe("Ada:run-1")
  })

  it("allocates a new deterministic ID for each awaited execution", async () => {
    const task = Task.make({
      name: "identify",
      fn: (_: undefined, context) => Effect.succeed(Option.getOrThrow(context.taskRunExternalId)),
    })
    const program = Effect.gen(function*() {
      const registered = yield* Hatchet.register(task)
      return [yield* Hatchet.run(registered, undefined), yield* Hatchet.run(registered, undefined)]
    }).pipe(Effect.provide(Hatchet.layerInMemory))

    await expect(Effect.runPromise(program)).resolves.toEqual(["task-run-1", "task-run-2"])
  })
})

describe("schema boundaries", () => {
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
    const program = Effect.gen(function*() {
      const registered = yield* Hatchet.register(task)
      return yield* Hatchet.run(registered, { value: "wrong" })
    }).pipe(
      Effect.catchTag("TaskSchemaError", (error) => Effect.succeed(error)),
      Effect.provide(Hatchet.layerInMemory),
    )

    await expect(Effect.runPromise(program)).resolves.toMatchObject({
      _tag: "TaskSchemaError",
      phase: "input",
      taskName: "schema-input",
    })
    expect(invocations).toBe(0)
  })

  it("rejects an invalid output after the task executes", async () => {
    const task = Task.make({
      name: "schema-output",
      output: Schema.Struct({ value: Schema.Number }),
      fn: () => Effect.succeed({ value: "wrong" }),
    })
    const program = Effect.gen(function*() {
      const registered = yield* Hatchet.register(task)
      return yield* Hatchet.run(registered, undefined)
    }).pipe(
      Effect.catchTag("TaskSchemaError", (error) => Effect.succeed(error)),
      Effect.provide(Hatchet.layerInMemory),
    )

    await expect(Effect.runPromise(program)).resolves.toMatchObject({
      _tag: "TaskSchemaError",
      phase: "output",
      taskName: "schema-output",
    })
  })
})

describe("registration, context, and error taxonomy", () => {
  it("rejects a duplicate without replacing the originally registered task", async () => {
    const original = Task.make({ name: "single-name", fn: () => Effect.succeed("original") })
    const replacement = Task.make({ name: "single-name", fn: () => Effect.succeed("replacement") })
    const program = Effect.gen(function*() {
      const registered = yield* Hatchet.register(original)
      const duplicate = yield* Hatchet.register(replacement).pipe(
        Effect.catchTag("DuplicateTaskError", (error) => Effect.succeed(error)),
      )
      const result = yield* Hatchet.run(registered, undefined)
      return { duplicate, result }
    }).pipe(Effect.provide(Hatchet.layerInMemory))

    await expect(Effect.runPromise(program)).resolves.toMatchObject({
      duplicate: { _tag: "DuplicateTaskError", taskName: "single-name" },
      result: "original",
    })
  })

  it("rejects missing and forged registration capabilities", async () => {
    const forged = { name: "not-registered" } as unknown as Hatchet.RegisteredTask<
      "not-registered",
      undefined,
      string,
      never
    >
    const program = Hatchet.run(forged, undefined).pipe(
      Effect.catchTag("MissingTaskError", (error) => Effect.succeed(error)),
      Effect.provide(Hatchet.layerInMemory),
    )

    await expect(Effect.runPromise(program)).resolves.toMatchObject({
      _tag: "MissingTaskError",
      taskName: "not-registered",
    })
  })

  it("captures dependencies at registration instead of requiring them at execution", async () => {
    const task = Task.make({
      name: "captured-context",
      fn: () => Effect.map(Prefix, (prefix) => prefix.value),
    })
    const capturedPrefix = Layer.succeed(Prefix, { value: "captured" })
    const program = Effect.gen(function*() {
      const registered = yield* Hatchet.register(task).pipe(Effect.provide(capturedPrefix))
      return yield* Hatchet.run(registered, undefined)
    }).pipe(Effect.provide(Hatchet.layerInMemory))

    await expect(Effect.runPromise(program)).resolves.toBe("captured")
  })

  it("preserves typed failures and leaves defects in the defect channel", async () => {
    const typed = Task.make({ name: "typed-failure", fn: () => Effect.fail(new TypedFailure()) })
    const defective = Task.make({ name: "defect", fn: () => Effect.die("unexpected defect") })
    const program = Effect.gen(function*() {
      const typedTask = yield* Hatchet.register(typed)
      const defectTask = yield* Hatchet.register(defective)
      const typedExit = yield* Effect.exit(Hatchet.run(typedTask, undefined))
      const defectExit = yield* Effect.exit(Hatchet.run(defectTask, undefined))
      return { typedExit, defectExit }
    }).pipe(Effect.provide(Hatchet.layerInMemory))

    const { typedExit, defectExit } = await Effect.runPromise(program)
    expect(Exit.isFailure(typedExit)).toBe(true)
    expect(Exit.isFailure(defectExit)).toBe(true)
    if (Exit.isFailure(typedExit)) {
      expect(typedExit.cause.reasons.filter(Cause.isFailReason).map((reason) => reason.error)).toEqual([
        new TypedFailure(),
      ])
      expect(Cause.hasDies(typedExit.cause)).toBe(false)
    }
    if (Exit.isFailure(defectExit)) {
      expect(Cause.hasDies(defectExit.cause)).toBe(true)
      expect(defectExit.cause.reasons.filter(Cause.isFailReason)).toEqual([])
    }
  })
})

describe("no-wait execution", () => {
  it("returns immediately and preserves a successful result", async () => {
    const task = Task.make({ name: "success", fn: () => Effect.succeed("done") })
    const program = Effect.gen(function*() {
      const registered = yield* Hatchet.register(task)
      const handle = yield* Hatchet.runNoWait(registered, undefined)
      return yield* handle.await
    }).pipe(Effect.provide(Hatchet.layerInMemory))

    await expect(Effect.runPromise(Effect.scoped(program))).resolves.toBe("done")
  })

  it("returns an observable handle whose failure is preserved", async () => {
    const task = Task.make({ name: "failure", fn: () => Effect.fail("expected") })
    const program = Effect.gen(function*() {
      const registered = yield* Hatchet.register(task)
      const handle = yield* Hatchet.runNoWait(registered, undefined)
      return yield* Effect.exit(handle.await)
    }).pipe(Effect.provide(Hatchet.layerInMemory))

    const exit = await Effect.runPromise(Effect.scoped(program))
    expect(exit._tag).toBe("Failure")
  })

  it("returns a handle before input validation and reports input schema failure through await", async () => {
    let invocations = 0
    const task = Task.make({
      name: "no-wait-schema-input",
      input: Schema.Struct({ value: Schema.Number }),
      fn: ({ value }) =>
        Effect.sync(() => {
          invocations += 1
          return value
        }),
    })
    const program = Effect.gen(function*() {
      const registered = yield* Hatchet.register(task)
      const handle = yield* Hatchet.runNoWait(registered, { value: "wrong" })
      return yield* Effect.exit(handle.await)
    }).pipe(Effect.provide(Hatchet.layerInMemory))

    const exit = await Effect.runPromise(Effect.scoped(program))
    expect(Exit.isFailure(exit)).toBe(true)
    if (Exit.isFailure(exit)) {
      expect(exit.cause.reasons.filter(Cause.isFailReason).map((reason) => reason.error)).toMatchObject([
        { _tag: "TaskSchemaError", phase: "input", taskName: "no-wait-schema-input" },
      ])
    }
    expect(invocations).toBe(0)
  })

  it("reports output schema failure through the no-wait handle", async () => {
    const task = Task.make({
      name: "no-wait-schema-output",
      output: Schema.Struct({ value: Schema.Number }),
      fn: () => Effect.succeed({ value: "wrong" }),
    })
    const program = Effect.gen(function*() {
      const registered = yield* Hatchet.register(task)
      const handle = yield* Hatchet.runNoWait(registered, undefined)
      return yield* Effect.exit(handle.await)
    }).pipe(Effect.provide(Hatchet.layerInMemory))

    const exit = await Effect.runPromise(Effect.scoped(program))
    expect(Exit.isFailure(exit)).toBe(true)
    if (Exit.isFailure(exit)) {
      expect(exit.cause.reasons.filter(Cause.isFailReason).map((reason) => reason.error)).toMatchObject([
        { _tag: "TaskSchemaError", phase: "output", taskName: "no-wait-schema-output" },
      ])
    }
  })

  it("interrupts outstanding work when the owning scope closes", async () => {
    const task = Task.make({ name: "scope-close", fn: () => Effect.never })
    const handle = await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function*() {
          const registered = yield* Hatchet.register(task)
          return yield* Hatchet.runNoWait(registered, undefined)
        }).pipe(Effect.provide(Hatchet.layerInMemory)),
      ),
    )

    const exit = await Effect.runPromise(Effect.exit(handle.await))
    expect(Exit.isFailure(exit)).toBe(true)
    if (Exit.isFailure(exit)) {
      expect(Cause.hasInterruptsOnly(exit.cause)).toBe(true)
    }
  })

  it("returns an observable handle whose cancellation interrupts work", async () => {
    const started = Deferred.makeUnsafe<void>()
    const task = Task.make({
      name: "wait",
      fn: () => Deferred.succeed(started, undefined).pipe(Effect.andThen(Effect.never)),
    })
    const program = Effect.gen(function*() {
      const registered = yield* Hatchet.register(task)
      const handle = yield* Hatchet.runNoWait(registered, undefined)
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

describe("breaking alpha removal", () => {
  it("does not expose the legacy workflow DSL or its source tree", async () => {
    const api = await import("@effectify/hatchet")
    expect(api).not.toHaveProperty("workflow")
    expect(api).not.toHaveProperty("task")
    expect(api).not.toHaveProperty("registerWorkflow")
    const { existsSync } = await import("node:fs")
    expect(existsSync(new URL("../../src/workflow", import.meta.url))).toBe(false)
    expect(existsSync(new URL("../../src/effectifier", import.meta.url))).toBe(false)
  })
})
