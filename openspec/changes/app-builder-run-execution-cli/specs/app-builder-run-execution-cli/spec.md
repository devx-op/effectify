# App Builder Run Execution CLI Tracker Specification

## Purpose

Preserve completed PE3–4 and protocol/POSIX authorities and their evidence without authorizing implementation. Only the pending thin CLI child is superseded; product planning continues at the proposal-only `app-builder-golden-monorepo` change.

## Requirements

### Requirement: Tracker Boundary and Grandchild Ownership

This tracker MUST NOT be applied. `app-builder-run-lifecycle`, `app-builder-run-store-recovery`, and `app-builder-run-lock-executor` plus finalization are completed retained authorities. Completed protocol-contract children and verified POSIX/executable evidence are retained prerequisites. `app-builder-execution-cli` is superseded and MUST NOT be applied.

#### Scenario: Tracker apply is requested

- GIVEN this tracker has no implementation tasks
- WHEN an apply operation targets it
- THEN the operation MUST stop without mutation
- AND the operation MUST direct product planning to `app-builder-golden-monorepo` without authorizing a later phase

#### Scenario: Dependency is consumed

- GIVEN a grandchild handles a run or continuation
- WHEN it needs a protocol identity or passive record
- THEN it MUST consume `app-builder-protocol-contracts`

### Requirement: Lifecycle and Approval Policy

`app-builder-run-lifecycle` MUST define an Effect-first run lifecycle with explicit legal transitions, typed transition failures, and truthful idempotency. Automatic approval MUST record its versioned policy identity, non-secret evidence, redacted secret evidence, and decision.

#### Scenario: Legal automatic transition

- GIVEN a run is in a state with a declared idempotent transition
- WHEN its versioned approval policy accepts redacted evidence
- THEN the transition MUST complete and record the decision provenance

#### Scenario: Illegal or unapproved transition

- GIVEN a transition is absent, non-idempotent, or denied
- WHEN automatic progression is requested
- THEN the lifecycle MUST return a typed failure or input-required outcome

### Requirement: Durable Recovery and Intent Drafts

`app-builder-run-store-recovery` MUST persist validated run state and wizard drafts crash-consistently. It MUST automatically recover only verified safe idempotent work; ambiguous, corrupted, or unsafe state MUST stop explicitly without workspace mutation.

#### Scenario: Safe restart

- GIVEN a crash interrupts a persisted safe transition
- WHEN recovery validates its state and continuation
- THEN recovery MUST resume only that safe work

#### Scenario: Unsafe restart

- GIVEN persisted state is corrupt, ambiguous, or lacks recovery authority
- WHEN recovery is requested
- THEN it MUST stop with a typed diagnostic and preserve evidence

### Requirement: Exclusive Effectful Execution

`app-builder-run-lock-executor` MUST separate intent capture, execution, and workspace mutation. It MUST acquire one cross-process workspace writer, report rejection ownership diagnostics, and permit stale-lock recovery only to documented authority. Cancellation and signals MUST finalize owned resources; retries MUST be bounded and limited to proven-idempotent operations.

#### Scenario: Concurrent writer

- GIVEN another process owns the workspace lock
- WHEN a run attempts acquisition
- THEN execution MUST be rejected with owner and recovery diagnostics

#### Scenario: Interrupted mutation

- GIVEN an executing run receives cancellation or a signal
- WHEN finalization occurs
- THEN owned resources MUST be released and non-idempotent mutation MUST NOT retry

### Requirement: Superseded Thin CLI Boundary

The pending `app-builder-execution-cli` child is non-applicable and superseded by `app-builder-golden-monorepo`. It MUST NOT be proposed, specified, designed, tasked, applied, or merged. Its historical planned files and interface scenarios confer no implementation authority.

#### Scenario: Thin CLI work is requested

- GIVEN the old `app-builder-execution-cli` child is pending
- WHEN any lifecycle or implementation action is requested for it
- THEN the action MUST stop as superseded and perform no mutation

#### Scenario: Golden planning continues

- GIVEN the Golden proposal is approved
- WHEN product planning resumes
- THEN the next route MUST be `app-builder-golden-monorepo`
- AND this tracker MUST NOT imply authorization for Golden specs, design, tasks, or implementation

### Requirement: Evidence and Integration Tracker Preservation

PR #104 MUST remain a no-merge integration tracker. Completed child checkboxes, archived artifacts, verification reports, task evidence, commits, PR facts, and canonical specifications MUST remain unchanged and consumable by future Golden planning.

#### Scenario: Tracker is respecified

- GIVEN completed protocol, lifecycle, store/recovery, lock/executor/finalization, and POSIX/executable evidence
- WHEN pending routing is updated
- THEN only the obsolete thin CLI route SHALL be marked superseded
- AND all completed evidence MUST remain intact

### Requirement: Retained Deterministic Evidence

Completed children MUST retain their typed errors and deterministic Effect-aware evidence for transitions, recovery, locks, cancellation, output, and retry bounds. This tracker MUST NOT reopen delivery or authorize Nx generation, web UI, analytics, plugin SDK, registry/marketplace, or broad scaffolding.

#### Scenario: Tracker work is proposed

- GIVEN retained evidence or an excluded capability would be changed through this tracker
- WHEN the work is reviewed
- THEN it MUST be rejected and routed to a separately authorized change
