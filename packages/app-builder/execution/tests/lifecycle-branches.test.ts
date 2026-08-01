import { expect, it } from "@effect/vitest"
import { decodePassivePlan, Reference } from "@effectify/app-builder-contracts"
import * as Result from "effect/Result"
import * as Schema from "effect/Schema"
import { RunLifecycle } from "../src/index.js"

const version = { major: 1, minor: 0, patch: 0 }
const runRef = { id: "run:branches", version }
const planRef = { id: "plan:branches", version }
const protocolRef = { id: "protocol:branches", version }
const contracts = { planRef, protocolRef }
const policyRequest = {
  requestId: "policy:branches",
  policyRef: protocolRef,
  runRef,
  planRef,
  lifecycleIdempotent: true,
  facts: [],
  secrets: [],
}
const approvedReceipt = {
  requestId: "policy:branches",
  policyRef: protocolRef,
  decision: { _tag: "Approved" },
  facts: [],
  secrets: [],
}
const safePointEvidence = { safePointId: "safe-point:branches", detail: "written output is absent" }

const snapshot = (tag: RunLifecycle.LifecycleSnapshot["_tag"], revision = 0) => {
  const base = { _tag: tag, runRef, contracts, revision, lastSequence: 0, history: [] }
  switch (tag) {
    case "Draft":
    case "Executing":
    case "Succeeded":
      return Schema.decodeUnknownSync(RunLifecycle.LifecycleSnapshot)(base)
    case "Validated":
      return Schema.decodeUnknownSync(RunLifecycle.LifecycleSnapshot)({ ...base, facts: [] })
    case "WaitingForApproval":
      return Schema.decodeUnknownSync(RunLifecycle.LifecycleSnapshot)({ ...base, policyRequest })
    case "Ready":
      return Schema.decodeUnknownSync(RunLifecycle.LifecycleSnapshot)({ ...base, policyReceipt: approvedReceipt })
    case "CancellationRequested":
      return Schema.decodeUnknownSync(RunLifecycle.LifecycleSnapshot)({
        ...base,
        cancellationRequestId: "cancel:branches",
      })
    case "RecoverableInterruption":
      return Schema.decodeUnknownSync(RunLifecycle.LifecycleSnapshot)({ ...base, safePointEvidence })
    case "Failed":
      return Schema.decodeUnknownSync(RunLifecycle.LifecycleSnapshot)({
        ...base,
        diagnostics: [{ severity: "error", code: "failed", message: "failed" }],
      })
    case "Cancelled":
      return Schema.decodeUnknownSync(RunLifecycle.LifecycleSnapshot)({ ...base, confirmationRef: "confirm:branches" })
  }
}

const request = (tag: RunLifecycle.TransitionRequest["_tag"], input: Readonly<Record<string, unknown>> = {}) => {
  const base = {
    _tag: tag,
    requestId: `request:${tag}`,
    expectedRevision: 0,
    cause: `cause:${tag}`,
    facts: [],
    secrets: [],
    contracts,
    ...input,
  }
  switch (tag) {
    case "Validate":
    case "AcceptExecution":
    case "RequestCancellation":
      return Schema.decodeUnknownSync(RunLifecycle.TransitionRequest)(base)
    case "RequireApproval":
      return Schema.decodeUnknownSync(RunLifecycle.TransitionRequest)({
        ...base,
        policyRequest: input.policyRequest ?? policyRequest,
      })
    case "ResolveApproval":
      if (Object.hasOwn(input, "receipt") && input.receipt === undefined) {
        return Schema.decodeUnknownSync(RunLifecycle.TransitionRequest)({
          _tag: tag,
          requestId: input.requestId ?? `request:${tag}`,
          expectedRevision: input.expectedRevision ?? 0,
          cause: input.cause ?? `cause:${tag}`,
          facts: input.facts ?? [],
          secrets: input.secrets ?? [],
          contracts: input.contracts ?? contracts,
        })
      }
      return Schema.decodeUnknownSync(RunLifecycle.TransitionRequest)({
        ...base,
        receipt: input.receipt ?? approvedReceipt,
      })
    case "Complete":
      return Schema.decodeUnknownSync(RunLifecycle.TransitionRequest)({
        ...base,
        outcome: input.outcome ?? { _tag: "Succeeded" },
      })
    case "ConfirmCancellation":
      return Schema.decodeUnknownSync(RunLifecycle.TransitionRequest)({ ...base, confirmationRef: "confirm:branches" })
    case "RecordRecoverableInterruption":
      return Schema.decodeUnknownSync(RunLifecycle.TransitionRequest)({ ...base, safePointEvidence })
  }
}

