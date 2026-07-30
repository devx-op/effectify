# Proposal: App Builder Contract Declarations

## Intent and Problem

Complete the private declaration vocabulary required by replay certification. The package lacks explicit requirement descriptors and a typed serializable declaration contract, preventing deterministic metadata exchange without runtime coupling.

## Scope

### In Scope

- Add JSON-only capability, constraint, and permission descriptors that preserve declared order.
- Add passive `Declaration<I, O, E, R>` values and encoded-side projections with explicit versioned schema documents.
- Add pure `Result` validation/projection with distinct duplicate and incompatible/mismatch errors, delivered under strict TDD in the order requirements → declarations → projection.

### Non-Goals

- Handlers, execution, permission evaluation, grants, services, Layers, registries, replay records, or compatibility solving.
- Public exports, publication, or certification; `app-builder-contract-replay-certification` owns them.
- Applying the non-applicable `app-builder-protocol-contracts` roadmap or modifying published PRs #94, #96, or #98.

## Business and Product Rules

- Permission requirements are declarative JSON metadata only.
- Schema documentation is an explicit versioned JSON document; codecs and annotations are never introspected.
- Compatibility uses declared identity, version, and metadata—not structural codec equivalence.
- `R` is phantom and invariant, and never appears in encoded or runtime data.
- Declarations remain private until final certification.

## Capabilities

### New Capabilities

- `app-builder-contract-declarations`: Private requirement descriptors, typed passive declarations, and deterministic encoded-side projection.

### Modified Capabilities

None.

## Approach and Impact

Implement leaf modules under `packages/app-builder/contracts/src/{requirement,tool}*.ts` with behavior and type-proof suites under `packages/app-builder/contracts/tests/`. Reuse identity, version, reference, and hostile-JSON seams unchanged. No runtime, public API, or migration is introduced.

## Dependency and Delivery Boundaries

- Dependency chain: published PRs #94 → #96 → #98 → this change → replay certification.
- Delivery uses the approved feature-branch chain and `ask-on-risk` policy.
- Recount after each work unit. **Stop above 3,000 changed lines** and obtain a new maintainer decision before proceeding.

## Risks

| Risk                                | Mitigation                                                       |
| ----------------------------------- | ---------------------------------------------------------------- |
| False compatibility confidence      | Compare only explicit declared metadata and encoding results.    |
| Runtime or permission scope creep   | Keep APIs passive, pure, service-free, and private.              |
| Order or phantom-channel regression | Add deterministic order tests and invariant compile-time proofs. |

## Rollback

Revert descriptors and declarations/projection as one unit. If replay certification depends on it, revert certification first. Published PRs remain untouched; no migration is required.

## Acceptance Direction

- [ ] JSON-only immutable metadata preserves declared array order and rejects unsupported values.
- [ ] Typed channels preserve I/O/E and invariant phantom `R`; encoded output contains no codecs, handlers, services, or `R`.
- [ ] Duplicate and incompatible/mismatched declarations fail through distinct typed errors.
- [ ] Focused and package-level Nx test, typecheck, lint, and build evidence passes within 3,000 lines.
