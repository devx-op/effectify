# Tasks: App Builder Contract Replay Certification

## Review Workload Forecast

| Field          | Value                                            |
| -------------- | ------------------------------------------------ |
| Source         | 800–900 lines                                    |
| Tests/fixtures | 950–1,100 lines                                  |
| Package/config | 100–200 lines                                    |
| Docs           | 180–220 lines                                    |
| Total          | 2,030–2,420; below approved 3,000-line exception |
| Delivery       | ask-on-risk; feature-branch-chain                |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

Recount each unit; above 3,000 stops/reforecasts. Issue-first; draft tracker merges after all children. Revert this coupled child before declarations; never apply the parent.

### Suggested Work Units

| Unit | Base / goal                          | Focused test command                                         | Runtime harness             | Rollback                     |
| ---- | ------------------------------------ | ------------------------------------------------------------ | --------------------------- | ---------------------------- |
| 1    | PR1 base=tracker: digest + passive   | `pnpm nx run @effectify/app-builder-contracts:test`          | N/A: pure decoders          | digest/passive + tests       |
| 2    | PR2 base=PR1: replay + compatibility | `pnpm nx run @effectify/app-builder-contracts:test`          | N/A: pure projection        | replay/compat + tests        |
| 3    | PR3 base=PR2: public API + docs      | `pnpm nx run @effectify/app-builder-contracts:typecheck`     | N/A: compile-time surface   | index/metadata/docs + proofs |
| 4    | PR4 base=PR3: package gates          | `pnpm nx run @effectify/app-builder-contracts:test-coverage` | N/A: package-only contracts | package gate evidence        |

Each line is one session: **R** failing assertion, **G** implementation, **F** refactor/check, **T** trace, **RB** rollback, **E** receipt/tally.

## Phase 1: Passive Foundations

- [x] 1.1 `src/digest.ts`, `reference.ts`, `identity-failure.ts`, `tests/identity-reference.test.ts` — R: four-key `DigestRef`, malformed metadata, no hashing; G: `DigestAlgorithm`/`DigestValue`/exact decoder; F: typecheck/lint; T: I/S10–11; RB: digest refs; E: U1.
- [x] 1.2 `src/passive-record.ts`, `tests/passive-record.test.ts`, `tests/hostile-input.test.ts` — R: frozen order; reject getters/proxies/excess keys; G: named variants/strict decoders; F: dedupe; T: R1/S1; RB: passive records; E: U1.

## Phase 2: Replay and Certification

- [x] 2.1 `src/replay.ts`, `replay-failure.ts`, `tests/replay.test.ts`, `tests/replay-fixture.ts` — R: reordered object keys match; semantic/array changes differ; G: exact `ReplayContract`/`projectReplayMaterial` using `effectify-replay/1`; F: fixture review; T: R2/S2–3; RB: replay; E: U2.
- [x] 2.2 `src/compatibility.ts`, `compatibility-failure.ts`, `tests/compatibility.test.ts` — R: declared order succeeds; unknown/duplicate/undeclared/schema mismatch return tagged failures; G: fixed declarations and `certifyPackageCompatibility`, no solver; F: exhaustive taxonomy; T: R3/S4–5; RB: compatibility; E: U2.

## Phase 3: Public Certification

- [x] 3.1 `src/index.ts`, `tests/public-contracts.types.ts`, `tests/public-surface.test.ts`, `tests/internal-imports.test.ts` — R: four channels compose, records gain none, private/deep imports fail; G: named allowlist/namespaces only; F: export-order check; T: R4/S6–7; RB: root surface; E: U3.
- [x] 3.2 `package.json`, `project.json`, `nx.json`, `tests/public-package.test.ts` — R: public package metadata assertions fail; G: public ESM/peer/build/coverage/release metadata; F: exact root export and private/deep import checks; T: R4/S6; RB: packaging; E: U3.
- [x] 3.3 `packages/app-builder/contracts/README.md`, `tests/public-surface.test.ts` — R: import/API, range matrix, `effectify-cjson/1`, and external digest ownership text required; G: concise guide; F: scanability pass; T: R4/S6; RB: docs; E: U3.

## Phase 4: Delivery Gates

- [x] 4.1 `project.json`, `vitest.config.mts`, `openspec/changes/app-builder-contract-replay-certification/tasks.md` — R: 95% line/statement/function and 90% branch thresholds plus 11-scenario matrix fail until complete; G: `test-coverage`; F: run package test/typecheck/lint/build and record issue-first chain, receipts, line count, coupled rollback/tracker gate; T: R5/S8–9; RB: certification evidence; E: U4.
