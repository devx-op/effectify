# Hatchet Declarative Task API Specification

## Purpose

Define the Effect-friendly contract for declarative Hatchet tasks without exposing SDK declaration types.

## Requirements

### Requirement: Compatibility-safe ordinary tasks

The package MUST preserve supported ordinary task behavior. Non-durable declarations MUST register and dispatch exactly once through the ordinary path.

#### Scenario: Existing ordinary declaration

- GIVEN a consumer using the supported ordinary task API
- WHEN the task is registered and invoked
- THEN its handler and observable result MUST remain compatible

#### Scenario: Unsupported mixed declaration

- GIVEN metadata that combines mutually exclusive ordinary and durable behavior
- WHEN declaration validation runs
- THEN registration MUST fail before SDK or registry mutation

### Requirement: Durable declarations and live dispatch

Durable declarations MUST create registry entries by stable identity. Live execution MUST resolve and dispatch their handlers.

#### Scenario: Durable dispatch

- GIVEN one valid durable declaration registered in a live runtime
- WHEN a matching Hatchet invocation arrives
- THEN the registry MUST resolve and execute that declaration's handler

#### Scenario: Unknown durable identity

- GIVEN an invocation with no matching registry entry
- WHEN live dispatch resolves it
- THEN dispatch MUST fail without executing another handler

### Requirement: Package-owned RateLimit and Trigger values

The public API MUST expose immutable package-owned `RateLimit` and `Trigger` values. Translation MUST preserve exact SDK field names, units, discriminants, and omission behavior; SDK representations MUST remain internal.

#### Scenario: Exact translation

- GIVEN valid rate-limit and trigger values
- WHEN translated for SDK registration
- THEN the produced SDK declaration MUST exactly match the corresponding SDK contract

### Requirement: Fail-closed declaration validation

Declarations MUST be validated before side effects. Unknown variants, malformed values, duplicate identities, and unsupported combinations MUST be rejected without coercion or omission.

#### Scenario: Invalid declaration

- GIVEN malformed or unsupported declaration metadata
- WHEN registration is requested
- THEN no registry entry or SDK registration MUST be created

### Requirement: Typed declaration failures

Expected declaration, translation, registry, and dispatch failures MUST use exported, discriminated Effect-friendly errors with actionable context.

#### Scenario: Typed validation failure

- GIVEN an invalid declaration
- WHEN registration is evaluated as an Effect
- THEN it MUST fail with the documented declaration error variant and context

### Requirement: Public package contract

Supported task, durable, `RateLimit`, `Trigger`, and error APIs MUST be root-exported and documented with examples and validation rules. Internal helpers MUST NOT be exported.

#### Scenario: Consumer import

- GIVEN a package consumer using only root exports and published documentation
- WHEN ordinary and durable declarations are type-checked
- THEN no internal import path MUST be required

### Requirement: Focused verification

Verification MUST include compile-time API assertions, validation and translation units, and ordinary/durable runtime dispatch with typed failures.

#### Scenario: Verification suite

- GIVEN the completed package-only change
- WHEN focused type, unit, and runtime checks run
- THEN compatibility, translation, dispatch, and failure semantics MUST pass

### Requirement: Recovery and review gates

Delivery MUST contain only the two ordered recovery commits plus package completion, exclude backup and React Router drift, and use the approved single-PR 5,000-line exception. Normalizers MUST precede exactly one new review. Only native `next_action` MAY direct work; its receipt MUST pass pre-commit, pre-push, and pre-PR gates. Historical lineages MUST remain immutable and MUST NOT authorize delivery.

#### Scenario: Gate acceptance

- GIVEN normalized package-only changes and one new review
- WHEN each receipt gate evaluates the review
- THEN delivery MUST proceed only with valid native action and receipt evidence

#### Scenario: Contaminated or historical evidence

- GIVEN backup, React Router, or historical-review evidence as approval
- WHEN a delivery gate evaluates it
- THEN the gate MUST reject delivery without mutating historical lineages
