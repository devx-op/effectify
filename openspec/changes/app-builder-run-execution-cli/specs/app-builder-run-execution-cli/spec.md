# App Builder Run Execution CLI Tracker Specification

## Purpose

Preserve PE3–4 requirements and the `app-builder-protocol-contracts` dependency without authorizing implementation. Contract records and identities are consumed, never redefined.

## Requirements

### Requirement: Tracker Boundary and Grandchild Ownership

This tracker MUST NOT be applied. Delivery SHALL use grandchildren: `app-builder-run-lifecycle` (policy), `app-builder-run-store-recovery` (durability), `app-builder-run-lock-executor` (exclusive execution), then `app-builder-execution-cli` (product interface).

#### Scenario: Tracker apply is requested

- GIVEN this tracker has no implementation tasks
- WHEN an apply operation targets it
- THEN the operation MUST stop without mutation
- AND direct work MUST be assigned to a proposed grandchild

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

### Requirement: `effectify create` Interface Parity

`app-builder-execution-cli` MUST use current Effect v4 `effect/unstable/cli` `Prompt` for `effectify create` without arguments. Wizard answers, complete flags, and declared defaults MUST resolve to one validated intent model. Non-interactive missing required input MUST fail before mutation; validated drafts MUST be resumable. JSON mode MUST reserve stdout for one machine envelope and route human terminal output elsewhere.

#### Scenario: Equivalent interactive and flag input

- GIVEN equivalent wizard answers and complete flags
- WHEN each invokes `effectify create`
- THEN both MUST yield the same validated intent and defaults

#### Scenario: Automation input is incomplete

- GIVEN non-interactive input omits a required value
- WHEN `effectify create` is invoked in JSON mode
- THEN it MUST emit one machine error envelope and perform no mutation

### Requirement: Deterministic and Bounded Delivery

Each grandchild MUST expose typed errors and deterministic Effect-aware test seams for transitions, recovery, locks, cancellation, output, and retry bounds. Nx generation, web UI, analytics, plugin SDK, registry/marketplace, and broad scaffolding MUST remain excluded.

#### Scenario: Proposed work widens scope

- GIVEN a proposed grandchild adds an excluded capability
- WHEN its specification is reviewed
- THEN the work MUST be rejected or split into a separately authorized change
