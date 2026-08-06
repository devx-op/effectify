# App Builder Contract Identities and Envelopes Specification

## Purpose

Define the browser-neutral PE1 identity foundation and composable envelope shell for `@effectify/app-builder-contracts`. This new capability refines the parent’s identity and envelope boundaries without defining outcomes.

## Requirements

### Requirement: Safe version identity and bounded compatibility

The system MUST model `major`, `minor`, and `patch` as safe non-negative integers with explicit version identity. It SHALL provide pure ordering and identity-level major checks. Unknown or unsupported majors MUST be rejected; caller-supplied policy determines accepted minors. This slice MUST NOT declare a compatibility matrix, migration policy, or certification decision.

#### Scenario: Valid version comparison

- GIVEN two versions with safe non-negative integer components
- WHEN a caller compares them or supplies support for their major
- THEN the pure result reflects their ordered identity and declared support

#### Scenario: Invalid or unsupported version

- GIVEN a negative, fractional, unsafe component or unsupported major
- WHEN a version is decoded or checked
- THEN it deterministically returns a malformed-version or incompatible-version failure

### Requirement: Nominal validated identity references

The system MUST expose distinct validated brands and versioned references for protocol, run, tool, plan, callback, continuation, trace, schema, and digest identities. Public constructors/codecs MUST retain each brand, validate approved ID syntax, and MUST NOT permit cross-assignment or widening.

#### Scenario: Domain reference round trip

- GIVEN a valid value for each identity domain
- WHEN its public codec encodes and decodes its versioned reference
- THEN the same domain-specific brand and version are retained

#### Scenario: Cross-domain or malformed ID

- GIVEN a Tool ID supplied where a Run ID is required, or an invalid ID string
- WHEN it is constructed or decoded through the public surface
- THEN the value is rejected without brand erosion or implicit coercion

### Requirement: Deterministic identity failures

The system MUST expose pure, typed failures for malformed identity, malformed version, and incompatible major cases. They MUST NOT throw, mutate input, depend on runtime services, or echo untrusted input.

#### Scenario: Hostile invalid input

- GIVEN malformed identity or version input
- WHEN a public validation or compatibility helper is invoked
- THEN it returns the same applicable typed failure category deterministically

### Requirement: Common envelope identity shell and outcome seam

The shell MUST contain only `protocolVersion`, a run identity/reference, optional trace reference, and applicable plan/output digest references. It SHALL provide a seam for one canonical wire `outcome` discriminator—the future status authority. It MUST NOT add duplicate `status`, discriminator cases, diagnostics, or outcome payload schemas; diagnostics/outcomes owns them.

#### Scenario: Compose a downstream outcome

- GIVEN a valid identity shell and a later outcome contract
- WHEN the later contract composes the canonical outcome discriminator
- THEN common identity fields remain reusable and no parallel status field exists

#### Scenario: Optional references

- GIVEN a shell without trace, plan digest, or output digest context
- WHEN it is encoded and decoded
- THEN those optional keys are absent; each present value is its applicable branded reference

### Requirement: Neutral, composable ownership boundary

This capability MUST contain only pure schemas, codecs, references, and compatibility/failure results. It MUST be browser-neutral and MUST NOT import or define Node, runtime, execution, or mutation behavior. JSON/canonicalization, diagnostics/outcomes, requirements, tool, passive-record/replay, and certification siblings MUST compose it; this slice defines none of their payloads, hashing, descriptors, CLI, IPC, or execution contracts.

#### Scenario: Downstream composition

- GIVEN a sibling composes an identity shell or reference into its own contract
- WHEN it imports this capability
- THEN no sibling-specific payload, runtime dependency, or final compatibility certification is required

## Compatibility Evolution

This capability owns safe version identity and caller-supplied acceptance/rejection only. The later exports/compatibility certification grandchild owns the cross-module table, migration policy, browser certification, and final public-surface guarantees.

## Parent Traceability

Refines parent PE1 typed protocol identity and the parent common-envelope aspect of PE1–2. Parent PE3–4 execution behavior and all outcome payload behavior remain excluded.
