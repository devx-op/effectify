# Apply Progress: App Builder Contract Declarations

## Native Completion Authority

- Runtime revision before finish: `sha256:d4d12b660af67665f17dee7b723a22c69f826038c7e5f6d07815e0928bc94d91`
- Native finish request ID: `apply-declarations-continuation-20260729-2158-finish-retry`
- Terminal runtime revision: `sha256:68b02ce1d1d170d8c862713dd3ea40d774c4359d01e82f4fcd70c3614ca1f0e4`
- Evidence revision: `sha256:f55036151b554fe4837e901e86bb2a401e169456510962ea471ad28843c5a187`
- Objective: `sha256:79de266803e949d2a1c4f8adbb8aabe7eb0cc3390ad17cf682b8471cc31cf581`, generation `1`
- Ordinal 1: `interrupted`, 737 changed lines.
- Ordinal 2: `passed`, 96 changed lines.
- Native cumulative: **833 / 3,000** changed lines; terminal and complete.

The immutable evidence document at `.git/gentle-ai/safety-snapshots/app-builder-contract-declarations/ordinal-2-before-clean-rebuild/apply-progress-evidence.md` MUST remain unchanged because its SHA-256 is the native evidence revision. Its 773-line figure is a source/test-only diff measurement; native accounting additionally charged the continuation task/evidence mutations and is authoritative at 833.

## Completion

All 11 tasks are complete and visibly marked `[x]` in `openspec/changes/app-builder-contract-declarations/tasks.md`.

The private, passive declarations boundary contains requirement descriptors, explicit schema documents, typed declarations, deterministic projection, failure variants, type proofs, and a direct-import firewall. No handler, execution, permission evaluation, service, Layer, registry, replay, certification, package-root export, commit, push, PR, Tuicr, or native review was introduced.

## TDD Cycle Evidence

No ordinal-1 RED evidence was accepted. A safety snapshot was created at `.git/gentle-ai/safety-snapshots/app-builder-contract-declarations/ordinal-2-before-clean-rebuild/partial-state.tar` (`sha256:3764043398caa57429a67225bfca823b6139582cd66cd0779c01dbe64e642ce2`) before controlled clean rebuilds. Every RED below was executed with the corresponding implementation withheld; every GREEN was executed only after restoration.

| Task | Layer             | Safety net                 | RED                                                                                                     | GREEN                                                                    | Triangulate                                                                         | REFACTOR                                                  |
| ---- | ----------------- | -------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- | --------------------------------------------------------- |
| 1.1  | Unit              | 45/45 package tests passed | `test -- tests/requirement.test.ts` exited 1, 0 tests with `requirement.ts` and failure source withheld | Same command: 2/2 passed                                                 | Ordered three kinds plus duplicate retention                                        | Consolidated hostile cases into explicit table; reran 2/2 |
| 1.2  | Unit              | 45/45 package tests passed | Controlled requirements RED above exited 1                                                              | Same command: 2/2 passed                                                 | Function/symbol, cycle, depth, getter, and proxy reasons; getter count remains zero | Explicit reason matrix; reran 2/2                         |
| 1.3  | Compile-time unit | Baseline typecheck passed  | `typecheck` exited 1 with TS2307 after `tool-declaration.ts` was withheld                               | `typecheck` passed after restoration                                     | I/O negatives, invariant R negatives, and encoded-key equality all compile-checked  | No source refactor required                               |
| 2.1  | Unit              | 45/45 package tests passed | `test -- tests/schema-document.test.ts` exited 1, 0 tests with schema-document source withheld          | Same command: 2/2 passed                                                 | Explicit frozen document plus malformed/hostile cases                               | No source refactor required                               |
| 2.2  | Unit              | 45/45 package tests passed | `test -- tests/tool-declaration.test.ts` exited 1, 0 tests with declaration source withheld             | Same command: 2/2 passed; typecheck passed                               | Frozen declaration/order/no-handler plus malformed input                            | No source refactor required                               |
| 2.3  | Unit              | 45/45 package tests passed | `test -- tests/tool-declaration.test.ts` exited 1, 0 tests with failure source withheld                 | Same command: 2/2 passed                                                 | All six tagged failure variants plus malformed/unsupported construction             | No source refactor required                               |
| 3.1  | Unit              | 45/45 package tests passed | `test -- tests/tool-declaration-projection.test.ts` exited 1, 0 tests with projection source withheld   | Same command: 3/3 passed                                                 | Ordered JSON-only projection, canonical-equivalent schema documents, and mismatches | Added canonical-key-order scenario; reran 3/3             |
| 3.2  | Compile-time unit | Baseline typecheck passed  | Controlled projection RED exited 1 when projection source was withheld                                  | `typecheck` passed after restoration                                     | I/O/R variance proofs plus duplicate/version/mismatch/projection branches           | No source refactor required                               |
| 3.3  | Unit              | 45/45 package tests passed | `test -- tests/internal-imports.test.ts` exited 1, 0 tests with projection leaf withheld                | Same command: 2/2 passed                                                 | Direct-leaf imports/dependency allowlist and root-export absence                    | No source refactor required                               |
| 4.1  | Verification      | N/A — evidence task        | Prior ordinal evidence invalidated; controlled RED receipts above were recreated                        | Final package test/typecheck/lint/build checks passed                    | Full test target validates all 17 files / 46 tests                                  | Check-only completion; no source refactor                 |
| 4.2  | Delivery policy   | N/A — evidence task        | Simulated `3001 > 3000` exited 1 with `STOP_AND_REFORECAST_REQUIRED`                                    | Actual scoped source/test `773 <= 3000` passed; native cumulative is 833 | Both reject/accept branches executed                                                | Check-only completion; no source refactor                 |

