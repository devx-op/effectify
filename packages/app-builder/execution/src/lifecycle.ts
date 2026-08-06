import { Diagnostic, PassiveRecord, Reference } from "@effectify/app-builder-contracts"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Result from "effect/Result"
import * as Schema from "effect/Schema"
import * as AutomaticPolicy from "./automatic-policy.js"
import * as LifecycleFailure from "./failure.js"
import * as TransitionEvidence from "./transition-evidence.js"

export const LifecycleRequestId = Schema.NonEmptyString.pipe(Schema.brand("AppBuilder.LifecycleRequestId"))
export type LifecycleRequestId = typeof LifecycleRequestId.Type

export const CancellationRequestId = LifecycleRequestId
export type CancellationRequestId = LifecycleRequestId

export const ConfirmationRef = Schema.NonEmptyString.pipe(Schema.brand("AppBuilder.CancellationConfirmationRef"))
export type ConfirmationRef = typeof ConfirmationRef.Type

export const SafePointEvidence = Schema.Struct({
  safePointId: Schema.NonEmptyString,
  detail: Schema.NonEmptyString,
})
export type SafePointEvidence = typeof SafePointEvidence.Type

const snapshotFields = {
  runRef: Reference.RunRef,
  contracts: TransitionEvidence.ContractRefs,
  revision: TransitionEvidence.Counter,
  lastSequence: TransitionEvidence.Counter,
  history: Schema.Array(TransitionEvidence.TransitionEvidence),
}

export const LifecycleSnapshot = Schema.TaggedUnion({
  Draft: snapshotFields,
  Validated: { ...snapshotFields, facts: Schema.Array(AutomaticPolicy.Fact) },
  WaitingForApproval: { ...snapshotFields, policyRequest: AutomaticPolicy.PolicyRequest },
  Ready: { ...snapshotFields, policyReceipt: AutomaticPolicy.PolicyReceipt },
  Executing: snapshotFields,
  CancellationRequested: { ...snapshotFields, cancellationRequestId: CancellationRequestId },
  RecoverableInterruption: { ...snapshotFields, safePointEvidence: SafePointEvidence },
  Succeeded: snapshotFields,
  Failed: { ...snapshotFields, diagnostics: Schema.Array(Diagnostic.Diagnostic) },
  Cancelled: { ...snapshotFields, confirmationRef: ConfirmationRef },
})
export type LifecycleSnapshot = typeof LifecycleSnapshot.Type

const requestFields = {
  requestId: LifecycleRequestId,
  expectedRevision: TransitionEvidence.Counter,
  cause: Schema.NonEmptyString,
  facts: Schema.Array(AutomaticPolicy.Fact),
  secrets: Schema.Array(AutomaticPolicy.SecretDescriptor),
  contracts: TransitionEvidence.ContractRefs,
}

export const CompletionOutcome = Schema.TaggedUnion({
  Succeeded: {},
  Failed: { diagnostics: Schema.Array(Diagnostic.Diagnostic) },
})
export type CompletionOutcome = typeof CompletionOutcome.Type

export const TransitionRequest = Schema.TaggedUnion({
  Validate: requestFields,
  RequireApproval: { ...requestFields, policyRequest: AutomaticPolicy.PolicyRequest },
  ResolveApproval: { ...requestFields, receipt: Schema.optionalKey(AutomaticPolicy.PolicyReceipt) },
  AcceptExecution: requestFields,
  Complete: { ...requestFields, outcome: CompletionOutcome },
  RequestCancellation: requestFields,
  ConfirmCancellation: { ...requestFields, confirmationRef: ConfirmationRef },
  RecordRecoverableInterruption: { ...requestFields, safePointEvidence: SafePointEvidence },
})
export type TransitionRequest = typeof TransitionRequest.Type

export const TransitionResult = Schema.TaggedUnion({
  Applied: { snapshot: LifecycleSnapshot, evidence: TransitionEvidence.TransitionEvidence },
  WaitingForApproval: {
    snapshot: LifecycleSnapshot,
    evidence: TransitionEvidence.TransitionEvidence,
    policyRequest: AutomaticPolicy.PolicyRequest,
  },
  CancellationRequested: { snapshot: LifecycleSnapshot, evidence: TransitionEvidence.TransitionEvidence },
  RecoverableInterruption: { snapshot: LifecycleSnapshot, evidence: TransitionEvidence.TransitionEvidence },
})
export type TransitionResult = typeof TransitionResult.Type

