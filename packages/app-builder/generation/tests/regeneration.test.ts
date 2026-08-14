import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Result from "effect/Result"
import * as Generation from "../src/index.js"
import {
  Pr130EvidenceClass,
  Pr130FrozenHead,
  type Pr130RegenerationProof,
  requirePr130RegenerationEligibility,
} from "../src/regeneration.js"

const ExpectedCanonicalEvidence: Pr130RegenerationProof["evidence"] = Object.freeze([
  {
    evidenceClass: "unit-1-replay-completeness",
    identity: "613a9654a183910956cc72153f7f8c33b3a78282",
  },
  {
    evidenceClass: "unit-2-typed-kernel-catalog",
    identity: "b85aabf05d6cb800e017cd5f4dc4e2ccc6a03e7f",
  },
  {
    evidenceClass: "unit-3-generation-surfaces",
    identity: "76aab96389f0f0c7c4ab02b20dbf53b7e60abcfa",
  },
  {
    evidenceClass: "unit-4-atomic-todo-materialization",
    identity: "21b92cc564ac806a82e50640552fdf8f0d6d674a",
  },
  {
    evidenceClass: "unit-5-todo-v1-parity",
    identity: "2ad43e0cca44a0ed34db27fa29b344a71fc8e214",
  },
  {
    evidenceClass: "unit-6-public-cli-lifecycle",
    identity: "54b9677b541cdb4fb3f0be11d5b4e77914f8a4c7",
  },
])
const ExpectedCanonicalClasses = Object.freeze(ExpectedCanonicalEvidence.map(({ evidenceClass }) => evidenceClass))
const ExpectedPr130Head = "d5928f99a122b04cb70ff68bfa02fa2d5648a5fc"

const completeProof = (): Pr130RegenerationProof => ({
  version: "effectify.app-builder-pr130-regeneration-proof/1",
  evidence: ExpectedCanonicalEvidence.map((evidence) => ({ ...evidence })),
  pr130Head: ExpectedPr130Head,
})

it.effect("incomplete canonical proof blocks PR #130 regeneration before effects", () =>
  Effect.gen(function* () {
    const failure = yield* requirePr130RegenerationEligibility({
      ...completeProof(),
      evidence: [],
    }).pipe(Effect.flip)

    expect(failure).toMatchObject({ _tag: "Pr130RegenerationBlocked" })
    expect(failure.reasons).toEqual(
      ExpectedCanonicalClasses.map((evidenceClass) => ({ _tag: "MissingEvidence", evidenceClass })),
    )
  }),
)

it.effect("each canonical Unit evidence class is independently required", () =>
  Effect.gen(function* () {
    for (const missing of ExpectedCanonicalClasses) {
      const proof = completeProof()
      const failure = yield* requirePr130RegenerationEligibility({
        ...proof,
        evidence: proof.evidence.filter(({ evidenceClass }) => evidenceClass !== missing),
      }).pipe(Effect.flip)

      expect(failure.reasons).toEqual([{ _tag: "MissingEvidence", evidenceClass: missing }])
    }
  }),
)

it.effect("mismatched evidence identities block PR #130 regeneration deterministically", () =>
  Effect.gen(function* () {
    const evidence = completeProof()
      .evidence.map(({ evidenceClass }) => ({ evidenceClass, identity: `stale:${evidenceClass}` }))
      .reverse()
    const failure = yield* requirePr130RegenerationEligibility({ ...completeProof(), evidence }).pipe(Effect.flip)

    expect(failure.reasons).toEqual(
      ExpectedCanonicalEvidence.map(({ evidenceClass, identity }) => ({
        _tag: "MismatchedEvidence",
        actualIdentities: [`stale:${evidenceClass}`],
        evidenceClass,
        expectedIdentity: identity,
      })),
    )
  }),
)

it.effect("wrong frozen PR #130 head blocks eligibility", () =>
  Effect.gen(function* () {
    const failure = yield* requirePr130RegenerationEligibility({
      ...completeProof(),
      pr130Head: "54b9677b541cdb4fb3f0be11d5b4e77914f8a4c7",
    }).pipe(Effect.flip)

    expect(failure.reasons).toEqual([
      {
        _tag: "WrongPr130Head",
        actualHead: "54b9677b541cdb4fb3f0be11d5b4e77914f8a4c7",
        expectedHead: Pr130FrozenHead,
      },
    ])
  }),
)

it.effect("complete canonical proof returns regeneration eligibility only", () =>
  Effect.gen(function* () {
    const proof = Object.freeze({
      ...completeProof(),
      evidence: Object.freeze(completeProof().evidence.map((entry) => Object.freeze(entry))),
    })
    const before = structuredClone(proof)
    const eligibility = yield* requirePr130RegenerationEligibility(proof)

    expect(eligibility).toEqual({ prNumber: 130, status: "eligible" })
    expect(proof).toEqual(before)
  }),
)

it("frozen PR #130 head remains typed input evidence only", () => {
  const source = readFileSync(fileURLToPath(new URL("../src/regeneration.ts", import.meta.url)), "utf8")

  expect(Pr130FrozenHead).toBe("d5928f99a122b04cb70ff68bfa02fa2d5648a5fc")
  expect(source).not.toMatch(/node:|github|octokit|\bfetch\b|Effect\.(promise|tryPromise)/i)
})

it.effect("public evidence metadata cannot weaken the canonical Unit 6 requirement", () =>
  Effect.gen(function* () {
    const publicClasses = Pr130EvidenceClass.literals
    const original = [...publicClasses]
    const deleted = Reflect.deleteProperty(publicClasses, "5")
    const shortened = Reflect.set(publicClasses, "length", 5)
    const outcome = yield* Effect.result(
      requirePr130RegenerationEligibility({
        ...completeProof(),
        evidence: ExpectedCanonicalEvidence.filter(
          ({ evidenceClass }) => evidenceClass !== "unit-6-public-cli-lifecycle",
        ),
      }),
    )
    for (const [index, evidenceClass] of original.entries()) {
      Reflect.set(publicClasses, String(index), evidenceClass)
    }
    Reflect.set(publicClasses, "length", original.length)

    expect(Result.isFailure(outcome)).toBe(true)
    if (Result.isFailure(outcome)) {
      expect(outcome.failure.reasons).toEqual([
        { _tag: "MissingEvidence", evidenceClass: "unit-6-public-cli-lifecycle" },
      ])
    }
    expect("Pr130EvidenceClasses" in Generation.Pr130Regeneration).toBe(false)
    expect([deleted, shortened, Object.isFrozen(publicClasses)]).toEqual([false, false, true])
  }),
)
