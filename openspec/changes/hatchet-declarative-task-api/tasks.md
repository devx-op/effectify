# Tasks: Hatchet Declarative Task API

## Review Workload Forecast

| Field                   | Value                                                         |
| ----------------------- | ------------------------------------------------------------- |
| Estimated changed lines | 1,100–1,600                                                   |
| Review budget           | 5,000 changed lines                                           |
| 400-line budget risk    | High                                                          |
| Chained PRs recommended | Yes; waived by approved exception                             |
| Suggested split         | One tracker PR; four work-unit commits                        |
| Delivery strategy       | single-pr-default; explicit large-delivery exception approved |
| Chain strategy          | size-exception                                                |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: size-exception
400-line budget risk: High

### Suggested Work Units

| Unit | Goal                       | Likely PR | Focused test command                                                                                                                                                                           | Runtime harness                       | Rollback boundary                                          |
| ---- | -------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ---------------------------------------------------------- |
| 1    | Recovery lineage           | Tracker   | package-only `git diff-tree` assertions                                                                                                                                                        | N/A: Git provenance                   | Revert replays in reverse order                            |
| 2    | Contract and validation    | Same PR   | `pnpm nx typecheck @effectify/hatchet`                                                                                                                                                         | Unit fixtures                         | Declarations/adapters                                      |
| 3    | Live dispatch              | Same PR   | `pnpm nx test @effectify/hatchet`                                                                                                                                                              | Fake SDK callbacks                    | Registry/live commit                                       |
| 4    | Delivery                   | Same PR   | `pnpm nx run-many -t test,typecheck,lint -p @effectify/hatchet`                                                                                                                                | Fake worker                           | Docs/normalizer commits                                    |
| 5    | Terminal-review correction | Same PR   | `pnpm nx test @effectify/hatchet --skip-nx-cache -- tests/unit/task-core.test.ts tests/unit/rate-limit.test.ts tests/unit/live-sdk-port.test.ts tests/unit/public-api-source-contract.test.ts` | In-memory completion and cancellation | Revert only import, lifecycle, and paired test corrections |

## Phase 1: Isolated Recovery

- [x] 1.1 Verify backup/current Git status, refs, and tracker ancestry; never modify old authorities.
- [x] 1.2 Create a fresh sibling worktree under `/Users/andres/devx-op/effectify-worktrees` and conventional branch from `fix/67-react-router-hatchet-example`; use absolute cwd.
- [x] 1.3 RED-test repository selection: reject relative/wrong cwd and accept only the intended absolute worktree.
- [x] 1.4 Cherry-pick `b3554662`, assert only `packages/hatchet/**` changed, then repeat for `0e6a8302`; stop on backup or React Router paths.

## Phase 2: Declarative API Completion

- [x] 2.1 RED-test mixed/unknown declarations, malformed values, duplicates, exact RateLimit/Trigger mapping, typed errors, root imports, and side-effect-free rejection.
- [x] 2.2 Complete `src/{Task,RateLimit,Trigger,Error,index}.ts` with immutable declarations, durable context, discriminated errors, and root exports; keep SDK types internal.
- [x] 2.3 Complete `src/internal/{declaration-validation,sdk-declaration}.ts` with fail-closed validation and exact omission/unit/discriminant mapping.
- [x] 2.4 RED-test unknown identity, schema failures, ordinary exactly-once behavior, durable dispatch, interruption, finalization, and requirements without sleeps.
- [x] 2.5 Complete `src/internal/{registry,live}.ts` with one registry, deterministic dispatch, typed failures, and scoped shutdown.
- [x] 2.6 Update `packages/hatchet/README.md` and public-contract tests; exclude every backup/React Router hunk.

## Phase 3: Verification and Normalization

- [x] 3.1 Run focused tests and `pnpm nx run-many -t test,typecheck,lint -p @effectify/hatchet`; run `pnpm nx build @effectify/hatchet` for declarations.
- [x] 3.2 Run every source-mutating normalizer before review, including `pnpm lint:fix`; verify approved paths and record the snapshot.
- [x] 3.3 RED-test Git gates: staged drift, `commit -a`, empty index, inconsistent push destinations, implicit PR head, and composed commands must stop.

## Phase 4: Review and Delivery Gates

The user replaced the stale single-review delivery plan with an explicit three-PR Feature Branch Chain. Historical native authorities remain immutable; each final slice received blind Judgment Day review, exact staged/committed hash verification, CI, and ordered integration into the tracker.

- [x] 4.1 Review PR1–PR3 as bounded slices; preserve historical authorities and resolve the PR2 interruption CRITICAL before delivery.
- [x] 4.2 Verify normalized reviewed bytes, tests/typecheck/lint/build, staged and committed hashes, and CI for each slice.
- [x] 4.3 Merge PR #77 into #76, #76 into #75, resolve #75 without package drift, and merge #75 into tracker PR #74 without merging #74 to `dev`.

## Corrective Work Unit: Terminal Review Findings

- [x] C.1 Preserve terminal review `review-2daefffe05d2966e` and historical reviews `review-ecff39feff9d2cff` and `review-517abc7c361506f0` unchanged; correct the authorized imports, release completed in-memory `runNoWait` fibers without await/cancel, add deterministic success/failure completion tests, run normalizers, and verify test/typecheck/lint/build with Nx cache disabled.