export const PriorTransitionResult = Schema.Struct({
  requestId: LifecycleRequestId,
  normalizedRequest: TransitionRequest,
  result: TransitionResult,
})
export type PriorTransitionResult = typeof PriorTransitionResult.Type

export interface ReduceInput {
  readonly snapshot: LifecycleSnapshot
  readonly request: TransitionRequest
  readonly priorResults: ReadonlyArray<PriorTransitionResult>
}

interface NormalizedRequest {
  readonly request: TransitionRequest
  readonly facts: ReadonlyArray<AutomaticPolicy.Fact>
  readonly secrets: ReadonlyArray<AutomaticPolicy.SecretDescriptor>
}

const sameVersion = (
  left: { readonly major: number; readonly minor: number; readonly patch: number },
  right: typeof left,
) => left.major === right.major && left.minor === right.minor && left.patch === right.patch

const sameReference = (
  left: {
    readonly id: string
    readonly version: { readonly major: number; readonly minor: number; readonly patch: number }
  },
  right: typeof left,
) => left.id === right.id && sameVersion(left.version, right.version)

const sameContracts = (left: TransitionEvidence.ContractRefs, right: TransitionEvidence.ContractRefs) =>
  sameReference(left.protocolRef, right.protocolRef) && sameReference(left.planRef, right.planRef)

const compareUtf16 = (left: string, right: string): number => (left < right ? -1 : left > right ? 1 : 0)

const sameFactValue = (left: AutomaticPolicy.FactValue, right: AutomaticPolicy.FactValue) => Object.is(left, right)

const sameFacts = (left: ReadonlyArray<AutomaticPolicy.Fact>, right: ReadonlyArray<AutomaticPolicy.Fact>) =>
  left.length === right.length &&
  left.every((fact, index) => fact.key === right[index]?.key && sameFactValue(fact.value, right[index].value))

const sameSecrets = (
  left: ReadonlyArray<AutomaticPolicy.SecretDescriptor>,
  right: ReadonlyArray<AutomaticPolicy.SecretDescriptor>,
) =>
  left.length === right.length &&
  left.every(
    (secret, index) =>
      secret.key === right[index]?.key &&
      secret.present === right[index].present &&
      secret.source === right[index].source,
  )

const sameTransitionEvidence = (
  left: TransitionEvidence.TransitionEvidence | undefined,
  right: TransitionEvidence.TransitionEvidence,
) =>
  left !== undefined &&
  left.sequence === right.sequence &&
  left.previousRevision === right.previousRevision &&
  left.nextRevision === right.nextRevision &&
  left.from === right.from &&
  left.to === right.to &&
  left.cause === right.cause &&
  left.requestId === right.requestId &&
  left.requestTag === right.requestTag &&
  sameFacts(left.facts, right.facts) &&
  sameSecrets(left.secrets, right.secrets) &&
  sameContracts(left.contracts, right.contracts) &&
  left.outcomeTag === right.outcomeTag

const normalizeFacts = (
  facts: ReadonlyArray<AutomaticPolicy.Fact>,
  requestId: string,
): Result.Result<ReadonlyArray<AutomaticPolicy.Fact>, LifecycleFailure.ConflictingDuplicate> => {
  const byKey = new Map<string, AutomaticPolicy.Fact>()
  for (const fact of facts) {
    const value = typeof fact.value === "number" && Object.is(fact.value, -0) ? 0 : fact.value
    const normalized = Object.freeze({ key: fact.key, value })
    const existing = byKey.get(fact.key)
    if (existing === undefined) {
      byKey.set(fact.key, normalized)
    } else if (!sameFactValue(existing.value, normalized.value)) {
      return Result.fail(new LifecycleFailure.ConflictingDuplicate({ requestId, scope: "facts", key: fact.key }))
    }
  }
  return Result.succeed(freezeArray([...byKey.values()].sort((left, right) => compareUtf16(left.key, right.key))))
}

