import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as Cjson from "./cjson.js"
import { captureReplayProvenance, ReplayIdentities, type ReplayIdentity, type ReplayProvenance } from "./provenance.js"

export class ReplayEvidenceError extends Data.TaggedError("ReplayEvidenceError")<{
  readonly identity: ReplayIdentity | "provenance"
  readonly phase: "candidate" | "recorded" | "workspace"
  readonly reason: "invalid-input" | "mismatch"
}> {}

export interface ReplayWorkspace {
  readonly readOutput: (path: string) => string | undefined
}

export interface ReplayResult {
  readonly diffPaths: ReadonlyArray<string>
  readonly zeroDiff: true
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const isProvenance = (value: unknown): value is ReplayProvenance => {
  if (!isRecord(value)) return false
  const evidence = value.evidence
  const outputIdentities = value.outputIdentities
  return (
    value.version === "effectify.app-builder-replay-provenance/1" &&
    value.canonicalJson === Cjson.CanonicalJsonAlgorithm &&
    typeof value.provenanceDigest === "string" &&
    isRecord(evidence) &&
    ReplayIdentities.every((identity) => typeof evidence[identity] === "string") &&
    Array.isArray(outputIdentities) &&
    outputIdentities.every(
      (output) =>
        isRecord(output) &&
        typeof output.path === "string" &&
        typeof output.mode === "string" &&
        typeof output.owner === "string" &&
        typeof output.sourceDigest === "string",
    )
  )
}

const mismatch = (
  identity: ReplayIdentity | "provenance",
  phase: ReplayEvidenceError["phase"],
  reason: ReplayEvidenceError["reason"] = "mismatch",
) => Effect.fail(new ReplayEvidenceError({ identity, phase, reason }))

const validateRecordedProvenance = (provenance: ReplayProvenance): Effect.Effect<void, ReplayEvidenceError> =>
  Cjson.canonicalDigest({
    canonicalJson: provenance.canonicalJson,
    evidence: provenance.evidence,
    outputIdentities: provenance.outputIdentities,
    version: provenance.version,
  }).pipe(
    Effect.mapError(
      () => new ReplayEvidenceError({ identity: "provenance", phase: "recorded", reason: "invalid-input" }),
    ),
    Effect.flatMap((digest) =>
      digest === provenance.provenanceDigest ? Effect.void : mismatch("provenance", "recorded"),
    ),
  )

/** Validates candidate provenance before observing output, so this authority cannot write a Tree. */
export const validateReplay = (
  provenance: ReplayProvenance,
  candidate: unknown,
  workspace: ReplayWorkspace,
): Effect.Effect<ReplayResult, ReplayEvidenceError> =>
  Effect.gen(function* () {
    yield* validateRecordedProvenance(provenance)
    const candidateProvenance = yield* captureReplayProvenance(candidate).pipe(
      Effect.mapError(
        () => new ReplayEvidenceError({ identity: "provenance", phase: "candidate", reason: "invalid-input" }),
      ),
    )
    for (const identity of ReplayIdentities) {
      if (candidateProvenance.evidence[identity] !== provenance.evidence[identity])
        return yield* mismatch(identity, "candidate")
    }
    for (const output of provenance.outputIdentities) {
      const source = workspace.readOutput(output.path)
      if (source === undefined || Cjson.canonicalSourceDigest(source) !== output.sourceDigest) {
        return yield* mismatch("outputs", "workspace")
      }
    }
    return Object.freeze({ diffPaths: Object.freeze([]), zeroDiff: true })
  })

const workspaceFrom = (input: unknown): Effect.Effect<ReplayWorkspace, ReplayEvidenceError> => {
  if (!Array.isArray(input)) return mismatch("provenance", "workspace", "invalid-input")
  const outputs = new Map<string, string>()
  for (const value of input) {
    if (
      !isRecord(value) ||
      typeof value.path !== "string" ||
      typeof value.content !== "string" ||
      outputs.has(value.path)
    ) {
      return mismatch("provenance", "workspace", "invalid-input")
    }
    outputs.set(value.path, value.content)
  }
  return Effect.succeed({ readOutput: (path) => outputs.get(path) })
}

/** Decodes the closed CLI replay payload into the same no-mutation replay authority. */
export const validateReplayPayload = (input: unknown): Effect.Effect<ReplayResult, ReplayEvidenceError> => {
  if (!isRecord(input)) return mismatch("provenance", "recorded", "invalid-input")
  const provenance = input.provenance
  if (!isProvenance(provenance)) return mismatch("provenance", "recorded", "invalid-input")
  return Effect.flatMap(workspaceFrom(input.workspaceOutputs), (workspace) =>
    validateReplay(provenance, input.candidate, workspace),
  )
}

export { captureReplayProvenance } from "./provenance.js"
