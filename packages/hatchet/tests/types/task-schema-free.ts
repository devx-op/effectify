import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { Hatchet, Task } from "@effectify/hatchet"

class SchemaFreeDependency extends Context.Service<SchemaFreeDependency, { readonly prefix: string }>()(
  "@effectify/hatchet/test/SchemaFreeDependency",
) {}

class OtherDependency extends Context.Service<OtherDependency, { readonly value: number }>()(
  "@effectify/hatchet/test/OtherDependency",
) {}

class SchemaFreeFailure {
  readonly _tag = "SchemaFreeFailure" as const
}

type Input = { readonly value: number }
type Output = { readonly rendered: string }

const task = Task.make({
  name: "schema-free",
  fn: (input: Input): Effect.Effect<Output, SchemaFreeFailure, SchemaFreeDependency> =>
    input.value > 0
      ? Effect.map(SchemaFreeDependency, ({ prefix }) => ({ rendered: `${prefix}${input.value}` }))
      : Effect.fail(new SchemaFreeFailure()),
})

const literalName: "schema-free" = task.name
const exactTask: Task.Task<"schema-free", Input, Output, SchemaFreeFailure, SchemaFreeDependency> = task
const exactExecute: (
  input: Input,
  context: Task.Context,
) => Effect.Effect<Output, SchemaFreeFailure, SchemaFreeDependency> = task.execute
const directLayer: Layer.Layer<Hatchet.Hatchet> = Hatchet.layerInMemory

void literalName
void exactTask
void exactExecute
void directLayer

// @ts-expect-error layerInMemory is a direct Layer value, not a factory.
Hatchet.layerInMemory()

// @ts-expect-error Task input remains the inferred Input type.
const invalidInput: Parameters<typeof task.execute>[0] = { value: "wrong" }

type TaskOutput =
  ReturnType<typeof task.execute> extends Effect.Effect<infer Output, infer _Error, infer _Requirements>
    ? Output
    : never
type TaskRequirements =
  ReturnType<typeof task.execute> extends Effect.Effect<infer _Output, infer _Error, infer Requirements>
    ? Requirements
    : never

// @ts-expect-error Task output remains Output rather than this incompatible shape.
const wrongOutput: TaskOutput = { wrong: "wrong" }

// @ts-expect-error Task requirements remain SchemaFreeDependency rather than OtherDependency.
const wrongRequirements: TaskRequirements = OtherDependency

void invalidInput
void wrongOutput
void wrongRequirements