const successful = (result: ReturnType<typeof RunLifecycle.reduce>) => {
  if (Result.isFailure(result)) throw new Error(`Expected success, received ${result.failure._tag}`)
  return result.success
}

it("replays every legal request body as an equal detached immutable copy", () => {
  const cases = [
    { snapshot: snapshot("Draft"), request: request("Validate") },
    { snapshot: snapshot("Validated"), request: request("RequireApproval") },
    { snapshot: snapshot("WaitingForApproval"), request: request("ResolveApproval") },
    { snapshot: snapshot("Ready"), request: request("AcceptExecution") },
    { snapshot: snapshot("Executing"), request: request("Complete") },
    {
      snapshot: snapshot("Executing"),
      request: request("Complete", {
        requestId: "request:complete-failed",
        outcome: {
          _tag: "Failed",
          diagnostics: [{ severity: "error", code: "boom", message: "boom", path: ["output", 0] }],
        },
      }),
    },
    { snapshot: snapshot("Draft"), request: request("RequestCancellation") },
    { snapshot: snapshot("CancellationRequested"), request: request("ConfirmCancellation") },
    { snapshot: snapshot("Executing"), request: request("RecordRecoverableInterruption") },
  ]

  for (const candidate of cases) {
    const original = successful(RunLifecycle.reduce({ ...candidate, priorResults: [] }))
    const prior = Schema.decodeUnknownSync(RunLifecycle.PriorTransitionResult)({
      requestId: candidate.request.requestId,
      normalizedRequest: candidate.request,
      result: original,
    })
    const replay = RunLifecycle.reduce({ ...candidate, priorResults: [prior] })

    if (Result.isFailure(replay)) throw new Error(`Expected replay, received ${replay.failure._tag}`)
    expect(replay.success).toEqual(prior.result)
    expect(replay.success).not.toBe(prior.result)
  }
})

it("rejects a ResolveApproval replay whose receipt does not correspond to the waiting policy request", () => {
  const waiting = snapshot("WaitingForApproval")
  const originalRequest = request("ResolveApproval")
  const original = successful(RunLifecycle.reduce({ snapshot: waiting, request: originalRequest, priorResults: [] }))
  const forgedReceipt = { ...approvedReceipt, requestId: "policy:forged" }
  const forgedRequest = request("ResolveApproval", { receipt: forgedReceipt })
  const prior = Schema.decodeUnknownSync(RunLifecycle.PriorTransitionResult)({
    requestId: forgedRequest.requestId,
    normalizedRequest: forgedRequest,
    result: { ...original, snapshot: { ...original.snapshot, policyReceipt: forgedReceipt } },
  })

  const replay = RunLifecycle.reduce({ snapshot: waiting, request: forgedRequest, priorResults: [prior] })

  expect(replay).toMatchObject({ _tag: "Failure", failure: { _tag: "PriorResultMismatch" } })
})

