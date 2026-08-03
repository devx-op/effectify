# App Builder Run Lock Executor Specification

## Purpose

Define exclusive, scoped execution of one resolved Effect callback while preserving truthful run and workspace evidence.

## Requirements

### Requirement: Atomic Scoped Workspace Ownership

`WorkspaceLock.withExclusive` MUST atomically acquire a private workspace lock directory before yielding opaque ownership authority. Exactly one concurrent contender MAY acquire it; every non-owner MUST perform zero workspace, store, or cleanup mutation. Authority MUST be unusable outside its Effect scope, and acquisition failure MUST NOT fall back to unlocked execution.

#### Scenario: Concurrent acquisition

- GIVEN two contenders for the same unlocked workspace
- WHEN they acquire concurrently
- THEN exactly one MUST receive scoped authority
- AND the other MUST make no mutation

#### Scenario: Acquisition cannot prove exclusivity

- GIVEN atomic acquisition fails or is indeterminate
- WHEN execution is requested
- THEN it MUST fail closed without invoking the callback

### Requirement: Owner Evidence and Stale Recovery

Lock metadata MUST identify its owner process instance and remain unchanged through recovery evaluation. Takeover MUST require explicit `LockRecoveryAuthority`, same-host proof, and definitive owner-process-instance death; elapsed time alone MUST NOT authorize recovery. Missing, changed, foreign-host, or ambiguous evidence MUST block takeover.

#### Scenario: Authorized dead owner

- GIVEN unchanged same-host metadata and definitive process-instance death
- WHEN `LockRecoveryAuthority` is supplied
- THEN recovery MAY acquire new scoped authority

#### Scenario: Ambiguous owner evidence

- GIVEN unavailable identity verification or changed metadata
- WHEN recovery is requested
- THEN it MUST preserve the lock and perform zero takeover mutation

### Requirement: Resolved Callback and Ownership-Gated Execution

`RunExecutor` MUST expose one resolved Effect callback shape with run identity and idempotency proof; `ToolProcess` MUST remain internal. It MUST commit `Ready` to `Executing` under ownership before callback invocation. Every `RunStore.commit`, workspace mutation, and terminal cleanup MUST require matching ownership authority. Retries MUST occur only where the supplied identity proof establishes idempotency, and a callback MUST NOT be re-invoked after an indeterminate attempt.

#### Scenario: Ordered execution

- GIVEN valid scoped authority and an idempotent callback identity
- WHEN a run starts
- THEN the `Executing` commit MUST succeed before callback invocation

#### Scenario: Missing or wrong authority

- GIVEN absent, expired, or foreign ownership authority
- WHEN a commit, mutation, or cleanup is requested
- THEN it MUST be rejected without side effects

### Requirement: Interruption and Truthful Lifecycle Persistence

Child lifecycle management MUST be Effect-scoped. Termination grace inputs MUST accept `Duration.Input`; after grace expiry, forced termination MAY be attempted only when supported. `Cancelled` MUST be persisted only after an interruption-only callback cause and confirmed child settlement. The system MUST commit `RequestCancellation` before `ConfirmCancellation`; failed commits, mixed failure/defect causes, adapter failures, and unknown settlement MUST retain non-cancelled evidence. `TerminationTimedOut` MUST preserve child and run evidence and MUST NOT be persisted or reported as `Cancelled`.

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

### Requirement: Bounded Finalization Surface

This follow-up MUST NOT alter CLI commands, prompts, flags, signal registration, rendering, tool discovery, registry behavior, `PassivePlan` derivation, lock model, distributed locking, leases, unlocked fallback, automatic salvage, tombstone/rename recovery, public cleanup authority, or unrelated behavior.

#### Scenario: Out-of-scope invocation

- GIVEN a caller outside finalization ownership
- WHEN it requests cleanup or recovery behavior
- THEN it MUST receive no new authority or behavior
