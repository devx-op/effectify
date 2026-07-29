# Workspace Generation and Lifecycle Specification

## Purpose

Define user-owned Nx workspace creation, incremental evolution, provenance, and safe migration behavior.

## Requirements

### Requirement: User-owned generation

Greenfield generation MUST create user-owned Nx/Effect source with no Effectify runtime dependency. It MUST validate an approved virtual-tree plan and commit source, intent, provenance, migrations, tests, and documentation as one controlled local operation where possible.

#### Scenario: Create a new workspace

- GIVEN a compatible approved preset or blueprint
- WHEN `effectify new` materializes the plan
- THEN it MUST show the exact diff before writes and return validation, digest, and recovery results

#### Scenario: Block an unapproved overwrite

- GIVEN the generated change would overwrite user-edited source
- WHEN approval has not covered the exact diff
- THEN the operation MUST NOT write files

### Requirement: Existing-workspace adoption

`effectify init` MUST inspect workspace tooling and integrations, preserve them unless change is approved, record adopted versus unmanaged artifacts, and never claim unrelated files.

#### Scenario: Initialize an existing Nx workspace

- GIVEN an existing workspace with a non-default test runner
- WHEN initialization is planned
- THEN its tooling is preserved and only approved normalization changes are proposed

#### Scenario: Identify unresolved adoption conflict

- GIVEN inspected code conflicts with selected plugin intent
- WHEN reconciliation runs
- THEN the system MUST report the conflict and await a compatible decision without mutation

### Requirement: Bounded-context incremental generation

Generators MUST be directly callable and plan/dry-run/diff capable. A complete slice SHALL create behavior, invariant, workflow, selected adapter/presentation, tests, and provenance; empty scaffolding is prohibited. Contexts MAY cross boundaries only through contracts. `shared/kernel` MUST contain only stable universal domain concepts; technical reuse belongs in `platform/*`; no generic layered shared slice may be generated.

#### Scenario: Generate a functional slice

- GIVEN a selected bounded context and compatible adapter
- WHEN a slice is approved
- THEN the generated vertical behavior MUST compile and include executable tests

#### Scenario: Reject a private cross-context dependency

- GIVEN a requested import targets another context's private project
- WHEN the generator validates Nx boundaries
- THEN it MUST fail with the violated boundary and no partial generation

### Requirement: Intent, provenance, and migration ledger

`effectify.json` MUST record intent without secrets or volatile state. Precedence MUST be invocation flags, environment, project manifest, user-global configuration, then defaults. Shared ledgers MUST record ownership, fingerprints, divergence, and migration state; local run state SHALL remain ignored. Versioned migrations MUST declare ranges, dependencies, idempotency, provenance, and recovery.

#### Scenario: Resolve analytics configuration

- GIVEN conflicting configuration sources for analytics
- WHEN project intent is resolved
- THEN the documented precedence MUST select the effective project-level opt-out

#### Scenario: Preserve a skipped migration

- GIVEN a user skips a code migration
- WHEN a later migration depends on it
- THEN the ledger MUST preserve the skip and block the dependent migration with an explanation

### Requirement: Testing defaults

New workspaces MUST default to Effect-aware Vitest; existing workspaces retain runner unless approved.

#### Scenario: Preserve an adopted test runner

- GIVEN initialization detects a non-Vitest runner
- WHEN no runner change is approved
- THEN verification MUST retain that runner

### Requirement: Safe updates and divergence recovery

Updates MUST separately plan manifest and code migrations, detect divergence, and require review of impact and exact diff. They SHALL checkpoint or use a virtual tree, verify hashes under lock, validate, and retain recovery evidence. They MUST NOT replace divergence, substitute compatibility, or repeat a persisted skip prompt.

#### Scenario: Update a divergent generated file

- GIVEN an update changes an artifact whose fingerprint diverges
- WHEN the update is planned
- THEN it MUST surface the divergence and require explicit resolution before structural change

#### Scenario: Re-run an idempotent migration

- GIVEN a migration is already recorded as applied
- WHEN update evaluates it again
- THEN it MUST not reapply the migration and MUST retain its recorded provenance
