# App Builder Protocol Contracts Specification

## Purpose

Define the browser-neutral, passive vocabulary for parent `platform-planning-execution` PE1–2; PE3–4 runtime behavior is excluded.

## Requirements

### Requirement: Neutral ownership boundary

`@effectify/app-builder-contracts` MUST be browser-safe and runtime-independent. It SHALL expose only data and pure validation, encoding, compatibility, and canonicalization. It MUST enable downstream provenance/baseline/validation/digest exchange without generating, inspecting, claiming, or mutating source. It MUST NOT implement Node dependencies, CLI, execution, IPC, storage, filesystem/Nx mutation, approval, locks, recovery, workers/brokers, planners, registries, builders, previews, plugins, compatibility solving, or enforcement.

#### Scenario: Browser consumption

- GIVEN a browser consumer imports the public surface
- WHEN it decodes passive contract data
- THEN no Node global, runtime service, execution, or source mutation is available

### Requirement: Versioned identity and rejection

Protocol, run, tool, plan, callback, continuation, trace, schema, and digest references MUST be validated branded identities with explicit versions. Compatibility SHALL be declared: supported versions are accepted; unknown or unsupported majors, malformed identities, duplicate metadata, unknown tags, and schema mismatches MUST produce typed failures.

#### Scenario: Unknown protocol major

- GIVEN an otherwise valid contract with an unknown major
- WHEN it is decoded
- THEN typed incompatibility is returned without fallback

### Requirement: JSON value and canonical identity

Wire values MUST be JSON: null, boolean, finite number, string, array, or string-keyed object; undefined, bigint, symbol, function, cyclic/runtime values, and non-finite numbers MUST be rejected. Canonicalization MUST name an algorithm/version, sort object keys, preserve array order, and retain no mutable aliases. Identical immutable records MUST yield identical canonical and replay identities; reordered arrays MUST differ.

#### Scenario: Canonical replay comparison

- GIVEN equivalent objects with reordered keys and records with reordered arrays
- WHEN canonicalized under one algorithm version
- THEN object identities MUST match and array identities MUST differ

#### Scenario: Unsupported value

- GIVEN an envelope containing `NaN`
- WHEN validated or canonicalized
- THEN a structured failure is returned

### Requirement: Exhaustive envelope outcomes

Every envelope MUST include protocol version, run identity, tagged outcome, diagnostics, and applicable trace and plan/output digest references. The only outcomes SHALL be success, failure, and input-required. Diagnostics/failures MUST include machine code, severity, message, and JSON-safe details/path/cause references; declared tool errors remain typed payloads.

#### Scenario: Exhaustive outcome variants

- GIVEN successful, failed, and input-required work
- WHEN outcomes are encoded
- THEN only the three declared tags and required common fields are present

### Requirement: Dual tool contract

An in-process declaration MUST preserve typed input, output, error, and requirements schemas/channels. Its serializable description MUST retain identity/version, input/output/error schema metadata, class, capabilities, permissions, resumability, and idempotency. Runtime schema objects and handlers MUST NOT be wire data.

#### Scenario: Describe a tool

- GIVEN a typed declaration
- WHEN its serializable description is produced
- THEN complete metadata is available without a handler or runtime schema object

### Requirement: Explicit requirement descriptors

Requirements MUST use explicit serializable capability descriptors and constraints. The package MUST NOT claim to automatically reflect TypeScript `R` or construct, grant, or evaluate services, Layers, or permissions.

#### Scenario: Serialize requirements

- GIVEN explicit descriptors alongside a declaration
- WHEN serialized
- THEN they SHALL remain independent of `R`

### Requirement: Passive immutable replay records

Plans, pinned inputs, baselines, provenance, validations, callbacks, continuations, and replay expectations MUST be immutable passive records; plans SHALL retain operation order. They MUST NOT prescribe transitions, persistence, approval, locks, or execution.

#### Scenario: Preserve replay data

- GIVEN a pinned plan with baseline and provenance references
- WHEN copied or decoded
- THEN ordered data and replay identity remain unchanged

## Compatibility Evolution

Minor-compatible evolution MAY be accepted only through declared behavior. Schema descriptions MAY embed a description or reference a versioned document; hashing MAY reside here or downstream, provided canonicalization and browser-neutral identities remain stable.

## Delivery Routing

### Requirement: Consolidated delivery sequence

The parent `app-builder-protocol-contracts` roadmap MUST remain non-applicable and MUST NOT be applied. Published grandchildren PR #94 (identities/envelopes), PR #96 (JSON canonicalization), and PR #98 (diagnostics/outcomes) are historical and MUST remain unchanged. The only remaining applicable changes SHALL be delivered in this order:

| Order | Applicable change                           | Required internal completion order                                        |
| ----- | ------------------------------------------- | ------------------------------------------------------------------------- |
| 1     | `app-builder-contract-declarations`         | requirement descriptors, then tool declarations and serialized projection |
| 2     | `app-builder-contract-replay-certification` | passive records and replay, then exports and compatibility certification  |

`app-builder-contract-replay-certification` MUST NOT begin completion before `app-builder-contract-declarations` is published.

#### Scenario: Declarations delivery completes

- GIVEN PRs #94, #96, and #98 remain published and unchanged
- WHEN `app-builder-contract-declarations` completes requirement descriptors before tool declarations and serialized projection, and is published
- THEN the declarations delivery is complete and replay certification becomes eligible to complete

#### Scenario: Replay certification completes

- GIVEN `app-builder-contract-declarations` has been published
- WHEN `app-builder-contract-replay-certification` completes passive records and replay before exports and compatibility certification, and is published
- THEN all four formerly unpublished grandchildren are delivered through the two applicable changes

### Requirement: Consolidated admission, rollback, and tracker closure

Each consolidated remaining PR MUST contain no more than 3,000 changed lines. A 2,000–3,000 changed-line PR SHALL require the maintainer-approved exception; a PR exceeding 3,000 changed lines MUST stop for `ask-on-risk` and a new maintainer decision before publication. Rollback MUST revert each consolidated PR as one coupled unit: descriptors with declarations/projection, or passive records/replay with exports/certification. The maintainer accepts this coupled rollback trade-off. Tracker merging MUST wait until both consolidated PRs are published and MUST NOT convert the parent roadmap into an applicable change.

#### Scenario: PR is admitted at the approved ceiling

- GIVEN a consolidated remaining PR has the required maintainer exception when it exceeds 2,000 changed lines
- WHEN its changed-line total is at or below 3,000
- THEN it MAY be published without another delivery-size decision

#### Scenario: PR exceeds the admission ceiling

- GIVEN a consolidated remaining PR exceeds 3,000 changed lines
- WHEN publication is proposed
- THEN publication MUST wait for `ask-on-risk` and a new maintainer decision

#### Scenario: Coupled rollback is accepted

- GIVEN a published consolidated PR must be reverted
- WHEN rollback is approved
- THEN its paired delivery contents MUST be reverted together without splitting the consolidated unit

#### Scenario: Tracker merge remains gated

- GIVEN fewer than both consolidated PRs are published
- WHEN a tracker merge is proposed
- THEN the tracker MUST NOT merge and the parent roadmap MUST remain non-applicable

## Parent Traceability

Refines PE1 `Typed tool protocol` and PE2 `Immutable plans and deterministic replay`; PE3–4 execution, approval, locks, recovery, and operations remain excluded.
