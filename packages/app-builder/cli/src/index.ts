import {
  composeCatalog,
  type AtomicGenerator,
  type FiniteCatalog,
  type GeneratorId,
} from "@effectify/app-builder-generation"
export { renderTodoPlan } from "./plan.js"

export const composeGeneration = <
  const Generators extends readonly [AtomicGenerator<unknown>, ...AtomicGenerator<unknown>[]],
>(options: {
  readonly catalog: FiniteCatalog<Generators>
  readonly context: unknown
  readonly input: Generators[number] extends AtomicGenerator<infer Input> ? Input : never
  readonly selected: ReadonlyArray<GeneratorId>
}) => composeCatalog(options)
export { generateTodo } from "./generate.js"
export { runCli, runNodeCli } from "./main.js"
export {
  CliCommands,
  CliCommandSchema,
  CliEventSchema,
  CliRequestSchema,
  CliTerminalEnvelopeSchema,
} from "./protocol.js"
export type { CliRuntime } from "./main.js"
export type { CliCommand, CliRequest } from "./protocol.js"
