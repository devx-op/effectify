# App Builder Contract Replay Certification Specification

## Purpose

Passive replay contracts.

## Requirements

### Requirement: Closed immutable replay variants

The system MUST expose closed immutable variants for ordered plans/steps, pinned inputs, callbacks/continuations, provenance/baselines/validations, and replay expectations. Arrays retain declared order; variants MUST NOT execute, transition, persist, authorize, resume, or inspect.

#### Scenario: Preserve passive records

- GIVEN valid records
- WHEN decoded or copied
- THEN values remain frozen and ordered

### Requirement: Complete canonical replay material

The system MUST project versioned canonical material with every semantic field, ordered collection, and digest claim. Object-key normalization SHALL use `effectify-cjson/1`; identity-significant arrays MUST NOT reorder.

#### Scenario: Match equivalent material

- GIVEN equivalent records with reordered object keys
- WHEN projected
- THEN material and identity match

#### Scenario: Detect replay mismatch

- GIVEN a changed semantic field or array order
- WHEN projected
- THEN material and identity differ

### Requirement: Declared compatibility aggregation

The system MUST accept only declared module/protocol ranges and aggregate deterministically. It MUST reject unknown modules, duplicates, undeclared versions, schema mismatches, and incompatible inputs with typed failures. It MUST NOT infer same-major acceptance or solve ranges.

#### Scenario: Aggregate declared compatibility

- GIVEN non-conflicting declared ranges
- WHEN certified
- THEN one deterministic compatible result is returned

#### Scenario: Reject an undeclared mismatch

- GIVEN an undeclared version, duplicate, or schema mismatch
- WHEN certified
- THEN the applicable typed failure is returned

### Requirement: Certified public surface and evidence

The system MUST certify deterministic fixtures from identity through declaration, passive records, replay material, and envelopes. Public generics MUST prove Type, Encoded, Error, and Requirements where present; records MUST NOT gain channels. The root MUST expose only an exact named allowlist and namespaces and firewall helpers from private/deep imports. README/API MUST document imports, compatibility matrix, canonicalization, and external digest ownership.

#### Scenario: Prove contract and package consumption

- GIVEN a valid fixture and package root
- WHEN type proofs and package-root tests execute
- THEN channels and allowlisted APIs work deterministically

#### Scenario: Reject certification leakage

- GIVEN malformed data or a private export
- WHEN certification or export inspection runs
- THEN failure occurs or the export is unreachable

### Requirement: Delivery and publication gates

Delivery MUST use strict RED-GREEN-REFACTOR: passive/replay before exports/certification, after #94/#96/#98/#100. Each seam MUST retain requirement/scenario traceability and recount lines; above 3,000 it MUST stop and reforecast through `ask-on-risk`. Rollback MUST revert replay, exports, and certification together; tracker publication MUST wait for this child and MUST NOT apply the parent roadmap.

#### Scenario: Stop at the ceiling

- GIVEN a seam exceeds 3,000 lines
- WHEN delivery is assessed
- THEN work stops pending decision and reforecast

#### Scenario: Roll back or publish the child

- GIVEN rollback or tracker publication
- WHEN gates are evaluated
- THEN the child reverts together or publication remains blocked
