import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"

export const Pr130EvidenceClass = Schema.Literals([
  "unit-1-replay-completeness",
  "unit-2-typed-kernel-catalog",
  "unit-3-generation-surfaces",
  "unit-4-atomic-todo-materialization",
  "unit-5-todo-v1-parity",
  "unit-6-public-cli-lifecycle",
])
export type Pr130EvidenceClass = typeof Pr130EvidenceClass.Type
const CanonicalEvidenceClasses = Object.freeze(Pr130EvidenceClass.literals)

export const Pr130FrozenHead = "d5928f99a122b04cb70ff68bfa02fa2d5648a5fc"

export const Pr130ExpectedEvidenceIdentities: Readonly<Record<Pr130EvidenceClass, string>> = Object.freeze({
  "unit-1-replay-completeness": "613a9654a183910956cc72153f7f8c33b3a78282",
  "unit-2-typed-kernel-catalog": "b85aabf05d6cb800e017cd5f4dc4e2ccc6a03e7f",
  "unit-3-generation-surfaces": "76aab96389f0f0c7c4ab02b20dbf53b7e60abcfa",
  "unit-4-atomic-todo-materialization": "21b92cc564ac806a82e50640552fdf8f0d6d674a",
  "unit-5-todo-v1-parity": "2ad43e0cca44a0ed34db27fa29b344a71fc8e214",
  "unit-6-public-cli-lifecycle": "54b9677b541cdb4fb3f0be11d5b4e77914f8a4c7",
})

export const Pr130RegenerationProof = Schema.Struct({
  version: Schema.Literal("effectify.app-builder-pr130-regeneration-proof/1"),
  evidence: Schema.Array(
    Schema.Struct({
      evidenceClass: Pr130EvidenceClass,
      identity: Schema.String,
    }),
  ),
  pr130Head: Schema.String,
})
export type Pr130RegenerationProof = typeof Pr130RegenerationProof.Type

export const Pr130RegenerationBlockReason = Schema.TaggedUnion({
  MissingEvidence: { evidenceClass: Pr130EvidenceClass },
  MismatchedEvidence: {
    actualIdentities: Schema.Array(Schema.String),
    evidenceClass: Pr130EvidenceClass,
    expectedIdentity: Schema.String,
  },
  WrongPr130Head: { actualHead: Schema.String, expectedHead: Schema.String },
})
export type Pr130RegenerationBlockReason = typeof Pr130RegenerationBlockReason.Type

export class Pr130RegenerationBlocked extends Data.TaggedError("Pr130RegenerationBlocked")<{
  readonly reasons: ReadonlyArray<Pr130RegenerationBlockReason>
}> {}

export interface Pr130RegenerationEligibility {
  readonly prNumber: 130
  readonly status: "eligible"
}

const eligibility: Pr130RegenerationEligibility = Object.freeze({ prNumber: 130, status: "eligible" })

/** Evaluates canonical evidence only; it owns no external read or mutation capability. */
export const requirePr130RegenerationEligibility = (
  proof: Pr130RegenerationProof,
): Effect.Effect<Pr130RegenerationEligibility, Pr130RegenerationBlocked> => {
  const reasons: Array<Pr130RegenerationBlockReason> = []
  for (const evidenceClass of CanonicalEvidenceClasses) {
    const expectedIdentity = Pr130ExpectedEvidenceIdentities[evidenceClass]
    const actualIdentities = proof.evidence
      .filter((evidence) => evidence.evidenceClass === evidenceClass)
      .map((evidence) => evidence.identity)
      .sort()
    if (actualIdentities.length === 0) {
      reasons.push({ _tag: "MissingEvidence", evidenceClass })
    } else if (actualIdentities.length !== 1 || actualIdentities[0] !== expectedIdentity) {
      reasons.push({
        _tag: "MismatchedEvidence",
        actualIdentities: Object.freeze(actualIdentities),
        evidenceClass,
        expectedIdentity,
      })
    }
  }
  if (proof.pr130Head !== Pr130FrozenHead) {
    reasons.push({ _tag: "WrongPr130Head", actualHead: proof.pr130Head, expectedHead: Pr130FrozenHead })
  }
  return reasons.length === 0
    ? Effect.succeed(eligibility)
    : Effect.fail(new Pr130RegenerationBlocked({ reasons: Object.freeze(reasons) }))
}
