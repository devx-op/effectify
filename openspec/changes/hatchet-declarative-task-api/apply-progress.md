# Apply Progress: Hatchet Declarative Task API

## Status

Phases 1–3 and the explicitly authorized terminal-review corrective work unit are complete in a fresh recovery worktree under the approved one-time `size-exception`. Phase 4 remains intentionally untouched. Terminal review `review-2daefffe05d2966e` and historical authorities `review-ecff39feff9d2cff` and `review-517abc7c361506f0` remain immutable evidence only and were not recovered, continued, reset, invalidated, deleted, or mutated.

## Historical Progress Preserved

The prior apply-progress observation recorded Units 1–3 on `feat/hatchet-declarative-task-api-contracts`, including historical approval lineage `review-a5a0ee6d1c52f005`. That provenance is preserved only as historical context. It did not authorize this recovery candidate, was not recovered or mutated, and is not represented as current approval.

## Recovery Identity

- Worktree: `/Users/andres/devx-op/effectify-worktrees/hatchet-declarative-task-api-recovery`
- Branch: `feat/hatchet-declarative-task-api-recovery`
- Base: `fix/67-react-router-hatchet-example` at `9d3899a572ce8cbd1f3da594a337c339ce956210`
- Replayed `b35546626d3d16ce73ea15791e65595a75aafc43` as `f34b77a78de4e355a60c47f3a5a9a3e14dedd485`; package-only assertion passed.
- Replayed `0e6a830298d4782458d44fc9e6e324c554ff7a3a` as `8d87f38a64b769e51b12d592ba67496f6d89a11a`; package-only assertion passed.
- Backup `/Users/andres/effectify-review-recovery-20260719-210223/worktree.patch` verified at SHA-256 `cb4546ccf22bdda25262e69797f81059da00225ccff1da7462ff51a1b32847cd`; no patch hunk was applied.

## Completed Tasks

- [x] Phase 1 tasks 1.1–1.4: isolated recovery, absolute-worktree guard, ordered replay, and package-only provenance.
- [x] Phase 2 tasks 2.1–2.6: immutable declarations, durable registry/live dispatch, fail-closed typed validation, exact SDK mapping, root exports, tests, and documentation.
- [x] Phase 3 tasks 3.1–3.3: source-mutating normalization, focused/full Nx verification, declarations build, package-path checks, and fail-closed Git gate scenarios.
- [x] Corrective task C.1: authorized namespace imports, automatic in-memory `runNoWait` lifecycle cleanup, deterministic success/failure completion tests, normalization, cache-disabled verification, and snapshot replacement.

## Changed Paths

- `packages/hatchet/README.md`
- `packages/hatchet/src/{Error,Hatchet,Task,index}.ts`
- `packages/hatchet/src/internal/{declaration-validation,live,registry}.ts`
- `packages/hatchet/tests/types/declarative-task-api.ts`
- `packages/hatchet/tests/unit/{live-sdk-port,public-api-source-contract,task-core}.test.ts`
- `openspec/changes/hatchet-declarative-task-api/{proposal,design,tasks,apply-progress}.md`
- `openspec/changes/hatchet-declarative-task-api/specs/hatchet-declarative-task-api/spec.md`

The two replay commits additionally contain only `packages/hatchet/**` paths. No `apps/react-router-example/**` path and no backup patch content is present.

## Verification Evidence

| Command / scenario                                                  | Exact result                                                                                                                                                                          |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `shasum -a 256 .../worktree.patch`                                  | PASS; checksum matched `cb4546...cd`.                                                                                                                                                 |
| Absolute repository-selection guard                                 | RED: relative and wrong absolute cwd rejected; GREEN: intended absolute worktree accepted.                                                                                            |
| Ordered `git cherry-pick` plus `git diff-tree` path assertions      | PASS; both replay commits changed only `packages/hatchet/**`.                                                                                                                         |
| Baseline `pnpm nx test @effectify/hatchet`                          | PASS; 11 files, 122 tests.                                                                                                                                                            |
| Focused Nx test command for live/task/rate-limit/trigger/public API | PASS; 5 files, 75 tests.                                                                                                                                                              |
| `pnpm lint:fix`                                                     | PASS; oxlint fix plus dprint format completed before the final candidate; warnings only.                                                                                              |
| `pnpm nx run-many -t test,typecheck,lint -p @effectify/hatchet`     | PASS; 11 files / 129 tests, typecheck/declarations pass, lint exits 0 with three warnings.                                                                                            |
| `pnpm nx build @effectify/hatchet`                                  | PASS; production declarations build succeeded (local cache hit after successful run-many dependency build).                                                                           |
| Git command guards                                                  | RED: empty index/unstaged drift, `commit -a`, composed command, inconsistent push destination, and implicit PR head rejected; explicit branch/refspec shapes accepted by pure guards. |
| Receipt gates without a fresh review                                | `post-apply`, `pre-commit`, and `pre-push` denied; explicit nonexistent fresh lineage denied for `pre-pr`. No authority was created or modified.                                      |
| `pnpm exec dprint check` and `git diff --check`                     | PASS after the final progress record; index remained empty.                                                                                                                           |
| `pnpm nx --help`                                                    | PASS; documents `--skipNxCache` / `--disableNxCache` and the `--skip-nx-cache` alias.                                                                                                 |
| Corrective RED: focused `task-core.test.ts`                         | EXPECTED FAIL; 11 tests evaluated, 2 new fire-and-forget release cases failed and 9 passed.                                                                                           |
| Corrective focused GREEN with `--skip-nx-cache`                     | PASS; 4 files, 71 tests.                                                                                                                                                              |
| Corrective run-many with `--skip-nx-cache`                          | PASS; 11 files / 131 tests, typecheck/declarations pass, lint exits 0 with three existing warnings.                                                                                   |
| Corrective build with `--skip-nx-cache`                             | PASS; production declarations build reran successfully.                                                                                                                               |
| `pnpm lint:fix` and final `git diff --check`                        | PASS; normalizer completed with warnings only; diff check passed.                                                                                                                     |