## Work Unit Evidence

| Work unit                       | Focused test command and exact result                                                                                                                    | Runtime harness                                                                                          | Rollback boundary                                                                                                  |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Requirements + phantom boundary | `pnpm nx run @effectify/app-builder-contracts:test -- tests/requirement.test.ts` — exit 0, 2 tests passed; `:typecheck` — exit 0                         | N/A — pure private data/compile-time contract; no runtime boundary exists                                | `src/declaration-failure.ts`, `src/requirement.ts`, `tests/requirement.test.ts`, `tests/tool-declaration.types.ts` |
| Documents + declaration         | `test -- tests/schema-document.test.ts` — exit 0, 2 tests; `test -- tests/tool-declaration.test.ts` — exit 0, 2 tests; `:typecheck` — exit 0             | N/A — pure decoders and immutable records; no runtime boundary exists                                    | `src/schema-document.ts`, `src/tool-declaration.ts`, corresponding tests                                           |
| Projection + firewall           | `test -- tests/tool-declaration-projection.test.ts` — exit 0, 3 tests; `test -- tests/internal-imports.test.ts` — exit 0, 2 tests; `:typecheck` — exit 0 | N/A — pure Result projection and static import firewall; no runtime boundary exists                      | `src/tool-declaration-projection.ts`, projection/type/firewall tests                                               |
| Final verification              | `pnpm nx run @effectify/app-builder-contracts:test` — exit 0, 17 files / 46 tests; `:typecheck`, `:lint`, `:build` — exit 0                              | N/A — package is private, passive, browser-neutral contract data; no integration/runtime harness applies | Revert the coupled declarations/projection unit; revert dependent replay certification first if later published    |

## Final Verification

- Final source-mutating normalization (exactly once): `pnpm exec oxfmt --write` on the 11 declarations source/test files — completed.
- Scoped post-normalization format check: `pnpm exec oxfmt --check` on the same 11 files — exit 0.
- `pnpm nx run @effectify/app-builder-contracts:test` — exit 0, 17 test files / 46 tests.
- `pnpm nx run @effectify/app-builder-contracts:typecheck` — exit 0.
- `pnpm nx run @effectify/app-builder-contracts:lint` — exit 0; six non-failing unused generic-parameter warnings from erased variance markers.
- `pnpm nx run @effectify/app-builder-contracts:build` — exit 0 (Nx local cache hit).
- `git diff --check` — exit 0.
- Repository-wide `pnpm nx run @effectify/repo:format:check` exited 1 only for the nine inherited, unchanged planning Markdown paths. They are outside the declarations source normalization scope and were intentionally not rewritten.

## Deviations and Issues

- No design deviation.
- The first strengthened requirements GREEN run failed because the newly introduced test destructured a variable into its own temporal-dead-zone binding. The assertion was corrected without modifying production code; the subsequent focused GREEN passed.
- Repository-wide Markdown formatting remains a pre-existing inherited issue. Source/test formatting is clean and all required declarations package targets pass.

## Next Step

Run `sdd-verify`. Do not publish or create a PR until its verification receipt admits the completed private child.