const normalizeSecrets = (
  secrets: ReadonlyArray<AutomaticPolicy.SecretDescriptor>,
  requestId: string,
): Result.Result<ReadonlyArray<AutomaticPolicy.SecretDescriptor>, LifecycleFailure.ConflictingDuplicate> => {
  const byKey = new Map<string, AutomaticPolicy.SecretDescriptor>()
  for (const secret of secrets) {
    const normalized = Object.freeze({ key: secret.key, present: secret.present, source: secret.source })
    const existing = byKey.get(secret.key)
    if (existing === undefined) {
      byKey.set(secret.key, normalized)
    } else if (existing.present !== normalized.present || existing.source !== normalized.source) {
      return Result.fail(new LifecycleFailure.ConflictingDuplicate({ requestId, scope: "secrets", key: secret.key }))
    }
  }
  return Result.succeed(freezeArray([...byKey.values()].sort((left, right) => compareUtf16(left.key, right.key))))
}

const normalizeRequest = (
  request: TransitionRequest,
): Result.Result<NormalizedRequest, LifecycleFailure.ConflictingDuplicate> => {
  const facts = normalizeFacts(request.facts, request.requestId)
  if (Result.isFailure(facts)) return Result.fail(facts.failure)
  const secrets = normalizeSecrets(request.secrets, request.requestId)
  if (Result.isFailure(secrets)) return Result.fail(secrets.failure)
  for (const secret of secrets.success) {
    if (facts.success.some((fact) => fact.key === secret.key)) {
      return Result.fail(
        new LifecycleFailure.ConflictingDuplicate({ requestId: request.requestId, scope: "secrets", key: secret.key }),
      )
    }
  }
  return Result.succeed(Object.freeze({ request, facts: facts.success, secrets: secrets.success }))
}

const samePolicyRequest = (left: AutomaticPolicy.PolicyRequest, right: AutomaticPolicy.PolicyRequest) =>
  left.requestId === right.requestId &&
  sameReference(left.policyRef, right.policyRef) &&
  sameReference(left.runRef, right.runRef) &&
  sameReference(left.planRef, right.planRef) &&
  left.lifecycleIdempotent === right.lifecycleIdempotent &&
  sameNormalizedPolicyInputs(left, right)

const samePolicyReceipt = (left: AutomaticPolicy.PolicyReceipt, right: AutomaticPolicy.PolicyReceipt) => {
  if (left.requestId !== right.requestId || !sameReference(left.policyRef, right.policyRef)) return false
  if (left.decision._tag !== right.decision._tag) return false
  if (
    left.decision._tag !== "Approved" &&
    right.decision._tag !== "Approved" &&
    left.decision.reason !== right.decision.reason
  ) {
    return false
  }
  return sameFacts(left.facts, right.facts) && sameSecrets(left.secrets, right.secrets)
}

const sameNormalizedPolicyInputs = (
  left: Pick<AutomaticPolicy.PolicyRequest, "facts" | "secrets">,
  right: Pick<AutomaticPolicy.PolicyRequest, "facts" | "secrets">,
) => {
  const requestFacts = normalizeFacts(left.facts, "policy-inputs")
  const receiptFacts = normalizeFacts(right.facts, "policy-inputs")
  const requestSecrets = normalizeSecrets(left.secrets, "policy-inputs")
  const receiptSecrets = normalizeSecrets(right.secrets, "policy-inputs")
  return (
    Result.isSuccess(requestFacts) &&
    Result.isSuccess(receiptFacts) &&
    Result.isSuccess(requestSecrets) &&
    Result.isSuccess(receiptSecrets) &&
    sameFacts(requestFacts.success, receiptFacts.success) &&
    sameSecrets(requestSecrets.success, receiptSecrets.success)
  )
}

const sameDiagnostics = (left: ReadonlyArray<Diagnostic.Diagnostic>, right: ReadonlyArray<Diagnostic.Diagnostic>) =>
  left.length === right.length &&
  left.every(
    (diagnostic, index) =>
      diagnostic.severity === right[index]?.severity &&
      diagnostic.code === right[index].code &&
      diagnostic.message === right[index].message &&
      diagnostic.path?.length === right[index].path?.length &&
      diagnostic.path?.every((segment, pathIndex) => segment === right[index].path?.[pathIndex]) !== false,
  )

