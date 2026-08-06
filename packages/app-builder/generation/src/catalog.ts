import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import type { Capability, CreationIntent } from "./intent.js"

export interface OfficialCatalogEntry {
  readonly capability: Capability
  readonly kind: "official"
  readonly requires: ReadonlyArray<Capability>
  readonly order: number
}

export interface CommunityCatalogEntry {
  readonly capability: "todo.community-labels"
  readonly kind: "community"
  readonly requires: ReadonlyArray<Capability>
  readonly order: number
  readonly packageName: "@effectify-community/todo-labels"
  readonly packageVersion: "1.0.0"
  readonly exportName: "todoLabels"
  readonly installedVersion: string
  readonly allowlisted: boolean
}

export type CatalogEntry = OfficialCatalogEntry | CommunityCatalogEntry

export interface Catalog {
  readonly version: "effectify.todo-catalog/1"
  readonly entries: ReadonlyArray<CatalogEntry>
}

export interface CatalogResolution {
  readonly entries: ReadonlyArray<CatalogEntry>
}

export class CatalogResolutionError extends Data.TaggedError("CatalogResolutionError")<{
  readonly capability: string
  readonly reason: "incompatible" | "unavailable"
}> {}

const official = (
  capability: OfficialCatalogEntry["capability"],
  requires: ReadonlyArray<Capability>,
  order: number,
): OfficialCatalogEntry => ({ capability, kind: "official", requires, order })

/** The only community package metadata trusted by this finite Todo catalog. */
const todoLabels = (): CommunityCatalogEntry => ({
  capability: "todo.community-labels",
  kind: "community",
  requires: ["todo.cli-presentation"],
  order: 6,
  packageName: "@effectify-community/todo-labels",
  packageVersion: "1.0.0",
  exportName: "todoLabels",
  installedVersion: "1.0.0",
  allowlisted: true,
})

export const TodoCatalog: Catalog = Object.freeze({
  version: "effectify.todo-catalog/1",
  entries: Object.freeze([
    official("todo.workspace", [], 0),
    official("todo.model", ["todo.workspace"], 1),
    official("todo.port", ["todo.model"], 2),
    official("todo.use-case", ["todo.port"], 3),
    official("todo.file-adapter", ["todo.use-case"], 4),
    official("todo.cli-presentation", ["todo.file-adapter"], 5),
    todoLabels(),
    official("todo.events", ["todo.cli-presentation"], 7),
  ]),
})

const compareEntries = (left: CatalogEntry, right: CatalogEntry): number =>
  left.order - right.order || left.capability.localeCompare(right.capability)

const hasTrustedCommunityMetadata = (entry: CommunityCatalogEntry): boolean =>
  entry.allowlisted &&
  entry.packageName === "@effectify-community/todo-labels" &&
  entry.packageVersion === "1.0.0" &&
  entry.exportName === "todoLabels" &&
  entry.installedVersion === entry.packageVersion

/** Resolves a finite capability closure without importing, executing, or mutating anything. */
export const resolveCatalog = (
  intent: CreationIntent,
  catalog: Catalog = TodoCatalog,
): Effect.Effect<CatalogResolution, CatalogResolutionError> =>
  Effect.gen(function* () {
    const byCapability = new Map(catalog.entries.map((entry) => [entry.capability, entry]))
    const closure = new Set<Capability>()

    const visit = (capability: Capability): CatalogResolutionError | undefined => {
      if (closure.has(capability)) return undefined

      const entry = byCapability.get(capability)
      if (entry === undefined) return new CatalogResolutionError({ capability, reason: "unavailable" })
      if (entry.kind === "community" && !hasTrustedCommunityMetadata(entry)) {
        return new CatalogResolutionError({ capability, reason: "incompatible" })
      }

      closure.add(capability)
      for (const requirement of entry.requires) {
        const failure = visit(requirement)
        if (failure !== undefined) return failure
      }
      return undefined
    }

    for (const capability of intent.capabilities) {
      const failure = visit(capability)
      if (failure !== undefined) return yield* Effect.fail(failure)
    }

    const entries = [...closure]
      .map((capability) => byCapability.get(capability))
      .filter((entry): entry is CatalogEntry => entry !== undefined)
      .sort(compareEntries)

    return Object.freeze({ entries: Object.freeze(entries) })
  })
