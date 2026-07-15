import type * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import { TaskSchemaError } from "../Error.js"
import type * as Task from "../Task.js"

interface StoredTask {
  readonly run: (
    input: unknown,
    taskContext: Task.Context,
  ) => Effect.Effect<unknown, unknown | TaskSchemaError, unknown>
}

export interface Registry {
  readonly register: <Name extends string, Input, Output, Error, Requirements>(
    task: Task.Task<Name, Input, Output, Error, Requirements>,
    context: Context.Context<Requirements>,
  ) => void
  readonly run: <Output, Error>(
    name: string,
    input: unknown,
    taskContext: Task.Context,
  ) => Effect.Effect<Output, Error | TaskSchemaError> | undefined
  readonly has: (name: string) => boolean
}

const makeStoredTask = <Name extends string, Input, Output, Error, Requirements>(
  task: Task.Task<Name, Input, Output, Error, Requirements>,
  context: Context.Context<Requirements>,
): StoredTask => ({
  run: (input, taskContext) =>
    Effect.gen(function*() {
      const decoded = task.inputSchema
        ? yield* Schema.decodeUnknownEffect(task.inputSchema)(input).pipe(
          Effect.mapError((issue) => new TaskSchemaError({ taskName: task.name, phase: "input", issue })),
        )
        : (input as Input)
      const output = yield* task.execute(decoded, taskContext).pipe(Effect.provideContext(context))
      if (task.outputSchema) {
        yield* Schema.encodeUnknownEffect(task.outputSchema)(output).pipe(
          Effect.mapError((issue) => new TaskSchemaError({ taskName: task.name, phase: "output", issue })),
        )
      }
      return output
    }),
})

export const make = (): Registry => {
  const tasks = new Map<string, StoredTask>()

  return {
    has: (name) => tasks.has(name),
    register: (task, context) => {
      tasks.set(task.name, makeStoredTask(task, context))
    },
    run: <Output, Error>(name: string, input: unknown, taskContext: Task.Context) => {
      const task = tasks.get(name)
      // The heterogeneous map erases task-specific I/O/E/R only here. Callers recover
      // the capability's type parameters through the opaque RegisteredTask contract.
      return task?.run(input, taskContext) as Effect.Effect<Output, Error | TaskSchemaError>
    },
  }
}
