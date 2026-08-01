# App Builder Run Lifecycle Specification

## Purpose

Define lifecycle authority for PE3–4, excluding execution and recovery.

## Requirements

### Requirement: Immutable Exhaustive Lifecycle Snapshot

The lifecycle MUST expose immutable schema-backed snapshots with identity, monotonic revision, and evidence. Public `Schema.TaggedUnion` states SHALL be exactly `Draft`, `Validated`, `WaitingForApproval`, `Ready`, `Executing`, `CancellationRequested`, `RecoverableInterruption`, `Succeeded`, `Failed`, and `Cancelled`. Failures MUST be closed `Schema.TaggedErrorClass` variants; internal decisions MAY use exhaustive `Data.TaggedEnum`.

#### Scenario: Unknown lifecycle state

- GIVEN an untrusted snapshot has an unknown tag
- WHEN decoded
- THEN it MUST reject without a result

### Requirement: Legal Transitions and Revisions

The reducer MUST permit only this table. Other pairs MUST fail with `IllegalTransition`; revision mismatch MUST fail with `RevisionConflict`.

| From                  | Event                          | To                      |
| --------------------- | ------------------------------ | ----------------------- |
| Draft                 | validate                       | Validated               |
| Validated             | require approval               | WaitingForApproval      |
| WaitingForApproval    | approved decision              | Ready                   |
| Ready                 | accept execution               | Executing               |
| Executing             | complete                       | Succeeded or Failed     |
| Draft–Executing       | request cancellation           | CancellationRequested   |
| CancellationRequested | confirmed cancellation         | Cancelled               |
| Executing             | proven safe-point interruption | RecoverableInterruption |

#### Scenario: Unlisted transition

- GIVEN a snapshot and revision that otherwise match
- WHEN the caller requests an event absent from the table
- THEN the reducer MUST return `IllegalTransition` and preserve the snapshot

### Requirement: Approval Waiting and Policy Seam

`WaitingForApproval` MUST return an approval/policy request and MUST NOT advance execution. Only an external matching policy identity/version, approval, and lifecycle-idempotency proof MAY reach `Ready`; missing, denied, or non-idempotent decisions MUST not advance. The capability SHALL define requests/receipts only, never policy rules.

#### Scenario: Required approval is unavailable

- GIVEN a validated run requires approval
- WHEN no qualifying external decision is supplied
- THEN the result MUST remain `WaitingForApproval` with a request and evidence

### Requirement: Evidence and Duplicate Requests

Each applied transition MUST append immutable evidence: prior/new state, cause, sequence, request identity, and contract references. It MUST retain non-secret facts plus redacted secret presence/source—never values or hashes. An equivalent identity MUST return its original result without another append; differing facts MUST fail with `ConflictingDuplicate`.

#### Scenario: Conflicting duplicate

- GIVEN evidence already records a request identity
- WHEN the identity is retried with different normalized facts
- THEN the reducer MUST return `ConflictingDuplicate` without rewriting history

### Requirement: Truthful Cancellation, Interruption, and Closure

`CancellationRequested` MUST be distinct from terminal `Cancelled` and MUST NOT claim cleanup. Only caller confirmation MAY cancel. `RecoverableInterruption` MUST contain proven safe-point evidence, MUST NOT imply success/failure, and MUST NOT resume here. `Succeeded`, `Failed`, and `Cancelled` MUST have no outgoing transition or history rewrite.

#### Scenario: Executing cancellation request

- GIVEN an executing run receives a cancellation request
- WHEN cleanup confirmation is absent
- THEN the result MUST be `CancellationRequested`, not `Cancelled`

### Requirement: Pure Effect v4 Boundary and Ownership

Pure total reducer MUST be sole authority; no clock, I/O, global, or ambient reads. A stateless `Context.Service` with named `Effect.fn` operations MAY adapt facts, but MUST preserve fiber interruption and return a new value. It MUST NOT own persistence/recovery; locks/executor/cleanup; CLI intent/wizard; filesystem/process/global state; Nx, web, plugins, or analytics.

#### Scenario: Interrupted service call

- GIVEN a lifecycle service call is interrupted
- WHEN interruption reaches its Effect boundary
- THEN interruption MUST remain visible and no cleanup claim or lifecycle mutation is produced

### Requirement: Contracts, Traceability, and Strict TDD

The capability MUST consume compatible `@effectify/app-builder-contracts` identities/records without redefining them, and trace lifecycle/approval to PE3–4. Strict TDD MUST prove the complete state/event matrix, table/property invariants (revision, identity, append, immutability, terminal closure), exhaustive tagged failures, and concurrency-order-independent results using Effect v4 seams without sleeps.

#### Scenario: Matrix and law suite

- GIVEN each declared state/event, revision, and duplicate class
- WHEN table-driven and property-driven tests run
- THEN exactly legal cells MUST apply and all other results MUST be deterministic typed failures
