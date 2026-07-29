# Platform Planning and Execution Specification

## Purpose

Define the shared, inspectable contract used by CLI, generators, plugins, builder output, and lifecycle operations.

## Requirements

### Requirement: Typed tool protocol

Significant commands MUST expose versioned, schema-defined JSON input/output envelopes. JSON-mode stdout SHALL remain machine-readable; human output SHALL project the same result. The registry MUST describe each core or plugin tool's identity, schemas, errors, read/write class, capabilities, permissions, resumability, idempotency, and version.

#### Scenario: Discover and call a deterministic tool

- GIVEN a compatible project and registered read/write tools
- WHEN a client lists, describes, and calls a tool through JSON
- THEN it receives typed envelopes with run ID, status, diagnostics, trace reference, and applicable digests

#### Scenario: Reject incompatible protocol input

- GIVEN a malformed or unsupported protocol version
- WHEN a command receives JSON input
- THEN it MUST return a typed failure without applying a mutation

### Requirement: Immutable plans and deterministic replay

Every mutation MUST derive from an immutable plan containing pinned capability/registry/plugin inputs, baseline hashes, ordered operations, permissions, provenance, validations, and plan/output digests. Identical pinned inputs and baseline MUST yield the same plan and output digest. Deterministic Nx/AST operations SHALL be preferred over textual or bounded LLM transformations; LLMs MUST NOT replace an available deterministic transformation.

#### Scenario: Replay a pinned plan

- GIVEN identical blueprint or preset, registry snapshot, plugin versions, inputs, and workspace baseline
- WHEN the plan is regenerated
- THEN the plan and output digests MUST match

#### Scenario: Detect replay drift

- GIVEN a changed baseline hash or pinned dependency
- WHEN a prior plan is replayed or resumed
- THEN approval MUST be invalidated and the system MUST return classified drift before writing

### Requirement: Approval, locking, and recovery

Read-only inspection and planning MAY run concurrently. Destructive writes, compatibility/topology/plugin changes, permission expansion, migrations, and overwrites MUST show an exact diff and require explicit approval. Workspace mutation MUST hold one owner-identified lock; stale locks MUST be diagnosed and released only by explicit action. Failed local operations MUST report rollback or deterministic recovery evidence; provider/network side effects MUST report truthful partial failure and compensation guidance.

#### Scenario: Apply an approved mutation

- GIVEN an approved, hash-valid plan and available mutation lock
- WHEN a write is executed
- THEN validation results and recovery state MUST be recorded with provenance

#### Scenario: Recover after a failed operation

- GIVEN local validation or a provider side effect fails
- WHEN the run terminates
- THEN no partial state may be unreported and recovery instructions MUST distinguish local rollback from external compensation

### Requirement: Resumable callbacks, analytics, and diagnostics

Input-required runs MUST persist typed state and return a continuation token, response schema, and non-sensitive context. Resumption MUST validate token, state version, plan/plugin digests, lock ownership, and hashes. Anonymous analytics MUST be enabled by default, support project-level opt-out, and exclude code, prompts, secrets, raw diffs, contents, absolute paths, and human responses. Detailed traces SHALL remain local. Diagnostic upload MUST be separately consented, previewed, redacted, deletable on request, and retained for at most 30 days.

#### Scenario: Resume an approved callback

- GIVEN a paused approval or consent callback with unchanged validated state
- WHEN another process submits the typed response and token
- THEN execution MUST resume from the persisted transition with traceability

#### Scenario: Opt out of anonymous analytics

- GIVEN project configuration disables analytics
- WHEN a command completes
- THEN no remote analytics event is emitted and diagnostic submission remains separately consented

#### Scenario: Expire diagnostic evidence

- GIVEN an explicitly submitted diagnostic bundle
- WHEN 30 days elapse or deletion is requested
- THEN the bundle MUST expire automatically or be deleted immediately without implying analytics consent
