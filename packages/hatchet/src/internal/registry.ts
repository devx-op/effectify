import type * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import * as Scope from "effect/Scope"
import { TaskSchemaError } from "../Error.js"
import type * as Task from "../Task.js"

interface StoredTask {
  readonly run: (
    input: unknown,
    taskContext: Task.Context | Task.DurableContext,
  ) => Effect.Effect<unknown, unknown | TaskSchemaError, unknown>
}

export interface Registry {
  readonly add: <Name extends string, Input, Output, Error, Requirements>(
    task: Task.Of<Name, Input, Output, Error, Requirements>,
    context: Context.Context<Requirements>,
  ) => void
  readonly run: <Output, Error>(
    name: string,
    input: unknown,
    taskContext: Task.Context | Task.DurableContext,
  ) => Effect.Effect<Output, Error | TaskSchemaError> | undefined
  readonly has: (name: string) => boolean
}

const makeStoredTask = <
  Name extends string,
  Input,
  Output,
  Error,
  Requirements,
>(
  task: Task.Of<Name, Input, Output, Error, Requirements>,
  context: Context.Context<Requirements>,
): StoredTask => ({
  run: (input, taskContext) =>
    Effect.gen(function*() {
      const taskScope = yield* Scope.Scope
      const decoded = task.inputSchema
        ? yield* Schema.decodeUnknownEffect(task.inputSchema)(input).pipe(
          Effect.mapError(
            (issue) =>
              new TaskSchemaError({
                taskName: task.name,
                phase: "input",
                issue,
              }),
          ),
        )
        : (input as Input)
      const output = yield* (task._tag === "Durable"
        ? task.execute(decoded, {
          ...taskContext,
          invocationCount: "invocationCount" in taskContext
            ? taskContext.invocationCount
            : 0,
        })
        : task.execute(decoded, taskContext))
        .pipe(
          Effect.provideService(Scope.Scope, taskScope),
          Effect.provideContext(context),
        )
      if (task.outputSchema) {
        yield* Schema.encodeUnknownEffect(task.outputSchema)(output).pipe(
          Effect.mapError(
            (issue) =>
              new TaskSchemaError({
                taskName: task.name,
                phase: "output",
                issue,
              }),
          ),
        )
      }
      return output
    }),
})

export const make = (): Registry => {
  const tasks = new Map<string, StoredTask>()

  return {
    has: (name) => tasks.has(name),
    add: (task, context) => {
      tasks.set(task.name, makeStoredTask(task, context))
    },
    run: <Output, Error>(
      name: string,
      input: unknown,
      taskContext: Task.Context | Task.DurableContext,
    ) => {
      const task = tasks.get(name)
      // The heterogeneous map erases task-specific I/O/E/R only here. Public callers
      // retain those parameters through the declarative Task identity.
      return task?.run(input, taskContext) as Effect.Effect<
        Output,
        Error | TaskSchemaError
      >
    },
  }
}
