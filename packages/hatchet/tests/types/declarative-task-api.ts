import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import { RateLimit, Task, TaskDeclarationError, Trigger } from "@effectify/hatchet"

class Dependency extends Context.Service<
  Dependency,
  { readonly value: string }
>()("@effectify/hatchet/test/DeclarativeDependency") {}

class Failure {
  readonly _tag = "Failure" as const
}

type Input = { readonly value: number }
type Output = { readonly rendered: string }

const ordinary: Task.Task<"ordinary", Input, Output, Failure, Dependency> = Task.make({
  name: "ordinary",
  input: Schema.Struct({ value: Schema.Number }),
  output: Schema.Struct({ rendered: Schema.String }),
  fn: (input): Effect.Effect<Output, Failure, Dependency> =>
    input.value > 0
      ? Effect.map(Dependency, ({ value }) => ({ rendered: value }))
      : Effect.fail(new Failure()),
})

const durable = Task.durable({
  name: "durable",
  fn: (_input: Input, context): Effect.Effect<Output, never, Dependency> => {
    const count: number = context.invocationCount
    return Effect.map(Dependency, ({ value }) => ({
      rendered: `${value}:${count}`,
    }))
  },
})

const mixed: ReadonlyArray<Task.Declaration<Dependency>> = [ordinary, durable]

// @ts-expect-error Advanced Hatchet durable APIs must not be exposed.
durable.execute({ value: 1 }, Task.DurableContext.empty).sleepFor
// @ts-expect-error Ordinary tasks do not receive durable-only context.
ordinary.execute({ value: 1 }, Task.DurableContext.empty).invocationCount

void mixed
void RateLimit.make({ units: 1, duration: "minute" })
void Trigger.event("customer:updated")
void new TaskDeclarationError({
  taskName: "ordinary",
  field: "name",
  reason: "DuplicateIdentity",
})