const sameSemanticRequest = (left: NormalizedRequest, right: NormalizedRequest): boolean => {
  if (
    left.request._tag !== right.request._tag ||
    left.request.cause !== right.request.cause ||
    !sameContracts(left.request.contracts, right.request.contracts) ||
    !sameFacts(left.facts, right.facts) ||
    !sameSecrets(left.secrets, right.secrets)
  ) {
    return false
  }
  switch (left.request._tag) {
    case "Validate":
    case "AcceptExecution":
    case "RequestCancellation":
      return true
    case "RequireApproval":
      return (
        right.request._tag === "RequireApproval" &&
        samePolicyRequest(left.request.policyRequest, right.request.policyRequest)
      )
    case "ResolveApproval":
      return (
        right.request._tag === "ResolveApproval" &&
        (left.request.receipt === undefined
          ? right.request.receipt === undefined
          : right.request.receipt !== undefined && samePolicyReceipt(left.request.receipt, right.request.receipt))
      )
    case "Complete":
      if (right.request._tag !== "Complete" || left.request.outcome._tag !== right.request.outcome._tag) return false
      return (
        left.request.outcome._tag === "Succeeded" ||
        (right.request.outcome._tag === "Failed" &&
          sameDiagnostics(left.request.outcome.diagnostics, right.request.outcome.diagnostics))
      )
    case "ConfirmCancellation":
      return (
        right.request._tag === "ConfirmCancellation" && left.request.confirmationRef === right.request.confirmationRef
      )
    case "RecordRecoverableInterruption":
      return (
        right.request._tag === "RecordRecoverableInterruption" &&
        left.request.safePointEvidence.safePointId === right.request.safePointEvidence.safePointId &&
        left.request.safePointEvidence.detail === right.request.safePointEvidence.detail
      )
  }
}

const nextCounter = (
  value: number,
  counter: "revision" | "sequence",
): Result.Result<number, LifecycleFailure.CounterExhausted> =>
  value === Number.MAX_SAFE_INTEGER
    ? Result.fail(new LifecycleFailure.CounterExhausted({ counter, value }))
    : Result.succeed(value + 1)

const freezeArray = <Value>(values: ReadonlyArray<Value>): ReadonlyArray<Value> => Object.freeze([...values])

const deepFreeze = (value: unknown): void => {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return
  for (const child of Object.values(value)) deepFreeze(child)
  Object.freeze(value)
}

const deepCopy = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(deepCopy)
  if (typeof value !== "object" || value === null) return value

  const copy: Record<string, unknown> = {}
  for (const [key, child] of Object.entries(value)) copy[key] = deepCopy(child)
  return copy
}

const immutableCopy = <Value>(schema: Schema.ConstraintDecoder<Value>, value: Value): Value => {
  const copy = Schema.decodeUnknownSync(schema)(deepCopy(value))
  deepFreeze(copy)
  return copy
}

const makeEvidence = (
  snapshot: LifecycleSnapshot,
  request: TransitionRequest,
  normalized: NormalizedRequest,
  to: TransitionEvidence.StateTag,
  outcomeTag: TransitionEvidence.OutcomeTag,
  nextRevision: number,
  nextSequence: number,
): TransitionEvidence.TransitionEvidence =>
  immutableCopy(TransitionEvidence.TransitionEvidence, {
    sequence: nextSequence,
    previousRevision: snapshot.revision,
    nextRevision,
    from: snapshot._tag,
    to,
    cause: request.cause,
    requestId: request.requestId,
    requestTag: request._tag,
    facts: normalized.facts,
    secrets: normalized.secrets,
    contracts: request.contracts,
    outcomeTag,
  })