it("rejects replayed result snapshots whose state payload was corrupted", () => {
  const diagnostics = [{ severity: "error" as const, code: "boom", message: "boom" }]
  const cases = [
    {
      snapshot: snapshot("Draft"),
      request: request("Validate"),
      corrupt: (result: ReturnType<typeof successful>) => ({
        ...result.snapshot,
        facts: [{ key: "forged", value: true }],
      }),
    },
    {
      snapshot: snapshot("WaitingForApproval"),
      request: request("ResolveApproval", {
        receipt: { ...approvedReceipt, decision: { _tag: "Denied", reason: "operator denied" } },
      }),
      corrupt: (result: ReturnType<typeof successful>) => ({
        ...result.snapshot,
        policyRequest: { ...policyRequest, requestId: "policy:forged" },
      }),
    },
    {
      snapshot: snapshot("Executing"),
      request: request("Complete", { outcome: { _tag: "Failed", diagnostics } }),
      corrupt: (result: ReturnType<typeof successful>) => ({ ...result.snapshot, diagnostics: [] }),
    },
    {
      snapshot: snapshot("Draft"),
      request: request("RequestCancellation"),
      corrupt: (result: ReturnType<typeof successful>) => ({
        ...result.snapshot,
        cancellationRequestId: "cancel:forged",
      }),
    },
    {
      snapshot: snapshot("CancellationRequested"),
      request: request("ConfirmCancellation"),
      corrupt: (result: ReturnType<typeof successful>) => ({
        ...result.snapshot,
        confirmationRef: "confirm:forged",
      }),
    },
    {
      snapshot: snapshot("Executing"),
      request: request("RecordRecoverableInterruption"),
      corrupt: (result: ReturnType<typeof successful>) => ({
        ...result.snapshot,
        safePointEvidence: { safePointId: "safe-point:forged", detail: "forged" },
      }),
    },
  ]

  for (const candidate of cases) {
    const original = successful(RunLifecycle.reduce({ ...candidate, priorResults: [] }))
    const prior = Schema.decodeUnknownSync(RunLifecycle.PriorTransitionResult)({
      requestId: candidate.request.requestId,
      normalizedRequest: candidate.request,
      result: { ...original, snapshot: candidate.corrupt(original) },
    })

    const replay = RunLifecycle.reduce({ ...candidate, priorResults: [prior] })

    expect(replay).toMatchObject({ _tag: "Failure", failure: { _tag: "PriorResultMismatch" } })
  }
})

it("keeps denied or missing approval waiting while rejecting mismatched policy and contract references", () => {
  const waiting = snapshot("WaitingForApproval")
  const missing = RunLifecycle.reduce({
    snapshot: waiting,
    request: request("ResolveApproval", { receipt: undefined }),
    priorResults: [],
  })
  const denied = RunLifecycle.reduce({
    snapshot: waiting,
    request: request("ResolveApproval", {
      receipt: { ...approvedReceipt, decision: { _tag: "Denied", reason: "operator denied" } },
    }),
    priorResults: [],
  })
  const mismatchedApproval = RunLifecycle.reduce({
    snapshot: waiting,
    request: request("ResolveApproval", { receipt: { ...approvedReceipt, requestId: "policy:other" } }),
    priorResults: [],
  })
  const mismatchedPolicy = RunLifecycle.reduce({
    snapshot: snapshot("Validated"),
    request: request("RequireApproval", {
      policyRequest: { ...policyRequest, planRef: { id: "plan:other", version } },
    }),
    priorResults: [],
  })
  const mismatchedContracts = RunLifecycle.reduce({
    snapshot: snapshot("Draft"),
    request: request("Validate", { contracts: { planRef, protocolRef: { id: "protocol:other", version } } }),
    priorResults: [],
  })

  expect(missing).toMatchObject({ _tag: "Success", success: { _tag: "WaitingForApproval" } })
  expect(denied).toMatchObject({ _tag: "Success", success: { _tag: "WaitingForApproval" } })
  expect(mismatchedApproval).toMatchObject({
    _tag: "Failure",
    failure: { _tag: "ContractMismatch", reason: "approval" },
  })
  expect(mismatchedPolicy).toMatchObject({ _tag: "Failure", failure: { _tag: "ContractMismatch", reason: "policy" } })
  expect(mismatchedContracts).toMatchObject({
    _tag: "Failure",
    failure: { _tag: "ContractMismatch", reason: "contracts" },
  })
})

it("rejects mismatched denied and input-required receipts without changing waiting history", () => {
  const waiting = snapshot("WaitingForApproval")
  const cases = [
    { decision: { _tag: "Denied", reason: "denied" }, receipt: { requestId: "policy:other" } },
    {
      decision: { _tag: "InputRequired", reason: "input required" },
      receipt: { policyRef: { id: "protocol:other", version } },
    },
    {
      decision: { _tag: "Denied", reason: "denied" },
      receipt: { facts: [{ key: "region", value: "other" }] },
    },
    {
      decision: { _tag: "InputRequired", reason: "input required" },
      receipt: { secrets: [{ key: "token", present: true, source: "environment" }] },
    },
  ] as const

  for (const candidate of cases) {
    const result = RunLifecycle.reduce({
      snapshot: waiting,
      request: request("ResolveApproval", {
        receipt: { ...approvedReceipt, ...candidate.receipt, decision: candidate.decision },
      }),
      priorResults: [],
    })

    expect(result).toMatchObject({ _tag: "Failure", failure: { _tag: "ContractMismatch", reason: "approval" } })
    expect(waiting).toMatchObject({ revision: 0, lastSequence: 0, history: [] })
  }

  const nonIdempotentWaiting = Schema.decodeUnknownSync(RunLifecycle.LifecycleSnapshot)({
    ...waiting,
    policyRequest: { ...policyRequest, lifecycleIdempotent: false },
  })
  const nonIdempotentResult = RunLifecycle.reduce({
    snapshot: nonIdempotentWaiting,
    request: request("ResolveApproval", {
      receipt: { ...approvedReceipt, decision: { _tag: "Denied", reason: "denied" } },
    }),
    priorResults: [],
  })

  expect(nonIdempotentResult).toMatchObject({
    _tag: "Failure",
    failure: { _tag: "ContractMismatch", reason: "approval" },
  })
  expect(nonIdempotentWaiting).toMatchObject({ revision: 0, lastSequence: 0, history: [] })
})

