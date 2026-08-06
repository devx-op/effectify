# Proposal: App Builder Contract Identities and Envelope Foundation

## Intent

Establish the first dependency-free `@effectify/app-builder-contracts` slice: browser-neutral Effect Schema identities and reusable envelope identity context for later contracts, without runtime behavior.

## Scope

### In Scope

- Safe non-negative `{ major, minor, patch }` versions, ordering, and identity-level major compatibility checks.
- Constrained branded IDs for protocol, run, tool, plan, callback, continuation, trace, schema, and digest, plus domain-specific `{ id, version }` references.
- Typed malformed-identity, malformed-version, and incompatible-major failures.
- Common envelope identity shell: `{ protocolVersion, runRef, traceRef?, planDigestRef?, outputDigestRef? }`.
- Minimal neutral package scaffold and focused tests.

### Out of Scope

- Diagnostics and `Success | Failure | InputRequired` payload/outcome schemas; sibling `app-builder-contract-diagnostics-outcomes` owns them and the complete envelope composition.
- JSON modeling, canonicalization, digest algorithms/bytes, tools, requirements, passive records/replay, exports, compatibility tables, browser certification, and docs.
- CLI, execution, services, Layers, transport, persistence, filesystem access, Nx mutation, or source inspection/mutation.

## Capabilities

### New Capabilities

- `app-builder-contract-identities-envelopes`: Version, nominal identity/reference, typed identity failure, and envelope-shell contracts.

### Modified Capabilities

None; no canonical OpenSpec capabilities currently exist.

## Approach

Add acyclic Effect Schema modules: `Version` and `Identity` → `Reference` and `IdentityFailure` → `Envelope`. Use ID syntax `^[a-z0-9][a-z0-9._:/-]{0,127}$`, safe integer components, domain-specific brands, and absent optional keys. Compatibility remains identity-level checking with caller-supplied support data; no package-wide policy is declared.

## Affected Areas

| Area                                                                                          | Impact | Description                                                    |
| --------------------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------- |
| `packages/app-builder/contracts/src/{Version,Identity,Reference,IdentityFailure,Envelope}.ts` | New    | Leaf schemas and envelope identity fields.                     |
| `packages/app-builder/contracts/tests/`                                                       | New    | Round-trip, boundary, brand, Result-failure, and shell proofs. |
| `packages/app-builder/contracts/{project.json,package.json,tsconfig*.json,vitest.config.ts}`  | New    | Minimal browser-neutral Nx package scaffold.                   |

## Traceability and Review Forecast

- Parent trace: PE1 typed protocol identity foundation.
- Forecast: likely 300–380 authored changed lines; `ask-on-risk` requires a delivery decision if tasks forecast 400 or more.

## Risks

| Risk                                                    | Likelihood | Mitigation                                                              |
| ------------------------------------------------------- | ---------- | ----------------------------------------------------------------------- |
| Envelope scope leaks into sibling outcomes              | Medium     | Export identity fields only; prohibit payload/tag dependencies.         |
| Helpers erase nominal brands or overreach compatibility | Medium     | Domain-specific schemas, type proofs, and caller-supplied support data. |

## Rollback Plan

Before sibling adoption, revert the scaffold and five modules. After adoption, revert consumers first in reverse dependency order. No state requires migration.

## Dependencies

- No preceding grandchild; Effect v4 Schema peer and existing Nx/package conventions only.

## Success Criteria

- [ ] All nine IDs and references validate and round-trip without cross-brand interchange.
- [ ] Invalid identities/versions and unsupported majors fail explicitly without throwing or echoing hostile input.
- [ ] The envelope shell contains only approved identity fields and remains browser-neutral.
