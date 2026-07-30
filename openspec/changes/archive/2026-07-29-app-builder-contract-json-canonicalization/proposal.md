# Proposal: App Builder Contract JSON Canonicalization

## Intent

Provide one hostile-input-safe, versioned boundary returning immutable accepted JSON and deterministic canonical text together, preventing downstream dependence on throwing inspection or unstable serialization.

## Proposal Question Round

Supplied human-approved decisions resolve proposal questions. Specification/design must fix the versioned maximum depth from stack/cost evidence.

## Scope

### In Scope

- Guarded normalization of safe normal, null-prototype, and cross-realm plain records plus JSON scalars and dense arrays.
- Stable typed failures for inspection defects, unsupported shapes, cycles, and depth overflow, without hostile data or causes.
- Deeply copied/frozen JSON material paired with `effectify-cjson/1` canonical text.
- Direct RFC 3629 UTF-8 encoding with no leading BOM and fresh bytes.
- Strict-TDD fixtures for acceptance, hostility, canonicalization, depth, and bytes.

### Out of Scope

- Hashing, digests, replay, diagnostics/outcomes, requirement descriptors, tool contracts, exports, and certification.
- Applying the non-applicable platform or protocol-contract roadmaps.

## Capabilities

### New Capabilities

- `app-builder-contract-json-canonicalization`: Safe JSON normalization, immutable `/1` canonicalization, finite failures, depth protection, and UTF-8/no-BOM output.

### Modified Capabilities

- None.

## Approach

Use guarded own-key, prototype, and descriptor inspection as the acceptance authority; never inspect hostile input through `Schema.Json` or ordinary JSON APIs first. Clone accepted values, freeze copied containers, serialize with raw UTF-16 key ordering and ECMAScript scalar rules, and return material/text together. Establish behavior through RED-GREEN-REFACTOR seams.

## Affected Areas

| Area                                                                       | Impact   | Description                                       |
| -------------------------------------------------------------------------- | -------- | ------------------------------------------------- |
| `packages/app-builder/contracts/src/{json,json-failure,canonical-json}.ts` | New      | Normalization, failures, `/1` text, UTF-8         |
| `packages/app-builder/contracts/tests/`                                    | Modified | Contract, hostile-input, depth, and byte fixtures |
| `packages/app-builder/contracts/tests/internal-imports.test.ts`            | Modified | Private leaf inventory                            |

## Risks

| Risk                                         | Likelihood | Mitigation                                            |
| -------------------------------------------- | ---------- | ----------------------------------------------------- |
| Inspection executes or retains hostile input | Medium     | Guard traps/descriptors; non-echoing failures         |
| `/1` output drifts                           | Medium     | Immutable identity and exact text/byte fixtures       |
| Deep input exhausts stack                    | Medium     | Evidence-based explicit depth bound and typed failure |
| Scope or chain leakage                       | Low        | Keep PR #2 isolated; require issue #95 approval       |

## Rollback Plan

Revert only this child work unit, removing its private leaves and tests while retaining PR #94 identities/envelopes and trackers #92–93.

## Dependencies

- Canonical spec `app-builder-contract-identities-envelopes`.
- Exact base PR #94 commit `55d5bfdd62a4c8efcb7471243213e9513a011e7a`.
- Maintainer approval of issue #95 before PR creation.

## Success Criteria

- [ ] Safe records normalize to alias-isolated, deeply frozen material and matching `/1` text.
- [ ] Hostile/invalid/deep inputs return finite non-echoing typed failures without throwing.
- [ ] Canonical fixtures and RFC 3629 UTF-8/no-BOM bytes are deterministic.
- [ ] The eventual isolated child passes package test, typecheck, lint, and build targets.
