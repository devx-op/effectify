# Tasks: App Builder Contract Identities and Envelope Foundation

## Review Workload Forecast

| Field                   | Value                            |
| ----------------------- | -------------------------------- |
| Estimated changed lines | 380 (375–390)                    |
| Receipt allowance       | 10 lines; bounded PASS summaries |
| 400-line budget risk    | Medium                           |
| Chained PRs recommended | No                               |
| Suggested split         | Single PR; monitor diff          |
| Delivery strategy       | ask-on-risk                      |
| Chain strategy          | pending                          |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: pending
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal                           | Likely PR | Focused test command                            | Runtime harness                   | Rollback boundary                                                                                                                           |
| ---- | ------------------------------ | --------- | ----------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Private identity leaf + proofs | PR 1      | `pnpm nx test @effectify/app-builder-contracts` | N/A: pure browser-neutral schemas | Remove `packages/app-builder/contracts/` and `openspec/changes/app-builder-contract-identities-envelopes/verification-receipts.md` together |

## Phase 1: Private Scaffold and Target Gate

- [x] 1.1 Create `packages/app-builder/contracts/{package.json,project.json,tsconfig.json,tsconfig.lib.json,tsconfig.spec.json,vitest.config.mts}`: private ESM, Effect/Vitest deps, ES2022/no production Node types; build `src/envelope.ts` with `@nx/js:tsc`; no `exports`, barrel, publish metadata, or certification ownership.
- [x] 1.2 Gate the new project with `pnpm nx show project @effectify/app-builder-contracts --json`; require `test,typecheck,lint,build`, then record bounded receipts in `openspec/changes/app-builder-contract-identities-envelopes/verification-receipts.md` as `command | exit=<n> | proof=<summary> | PASS` only.

## Phase 2: Version and Failure RED → GREEN → REFACTOR

- [x] 2.1 **RED**: Add `tests/version.test.ts` for safe non-negative integer `{major,minor,patch}`, ordering, caller support, and hostile negative/fractional/unsafe/unsupported/proxy/throwing-getter version inputs returning deterministic typed non-echoing malformed-version/incompatible-major failures.
- [x] 2.2 **GREEN**: Create `src/identity-failure.ts` with only `MalformedVersion|IncompatibleVersion` and `src/version.ts` guarded `Result` decoders, `compareVersions`, and `checkCompatibility`; no default compatibility table.
- [x] 2.3 **REFACTOR**: Keep guarded inspection and constraints before brands; retain no hostile input/cause and no runtime service dependency.

## Phase 3: Nominal References RED → GREEN → REFACTOR

- [x] 3.1 **RED**: Add `tests/identity-reference.test.ts` and `tests/hostile-input.test.ts` for malformed IDs, proxy/getter defects, deterministic typed non-throwing/non-echoing identity failures, round trips, and in-test cross-assignment `@ts-expect-error` proofs.
- [x] 3.2 **GREEN**: Add `MalformedIdentity` to `src/identity-failure.ts`; create `src/identity.ts` and `src/reference.ts` for Protocol, Run, Tool, Plan, Callback, Continuation, Trace, Schema, and Digest IDs/`{id,version}` refs; stage identity versus version failures.
- [x] 3.3 **REFACTOR**: Preserve domain brands and exact reference shape; reject strings, coercion, generic `kind`, widening, and public root imports.

## Phase 4: Envelope and Neutrality RED → GREEN → REFACTOR

- [x] 4.1 **RED**: Add `tests/envelope.test.ts` and `tests/internal-imports.test.ts` proving shell composition with future `outcome`, no `status`, absent optional `traceRef|planDigestRef|outputDigestRef`, direct leaf imports, and forbidden Node/DOM/runtime/sibling imports.
- [x] 4.2 **GREEN**: Create `src/envelope.ts` with only `protocolVersion`, `runRef`, and optional branded refs via `optionalKey`; leave outcomes/diagnostics, canonicalization, tools, passive records, runtime scope, hashing, and certification to siblings.
- [x] 4.3 **REFACTOR**: Keep `IdentityFailure ← Version/Identity ← Reference ← Envelope` acyclic; retain no `src/index.ts`, export map, or final public API.

## Phase 5: Verification and Traceability

- [x] 5.1 Run `pnpm nx test @effectify/app-builder-contracts`, `pnpm nx typecheck @effectify/app-builder-contracts`, `pnpm nx lint @effectify/app-builder-contracts`, and `pnpm nx build @effectify/app-builder-contracts`; append only `command | exit=<n> | proof=<summary> | PASS` receipts.
- [x] 5.2 Trace PE1: R1/S1–2→2._, R2/S3–4→3._, R3/S5→2._,3._, R4/S6–7→4._, R5/S8→1._,4.*; rollback modules, tests, config, and receipts as Unit 1.

## Corrective Feedback Passes

- [x] C2 Preserve the eager, synchronous `Result` boundary with canonical v4 `Result.try`/`gen`/`all`/`filterOrFail` composition; replace mechanical `it.effect(Effect.sync(...))` tests with ordinary synchronous `it`; retain hostile-input and nominal guarantees; record canonical citations and verification evidence.
