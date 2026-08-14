import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import type { Capability, CreationIntent } from "./intent.js"
import {
  type AtomicGenerator,
  type Capability as KernelCapability,
  CapabilityGraphFailure,
  type FileContribution,
  ContributionConflict,
  decodeRenderContext,
  type FiniteCatalog,
  type GenerationFailure,
  type GeneratorId,
  SchemaContextFailure,
} from "./kernel.js"

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

export interface CatalogComposition {
  readonly contributions: ReadonlyArray<FileContribution>
  readonly generatorIds: ReadonlyArray<GeneratorId>
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

const composeFailure = (capability: string, reason: CapabilityGraphFailure["reason"]) =>
  Effect.fail(new CapabilityGraphFailure({ capability, reason }))

export const composeCatalog = <
  Input,
  const Generators extends readonly [AtomicGenerator<Input>, ...AtomicGenerator<Input>[]],
>(options: {
  readonly catalog: FiniteCatalog<Generators>
  readonly context: unknown
  readonly input: unknown
  readonly selected: ReadonlyArray<GeneratorId>
}): Effect.Effect<CatalogComposition, GenerationFailure> =>
  Effect.gen(function* () {
    const context = yield* decodeRenderContext(options.context)
    const byId = new Map<GeneratorId, AtomicGenerator<Input>>()
    const providers = new Map<KernelCapability, AtomicGenerator<Input>>()
    for (const generator of options.catalog) {
      if (byId.has(generator.id)) return yield* composeFailure(generator.id, "duplicate-generator-id")
      byId.set(generator.id, generator)
      for (const capability of generator.provides) {
        if (providers.has(capability)) {
          return yield* Effect.fail(new ContributionConflict({ identity: capability, reason: "duplicate-provider" }))
        }
        providers.set(capability, generator)
      }
    }

    const closure = new Set<GeneratorId>()
    const visiting = new Set<GeneratorId>()
    const visit = (id: GeneratorId): Effect.Effect<void, CapabilityGraphFailure> => {
      const generator = byId.get(id)
      if (generator === undefined) return composeFailure(id, "missing-capability")
      if (closure.has(id)) return Effect.void
      if (visiting.has(id)) return composeFailure(id, "cyclic-capability")
      visiting.add(id)
      return Effect.forEach(generator.requires, (capability) => {
        const provider = providers.get(capability)
        return provider === undefined ? composeFailure(capability, "missing-capability") : visit(provider.id)
      }).pipe(
        Effect.asVoid,
        Effect.tap(() =>
          Effect.sync(() => {
            visiting.delete(id)
            closure.add(id)
          }),
        ),
      )
    }
    yield* Effect.forEach(options.selected, visit)

    const dependencies = new Map(
      [...closure].map((id) => {
        const generator = byId.get(id)
        const required =
          generator === undefined ? [] : generator.requires.flatMap((capability) => [providers.get(capability)?.id])
        return [
          id,
          new Set(required.filter((value): value is GeneratorId => value !== undefined && closure.has(value))),
        ] as const
      }),
    )
    const remaining = new Set(closure)
    const generatorIds: Array<GeneratorId> = []
    while (remaining.size > 0) {
      const ready = [...remaining].filter((id) => dependencies.get(id)?.size === 0).sort()
      if (ready.length === 0) return yield* composeFailure([...remaining].sort()[0] ?? "catalog", "cyclic-capability")
      for (const id of ready) {
        remaining.delete(id)
        generatorIds.push(id)
        for (const required of dependencies.values()) required.delete(id)
      }
    }

    const contributions: Array<FileContribution> = []
    const paths = new Set<string>()
    for (const id of generatorIds) {
      const generator = byId.get(id)
      if (generator === undefined) continue
      const input = yield* Schema.decodeUnknownEffect(generator.InputSchema)(options.input).pipe(
        Effect.mapError(() => new SchemaContextFailure({ boundary: "intent", reason: "schema" })),
      )
      for (const contribution of yield* generator.render(input, context)) {
        if (paths.has(contribution.path)) {
          return yield* Effect.fail(new ContributionConflict({ identity: contribution.path, reason: "duplicate-path" }))
        }
        paths.add(contribution.path)
        contributions.push(Object.freeze({ ...contribution }))
      }
    }
    return Object.freeze({
      contributions: Object.freeze(contributions.sort((left, right) => left.path.localeCompare(right.path))),
      generatorIds: Object.freeze(generatorIds),
    })
  })
