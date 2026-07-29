# Builder, Preview, and Blueprints Specification

## Purpose

Define web-safe planning, preview truthfulness, shareable design intent, and reproducible blueprint execution.

## Requirements

### Requirement: Planner-only builder

The builder MUST compose plugin-declared capabilities through the shared compatibility and planning contract. It SHALL create typed plans only and MUST NOT host workspace execution, browser source editing, managed hosting, or browser execution of marketplace ESM. Compatibility outcomes MUST identify supported, experimental, incompatible, unavailable, and pending-evidence combinations, including registry-provided maturity without promoting experimental plugins.

#### Scenario: Compose a supported design

- GIVEN a signed registry snapshot and compatible selected capabilities
- WHEN a user builds a configuration
- THEN the builder MUST return a typed plan and compatibility evidence without executing plugin code

#### Scenario: Surface an incompatible design

- GIVEN selected capabilities conflict
- WHEN compatibility is resolved
- THEN the builder MUST explain the conflict and MUST NOT create an executable plan

### Requirement: Dual preview truthfulness

The shared preview protocol MUST distinguish declared web-safe preview from authoritative local materialized preview. Declared files MUST be labelled `available`, `dynamic`, or `unavailable`; only local Nx virtual-tree materialization MAY provide exact generated contents. Materialization MUST compare declared and actual output and report classified drift.

#### Scenario: Inspect a declared preview

- GIVEN a builder plan contains deterministic and dynamic output
- WHEN its explorer is rendered
- THEN users MUST see availability labels rather than fabricated exact contents

#### Scenario: Detect preview drift

- GIVEN the declared preview differs from local virtual-tree output
- WHEN `effectify new` materializes the plan
- THEN it MUST report and explain the drift before approved writes

### Requirement: Editable intent URLs

Editable URLs MUST represent design intent only and MAY re-resolve under current compatibility rules. They MUST NOT claim pinned reproducibility, approval, or execution authority and MUST NOT contain secrets or private workspace material.

#### Scenario: Reopen editable intent after registry change

- GIVEN an editable URL refers to a now-incompatible combination
- WHEN it is reopened
- THEN it MUST re-evaluate compatibility and show the new state without mutation

### Requirement: Permanent signed blueprints

Immutable signed blueprints MUST bind exact registry snapshot, plugin versions and digests, permissions, topology, preview digest, and plan digest. Blueprints SHALL not expire and MUST remain inspectable. Local execution MUST validate the signature and pins, run live registry revocation checks, produce an authoritative diff, and require normal mutation approval.

#### Scenario: Reproduce a permanent blueprint

- GIVEN a valid blueprint and matching available pinned dependencies
- WHEN it is materialized against the recorded baseline
- THEN it MUST reproduce the pinned plan/output identity subject to reported baseline drift

#### Scenario: Reject invalid or revoked blueprint execution

- GIVEN a blueprint has an invalid signature, changed pins, or a revoked dependency
- WHEN execution is requested
- THEN it MUST fail before writing and retain inspectability of the historical blueprint