const transition = (
  snapshot: LifecycleSnapshot,
  request: TransitionRequest,
  normalized: NormalizedRequest,
  to: TransitionEvidence.StateTag,
  outcomeTag: TransitionEvidence.OutcomeTag,
  build: (base: {
    readonly revision: number
    readonly lastSequence: number
    readonly history: ReadonlyArray<TransitionEvidence.TransitionEvidence>
  }) => LifecycleSnapshot,
): Result.Result<TransitionResult, LifecycleFailure.CounterExhausted> => {
  const nextRevision = nextCounter(snapshot.revision, "revision")
  if (Result.isFailure(nextRevision)) return Result.fail(nextRevision.failure)
  const nextSequence = nextCounter(snapshot.lastSequence, "sequence")
  if (Result.isFailure(nextSequence)) return Result.fail(nextSequence.failure)

  const evidence = makeEvidence(
    snapshot,
    request,
    normalized,
    to,
    outcomeTag,
    nextRevision.success,
    nextSequence.success,
  )
  const nextSnapshotBase = immutableCopy(
    LifecycleSnapshot,
    build({
      revision: nextRevision.success,
      lastSequence: nextSequence.success,
      history: freezeArray([]),
    }),
  )
  const nextSnapshot: LifecycleSnapshot = Object.freeze({
    ...nextSnapshotBase,
    history: freezeArray([
      ...snapshot.history.map((historyEvidence) =>
        immutableCopy(TransitionEvidence.TransitionEvidence, historyEvidence),
      ),
      evidence,
    ]),
  })

  switch (outcomeTag) {
    case "Applied":
      return Result.succeed(Object.freeze({ _tag: "Applied", snapshot: nextSnapshot, evidence }))
    case "WaitingForApproval":
      if (nextSnapshot._tag !== "WaitingForApproval") {
        return Result.fail(
          new LifecycleFailure.CounterExhausted({ counter: "revision", value: Number.MAX_SAFE_INTEGER }),
        )
      }
      return Result.succeed(
        Object.freeze({
          _tag: "WaitingForApproval",
          snapshot: nextSnapshot,
          evidence,
          policyRequest: nextSnapshot.policyRequest,
        }),
      )
    case "CancellationRequested":
      return Result.succeed(Object.freeze({ _tag: "CancellationRequested", snapshot: nextSnapshot, evidence }))
    case "RecoverableInterruption":
      return Result.succeed(Object.freeze({ _tag: "RecoverableInterruption", snapshot: nextSnapshot, evidence }))
  }
}

const nextBase = (
  snapshot: LifecycleSnapshot,
  state: {
    readonly revision: number
    readonly lastSequence: number
    readonly history: ReadonlyArray<TransitionEvidence.TransitionEvidence>
  },
) => ({
  runRef: snapshot.runRef,
  contracts: snapshot.contracts,
  revision: state.revision,
  lastSequence: state.lastSequence,
  history: state.history,
})

const policyReceiptCorresponds = (
  snapshot: Extract<LifecycleSnapshot, { readonly _tag: "WaitingForApproval" }>,
  receipt: AutomaticPolicy.PolicyReceipt,
  transitionInputs: Pick<TransitionRequest, "facts" | "secrets">,
) =>
  receipt.requestId === snapshot.policyRequest.requestId &&
  sameReference(receipt.policyRef, snapshot.policyRequest.policyRef) &&
  snapshot.policyRequest.lifecycleIdempotent &&
  sameNormalizedPolicyInputs(snapshot.policyRequest, receipt) &&
  sameNormalizedPolicyInputs(snapshot.policyRequest, transitionInputs)

const replayPayloadMatches = (snapshot: LifecycleSnapshot, request: TransitionRequest, result: TransitionResult) => {
  const resultSnapshot = result.snapshot
  switch (resultSnapshot._tag) {
    case "Validated":
      return sameFacts(resultSnapshot.facts, result.evidence.facts)
    case "WaitingForApproval":
      return (
        result._tag === "WaitingForApproval" &&
        samePolicyRequest(result.policyRequest, resultSnapshot.policyRequest) &&
        (request._tag === "RequireApproval"
          ? samePolicyRequest(resultSnapshot.policyRequest, request.policyRequest)
          : snapshot._tag === "WaitingForApproval" &&
            samePolicyRequest(resultSnapshot.policyRequest, snapshot.policyRequest))
      )
    case "Ready":
      return (
        request._tag === "ResolveApproval" &&
        request.receipt !== undefined &&
        samePolicyReceipt(resultSnapshot.policyReceipt, request.receipt) &&
        (snapshot._tag !== "WaitingForApproval" || policyReceiptCorresponds(snapshot, request.receipt, request))
      )
    case "Failed":
      return (
        request._tag === "Complete" &&
        request.outcome._tag === "Failed" &&
        sameDiagnostics(resultSnapshot.diagnostics, request.outcome.diagnostics)
      )
    case "CancellationRequested":
      return resultSnapshot.cancellationRequestId === request.requestId
    case "Cancelled":
      return request._tag === "ConfirmCancellation" && resultSnapshot.confirmationRef === request.confirmationRef
    case "RecoverableInterruption":
      return (
        request._tag === "RecordRecoverableInterruption" &&
        resultSnapshot.safePointEvidence.safePointId === request.safePointEvidence.safePointId &&
        resultSnapshot.safePointEvidence.detail === request.safePointEvidence.detail
      )
    default:
      return true
  }
}