## Runtime Harness Evidence

`pnpm nx test @effectify/hatchet -- tests/unit/live-sdk-port.test.ts tests/unit/task-core.test.ts tests/unit/rate-limit.test.ts tests/unit/trigger.test.ts tests/unit/public-api-source-contract.test.ts` passed 75/75. The fake SDK worker proved ordinary and durable registration, invocation-count propagation, unknown-identity failure, Schema failure, abort interruption, worker finalization, exact SDK declaration shapes, duplicate rejection before SDK mutation, and root imports without sleeps.

Corrective runtime evidence used `Deferred` plus scheduler yielding, never sleeps. Successful and typed-failing `runNoWait` executions completed without evaluating the returned handles' `await` or `cancel`; subsequent `cancelRun` calls observed that both completed runs had already left the in-memory map. Existing cancellation and ordinary `run` tests remained green, preserving cancel and await semantics.

## TDD Cycle Evidence

| Task    | Test File / Scenario                            | Layer                 | Safety Net         | RED                                                          | GREEN                                                    | TRIANGULATE                                                                | REFACTOR                                                          |
| ------- | ----------------------------------------------- | --------------------- | ------------------ | ------------------------------------------------------------ | -------------------------------------------------------- | -------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| 1.3     | Absolute repository-selection shell guard       | Delivery              | Clean base         | Relative/wrong cwd rejected                                  | Intended absolute cwd accepted                           | Three cwd cases                                                            | Guard kept pure                                                   |
| 1.4     | Ordered replay path assertions                  | Delivery              | Clean base         | Forbidden-path predicate prepared before replay              | Both replay commits package-only                         | One assertion per replay                                                   | N/A                                                               |
| 2.1–2.3 | Rate-limit, trigger, live SDK, public API tests | Unit/integration/type | 122/122 baseline   | Durable export/registration and duplicate tests failed first | Focused tests passed                                     | Valid, malformed, duplicate, unknown-kind, and exact-shape cases           | Validation centralized                                            |
| 2.4–2.5 | `live-sdk-port.test.ts`, `task-core.test.ts`    | Integration/unit      | 122/122 baseline   | Durable dispatch and in-memory invocation tests failed first | Durable callback and registry tests passed               | Unknown identity, Schema failure, interruption, finalization, requirements | One heterogeneous registry seam retained                          |
| 2.6     | Public API source contract and README           | Unit/type/docs        | 122/122 baseline   | Root export assertion failed first                           | Root import/type checks passed                           | Task, RateLimit, Trigger, and error surfaces                               | Internal helpers remain private                                   |
| 3.3     | Git and receipt guards                          | Delivery              | Unstaged candidate | Unsafe command/state shapes rejected                         | Explicit shapes accepted; no-review receipt gates denied | Commit, push, PR, and receipt cases                                        | Pure guards; no Git mutation                                      |
| C.1     | `task-core.test.ts` fire-and-forget release     | Integration           | 9/9 focused tests  | Two completion-without-await/cancel cases failed first       | 11/11 focused tests passed                               | Successful and typed-failing completion paths                              | Registration gate prevents insertion race; finalizer owns cleanup |

## Work Unit Evidence

