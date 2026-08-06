import { Reference } from "@effectify/app-builder-contracts"
import * as Schema from "effect/Schema"
import { Fact, SecretDescriptor } from "./automatic-policy.js"

export const Counter = Schema.Number.check(
  Schema.isInt(),
  Schema.isGreaterThanOrEqualTo(0),
  Schema.isLessThanOrEqualTo(Number.MAX_SAFE_INTEGER),
)
export type Counter = typeof Counter.Type

export const StateTag = Schema.Literals([
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
])
export type StateTag = typeof StateTag.Type

export const RequestTag = Schema.Literals([
  "Validate",
  "RequireApproval",
  "ResolveApproval",
  "AcceptExecution",
  "Complete",
  "RequestCancellation",
  "ConfirmCancellation",
  "RecordRecoverableInterruption",
])
export type RequestTag = typeof RequestTag.Type

export const OutcomeTag = Schema.Literals([
  "Applied",
  "WaitingForApproval",
  "CancellationRequested",
  "RecoverableInterruption",
])
export type OutcomeTag = typeof OutcomeTag.Type

export const ContractRefs = Schema.Struct({
  protocolRef: Reference.ProtocolRef,
  planRef: Reference.PlanRef,
})
export type ContractRefs = typeof ContractRefs.Type

export const TransitionEvidence = Schema.Struct({
  sequence: Counter,
  previousRevision: Counter,
  nextRevision: Counter,
  from: StateTag,
  to: StateTag,
  cause: Schema.NonEmptyString,
  requestId: Schema.NonEmptyString,
  requestTag: RequestTag,
  facts: Schema.Array(Fact),
  secrets: Schema.Array(SecretDescriptor),
  contracts: ContractRefs,
  outcomeTag: OutcomeTag,
})
export type TransitionEvidence = typeof TransitionEvidence.Type
