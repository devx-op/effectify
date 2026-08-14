import * as Effect from "effect/Effect"
import { type CatalogEntry, type CatalogResolutionError, resolveCatalog } from "./catalog.js"
import { type Capability, type CreationIntent, decodeCreationIntent, type InvalidCreationIntent } from "./intent.js"

export interface SelectedPlugin {
  readonly capability: "todo.community-labels"
  readonly exportName: "todoLabels"
  readonly packageName: "@effectify-community/todo-labels"
  readonly packageVersion: "1.0.0"
}

export interface TodoPlan {
  readonly canonicalJson: "effectify-cjson/1"
  readonly catalogVersion: "effectify.todo-catalog/1"
  readonly formatVersion: "effectify.todo-plan/1"
  readonly intent: CreationIntent
  readonly mutation: "none"
  readonly orderedCapabilities: ReadonlyArray<Capability>
  readonly selectedPlugins: ReadonlyArray<SelectedPlugin>
}

const compareCapability = (left: Capability, right: Capability): number => {
  const order: ReadonlyArray<Capability> = [
    "todo.workspace",
    "todo.model",
    "todo.port",
    "todo.use-case",
    "todo.file-adapter",
    "todo.cli-presentation",
    "todo.community-labels",
    "todo.events",
  ]
  return order.indexOf(left) - order.indexOf(right)
}

const selectedPlugin = (entry: CatalogEntry): SelectedPlugin | undefined =>
  entry.kind === "community"
    ? {
        capability: entry.capability,
        exportName: entry.exportName,
        packageName: entry.packageName,
        packageVersion: entry.packageVersion,
      }
    : undefined

const canonicalIntent = (intent: CreationIntent): CreationIntent =>
  Object.freeze({
    capabilities: Object.freeze([...new Set(intent.capabilities)].sort(compareCapability)),
    ...(intent.naming === undefined
      ? {}
      : {
          naming: Object.freeze({
            ...intent.naming,
            domain: Object.freeze(intent.naming.domain),
            entity: Object.freeze(intent.naming.entity),
            entrypoint: Object.freeze(intent.naming.entrypoint),
          }),
        }),
    preset: intent.preset,
    version: intent.version,
  })

/** Produces the versioned Todo plan before any Nx adapter or workspace mutation exists. */
export const planTodo = (input: unknown): Effect.Effect<TodoPlan, InvalidCreationIntent | CatalogResolutionError> =>
  Effect.gen(function* () {
    const intent = yield* decodeCreationIntent(input)
    const resolution = yield* resolveCatalog(intent)
    const plugins = resolution.entries.flatMap((entry) => {
      const plugin = selectedPlugin(entry)
      return plugin === undefined ? [] : [plugin]
    })

    return Object.freeze({
      canonicalJson: "effectify-cjson/1",
      catalogVersion: "effectify.todo-catalog/1",
      formatVersion: "effectify.todo-plan/1",
      intent: canonicalIntent(intent),
      mutation: "none",
      orderedCapabilities: Object.freeze(resolution.entries.map((entry) => entry.capability)),
      selectedPlugins: Object.freeze(plugins),
    })
  })