it("records and replays ResolveApproval evidence for unavailable approval outcomes", () => {
  const cases = [
    { requestId: "request:missing", receipt: undefined },
    {
      requestId: "request:denied",
      receipt: { ...approvedReceipt, decision: { _tag: "Denied", reason: "operator denied" } },
    },
    {
      requestId: "request:input-required",
      receipt: { ...approvedReceipt, decision: { _tag: "InputRequired", reason: "operator input required" } },
    },
  ] as const

  for (const candidate of cases) {
    const resolve = request("ResolveApproval", candidate)
    const result = successful(
      RunLifecycle.reduce({ snapshot: snapshot("WaitingForApproval"), request: resolve, priorResults: [] }),
    )

    expect(result).toMatchObject({
      _tag: "WaitingForApproval",
      snapshot: { _tag: "WaitingForApproval", revision: 1, lastSequence: 1 },
      evidence: {
        requestId: candidate.requestId,
        requestTag: "ResolveApproval",
        from: "WaitingForApproval",
        to: "WaitingForApproval",
        outcomeTag: "WaitingForApproval",
      },
    })
    expect(result.snapshot.history.at(-1)).toBe(result.evidence)

    const prior = Schema.decodeUnknownSync(RunLifecycle.PriorTransitionResult)({
      requestId: resolve.requestId,
      normalizedRequest: resolve,
      result,
    })
    const replay = RunLifecycle.reduce({ snapshot: result.snapshot, request: resolve, priorResults: [prior] })
    if (Result.isFailure(replay)) throw new Error(`Expected approval replay, received ${replay.failure._tag}`)
    expect(replay.success).toEqual(prior.result)
    expect(replay.success).not.toBe(prior.result)
  }
})

it("rejects approved receipts whose normalized policy inputs differ", () => {
  const waiting = snapshot("WaitingForApproval")
  const mismatchedFacts = RunLifecycle.reduce({
    snapshot: waiting,
    request: request("ResolveApproval", {
      receipt: { ...approvedReceipt, facts: [{ key: "region", value: "eu-west-1" }] },
    }),
    priorResults: [],
  })
  const mismatchedSecrets = RunLifecycle.reduce({
    snapshot: waiting,
    request: request("ResolveApproval", {
      receipt: { ...approvedReceipt, secrets: [{ key: "token", present: true, source: "environment" }] },
    }),
    priorResults: [],
  })

  expect(mismatchedFacts).toMatchObject({ _tag: "Failure", failure: { reason: "approval" } })
  expect(mismatchedSecrets).toMatchObject({ _tag: "Failure", failure: { reason: "approval" } })
})

it("rejects approval transitions containing facts or secrets outside the approved policy inputs", () => {
  const waiting = snapshot("WaitingForApproval")
  const cases = [
    { facts: [{ key: "region", value: "us-east-1" }] },
    { secrets: [{ key: "token", present: true, source: "environment" }] },
  ] as const

  for (const inputs of cases) {
    const result = RunLifecycle.reduce({
      snapshot: waiting,
      request: request("ResolveApproval", inputs),
      priorResults: [],
    })

    expect(result).toMatchObject({ _tag: "Failure", failure: { _tag: "ContractMismatch", reason: "approval" } })
    expect(waiting).toMatchObject({ revision: 0, lastSequence: 0, history: [] })
  }
})

