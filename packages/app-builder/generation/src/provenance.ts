import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as Cjson from "./cjson.js"

export const ReplayIdentities = ["blocks", "catalog", "dependencies", "intent", "outputs", "pins", "plan"] as const
export type ReplayIdentity = (typeof ReplayIdentities)[number]

export interface ReplayEvidence {
  readonly blocks: string
  readonly catalog: string
  readonly dependencies: string
  readonly intent: string
  readonly outputs: string
  readonly pins: string
  readonly plan: string
}

export interface OutputIdentity {
  readonly mode: string
  readonly owner: string
  readonly path: string
  readonly sourceDigest: string
}

export interface ReplayProvenance {
  readonly canonicalJson: typeof Cjson.CanonicalJsonAlgorithm
  readonly evidence: ReplayEvidence
  readonly outputIdentities: ReadonlyArray<OutputIdentity>
  readonly provenanceDigest: string
  readonly version: "effectify.app-builder-replay-provenance/1"
}

export class ReplayProvenanceError extends Data.TaggedError("ReplayProvenanceError")<{
  readonly field: string
  readonly reason: "invalid-candidate" | "unfrozen-install"
}> {}

interface ReplayCandidate {
  readonly blocks: unknown
  readonly catalog: unknown
  readonly dependencies: unknown
  readonly intent: unknown
  readonly outputs: unknown
  readonly pins: unknown
  readonly plan: unknown
}

interface ReplayOutput {
  readonly content: string
  readonly mode: string
  readonly owner: string
  readonly path: string
}

interface SemanticDependency {
  readonly importer: string
  readonly integrity: string
  readonly name: string
  readonly peers: Readonly<Record<string, string>>
  readonly version: string
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const text = (record: Record<string, unknown>, field: string): string | undefined => {
  const value = record[field]
  return typeof value === "string" && value.length > 0 ? value : undefined
}

const failure = (field: string, reason: ReplayProvenanceError["reason"] = "invalid-candidate") =>
  Effect.fail(new ReplayProvenanceError({ field, reason }))

const decodeCandidate = (input: unknown): Effect.Effect<ReplayCandidate, ReplayProvenanceError> => {
  if (!isRecord(input)) return failure("candidate")
  const { blocks, catalog, dependencies, intent, outputs, pins, plan } = input
  return blocks === undefined ||
    catalog === undefined ||
    dependencies === undefined ||
    intent === undefined ||
    outputs === undefined ||
    pins === undefined ||
    plan === undefined
    ? failure("candidate")
    : Effect.succeed({ blocks, catalog, dependencies, intent, outputs, pins, plan })
}

const decodeOutputs = (input: unknown): Effect.Effect<ReadonlyArray<ReplayOutput>, ReplayProvenanceError> => {
  if (!Array.isArray(input)) return failure("outputs")
  const outputs: Array<ReplayOutput> = []
  for (const value of input) {
    if (!isRecord(value)) return failure("outputs")
    const content = text(value, "content")
    const mode = text(value, "mode")
    const owner = text(value, "owner")
    const path = text(value, "path")
    if (
      content === undefined ||
      mode === undefined ||
      owner === undefined ||
      path === undefined ||
      path.includes("..")
    ) {
      return failure("outputs")
    }
    outputs.push({ content: Cjson.normalizeSource(content), mode, owner, path })
  }
  const ordered = outputs.sort((left, right) => left.path.localeCompare(right.path))
  return ordered.length === 0 || ordered.some((output, index) => output.path === ordered[index - 1]?.path)
    ? failure("outputs")
    : Effect.succeed(Object.freeze(ordered))
}

const semanticDependencies = (
  input: unknown,
): Effect.Effect<ReadonlyArray<SemanticDependency>, ReplayProvenanceError> => {
  if (!Array.isArray(input)) return failure("dependencies")
  const dependencies: Array<SemanticDependency> = []
  for (const value of input) {
    if (!isRecord(value) || !isRecord(value.peers)) return failure("dependencies")
    const importer = text(value, "importer")
    const integrity = text(value, "integrity")
    const name = text(value, "name")
    const version = text(value, "version")
    const peers: Record<string, string> = {}
    for (const [key, peer] of Object.entries(value.peers).sort()) {
      if (typeof peer !== "string") return failure("dependencies")
      peers[key] = peer
    }
    if (importer === undefined || integrity === undefined || name === undefined || version === undefined)
      return failure("dependencies")
    dependencies.push({ importer, integrity, name, peers: Object.freeze(peers), version })
  }
  return Effect.succeed(
    Object.freeze(dependencies.sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)))),
  )
}

const validatePins = (input: unknown): Effect.Effect<void, ReplayProvenanceError> => {
  if (
    !isRecord(input) ||
    text(input, "packageManager") === undefined ||
    text(input, "nx") === undefined ||
    text(input, "effect") === undefined ||
    !Array.isArray(input.plugins)
  )
    return failure("pins")
  if (input.frozenInstall !== true) return failure("pins", "unfrozen-install")
  return input.plugins.every(
    (plugin) => isRecord(plugin) && text(plugin, "name") !== undefined && text(plugin, "version") !== undefined,
  )
    ? Effect.void
    : failure("pins")
}

const digest = (identity: ReplayIdentity, input: unknown): Effect.Effect<string, ReplayProvenanceError> =>
  Cjson.canonicalDigest(input).pipe(
    Effect.mapError(() => new ReplayProvenanceError({ field: identity, reason: "invalid-candidate" })),
  )

export const semanticDependencyDigest = (input: unknown): Effect.Effect<string, ReplayProvenanceError> =>
  Effect.flatMap(semanticDependencies(input), (dependencies) => digest("dependencies", dependencies))

export const outputIdentityDigest = (
  outputIdentities: ReadonlyArray<OutputIdentity>,
): Effect.Effect<string, ReplayProvenanceError> => digest("outputs", outputIdentities)

/** Captures normalized, frozen semantic provenance without acquiring a mutation adapter. */
export const captureReplayProvenance = (input: unknown): Effect.Effect<ReplayProvenance, ReplayProvenanceError> =>
  Effect.gen(function* () {
    const candidate = yield* decodeCandidate(input)
    yield* validatePins(candidate.pins)
    const outputs = yield* decodeOutputs(candidate.outputs)
    const outputIdentities = Object.freeze(
      outputs.map(({ content, mode, owner, path }) =>
        Object.freeze({ mode, owner, path, sourceDigest: Cjson.canonicalSourceDigest(content) }),
      ),
    )
    const evidence: ReplayEvidence = Object.freeze({
      blocks: yield* digest("blocks", candidate.blocks),
      catalog: yield* digest("catalog", candidate.catalog),
      dependencies: yield* semanticDependencyDigest(candidate.dependencies),
      intent: yield* digest("intent", candidate.intent),
      outputs: yield* outputIdentityDigest(outputIdentities),
      pins: yield* digest("pins", candidate.pins),
      plan: yield* digest("plan", candidate.plan),
    })
    const provenanceDigest = yield* Cjson.canonicalDigest({
      canonicalJson: Cjson.CanonicalJsonAlgorithm,
      evidence,
      outputIdentities,
      version: "effectify.app-builder-replay-provenance/1",
    }).pipe(Effect.mapError(() => new ReplayProvenanceError({ field: "provenance", reason: "invalid-candidate" })))
    return Object.freeze({
      canonicalJson: Cjson.CanonicalJsonAlgorithm,
      evidence,
      outputIdentities,
      provenanceDigest,
      version: "effectify.app-builder-replay-provenance/1",
    })
  })