const hasCompleteHistory = (snapshot: LifecycleSnapshot) =>
  snapshot.history.length === snapshot.lastSequence &&
  snapshot.revision === snapshot.history.length &&
  snapshot.history.every(
    (evidence, index) =>
      evidence.sequence === index + 1 &&
      evidence.previousRevision === index &&
      evidence.nextRevision === index + 1 &&
      (index === 0 ||
        (snapshot.history[index - 1]?.to === evidence.from &&
          snapshot.history[index - 1]?.nextRevision === evidence.previousRevision)),
  ) &&
  (snapshot.history.length === 0 || snapshot.history.at(-1)?.to === snapshot._tag)

const sameHistory = (
  left: ReadonlyArray<TransitionEvidence.TransitionEvidence>,
  right: ReadonlyArray<TransitionEvidence.TransitionEvidence>,
) => left.length === right.length && left.every((evidence, index) => sameTransitionEvidence(right[index], evidence))

const replayTransitionMatches = (snapshot: LifecycleSnapshot, request: TransitionRequest, result: TransitionResult) => {
  const evidence = result.evidence
  const completeHistory = hasCompleteHistory(snapshot) && hasCompleteHistory(result.snapshot)
  const matchesSource =
    snapshot._tag === evidence.from &&
    snapshot.revision === evidence.previousRevision &&
    result.snapshot.history.length === snapshot.history.length + 1 &&
    sameHistory(snapshot.history, result.snapshot.history.slice(0, -1))
  const matchesResult =
    snapshot._tag === result.snapshot._tag &&
    snapshot.revision === result.snapshot.revision &&
    snapshot.lastSequence === result.snapshot.lastSequence &&
    sameHistory(snapshot.history, result.snapshot.history)
  const matchesDescendant =
    snapshot.history.length > result.snapshot.history.length &&
    sameHistory(result.snapshot.history, snapshot.history.slice(0, result.snapshot.history.length))
  if (
    !completeHistory ||
    !sameReference(result.snapshot.runRef, snapshot.runRef) ||
    !sameContracts(result.snapshot.contracts, snapshot.contracts) ||
    !sameContracts(result.snapshot.contracts, request.contracts) ||
    evidence.cause !== request.cause ||
    evidence.to !== result.snapshot._tag ||
    (!matchesSource && !matchesResult && !matchesDescendant) ||
    !replayPayloadMatches(snapshot, request, result)
  ) {
    return false
  }
  switch (request._tag) {
    case "Validate":
      return evidence.from === "Draft" && result._tag === "Applied" && evidence.to === "Validated"
    case "RequireApproval":
      return (
        evidence.from === "Validated" && result._tag === "WaitingForApproval" && evidence.to === "WaitingForApproval"
      )
    case "ResolveApproval":
      return (
        evidence.from === "WaitingForApproval" &&
        ((result._tag === "Applied" && evidence.to === "Ready") ||
          (result._tag === "WaitingForApproval" && evidence.to === "WaitingForApproval"))
      )
    case "AcceptExecution":
      return evidence.from === "Ready" && result._tag === "Applied" && evidence.to === "Executing"
    case "Complete":
      return evidence.from === "Executing" && result._tag === "Applied" && evidence.to === request.outcome._tag
    case "RequestCancellation":
      return (
        !["CancellationRequested", "RecoverableInterruption", "Succeeded", "Failed", "Cancelled"].includes(
          evidence.from,
        ) &&
        result._tag === "CancellationRequested" &&
        evidence.to === "CancellationRequested"
      )
    case "ConfirmCancellation":
      return evidence.from === "CancellationRequested" && result._tag === "Applied" && evidence.to === "Cancelled"
    case "RecordRecoverableInterruption":
      return evidence.from === "Executing" && result._tag === "RecoverableInterruption" && evidence.to === result._tag
  }
}

const illegal = (snapshot: LifecycleSnapshot, request: TransitionRequest) =>
  Result.fail(new LifecycleFailure.IllegalTransition({ from: snapshot._tag, requestTag: request._tag }))