| Work Unit                  | Focused test command and result                                             | Runtime harness                                                                                   | Rollback boundary                                                                                                      |
| -------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Recovery lineage           | Ordered cherry-pick and `git diff-tree` assertions PASS                     | N/A: Git provenance boundary                                                                      | Revert `8d87f38a`, then `f34b77a7`; no tracker or historical authority mutation.                                       |
| Contract and validation    | Focused Nx command PASS, 75/75                                              | Fake SDK declaration construction and rejection-before-mutation PASS                              | Revert public declaration/error/adapter/test/doc paths without removing unrelated package behavior.                    |
| Live dispatch              | `live-sdk-port` and `task-core` included in focused PASS                    | Fake worker callbacks prove ordinary/durable dispatch, interruption, and stop finalization        | Revert `registry.ts`, durable portions of `live.ts`/`Hatchet.ts`, and paired tests.                                    |
| Verification/normalization | Run-many PASS; 129/129; build PASS                                          | Same fake worker full-suite evidence                                                              | Revert only Phase 2 completion paths; replay commits remain independently revertible.                                  |
| Terminal-review correction | Focused cache-disabled PASS, 71/71; full run-many PASS, 131/131; build PASS | Deterministic in-memory success/failure completion plus existing cancel/await behavior, no sleeps | Revert `Error.ts`, `Hatchet.ts`, `internal/declaration-validation.ts`, and the two new `task-core.test.ts` cases only. |

## Candidate Snapshot

The prior package snapshot `e85e1f0b15e92cd2f18997d6976d23c9ff7d9f6333ad0b485f2fbbc706a9c49e` is historical and no longer current. The corrected package snapshot (relative to `fix/67-react-router-hatchet-example`) is SHA-256 `995b5dc87f1cff70396c59c4fba5c0c7251bf5c75b85fd523ce2b81746d873c7`; 19 files, 1,020 additions, 93 deletions, 1,113 changed lines. The 56-line snapshot delta is confined to the authorized import/lifecycle/test correction; `Task.ts` received no corrective edit. The snapshot covers `packages/hatchet/**`; OpenSpec process artifacts are recorded separately to avoid a self-referential progress hash. `git diff --check` passed, the index contains zero staged paths, and the candidate has no `apps/react-router-example/**` path.

All source-mutating normalizers completed before the final corrected snapshot hash confirmation.

## Hybrid Store Corrective Retry

The single allowed gatekeeper corrective retry repaired only the candidate OpenSpec artifact store. The approved `proposal.md`, `design.md`, and `specs/hatchet-declarative-task-api/spec.md` were copied byte-for-byte from `/Users/andres/devx-op/effectify/openspec/changes/hatchet-declarative-task-api/` and cross-checked against Engram topics `sdd/hatchet-declarative-task-api/{proposal,spec,design}`.

Artifact SHA-256 values are `f61df4611c09cf343452bac3889aa67961987a8815619e5a07499a685ad4eee4` (proposal), `3bddc195d7a3d710a589da2f7a42f5aba3678d188074a5ca9f879c4650326adb` (design), and `5439e2fb2dbcae83d5af8231e4e718a0cdabb320d436dd91c0bac673bff00281` (spec). That earlier gate status is historical, not the current candidate status. Phase 4 remains 0/3 complete. The later terminal review `review-2daefffe05d2966e` and both earlier reviews remain unchanged; this corrective work created no review, commit, push, PR update, or staged content.

## Final Feature Branch Chain Delivery

The user explicitly replaced the stale single-PR/native-receipt delivery plan with a three-PR Feature Branch Chain and deferred native gates until delivery. Historical authorities remain immutable and were never used as current approval.

| Slice | Scope                                                                       | Commit                        | PR  | Review and verification                                                                          | Integration                       |
| ----- | --------------------------------------------------------------------------- | ----------------------------- | --- | ------------------------------------------------------------------------------------------------ | --------------------------------- |
| PR1   | Task compatibility, RateLimit, Trigger                                      | `0e6a8302` (after `b3554662`) | #75 | Package tests/typecheck/build and reviewed correction evidence                                   | Merged into tracker as `40ddc620` |
| PR2   | Durable registry/live dispatch, typed failures, interruption-safe lifecycle | `d4a4ca42`                    | #76 | 132/132, Nx typecheck/lint/build, dprint, exact diff hash, final dual Judgment Day empty ledgers | Merged into PR1 as `fecd89e8`     |
| PR3   | Root exports, consumer contracts, README                                    | `7048c83c`                    | #77 | Public API RED/GREEN, full verification, exact diff hash, dual Judgment Day empty ledgers        | Merged into PR2 as `a0e2d2cc`     |

PR #75 initially conflicted because tracker commit `71e3da82` already contained the earlier combined recovery. Conflict resolution kept the final reviewed chain bytes for all seven package files. Hatchet verification passed 132/132 plus Nx typecheck/lint/build, dprint, and `git diff --check`; a fresh reliability audit returned an empty ledger. The final tracker package tree exactly matches the merged PR1 branch.

## Remaining Work

- [ ] Run final SDD sync/archive only when the completed tracker PR #74 is ready to integrate into `dev`.
- [ ] Keep PR #74 draft while further Hatchet modernization work continues.

Implementation, bounded review, commits, pushes, PR creation, CI, conflict resolution, and chain integration for this declarative task API change are complete.
