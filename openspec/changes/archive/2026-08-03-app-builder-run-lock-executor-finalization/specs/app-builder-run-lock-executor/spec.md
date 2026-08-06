# Delta for App Builder Run Lock Executor

## MODIFIED Requirements

### Requirement: Interruption and Truthful Lifecycle Persistence

Child lifecycle management MUST be Effect-scoped. Termination grace inputs MUST accept `Duration.Input`; after grace expiry, forced termination MAY be attempted only when supported. `Cancelled` MUST be persisted only after an interruption-only callback cause and confirmed child settlement. The system MUST commit `RequestCancellation` before `ConfirmCancellation`; failed commits, mixed failure/defect causes, adapter failures, and unknown settlement MUST retain non-cancelled evidence. `TerminationTimedOut` MUST preserve child and run evidence and MUST NOT be persisted or reported as `Cancelled`.

(Previously: proven cancellation did not require interruption-only cause plus confirmed settlement.)

#### Scenario: Proven cancellation

- GIVEN an interruption-only callback cause and confirmed child settlement
- WHEN finalization commits both cancellation transitions
- THEN it MUST persist `Cancelled`

#### Scenario: Mixed or indeterminate cause

- GIVEN a mixed cause, adapter failure, unknown settlement, or failed cancellation commit
- WHEN finalization runs
- THEN it MUST preserve evidence and MUST NOT claim `Cancelled`

#### Scenario: Termination timeout

- GIVEN termination remains unconfirmed after the bounded grace procedure
- WHEN finalization returns
- THEN it MUST return `TerminationTimedOut` and preserve evidence

### Requirement: Safe Finalization, Compatibility, and Testability

Finalization MUST settle the child and capture unchanged terminal evidence while ownership is live. It MUST durably compare-remove unchanged lock metadata before deleting terminal evidence. Post-release deletion MUST compare the captured terminal evidence unchanged and fail closed on mismatch or deletion failure. Release, capture, cleanup, or crash/interruption failure MUST preserve evidence and MUST NOT claim completion. Retries MUST remain ownership- and idempotency-safe. Workspace paths and process environment inputs MUST be validated and workspace-scoped. `effectify-run-store/1` bytes MUST remain readable without migration. Deterministic seams MUST permit tests for races, recovery proofs, lifecycle ordering, termination, failures, paths, and environment safety without wall-clock or live-process dependence.

(Previously: owned cleanup occurred before lock removal, allowing release failure to erase evidence.)

#### Scenario: Release before deletion

- GIVEN proven terminal evidence and matching authority
- WHEN durable lock release succeeds
- THEN only unchanged captured evidence MAY be deleted afterward

#### Scenario: Release or preparation failure

- GIVEN evidence capture, release, or durability fails
- WHEN finalization exits or is interrupted before release completion
- THEN it MUST retain evidence and MUST NOT run deletion

#### Scenario: Post-release evidence mismatch

- GIVEN another owner changes terminal evidence after release
- WHEN conditional deletion compares the captured evidence
- THEN it MUST preserve evidence and fail closed

#### Scenario: Cleanup failure

- GIVEN release succeeded but conditional deletion fails
- WHEN finalization reports the failure
- THEN terminal evidence MUST remain and completion MUST NOT be claimed

#### Scenario: Interruption after release

- GIVEN release succeeded before conditional deletion begins
- WHEN finalization crashes or is interrupted
- THEN retained terminal evidence MUST NOT be treated as deleted

## ADDED Requirements

### Requirement: Bounded Finalization Surface

This follow-up MUST NOT alter CLI commands, prompts, flags, signal registration, rendering, tool discovery, registry behavior, `PassivePlan` derivation, lock model, distributed locking, leases, unlocked fallback, automatic salvage, tombstone/rename recovery, public cleanup authority, or unrelated behavior.

#### Scenario: Out-of-scope invocation

- GIVEN a caller outside finalization ownership
- WHEN it requests cleanup or recovery behavior
- THEN it MUST receive no new authority or behavior