export const reduce = (input: ReduceInput): Result.Result<TransitionResult, LifecycleFailure.LifecycleFailure> => {
  const { request, snapshot } = input
  const normalized = normalizeRequest(request)
  if (Result.isFailure(normalized)) return Result.fail(normalized.failure)

  const matchingPriorResults = input.priorResults.filter((prior) => prior.requestId === request.requestId)
  if (matchingPriorResults.length > 1) {
    return Result.fail(
      new LifecycleFailure.ConflictingDuplicate({ requestId: request.requestId, scope: "prior-results" }),
    )
  }
  const prior = matchingPriorResults[0]
  if (prior !== undefined) {
    const normalizedPrior = normalizeRequest(prior.normalizedRequest)
    if (Result.isFailure(normalizedPrior))
      return Result.fail(new LifecycleFailure.PriorResultMismatch({ requestId: request.requestId }))
    if (!sameSemanticRequest(normalized.success, normalizedPrior.success)) {
      return Result.fail(new LifecycleFailure.ConflictingDuplicate({ requestId: request.requestId, scope: "request" }))
    }
    const evidence = prior.result.evidence
    const evidenceMatches =
      evidence.requestId === request.requestId &&
      evidence.requestTag === request._tag &&
      sameContracts(evidence.contracts, request.contracts) &&
      sameFacts(evidence.facts, normalized.success.facts) &&
      sameSecrets(evidence.secrets, normalized.success.secrets) &&
      prior.result.snapshot.revision === evidence.nextRevision &&
      prior.result.snapshot.lastSequence === evidence.sequence &&
      sameTransitionEvidence(prior.result.snapshot.history.at(-1), evidence)
    if (!evidenceMatches || !replayTransitionMatches(snapshot, request, prior.result)) {
      return Result.fail(new LifecycleFailure.PriorResultMismatch({ requestId: request.requestId }))
    }
    return Result.succeed(immutableCopy(TransitionResult, prior.result))
  }
  if (snapshot.history.some((evidence) => evidence.requestId === request.requestId)) {
    return Result.fail(new LifecycleFailure.PriorResultUnavailable({ requestId: request.requestId }))
  }
  if (!hasCompleteHistory(snapshot)) {
    return Result.fail(new LifecycleFailure.SnapshotIntegrityFailure({ reason: "history" }))
  }
  if (!sameContracts(snapshot.contracts, request.contracts)) {
    return Result.fail(new LifecycleFailure.ContractMismatch({ reason: "contracts" }))
  }
  if (snapshot.revision !== request.expectedRevision) {
    return Result.fail(
      new LifecycleFailure.RevisionConflict({ expected: request.expectedRevision, actual: snapshot.revision }),
    )
  }

  switch (snapshot._tag) {
    case "Draft":
      if (request._tag === "Validate") {
        return transition(snapshot, request, normalized.success, "Validated", "Applied", (state) =>
          Object.freeze({ _tag: "Validated", ...nextBase(snapshot, state), facts: normalized.success.facts }),
        )
      }
      break
    case "Validated":
      if (request._tag === "RequireApproval") {
        if (
          !sameReference(request.policyRequest.runRef, snapshot.runRef) ||
          !sameReference(request.policyRequest.planRef, snapshot.contracts.planRef) ||
          !sameReference(request.policyRequest.policyRef, snapshot.contracts.protocolRef) ||
          !sameNormalizedPolicyInputs(request.policyRequest, normalized.success)
        ) {
          return Result.fail(new LifecycleFailure.ContractMismatch({ reason: "policy" }))
        }
        return transition(snapshot, request, normalized.success, "WaitingForApproval", "WaitingForApproval", (state) =>
          Object.freeze({
            _tag: "WaitingForApproval",
            ...nextBase(snapshot, state),
            policyRequest: {
              ...request.policyRequest,
              facts: normalized.success.facts,
              secrets: normalized.success.secrets,
            },
          }),
        )
      }
      break
    case "WaitingForApproval":
      if (request._tag === "ResolveApproval") {
        const receipt = request.receipt
        if (receipt === undefined) {
          return transition(
            snapshot,
            request,
            normalized.success,
            "WaitingForApproval",
            "WaitingForApproval",
            (state) =>
              Object.freeze({
                _tag: "WaitingForApproval",
                ...nextBase(snapshot, state),
                policyRequest: snapshot.policyRequest,
              }),
          )
        }
        if (!policyReceiptCorresponds(snapshot, receipt, normalized.success)) {
          return Result.fail(new LifecycleFailure.ContractMismatch({ reason: "approval" }))
        }
        if (receipt.decision._tag !== "Approved") {
          return transition(
            snapshot,
            request,
            normalized.success,
            "WaitingForApproval",
            "WaitingForApproval",
            (state) =>
              Object.freeze({
                _tag: "WaitingForApproval",
                ...nextBase(snapshot, state),
                policyRequest: snapshot.policyRequest,
              }),
          )
        }
        return transition(snapshot, request, normalized.success, "Ready", "Applied", (state) =>
          Object.freeze({ _tag: "Ready", ...nextBase(snapshot, state), policyReceipt: receipt }),
        )
      }
      break
    case "Ready":
      if (request._tag === "AcceptExecution") {
        return transition(snapshot, request, normalized.success, "Executing", "Applied", (state) =>
          Object.freeze({ _tag: "Executing", ...nextBase(snapshot, state) }),
        )
      }
      break
    case "Executing":
      if (request._tag === "Complete") {
        if (request.outcome._tag === "Succeeded") {
          return transition(snapshot, request, normalized.success, "Succeeded", "Applied", (state) =>
            Object.freeze({ _tag: "Succeeded", ...nextBase(snapshot, state) }),
          )
        }
        const outcome = request.outcome
        if (outcome._tag === "Failed") {
          const diagnostics = outcome.diagnostics
          return transition(snapshot, request, normalized.success, "Failed", "Applied", (state) =>
            Object.freeze({
              _tag: "Failed",
              ...nextBase(snapshot, state),
              diagnostics: freezeArray(diagnostics),
            }),
          )
        }
        return illegal(snapshot, request)
      }
      if (request._tag === "RecordRecoverableInterruption") {
        return transition(
          snapshot,
          request,
          normalized.success,
          "RecoverableInterruption",
          "RecoverableInterruption",
          (state) =>
            Object.freeze({
              _tag: "RecoverableInterruption",
              ...nextBase(snapshot, state),
              safePointEvidence: request.safePointEvidence,
            }),
        )
      }
      break
    case "CancellationRequested":
      if (request._tag === "ConfirmCancellation") {
        return transition(snapshot, request, normalized.success, "Cancelled", "Applied", (state) =>
          Object.freeze({ _tag: "Cancelled", ...nextBase(snapshot, state), confirmationRef: request.confirmationRef }),
        )
      }
      break
    case "RecoverableInterruption":
    case "Succeeded":
    case "Failed":
    case "Cancelled":
      break
  }

  if (
    request._tag === "RequestCancellation" &&
    (snapshot._tag === "Draft" ||
      snapshot._tag === "Validated" ||
      snapshot._tag === "WaitingForApproval" ||
      snapshot._tag === "Ready" ||
      snapshot._tag === "Executing")
  ) {
    return transition(
      snapshot,
      request,
      normalized.success,
      "CancellationRequested",
      "CancellationRequested",
      (state) =>
        Object.freeze({
          _tag: "CancellationRequested",
          ...nextBase(snapshot, state),
          cancellationRequestId: request.requestId,
        }),
    )
  }

  return illegal(snapshot, request)
}

export const makeDraft = (input: {
  readonly runRef: Reference.RunRef
  readonly protocolRef: Reference.ProtocolRef
  readonly plan: PassiveRecord.PassivePlan
}): LifecycleSnapshot =>
  immutableCopy(LifecycleSnapshot, {
    _tag: "Draft",
    runRef: input.runRef,
    contracts: { protocolRef: input.protocolRef, planRef: input.plan.planRef },
    revision: 0,
    lastSequence: 0,
    history: [],
  })

export interface RunLifecycleService {
  readonly transition: (input: ReduceInput) => Effect.Effect<TransitionResult, LifecycleFailure.LifecycleFailure>
}

export class Service extends Context.Service<Service, RunLifecycleService>()(
  "@effectify/app-builder-execution/RunLifecycle",
) {}

const transitionEffect = Effect.fn("AppBuilder.RunLifecycle.transition")(function* (input: ReduceInput) {
  const result = reduce(input)
  if (Result.isFailure(result)) return yield* Effect.fail(result.failure)
  return result.success
})

export const layer = Layer.succeed(Service, Service.of({ transition: transitionEffect }))
