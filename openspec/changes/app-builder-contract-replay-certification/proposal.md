# Proposal: App Builder Contract Replay Certification

## Intent and Problem

Publish the final browser-neutral `@effectify/app-builder-contracts` surface. The package lacks passive replay identity, explicit compatibility certification, a safe root API, and consumer guidance, so downstream consumers cannot exchange or compare complete replay contracts confidently.

## Scope

### In Scope

1. Closed, immutable passive variants for ordered plan/step identities, pinned input, provenance, baselines, validations, callbacks, continuations, replay expectations, and canonical replay material.
2. Explicit module/protocol version-range declarations, typed compatibility rejection, and package-level certification aggregation.
3. Allowlisted named and module-namespace exports, deterministic cross-module package fixtures, four-channel type proofs, and package README/API guidance with a compatibility matrix and canonicalization/digest ownership rules.

### Out of Scope

- Execution, hashing/verification, compatibility solving, filesystem/IPC/runtime services, migration, hidden helper exports, or PE3–4 behavior.
- Rewriting published dependencies or applying the parent roadmap.

## Product Rules

- Canonical replay identity includes all replay semantics and preserves identity-significant array order; `effectify-cjson/1` owns object-key normalization.
- `DigestRef` carries explicit algorithm identity and digest value; an external authority owns computation and integrity claims.
- Compatibility accepts only declared ranges per module/protocol and aggregates those results; there is no inferred same-major acceptance.
- Generic public contracts prove Type, Encoded, Error, and Requirements channels where present; records gain no artificial channels.

## Capabilities

### New Capabilities

- `app-builder-contract-replay-certification`: Passive replay contracts, compatibility aggregation, public exports, and package certification evidence.

### Modified Capabilities

- `app-builder-contract-identities-envelopes`: `DigestRef` gains algorithm identity plus digest value while hashing remains external.

## Approach and Impact

Use strict RED-GREEN-REFACTOR seams in scope order. Add replay/digest/compatibility leaves, then publish an exact root allowlist and certify deterministic composition.

| Area                                                                                                       | Impact       | Description                      |
| ---------------------------------------------------------------------------------------------------------- | ------------ | -------------------------------- |
| `packages/app-builder/contracts/src/{passive-record,replay,digest,compatibility,index}.ts`, `reference.ts` | New/Modified | Contracts and allowlist          |
| Package/Nx/TS metadata                                                                                     | Modified     | Public ESM/types and Effect peer |
| `packages/app-builder/contracts/tests/`, README/API guide                                                  | New/Modified | Proofs, fixtures, documentation  |

## Dependencies

- Published PRs #94/#96/#98/#100 remain immutable historical inputs.
- `app-builder-protocol-contracts` is traceability-only, non-applicable, and MUST never be applied.

## Delivery, Risks, and Rollback

Continue the approved feature-branch chain after declarations. Recount each seam; above 3,000 changed lines, STOP and invoke `ask-on-risk`. Key risks are incomplete identity, permissive compatibility, and export leakage; exact package fixtures and allowlists mitigate them. Roll back this change as one coupled unit to the private declarations state; revert replay certification before declarations. No migration is required.

## Success Criteria

- [ ] Equivalent content matches; reordered identity-significant arrays differ.
- [ ] Undeclared versions and mismatches fail deterministically.
- [ ] Root exports, four-channel proofs, package tests, docs, and Nx test/typecheck/lint/build receipts pass within the ceiling.
