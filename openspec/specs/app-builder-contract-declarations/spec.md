# App Builder Contract Declarations Specification

## Purpose

Private declarations before replay certification; no runtime behavior or public API.

## Requirements

### Requirement: JSON-only requirement descriptors

Capability, constraint, and declarative permission descriptors MUST contain only immutable JSON metadata. Collections MUST preserve declared array order and MUST NOT sort, deduplicate, grant, evaluate, or execute permissions. Unsupported JSON and malformed metadata MUST return distinct typed failures.

#### Scenario: Preserve declared requirements

- GIVEN valid ordered JSON descriptors
- WHEN a declaration is encoded
- THEN their declared order is retained

#### Scenario: Reject descriptor metadata

- GIVEN unsupported JSON or malformed metadata
- WHEN validation runs
- THEN it returns malformed-metadata without execution

### Requirement: Explicit schema identity documents

Each I, O, and E contract MUST declare an explicit versioned JSON schema identity and document. The system MUST NOT inspect codecs, annotations, or structural codec equivalence to construct, compare, or validate metadata.

#### Scenario: Declare versioned schemas

- GIVEN explicit I/O/E identities, versions, and documents
- WHEN metadata is created
- THEN those documents are retained

#### Scenario: Reject incomplete schema metadata

- GIVEN missing, malformed, or conflicting schema metadata
- WHEN metadata is validated
- THEN a typed malformed-metadata failure is returned

### Requirement: Passive four-channel declaration

The system MUST model `Declaration<I, O, E, R>` with typed I/O/E and invariant phantom R channels. `R` MUST be encoded-absent and MUST NOT appear in runtime values, descriptors, or schema metadata. Declarations MUST remain passive immutable data without handlers.

#### Scenario: Preserve typed channels

- GIVEN `Declaration<I, O, E, R>`
- WHEN it is represented or projected
- THEN I/O/E remain typed and R remains type-only

#### Scenario: Enforce invariant encoded-absence

- GIVEN declarations with distinct R channels
- WHEN cross-assignment is type-checked and values are encoded
- THEN assignment fails and output contains no R data

### Requirement: Deterministic encoded projection and compatibility

Encoded-side projection MUST retain all four type channels while emitting only declared JSON metadata for I/O/E. Validation and projection MUST be pure `Result` operations. Duplicate identity, incompatible version, metadata mismatch, malformed metadata, and projection failure MUST remain distinct typed failures. Compatibility MUST use only declared identity, version, and metadata.

#### Scenario: Project compatible declarations

- GIVEN matching declared identity, version, and metadata
- WHEN declarations are projected
- THEN ordered output contains no codecs or R data

#### Scenario: Distinguish invalid outcomes

- GIVEN duplicate identity, incompatible version, mismatch, malformed metadata, or projection failure
- WHEN validation or projection runs
- THEN its distinct typed failure category is returned

### Requirement: Private passive boundary and delivery gates

This capability MUST NOT add handlers, execution, authorization evaluation, services, Layers, registries, replay records, compatibility solving, or package-root exports. Delivery MUST use strict TDD in requirements → declarations → projection order, after PRs #94, #96, and #98, on the approved feature-branch chain with `ask-on-risk`. Each work unit MUST recount lines; above 3,000, work MUST stop and reforecast for a maintainer decision. Rollback MUST revert descriptors and declarations/projection together, reverting dependent replay certification first.

#### Scenario: Enforce delivery boundary

- GIVEN a completed work unit
- WHEN it is assessed
- THEN tests precede code and no excluded scope is introduced

#### Scenario: Stop at delivery risk

- GIVEN more than 3,000 changed lines or required rollback
- WHEN delivery is assessed
- THEN it stops for a decision or reverts the coupled unit

## Parent Traceability

| Parent requirement                       | Refinement                                                           |
| ---------------------------------------- | -------------------------------------------------------------------- |
| Dual tool contract                       | Typed declaration and encoded metadata projection                    |
| Explicit requirement descriptors         | Ordered JSON-only capability, constraint, and permission descriptors |
| Neutral ownership boundary               | Private passive, service-free boundary                               |
| Consolidated delivery sequence/admission | Dependency chain, strict TDD, 3,000-line gate, and coupled rollback  |

PE3–4 execution, authorization, approval, locks, recovery, and operations remain excluded. Replay certification owns public exports and final compatibility certification.
