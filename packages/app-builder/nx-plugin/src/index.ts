export * as ApplyPlan from "./apply-plan.js"
import {
  composeCatalog,
  type AtomicGenerator,
  type FiniteCatalog,
  type GeneratorId,
} from "@effectify/app-builder-generation"
export const composeGeneration = <
  const Generators extends readonly [AtomicGenerator<unknown>, ...AtomicGenerator<unknown>[]],
>(options: {
  readonly catalog: FiniteCatalog<Generators>
  readonly context: unknown
  readonly input: Generators[number] extends AtomicGenerator<infer Input> ? Input : never
  readonly selected: ReadonlyArray<GeneratorId>
}) => composeCatalog(options)

export type { AppliedTodoTopology } from "./apply-plan.js"
