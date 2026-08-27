import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import {
  Hatchet,
  type MissingTaskError,
  type RunHandle,
  type RunId,
  Task,
  type TaskSchemaError,
} from "@effectify/hatchet"

class Prefix extends Context.Service<Prefix, { readonly value: string }>()(
  "@effectify/hatchet/test/RunNoWaitTypePrefix",
) {}

class TaskFailure {
  readonly _tag = "TaskFailure" as const
}

const task = Task.make({
  name: "typed-run-no-wait",
  input: Schema.Struct({ value: Schema.Finite }),
  output: Schema.String,
  fn: ({ value }): Effect.Effect<string, TaskFailure, Prefix> =>
    value > 0 ? Effect.map(Prefix, ({ value: prefix }) => `${prefix}${value}`) : Effect.fail(new TaskFailure()),
})

const dispatched = Hatchet.runNoWait(task, { value: 1 })
const exactDispatch: Effect.Effect<
  RunHandle<string, TaskFailure>,
  MissingTaskError | TaskSchemaError | Hatchet.AcquisitionError,
  Hatchet.Hatchet | Prefix
> = dispatched

const program = Effect.gen(function* () {
  const handle = yield* Hatchet.runNoWait(task, { value: 1 })
  const id: RunId = handle.id
  const output: string = yield* handle.await
  yield* handle.cancel
  return { id, output }
})

const prefixLayer = Layer.succeed(Prefix, { value: "typed-" })
const hatchetLayer: Layer.Layer<Hatchet.Hatchet, never, Prefix> = Hatchet.layer({
  tasks: [task],
})
const appLayer = Layer.merge(prefixLayer, hatchetLayer.pipe(Layer.provide(prefixLayer)))
const runnable: Effect.Effect<
  { readonly id: RunId; readonly output: string },
  TaskFailure | TaskSchemaError | MissingTaskError | Hatchet.AcquisitionError
> = program.pipe(Effect.provide(appLayer))

// @ts-expect-error RunHandle output remains the Task output type.
const wrongOutput: RunHandle<number, TaskFailure> = exactDispatch

// @ts-expect-error RunHandle id remains branded and does not accept arbitrary strings.
const wrongId: RunId = "run-1"

void exactDispatch
void runnable
void wrongOutput
void wrongId