it("rejects RequireApproval when policy inputs differ from normalized transition inputs", () => {
  const cases = [
    { facts: [{ key: "region", value: "us-east-1" }] },
    { secrets: [{ key: "token", present: true, source: "environment" }] },
  ]

  for (const inputs of cases) {
    const result = RunLifecycle.reduce({
      snapshot: snapshot("Validated"),
      request: request("RequireApproval", { ...inputs, policyRequest }),
      priorResults: [],
    })

    expect(result).toMatchObject({ _tag: "Failure", failure: { _tag: "ContractMismatch", reason: "policy" } })
  }
})

it("rejects all duplicate sources before revision and transition checks", () => {
  const conflictingSecrets = RunLifecycle.reduce({
    snapshot: snapshot("Draft", 2),
    request: request("Validate", {
      expectedRevision: 0,
      secrets: [
        { key: "token", present: true, source: "environment" },
        { key: "token", present: false, source: "environment" },
      ],
    }),
    priorResults: [],
  })
  const duplicateFacts = RunLifecycle.reduce({
    snapshot: snapshot("Draft"),
    request: request("Validate", {
      facts: [
        { key: "region", value: "us-east-1" },
        { key: "region", value: "eu-west-1" },
      ],
    }),
    priorResults: [],
  })
  const originalRequest = request("Validate")
  const original = successful(
    RunLifecycle.reduce({ snapshot: snapshot("Draft"), request: originalRequest, priorResults: [] }),
  )
  const prior = Schema.decodeUnknownSync(RunLifecycle.PriorTransitionResult)({
    requestId: originalRequest.requestId,
    normalizedRequest: originalRequest,
    result: original,
  })
  const duplicatePrior = RunLifecycle.reduce({
    snapshot: snapshot("Draft"),
    request: originalRequest,
    priorResults: [prior, prior],
  })

  expect(conflictingSecrets).toMatchObject({
    _tag: "Failure",
    failure: { _tag: "ConflictingDuplicate", scope: "secrets", key: "token" },
  })
  expect(duplicateFacts).toMatchObject({
    _tag: "Failure",
    failure: { _tag: "ConflictingDuplicate", scope: "facts", key: "region" },
  })
  expect(duplicatePrior).toMatchObject({
    _tag: "Failure",
    failure: { _tag: "ConflictingDuplicate", scope: "prior-results" },
  })
})

it("normalizes ordered secret descriptors, compares replayed secrets, and projects a draft from the decoded plan", () => {
  const secretRequest = request("Validate", {
    requestId: "request:secret-replay",
    secrets: [
      { key: "z-token", present: true, source: "environment" },
      { key: "a-token", present: false, source: "prompt" },
    ],
  })
  const original = successful(
    RunLifecycle.reduce({ snapshot: snapshot("Draft"), request: secretRequest, priorResults: [] }),
  )
  const prior = Schema.decodeUnknownSync(RunLifecycle.PriorTransitionResult)({
    requestId: secretRequest.requestId,
    normalizedRequest: secretRequest,
    result: original,
  })
  const replay = RunLifecycle.reduce({ snapshot: snapshot("Draft"), request: secretRequest, priorResults: [prior] })
  const planResult = decodePassivePlan({ planRef, steps: [] })
  if (Result.isFailure(planResult)) throw new Error("Expected a decoded passive plan")
  const decodedRunRef = Schema.decodeUnknownSync(Reference.RunRef)(runRef)
  const decodedProtocolRef = Schema.decodeUnknownSync(Reference.ProtocolRef)(protocolRef)
  const draft = RunLifecycle.makeDraft({
    runRef: decodedRunRef,
    protocolRef: decodedProtocolRef,
    plan: planResult.success,
  })

  if (Result.isFailure(replay)) throw new Error(`Expected secret replay, received ${replay.failure._tag}`)
  expect(replay.success).toEqual(prior.result)
  expect(replay.success).not.toBe(prior.result)
  expect(original.evidence.secrets).toEqual([
    { key: "a-token", present: false, source: "prompt" },
    { key: "z-token", present: true, source: "environment" },
  ])
  expect(draft).toMatchObject({ _tag: "Draft", runRef, contracts: { planRef, protocolRef }, revision: 0, history: [] })
})

