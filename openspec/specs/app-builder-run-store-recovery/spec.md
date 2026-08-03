# App Builder Run Store Recovery Specification

## Purpose

Define durable workspace-local run/draft storage, read-only recovery, and post-closure cleanup. Lifecycle owns transitions; never executes.

## Requirements

### Requirement: Contracts-Owned Draft Boundary

The system MUST persist wizard drafts through contracts-owned schema validation. It MUST NOT define CLI intent, defaults, prompts, or presentation.

#### Scenario: Validated draft

- GIVEN a contracts-valid draft
- WHEN it is persisted and read
- THEN its validated payload MUST be returned without CLI behavior

#### Scenario: Invalid draft

- GIVEN untrusted draft bytes fail validation
- WHEN persistence is requested
- THEN a closed typed outcome MUST result and nothing is written

### Requirement: Managed State Isolation

The system MUST use one Git-ignored workspace root and validated encoded identifiers. It MUST reject traversal, symlink escape, non-directory ancestors, cross-device publication, and insufficient private permissions.

#### Scenario: Private path

- GIVEN a valid identifier and compliant filesystem
- WHEN state is created
- THEN new directories and files MUST be owner-restricted

#### Scenario: Hostile path

- GIVEN a managed-root policy violation
- WHEN state is accessed
- THEN the target MUST not be followed or altered

### Requirement: Canonical Journal and Snapshot

Immutable versioned per-revision journals MUST be authoritative. Each MUST contain exact version, identities/references, revision/sequence, predecessor and canonical-payload digests, exact lifecycle replay material, and evidence; secret values or hashes MUST NOT persist. A derived snapshot MAY accelerate reads only when exactly matching the tail.

#### Scenario: Exact replay

- GIVEN a committed transition segment
- WHEN it is decoded
- THEN its replay result and evidence MUST exactly correspond

#### Scenario: Unsupported or stale material

- GIVEN an unknown version or nonmatching snapshot
- WHEN recovery runs
- THEN it MUST block the version and ignore the snapshot

### Requirement: Truthful Optimistic Commit

The system MUST validate the authoritative tail and reject revision, predecessor, payload, or request-identity conflicts. Success SHALL require restrictive temporary creation, complete write, file durability, immutable no-replace publication, and directory durability. Unsupported or indeterminate stages MUST fail closed, never claim cross-process locking.

#### Scenario: Tail conflict

- GIVEN an expected revision or digest differs
- WHEN commit is requested
- THEN a typed conflict MUST result without segment replacement

#### Scenario: Interrupted commit

- GIVEN any durable stage fails or is interrupted
- WHEN the caller observes it
- THEN it MUST receive truthful typed status, never assumed success

### Requirement: Read-Only Closed Recovery

Recovery MUST validate filename identity, schema, version, digests, references, monotonicity, evidence append, and prior-result correspondence as one complete chain. It SHALL return only `Recovered`, `ResumeCandidate`, `InputRequired`, or `RecoveryBlocked` with safe diagnostics, never secret bytes or unchecked causes. Orphan temps MUST be reported and untouched.

#### Scenario: Recoverable chain

- GIVEN a complete valid safe-point chain
- WHEN recovery runs
- THEN it MUST return `ResumeCandidate` or `InputRequired` from lifecycle facts

#### Scenario: Corrupt or ambiguous chain

- GIVEN hostile, malformed, gapped, duplicate, conflicting-tail, or mismatched evidence
- WHEN recovery runs
- THEN it MUST return `RecoveryBlocked`, not a valid prefix

### Requirement: Non-Executable Handoff and Retention

A `ResumeCandidate` MUST be non-executable and name unmet lock and executor/idempotency authorities. Evidence MUST remain through closure. Under matching live ownership, cleanup MAY prepare only validated terminal evidence for later deletion; it MUST delete only after durable lock release and only if the prepared terminal evidence remains unchanged. Recovery MUST NOT mutate workspaces, execute, lock, repair, salvage, migrate, quarantine, clean implicitly, use tombstone/rename recovery, or expose public cleanup authority. It MUST NOT require a database.

#### Scenario: Candidate handoff

- GIVEN valid interruption evidence without successor authority
- WHEN recovery produces a candidate
- THEN unmet authorities MUST remain explicit

#### Scenario: Cleanup guard

- GIVEN nonterminal, invalid, or ambiguous state
- WHEN cleanup is requested
- THEN all evidence MUST be preserved

#### Scenario: Release failure

- GIVEN prepared terminal evidence and a failed or interrupted lock release
- WHEN finalization ends
- THEN deletion MUST NOT occur and evidence MUST remain

#### Scenario: Changed terminal evidence

- GIVEN release succeeds and terminal evidence changes before deletion
- WHEN deletion compares its preparation
- THEN it MUST preserve evidence and report a closed failure

### Requirement: Strict TDD Evidence Matrix

Deterministic Nx/pnpm tests MUST cover every crash boundary, validation class, replay law, path/permission defense, recovery outcome, cleanup guard, cancellation proof, and release-before-delete ordering without failed-recovery mutation. Reproducible RED, GREEN, TRIANGULATE, and SAFETY NET evidence MUST distinguish interruption-only settlement, mixed/indeterminate outcomes, release failure, cleanup failure, and changed evidence. Coverage MUST include `run-executor.ts`, `workspace-lock.ts`, `cleanup.ts`, and every corrected helper without weakening existing thresholds. The follow-up SHOULD target no more than 400 changed lines; an overage MUST be recorded and MUST NOT omit required proof.

#### Scenario: Crash matrix

- GIVEN each durable commit boundary
- WHEN interruption is injected
- THEN recovery MUST yield its specified truthful outcome

#### Scenario: Finalization proof matrix

- GIVEN the corrected cancellation, release, and deletion paths
- WHEN deterministic RED/GREEN/TRIANGULATE/SAFETY NET and coverage checks run
- THEN every corrected path and outcome distinction MUST be proven
