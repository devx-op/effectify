import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import type * as Scope from "effect/Scope"
import { DuplicateTaskError, MissingTaskError, type TaskSchemaError } from "./Error.js"
import { makeRunId, type RunId } from "./Model.js"
import * as Registry from "./internal/registry.js"
import type * as Task from "./Task.js"

declare const RegisteredTaskTypeId: unique symbol

export interface RegisteredTask<Name extends string, Input, Output, Error> {
  readonly name: Name
  readonly [RegisteredTaskTypeId]: readonly [Input, Output, Error]
}

export interface RunHandle<Output, Error> {
  readonly id: RunId
  readonly await: Effect.Effect<Output, Error | TaskSchemaError>
  readonly cancel: Effect.Effect<void>
}

export interface Service {
  readonly register: <Name extends string, Input, Output, Error, Requirements>(
    task: Task.Task<Name, Input, Output, Error, Requirements>,
  ) => Effect.Effect<RegisteredTask<Name, Input, Output, Error>, DuplicateTaskError, Requirements>
  readonly run: <Name extends string, Input, Output, Error>(
    task: RegisteredTask<Name, Input, Output, Error>,
    input: unknown,
  ) => Effect.Effect<Output, Error | TaskSchemaError | MissingTaskError>
  readonly runNoWait: <Name extends string, Input, Output, Error>(
    task: RegisteredTask<Name, Input, Output, Error>,
    input: unknown,
  ) => Effect.Effect<RunHandle<Output, Error>, MissingTaskError, Scope.Scope>
}

export class Hatchet extends Context.Service<Hatchet, Service>()("@effectify/hatchet/Hatchet") {}

const makeService = (): Service => {
  const tasks = Registry.make()
  const capabilities = new WeakMap<object, string>()
  let nextRunId = 1

  const registeredName = <Name extends string, Input, Output, Error>(
    task: RegisteredTask<Name, Input, Output, Error>,
  ): string | undefined => capabilities.get(task)

  const nextContext = (): { readonly id: string; readonly context: Task.Context } => {
    const id = `run-${nextRunId}`
    nextRunId += 1
    return {
      id,
      context: {
        workflowRunId: Option.some(id),
        taskRunExternalId: Option.some(`task-${id}`),
        interruption: Effect.never,
      },
    }
  }

  return {
    register: <Name extends string, Input, Output, Error, Requirements>(
      task: Task.Task<Name, Input, Output, Error, Requirements>,
    ) =>
      Effect.gen(function*() {
        if (tasks.has(task.name)) {
          return yield* new DuplicateTaskError({ taskName: task.name })
        }
        const context = yield* Effect.context<Requirements>()
        tasks.register(task, context)
        const registered = Object.freeze({ name: task.name }) as RegisteredTask<Name, Input, Output, Error>
        capabilities.set(registered, task.name)
        return registered
      }),
    run: <Name extends string, Input, Output, Error>(
      task: RegisteredTask<Name, Input, Output, Error>,
      input: unknown,
    ) => {
      const name = registeredName(task)
      if (!name) {
        return Effect.fail(new MissingTaskError({ taskName: task.name }))
      }
      const execution = nextContext()
      const stored = tasks.run<Output, Error>(name, input, execution.context)
      return stored
        ? stored
        : Effect.fail(new MissingTaskError({ taskName: task.name }))
    },
    runNoWait: <Name extends string, Input, Output, Error>(
      task: RegisteredTask<Name, Input, Output, Error>,
      input: unknown,
    ) => {
      const name = registeredName(task)
      if (!name) {
        return Effect.fail(new MissingTaskError({ taskName: task.name }))
      }
      const execution = nextContext()
      const stored = tasks.run<Output, Error>(name, input, execution.context)
      if (!stored) {
        return Effect.fail(new MissingTaskError({ taskName: task.name }))
      }
      return Effect.gen(function*() {
        const fiber = yield* stored.pipe(Effect.forkScoped)
        return {
          id: makeRunId(execution.id),
          await: Fiber.join(fiber),
          cancel: Fiber.interrupt(fiber),
        }
      })
    },
  }
}

const inMemoryLayer = Layer.sync(Hatchet)(makeService)

export const layerInMemory = inMemoryLayer

export const register = <Name extends string, Input, Output, Error, Requirements>(
  task: Task.Task<Name, Input, Output, Error, Requirements>,
): Effect.Effect<RegisteredTask<Name, Input, Output, Error>, DuplicateTaskError, Hatchet | Requirements> =>
  Effect.gen(function*() {
    const service = yield* Hatchet
    return yield* service.register(task)
  })

export const run = <Name extends string, Input, Output, Error>(
  task: RegisteredTask<Name, Input, Output, Error>,
  input: unknown,
): Effect.Effect<Output, Error | TaskSchemaError | MissingTaskError, Hatchet> =>
  Effect.gen(function*() {
    const service = yield* Hatchet
    return yield* service.run(task, input)
  })

export const runNoWait = <Name extends string, Input, Output, Error>(
  task: RegisteredTask<Name, Input, Output, Error>,
  input: unknown,
): Effect.Effect<RunHandle<Output, Error>, MissingTaskError, Hatchet | Scope.Scope> =>
  Effect.gen(function*() {
    const service = yield* Hatchet
    return yield* service.runNoWait(task, input)
  })
