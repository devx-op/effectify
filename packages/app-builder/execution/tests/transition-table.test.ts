import { expect, it } from "@effect/vitest"
import * as Result from "effect/Result"
import * as Schema from "effect/Schema"
import { LifecycleFailure, RunLifecycle } from "../src/index.js"

const version = { major: 1, minor: 0, patch: 0 }
const runRef = { id: "run:lifecycle", version }
const planRef = { id: "plan:lifecycle", version }
const protocolRef = { id: "protocol:lifecycle", version }
const contracts = { planRef, protocolRef }

const policyRequest = {
  requestId: "policy:approve",
  policyRef: protocolRef,
  runRef,
  planRef,
  lifecycleIdempotent: true,
  facts: [],
  secrets: [],
}

const policyReceipt = {
  requestId: "policy:approve",
  policyRef: protocolRef,
  decision: { _tag: "Approved" },
  facts: [],
  secrets: [],
}

const safePointEvidence = { safePointId: "safe-point:1", detail: "workspace untouched" }

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
      return Schema.decodeUnknownSync(RunLifecycle.LifecycleSnapshot)({ ...base, policyReceipt })
    case "CancellationRequested":
      return Schema.decodeUnknownSync(RunLifecycle.LifecycleSnapshot)({
        ...base,
        cancellationRequestId: "cancel:1",
      })
    case "RecoverableInterruption":
      return Schema.decodeUnknownSync(RunLifecycle.LifecycleSnapshot)({ ...base, safePointEvidence })
    case "Failed":
      return Schema.decodeUnknownSync(RunLifecycle.LifecycleSnapshot)({
        ...base,
        diagnostics: [{ severity: "error", code: "failed", message: "failed" }],
      })
    case "Cancelled":
      return Schema.decodeUnknownSync(RunLifecycle.LifecycleSnapshot)({ ...base, confirmationRef: "confirm:1" })
  }
}

const request = (tag: RunLifecycle.TransitionRequest["_tag"], expectedRevision = 0) => {
  const base = {
    _tag: tag,
    requestId: `request:${tag}`,
    expectedRevision,
    cause: `cause:${tag}`,
    facts: [],
    secrets: [],
    contracts,
  }

  switch (tag) {
    case "Validate":
    case "AcceptExecution":
    case "RequestCancellation":
      return Schema.decodeUnknownSync(RunLifecycle.TransitionRequest)(base)
    case "RequireApproval":
      return Schema.decodeUnknownSync(RunLifecycle.TransitionRequest)({ ...base, policyRequest })
    case "ResolveApproval":
      return Schema.decodeUnknownSync(RunLifecycle.TransitionRequest)({ ...base, receipt: policyReceipt })
    case "Complete":
      return Schema.decodeUnknownSync(RunLifecycle.TransitionRequest)({
        ...base,
        outcome: { _tag: "Succeeded" },
      })
    case "ConfirmCancellation":
      return Schema.decodeUnknownSync(RunLifecycle.TransitionRequest)({ ...base, confirmationRef: "confirm:1" })
    case "RecordRecoverableInterruption":
      return Schema.decodeUnknownSync(RunLifecycle.TransitionRequest)({ ...base, safePointEvidence })
  }
}

const legalCells: ReadonlySet<string> = new Set([
  "Draft:Validate",
  "Draft:RequestCancellation",
  "Validated:RequireApproval",
  "Validated:RequestCancellation",
  "WaitingForApproval:ResolveApproval",
  "WaitingForApproval:RequestCancellation",
  "Ready:AcceptExecution",
  "Ready:RequestCancellation",
  "Executing:Complete",
  "Executing:RequestCancellation",
  "Executing:RecordRecoverableInterruption",
  "CancellationRequested:ConfirmCancellation",
])

const requestTags: ReadonlyArray<RunLifecycle.TransitionRequest["_tag"]> = [
  "Validate",
  "RequireApproval",
  "ResolveApproval",
  "AcceptExecution",
  "Complete",
  "RequestCancellation",
  "ConfirmCancellation",
  "RecordRecoverableInterruption",
]

const stateTags: ReadonlyArray<RunLifecycle.LifecycleSnapshot["_tag"]> = [
  "Draft",
  "Validated",
  "WaitingForApproval",
  "Ready",
  "Executing",
  "CancellationRequested",
  "RecoverableInterruption",
  "Succeeded",
  "Failed",
  "Cancelled",
]

it("rejects unknown lifecycle tags before reduction", () => {
  const decoded = Schema.decodeUnknownResult(RunLifecycle.LifecycleSnapshot)({
    _tag: "Unknown",
    runRef,
    contracts,
    revision: 0,
    lastSequence: 0,
    history: [],
  })

  expect(Result.isFailure(decoded)).toBe(true)
})

it("applies exactly the legal state and request cells", () => {
  for (const stateTag of stateTags) {
    for (const requestTag of requestTags) {
      const result = RunLifecycle.reduce({
        snapshot: snapshot(stateTag),
        request: request(requestTag),
        priorResults: [],
      })
      const key = `${stateTag}:${requestTag}`

      if (legalCells.has(key)) {
        expect(Result.isSuccess(result), key).toBe(true)
      } else {
        expect(Result.isFailure(result), key).toBe(true)
        if (Result.isFailure(result)) expect(result.failure._tag, key).toBe("IllegalTransition")
      }
    }
  }
})

it("reports revision conflicts and preserves truthful cancellation and interruption results", () => {
  const revisionConflict = RunLifecycle.reduce({
    snapshot: snapshot("Draft"),
    request: request("Validate", 2),
    priorResults: [],
  })
  const cancellation = RunLifecycle.reduce({
    snapshot: snapshot("Executing"),
    request: request("RequestCancellation"),
    priorResults: [],
  })
  const interruption = RunLifecycle.reduce({
    snapshot: snapshot("Executing"),
    request: request("RecordRecoverableInterruption"),
    priorResults: [],
  })

  expect(revisionConflict).toMatchObject({ _tag: "Failure", failure: { _tag: "RevisionConflict" } })
  expect(cancellation).toMatchObject({ _tag: "Success", success: { _tag: "CancellationRequested" } })
  expect(interruption).toMatchObject({ _tag: "Success", success: { _tag: "RecoverableInterruption" } })
})

it("exposes every closed lifecycle failure tag", () => {
  const failures = [
    new LifecycleFailure.PriorResultUnavailable({ requestId: "request:1" }),
    new LifecycleFailure.PriorResultMismatch({ requestId: "request:1" }),
    new LifecycleFailure.RevisionConflict({ expected: 1, actual: 2 }),
    new LifecycleFailure.CounterExhausted({ counter: "revision", value: Number.MAX_SAFE_INTEGER }),
    new LifecycleFailure.IllegalTransition({ from: "Draft", requestTag: "Complete" }),
    new LifecycleFailure.ConflictingDuplicate({ requestId: "request:1", scope: "request" }),
    new LifecycleFailure.ContractMismatch({ reason: "approval" }),
    new LifecycleFailure.SnapshotIntegrityFailure({ reason: "history" }),
  ]

  expect(failures.map((failure) => failure._tag).sort()).toEqual([
    "ConflictingDuplicate",
    "ContractMismatch",
    "CounterExhausted",
    "IllegalTransition",
    "PriorResultMismatch",
    "PriorResultUnavailable",
    "RevisionConflict",
    "SnapshotIntegrityFailure",
  ])
})
