# Delta for App Builder Deterministic Replay

## ADDED Requirements

### Requirement: Canonical Semantic Replay Evidence

Replay evidence MUST bind validated intent, catalog, selected blocks, canonical plan, and output identities. Dependency evidence MUST use a canonical semantic projection rather than byte-identical lock metadata. Package manager, Nx, Effect, and plugin versions MUST be pinned, and replay installs MUST be frozen.

#### Scenario: Validate equivalent semantic dependencies

- GIVEN replay inputs with equivalent canonical dependency projections
- WHEN lock metadata differs only in non-semantic registry details
- THEN replay MUST accept the dependency identity

#### Scenario: Reject identity mismatch

- GIVEN a replay request with mismatched intent, catalog, block, plan, or output identity
- WHEN validation runs
- THEN it MUST fail before generation

### Requirement: Zero-Diff Deterministic Replay

For unchanged relevant state, replaying the same valid input MUST produce equal canonical plan and evidence identities and zero generated-tree diff. It MUST preserve unrelated user-authored content and report any failed comparison as typed evidence.

#### Scenario: Replay unchanged generation

- GIVEN an unchanged generated workspace and recorded valid replay evidence
- WHEN replay executes with frozen installs
- THEN identities MUST match and generated-tree diff MUST be zero

#### Scenario: Detect changed owned output

- GIVEN an owned generated output differs from recorded evidence
- WHEN replay validates the workspace
- THEN it MUST report a typed mismatch and MUST NOT overwrite it
