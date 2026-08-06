import * as Schema from "effect/Schema"

export class PriorResultUnavailable extends Schema.TaggedErrorClass<PriorResultUnavailable>()(
  "PriorResultUnavailable",
  { requestId: Schema.NonEmptyString },
) {}

export class PriorResultMismatch extends Schema.TaggedErrorClass<PriorResultMismatch>()("PriorResultMismatch", {
  requestId: Schema.NonEmptyString,
}) {}

export class RevisionConflict extends Schema.TaggedErrorClass<RevisionConflict>()("RevisionConflict", {
  expected: Schema.Number,
  actual: Schema.Number,
}) {}

export class CounterExhausted extends Schema.TaggedErrorClass<CounterExhausted>()("CounterExhausted", {
  counter: Schema.Literals(["revision", "sequence"]),
  value: Schema.Number,
}) {}

export class IllegalTransition extends Schema.TaggedErrorClass<IllegalTransition>()("IllegalTransition", {
  from: Schema.NonEmptyString,
  requestTag: Schema.NonEmptyString,
}) {}

export class ConflictingDuplicate extends Schema.TaggedErrorClass<ConflictingDuplicate>()("ConflictingDuplicate", {
  requestId: Schema.NonEmptyString,
  scope: Schema.Literals(["request", "facts", "secrets", "prior-results"]),
  key: Schema.optionalKey(Schema.NonEmptyString),
}) {}

export class ContractMismatch extends Schema.TaggedErrorClass<ContractMismatch>()("ContractMismatch", {
  reason: Schema.Literals(["approval", "contracts", "idempotency", "policy"]),
}) {}

export class SnapshotIntegrityFailure extends Schema.TaggedErrorClass<SnapshotIntegrityFailure>()(
  "SnapshotIntegrityFailure",
  { reason: Schema.Literal("history") },
) {}

export type LifecycleFailure =
  | PriorResultUnavailable
  | PriorResultMismatch
  | RevisionConflict
  | CounterExhausted
  | IllegalTransition
  | ConflictingDuplicate
  | ContractMismatch
  | SnapshotIntegrityFailure
