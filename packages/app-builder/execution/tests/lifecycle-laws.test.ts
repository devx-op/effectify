import { expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Result from "effect/Result"
import * as Schema from "effect/Schema"
import { AutomaticPolicy, RunLifecycle } from "../src/index.js"

const version = { major: 1, minor: 0, patch: 0 }
const runRef = { id: "run:laws", version }
const planRef = { id: "plan:laws", version }
const protocolRef = { id: "protocol:laws", version }
const contracts = { planRef, protocolRef }

const draft = (snapshotContracts = contracts) =>
  Schema.decodeUnknownSync(RunLifecycle.LifecycleSnapshot)({
    _tag: "Draft",
    runRef,
    contracts: snapshotContracts,
    revision: 0,
    lastSequence: 0,
    history: [],
  })

const validate = (
  input: {
    readonly requestId?: string
    readonly expectedRevision?: number
    readonly facts?: ReadonlyArray<{ readonly key: string; readonly value: null | boolean | number | string }>
    readonly secrets?: ReadonlyArray<{
      readonly key: string
      readonly present: boolean
      readonly source: AutomaticPolicy.SecretSource
    }>
    readonly contracts?: typeof contracts
  } = {},
) =>
  Schema.decodeUnknownSync(RunLifecycle.TransitionRequest)({
    _tag: "Validate",
    requestId: input.requestId ?? "request:validate",
    expectedRevision: input.expectedRevision ?? 0,
    cause: "validate facts",
    facts: input.facts ?? [],
    secrets: input.secrets ?? [],
    contracts: input.contracts ?? contracts,
  })

const applied = (result: ReturnType<typeof RunLifecycle.reduce>) => {
  if (Result.isFailure(result) || result.success._tag !== "Applied") {
    throw new Error("Expected an applied lifecycle transition")
  }
  return result.success
}

it("normalizes facts by UTF-16 order and normalizes negative zero", () => {
  const result = applied(
    RunLifecycle.reduce({
      snapshot: draft(),
      request: validate({
        facts: [
          { key: "z", value: -0 },
          { key: "A", value: 1 },
          { key: "a", value: 2 },
        ],
      }),
      priorResults: [],
    }),
  )

  expect(result.snapshot).toMatchObject({
    _tag: "Validated",
    facts: [
      { key: "A", value: 1 },
      { key: "a", value: 2 },
      { key: "z", value: 0 },
    ],
  })
  if (result.snapshot._tag !== "Validated") throw new Error("Expected a validated snapshot")
  expect(Object.is(result.snapshot.facts[2].value, -0)).toBe(false)
})

it("collapses equal duplicate descriptors and rejects conflicting fact or secret classifications", () => {
  const equalDuplicates = RunLifecycle.reduce({
    snapshot: draft(),
    request: validate({
      facts: [
        { key: "region", value: "us-east-1" },
        { key: "region", value: "us-east-1" },
      ],
      secrets: [
        { key: "token", present: true, source: "environment" },
        { key: "token", present: true, source: "environment" },
      ],
    }),
    priorResults: [],
  })
  const conflictingFact = RunLifecycle.reduce({
    snapshot: draft(),
    request: validate({
      facts: [
        { key: "region", value: "us-east-1" },
        { key: "region", value: "eu-west-1" },
      ],
    }),
    priorResults: [],
  })
  const reusedClassification = RunLifecycle.reduce({
    snapshot: draft(),
    request: validate({
      facts: [{ key: "token", value: "declared" }],
      secrets: [{ key: "token", present: true, source: "environment" }],
    }),
    priorResults: [],
  })

  const appliedDuplicates = applied(equalDuplicates)
  expect(appliedDuplicates.evidence.facts).toEqual([{ key: "region", value: "us-east-1" }])
  expect(appliedDuplicates.evidence.secrets).toEqual([{ key: "token", present: true, source: "environment" }])
  expect(conflictingFact).toMatchObject({
    _tag: "Failure",
    failure: { _tag: "ConflictingDuplicate", scope: "facts", key: "region" },
  })
  expect(reusedClassification).toMatchObject({
    _tag: "Failure",
    failure: { _tag: "ConflictingDuplicate", scope: "secrets", key: "token" },
  })
})

it("rejects arbitrary secret provenance before it can reach evidence", () => {
  const decoded = Schema.decodeUnknownResult(AutomaticPolicy.SecretDescriptor)({
    key: "token",
    present: true,
    source: "sk_live_secret",
  })

  expect(Result.isFailure(decoded)).toBe(true)
})

it("returns a detached immutable prior result for an equivalent replay before revision comparison", () => {
  const originalRequest = validate({ facts: [{ key: "region", value: "us-east-1" }] })
  const original = applied(RunLifecycle.reduce({ snapshot: draft(), request: originalRequest, priorResults: [] }))
  const prior = Schema.decodeUnknownSync(RunLifecycle.PriorTransitionResult)({
    requestId: originalRequest.requestId,
    normalizedRequest: originalRequest,
    result: original,
  })
  const replay = RunLifecycle.reduce({
    snapshot: draft(),
    request: validate({
      requestId: "request:validate",
      expectedRevision: 999,
      facts: [{ key: "region", value: "us-east-1" }],
    }),
    priorResults: [prior],
  })

  if (Result.isFailure(replay)) throw new Error("Expected an equivalent replay")
  expect(replay.success).toEqual(prior.result)
  expect(replay.success).not.toBe(prior.result)
  expect(replay.success.snapshot).not.toBe(prior.result.snapshot)
  expect(replay.success.evidence).not.toBe(prior.result.evidence)
  expect(replay.success.snapshot.history).not.toBe(prior.result.snapshot.history)
  expect(replay.success.snapshot.history[0]).not.toBe(prior.result.snapshot.history[0])

  expect(Reflect.set(replay.success.evidence, "cause", "mutated replay cause")).toBe(false)
  expect(Reflect.set(replay.success.snapshot.history[0]!, "cause", "mutated replay history")).toBe(false)
  expect(replay.success).toEqual(prior.result)
  expect(prior.result.evidence.cause).toBe("validate facts")
  expect(prior.result.snapshot.history[0]?.cause).toBe("validate facts")
})

it("preserves replay semantics when replay starts from the persisted resulting snapshot", () => {
  const originalRequest = validate({ facts: [{ key: "region", value: "us-east-1" }] })
  const original = applied(RunLifecycle.reduce({ snapshot: draft(), request: originalRequest, priorResults: [] }))
  const prior = Schema.decodeUnknownSync(RunLifecycle.PriorTransitionResult)({
    requestId: originalRequest.requestId,
    normalizedRequest: originalRequest,
    result: original,
  })

  const replay = RunLifecycle.reduce({ snapshot: original.snapshot, request: originalRequest, priorResults: [prior] })

  if (Result.isFailure(replay)) throw new Error(`Expected an equivalent replay, received ${replay.failure._tag}`)
  expect(replay.success).toEqual(prior.result)
  expect(replay.success).not.toBe(prior.result)
})

it("returns the original result when an equivalent replay starts from a later descendant", () => {
  const originalRequest = validate({ facts: [{ key: "region", value: "us-east-1" }] })
  const original = applied(RunLifecycle.reduce({ snapshot: draft(), request: originalRequest, priorResults: [] }))
  const prior = Schema.decodeUnknownSync(RunLifecycle.PriorTransitionResult)({
    requestId: originalRequest.requestId,
    normalizedRequest: originalRequest,
    result: original,
  })
  const cancellationRequest = Schema.decodeUnknownSync(RunLifecycle.TransitionRequest)({
    _tag: "RequestCancellation",
    requestId: "request:cancel-after-validation",
    expectedRevision: 1,
    cause: "cancel validated run",
    facts: [],
    secrets: [],
    contracts,
  })
  const descendant = RunLifecycle.reduce({
    snapshot: original.snapshot,
    request: cancellationRequest,
    priorResults: [],
  })
  if (Result.isFailure(descendant)) throw new Error("Expected a later descendant transition")
  const descendantHistory = descendant.success.snapshot.history

  const replay = RunLifecycle.reduce({
    snapshot: descendant.success.snapshot,
    request: originalRequest,
    priorResults: [prior],
  })

  if (Result.isFailure(replay)) throw new Error(`Expected a delayed replay, received ${replay.failure._tag}`)
  expect(replay.success).toEqual(prior.result)
  expect(replay.success).not.toBe(prior.result)
  expect(descendant.success.snapshot.history).toBe(descendantHistory)
  expect(descendant.success.snapshot.history).toHaveLength(2)
})

it("rejects a replay when embedded history evidence diverges from top-level evidence", () => {
  const originalRequest = validate()
  const original = applied(RunLifecycle.reduce({ snapshot: draft(), request: originalRequest, priorResults: [] }))
  const divergentHistoryEvidence = { ...original.evidence, cause: "fabricated history cause" }
  const prior = Schema.decodeUnknownSync(RunLifecycle.PriorTransitionResult)({
    requestId: originalRequest.requestId,
    normalizedRequest: originalRequest,
    result: {
      ...original,
      snapshot: { ...original.snapshot, history: [divergentHistoryEvidence] },
    },
  })

  const replay = RunLifecycle.reduce({ snapshot: draft(), request: originalRequest, priorResults: [prior] })

  expect(replay).toMatchObject({ _tag: "Failure", failure: { _tag: "PriorResultMismatch" } })
})

it("rejects a replay when embedded history evidence has different normalized facts", () => {
  const originalRequest = validate({ facts: [{ key: "region", value: "us-east-1" }] })
  const original = applied(RunLifecycle.reduce({ snapshot: draft(), request: originalRequest, priorResults: [] }))
  const divergentHistoryEvidence = {
    ...original.evidence,
    facts: [{ key: "region", value: "eu-west-1" }],
  }
  const prior = Schema.decodeUnknownSync(RunLifecycle.PriorTransitionResult)({
    requestId: originalRequest.requestId,
    normalizedRequest: originalRequest,
    result: {
      ...original,
      snapshot: { ...original.snapshot, history: [divergentHistoryEvidence] },
    },
  })

  const replay = RunLifecycle.reduce({ snapshot: draft(), request: originalRequest, priorResults: [prior] })

  expect(replay).toMatchObject({ _tag: "Failure", failure: { _tag: "PriorResultMismatch" } })
})

it("rejects replayed result snapshots with a forged run reference", () => {
  const originalRequest = validate()
  const original = applied(RunLifecycle.reduce({ snapshot: draft(), request: originalRequest, priorResults: [] }))
  const prior = Schema.decodeUnknownSync(RunLifecycle.PriorTransitionResult)({
    requestId: originalRequest.requestId,
    normalizedRequest: originalRequest,
    result: {
      ...original,
      snapshot: { ...original.snapshot, runRef: { id: "run:forged", version } },
    },
  })

  const replay = RunLifecycle.reduce({ snapshot: draft(), request: originalRequest, priorResults: [prior] })

  expect(replay).toMatchObject({ _tag: "Failure", failure: { _tag: "PriorResultMismatch" } })
})

it("rejects replayed result snapshots with forged contracts", () => {
  const originalRequest = validate()
  const original = applied(RunLifecycle.reduce({ snapshot: draft(), request: originalRequest, priorResults: [] }))
  const prior = Schema.decodeUnknownSync(RunLifecycle.PriorTransitionResult)({
    requestId: originalRequest.requestId,
    normalizedRequest: originalRequest,
    result: {
      ...original,
      snapshot: {
        ...original.snapshot,
        contracts: { ...original.snapshot.contracts, planRef: { id: "plan:forged", version } },
      },
    },
  })

  const replay = RunLifecycle.reduce({ snapshot: draft(), request: originalRequest, priorResults: [prior] })

  expect(replay).toMatchObject({ _tag: "Failure", failure: { _tag: "PriorResultMismatch" } })
})

it("rejects replay histories that are not a complete extension of the supplied snapshot", () => {
  const validateRequest = validate()
  const validated = applied(RunLifecycle.reduce({ snapshot: draft(), request: validateRequest, priorResults: [] }))
  const cancellationRequest = Schema.decodeUnknownSync(RunLifecycle.TransitionRequest)({
    _tag: "RequestCancellation",
    requestId: "request:cancel",
    expectedRevision: 1,
    cause: "cancel run",
    facts: [],
    secrets: [],
    contracts,
  })
  const cancellation = RunLifecycle.reduce({
    snapshot: validated.snapshot,
    request: cancellationRequest,
    priorResults: [],
  })
  if (Result.isFailure(cancellation)) throw new Error("Expected a cancellation request")
  const cancelled = cancellation.success
  const first = cancelled.snapshot.history[0]!
  const final = cancelled.evidence
  const cases = [
    {
      name: "forged preceding evidence",
      snapshot: validated.snapshot,
      history: [{ ...first, requestId: "request:forged" }, final],
      revision: 2,
      lastSequence: 2,
    },
    {
      name: "history cardinality and lastSequence mismatch",
      snapshot: validated.snapshot,
      history: [first, final],
      revision: 2,
      lastSequence: 3,
    },
    {
      name: "non-contiguous sequence and revision",
      snapshot: validated.snapshot,
      history: [{ ...first, nextRevision: 0 }, final],
      revision: 2,
      lastSequence: 2,
    },
    {
      name: "history that does not extend the supplied source snapshot",
      snapshot: {
        ...validated.snapshot,
        history: [{ ...first, cause: "persisted source evidence" }],
      },
      history: [first, final],
      revision: 2,
      lastSequence: 2,
    },
  ] as const

  for (const testCase of cases) {
    const prior = Schema.decodeUnknownSync(RunLifecycle.PriorTransitionResult)({
      requestId: cancellationRequest.requestId,
      normalizedRequest: cancellationRequest,
      result: {
        ...cancelled,
        snapshot: {
          ...cancelled.snapshot,
          revision: testCase.revision,
          lastSequence: testCase.lastSequence,
          history: testCase.history,
        },
      },
    })
    const replay = RunLifecycle.reduce({
      snapshot: Schema.decodeUnknownSync(RunLifecycle.LifecycleSnapshot)(testCase.snapshot),
      request: cancellationRequest,
      priorResults: [prior],
    })

    expect(replay, testCase.name).toMatchObject({
      _tag: "Failure",
      failure: { _tag: "PriorResultMismatch" },
    })
  }
})

it("rejects unavailable, mismatched, and conflicting prior replay material without rewriting history", () => {
  const originalRequest = validate()
  const original = applied(RunLifecycle.reduce({ snapshot: draft(), request: originalRequest, priorResults: [] }))
  const missing = RunLifecycle.reduce({
    snapshot: original.snapshot,
    request: originalRequest,
    priorResults: [],
  })
  const mismatchedPrior = Schema.decodeUnknownSync(RunLifecycle.PriorTransitionResult)({
    requestId: originalRequest.requestId,
    normalizedRequest: originalRequest,
    result: {
      ...original,
      evidence: { ...original.evidence, requestId: "request:other" },
    },
  })
  const mismatch = RunLifecycle.reduce({ snapshot: draft(), request: originalRequest, priorResults: [mismatchedPrior] })
  const fabricatedEvidence = { ...original.evidence, cause: "fabricated", from: "Draft", to: "Executing" }
  const fabricatedPrior = Schema.decodeUnknownSync(RunLifecycle.PriorTransitionResult)({
    requestId: originalRequest.requestId,
    normalizedRequest: originalRequest,
    result: {
      ...original,
      snapshot: { ...original.snapshot, _tag: "Executing", history: [fabricatedEvidence] },
      evidence: fabricatedEvidence,
    },
  })
  const fabricated = RunLifecycle.reduce({
    snapshot: draft(),
    request: originalRequest,
    priorResults: [fabricatedPrior],
  })
  const differentBody = RunLifecycle.reduce({
    snapshot: draft(),
    request: validate({ facts: [{ key: "region", value: "eu-west-1" }] }),
    priorResults: [
      Schema.decodeUnknownSync(RunLifecycle.PriorTransitionResult)({
        requestId: originalRequest.requestId,
        normalizedRequest: originalRequest,
        result: original,
      }),
    ],
  })

  expect(missing).toMatchObject({ _tag: "Failure", failure: { _tag: "PriorResultUnavailable" } })
  expect(mismatch).toMatchObject({ _tag: "Failure", failure: { _tag: "PriorResultMismatch" } })
  expect(fabricated).toMatchObject({ _tag: "Failure", failure: { _tag: "PriorResultMismatch" } })
  expect(differentBody).toMatchObject({
    _tag: "Failure",
    failure: { _tag: "ConflictingDuplicate", scope: "request" },
  })
})

it("guards safe counter successors, keeps inputs immutable, and closes terminal snapshots", () => {
  const exhaustedRevision = RunLifecycle.reduce({
    snapshot: Schema.decodeUnknownSync(RunLifecycle.LifecycleSnapshot)({
      _tag: "Draft",
      runRef,
      contracts,
      revision: Number.MAX_SAFE_INTEGER,
      lastSequence: 0,
      history: [],
    }),
    request: validate({ expectedRevision: Number.MAX_SAFE_INTEGER }),
    priorResults: [],
  })
  const exhaustedSequence = RunLifecycle.reduce({
    snapshot: Schema.decodeUnknownSync(RunLifecycle.LifecycleSnapshot)({
      _tag: "Draft",
      runRef,
      contracts,
      revision: 0,
      lastSequence: Number.MAX_SAFE_INTEGER,
      history: [],
    }),
    request: validate(),
    priorResults: [],
  })
  const initial = draft()
  const transitioned = applied(RunLifecycle.reduce({ snapshot: initial, request: validate(), priorResults: [] }))
  const terminal = Schema.decodeUnknownSync(RunLifecycle.LifecycleSnapshot)({
    _tag: "Succeeded",
    runRef,
    contracts,
    revision: 1,
    lastSequence: 1,
    history: [{ ...transitioned.evidence, to: "Succeeded" }],
  })
  const afterTerminal = RunLifecycle.reduce({
    snapshot: terminal,
    request: validate({ expectedRevision: 1, requestId: "request:terminal" }),
    priorResults: [],
  })

  expect(exhaustedRevision).toMatchObject({
    _tag: "Failure",
    failure: { _tag: "SnapshotIntegrityFailure", reason: "history" },
  })
  expect(exhaustedSequence).toMatchObject({
    _tag: "Failure",
    failure: { _tag: "SnapshotIntegrityFailure", reason: "history" },
  })
  expect(initial).toMatchObject({ _tag: "Draft", revision: 0, lastSequence: 0, history: [] })
  expect(transitioned.snapshot).not.toBe(initial)
  expect(transitioned.snapshot.history).toHaveLength(1)
  expect(afterTerminal).toMatchObject({ _tag: "Failure", failure: { _tag: "IllegalTransition" } })
})

it("rejects a decoded source snapshot with incomplete history before validation", () => {
  const inconsistent = Schema.decodeUnknownSync(RunLifecycle.LifecycleSnapshot)({
    _tag: "Draft",
    runRef,
    contracts,
    revision: 2,
    lastSequence: 0,
    history: [],
  })

  const result = RunLifecycle.reduce({
    snapshot: inconsistent,
    request: validate({ expectedRevision: 2 }),
    priorResults: [],
  })

  expect(result).toMatchObject({ _tag: "Failure", failure: { _tag: "SnapshotIntegrityFailure" } })
})

it("preserves nested caller-owned contracts, facts, and causes after reduction", () => {
  const mutableContracts = {
    planRef: { id: "plan:immutable", version: { major: 1, minor: 0, patch: 0 } },
    protocolRef: { id: "protocol:immutable", version: { major: 1, minor: 0, patch: 0 } },
  }
  const request = validate({
    contracts: mutableContracts,
    facts: [{ key: "region", value: "us-east-1" }],
  })
  const result = applied(RunLifecycle.reduce({ snapshot: draft(mutableContracts), request, priorResults: [] }))
  const firstFact = request.facts[0]
  if (firstFact === undefined) throw new Error("Expected the request fact")

  expect(Reflect.set(request.contracts.planRef, "id", "plan:mutated")).toBe(true)
  expect(Reflect.set(firstFact, "value", "eu-west-1")).toBe(true)
  expect(Reflect.set(request, "cause", "mutated cause")).toBe(true)

  expect(result.evidence).toMatchObject({
    cause: "validate facts",
    facts: [{ key: "region", value: "us-east-1" }],
    contracts: { planRef: { id: "plan:immutable" } },
  })
  expect(result.snapshot).toMatchObject({
    contracts: { planRef: { id: "plan:immutable" } },
    history: [
      {
        cause: "validate facts",
        facts: [{ key: "region", value: "us-east-1" }],
        contracts: { planRef: { id: "plan:immutable" } },
      },
    ],
  })
})

it("returns deeply immutable evidence shared by the appended history entry", () => {
  const result = applied(
    RunLifecycle.reduce({
      snapshot: draft(),
      request: validate({ facts: [{ key: "region", value: "us-east-1" }] }),
      priorResults: [],
    }),
  )
  const historyEvidence = result.snapshot.history[0]
  if (historyEvidence === undefined) throw new Error("Expected the appended history evidence")

  expect(historyEvidence).toBe(result.evidence)
  expect(historyEvidence.contracts).toBe(result.evidence.contracts)
  expect(Reflect.set(result.evidence.contracts.planRef, "id", "plan:rewritten")).toBe(false)
  expect(Reflect.set(historyEvidence.contracts.planRef, "id", "plan:rewritten-history")).toBe(false)
  expect(result.evidence.contracts.planRef.id).toBe("plan:laws")
  expect(historyEvidence.contracts.planRef.id).toBe("plan:laws")
  expect(result.snapshot.contracts.planRef.id).toBe("plan:laws")
})

it.effect("returns deterministic results for concurrent reductions of one immutable snapshot", () =>
  Effect.gen(function* () {
    const initial = draft()
    const requestValue = validate({ facts: [{ key: "region", value: "us-east-1" }] })
    const results = yield* Effect.all(
      [
        Effect.sync(() => RunLifecycle.reduce({ snapshot: initial, request: requestValue, priorResults: [] })),
        Effect.sync(() => RunLifecycle.reduce({ snapshot: initial, request: requestValue, priorResults: [] })),
      ],
      { concurrency: "unbounded" },
    )

    expect(results[0]).toStrictEqual(results[1])
    expect(initial).toMatchObject({ _tag: "Draft", revision: 0, lastSequence: 0, history: [] })
  }),
)
