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

## Parent Traceability

Refines PE1 `Typed tool protocol` and PE2 `Immutable plans and deterministic replay`; PE3–4 execution, approval, locks, recovery, and operations remain excluded.