it("detaches and deep-freezes draft contract references from caller-owned inputs", () => {
  const callerRunRef = { id: "run:mutable", version: { ...version } }
  const callerProtocolRef = { id: "protocol:mutable", version: { ...version } }
  const callerPlanRef = { id: "plan:mutable", version: { ...version } }
  const planResult = decodePassivePlan({ planRef: callerPlanRef, steps: [] })
  if (Result.isFailure(planResult)) throw new Error("Expected a decoded passive plan")
  const callerOwnedRunRef = Schema.decodeUnknownSync(Reference.RunRef)(callerRunRef)
  const callerOwnedProtocolRef = Schema.decodeUnknownSync(Reference.ProtocolRef)(callerProtocolRef)

  const draft = RunLifecycle.makeDraft({
    runRef: callerOwnedRunRef,
    protocolRef: callerOwnedProtocolRef,
    plan: planResult.success,
  })
  Reflect.set(callerOwnedRunRef.version, "major", 9)
  Reflect.set(callerOwnedProtocolRef.version, "major", 9)
  Reflect.set(planResult.success.planRef.version, "major", 9)

  expect(draft).toMatchObject({
    runRef: { version },
    contracts: { protocolRef: { version }, planRef: { version } },
  })
  expect(Object.isFrozen(draft.runRef.version)).toBe(true)
  expect(Object.isFrozen(draft.contracts.protocolRef.version)).toBe(true)
  expect(Object.isFrozen(draft.contracts.planRef.version)).toBe(true)
})

it("rejects a WaitingForApproval replay with a forged top-level policy request", () => {
  const waiting = snapshot("WaitingForApproval")
  const resolve = request("ResolveApproval", { receipt: undefined })
  const original = successful(RunLifecycle.reduce({ snapshot: waiting, request: resolve, priorResults: [] }))
  if (original._tag !== "WaitingForApproval") throw new Error("Expected waiting result")
  const prior = Schema.decodeUnknownSync(RunLifecycle.PriorTransitionResult)({
    requestId: resolve.requestId,
    normalizedRequest: resolve,
    result: { ...original, policyRequest: { ...original.policyRequest, requestId: "policy:forged" } },
  })

  const replay = RunLifecycle.reduce({ snapshot: waiting, request: resolve, priorResults: [prior] })

  expect(replay).toMatchObject({ _tag: "Failure", failure: { _tag: "PriorResultMismatch" } })
})

it("rejects replay evidence followed by divergent trailing history", () => {
  const draft = snapshot("Draft")
  const validate = request("Validate")
  const original = successful(RunLifecycle.reduce({ snapshot: draft, request: validate, priorResults: [] }))
  const prior = Schema.decodeUnknownSync(RunLifecycle.PriorTransitionResult)({
    requestId: validate.requestId,
    normalizedRequest: validate,
    result: {
      ...original,
      snapshot: {
        ...original.snapshot,
        history: [...original.snapshot.history, { ...original.evidence, cause: "cause:forged-trailing" }],
      },
    },
  })

  const replay = RunLifecycle.reduce({ snapshot: draft, request: validate, priorResults: [prior] })

  expect(replay).toMatchObject({ _tag: "Failure", failure: { _tag: "PriorResultMismatch" } })
})

it("stores normalized policy facts and secrets when requiring approval", () => {
  const facts = [
    { key: "z-region", value: "us-east-1" },
    { key: "a-region", value: "eu-west-1" },
    { key: "z-region", value: "us-east-1" },
  ]
  const secrets = [
    { key: "z-token", present: true, source: "environment" },
    { key: "a-token", present: false, source: "prompt" },
    { key: "z-token", present: true, source: "environment" },
  ]
  const requireApproval = request("RequireApproval", {
    facts,
    secrets,
    policyRequest: { ...policyRequest, facts, secrets },
  })

  const result = successful(
    RunLifecycle.reduce({ snapshot: snapshot("Validated"), request: requireApproval, priorResults: [] }),
  )
  if (result._tag !== "WaitingForApproval") throw new Error("Expected waiting result")
  if (result.snapshot._tag !== "WaitingForApproval") throw new Error("Expected waiting snapshot")

  expect(result.policyRequest.facts).toEqual([
    { key: "a-region", value: "eu-west-1" },
    { key: "z-region", value: "us-east-1" },
  ])
  expect(result.policyRequest.secrets).toEqual([
    { key: "a-token", present: false, source: "prompt" },
    { key: "z-token", present: true, source: "environment" },
  ])
  expect(result.snapshot.policyRequest).toBe(result.policyRequest)
})
