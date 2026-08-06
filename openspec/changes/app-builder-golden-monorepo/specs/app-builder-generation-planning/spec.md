# Delta for App Builder Generation Planning

## ADDED Requirements

### Requirement: Atomic Composable Generation Blocks

Every generation block MUST be atomic, idempotent, independently plannable, composable, and independently replayable. The Todo preset SHALL orchestrate the same blocks available after initial generation, including domain model, use case, port, integration/adapter, event capability, and presentation additions.

#### Scenario: Extend a generated workspace

- GIVEN a generated Todo workspace and a selected declared port capability
- WHEN the addition is planned and applied
- THEN only its owned contributions MAY change

#### Scenario: Replan an existing block

- GIVEN an unchanged relevant workspace state and an already-applied block
- WHEN the same block is planned again
- THEN the canonical result MUST be idempotent

### Requirement: Canonical Ownership and Conflict-Free Planning

Each contribution MUST declare canonical provenance and explicit file or structured-region ownership. The system MUST produce a canonical, dependency-closed, deterministically ordered plan before mutation, reject conflicting ownership or contributions before any write, and preserve unrelated user-authored code.

#### Scenario: Reject a write conflict without mutation

- GIVEN selected blocks claim incompatible ownership of a target
- WHEN the plan is produced
- THEN it MUST fail with conflict evidence and make zero writes

#### Scenario: Preserve unrelated user code

- GIVEN a user-authored unowned file or region
- WHEN a compatible addition is generated
- THEN that code MUST remain unchanged

### Requirement: Planning Boundary Independence

Planning contracts MUST remain independent of Nx Devkit `Tree`. A one-way application adapter MAY apply an approved plan, but `Tree` MUST NOT appear in intent, catalog, block, ownership, provenance, or plan contracts.

#### Scenario: Plan without mutation adapter

- GIVEN a valid resolved intent
- WHEN planning executes without an Nx mutation adapter
- THEN it MUST produce the same canonical plan and evidence
