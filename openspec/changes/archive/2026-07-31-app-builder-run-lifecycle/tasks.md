# Tasks: App Builder Run Lifecycle

## Review Workload Forecast

| Field                   | Value                                                   |
| ----------------------- | ------------------------------------------------------- |
| Estimated changed lines | 900–1,200                                               |
| 3,000-line budget risk  | Low                                                     |
| Chained PRs recommended | No — one independently reviewable lifecycle child       |
| Suggested split         | PR #1 base = feature/tracker branch; single child slice |
| Delivery strategy       | auto-chain                                              |
| Chain strategy          | feature-branch-chain                                    |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: feature-branch-chain
3,000-line budget risk: Low
delivery_strategy: auto-chain

### Suggested Work Units

| Unit | Goal / dependencies                                      | Focused test command and evidence                                                        | Runtime harness                                      | Rollback boundary                                                |
| ---- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------- |
| 1    | Package, schemas, reducer, replay; starts from contracts | `pnpm nx test @effectify/app-builder-execution` → all lifecycle tests pass               | N/A: pure in-memory kernel                           | Remove `packages/app-builder/execution/{src,tests,*.json,*.mts}` |
| 2    | Service, public surface, docs; depends on 1              | `pnpm nx run @effectify/app-builder-execution:typecheck` → public-only imports typecheck | N/A: stateless `Layer.succeed`; no runtime authority | Remove service/barrel/README additions                           |

## Phase 1: Package Boundary

- [x] 1.1 Create `packages/app-builder/execution/{package.json,project.json,tsconfig.json,tsconfig.lib.json,tsconfig.spec.json,vitest.config.mts}` with contracts-equivalent Nx targets and the exact root export map. Depends: none; evidence: `pnpm nx show project @effectify/app-builder-execution --json` lists targets.
- [x] 1.2 **RED**: add root-only allowlist and forbidden internal-import assertions in `tests/{public-surface.test.ts,public-types.ts}`; `pnpm nx test @effectify/app-builder-execution` fails before modules exist. Depends: 1.1.
- [x] 1.3 **GREEN/REFACTOR**: add `src/index.ts` and four namespace leaves (`lifecycle`, `transition-evidence`, `automatic-policy`, `failure`) so only `RunLifecycle`, `TransitionEvidence`, `AutomaticPolicy`, and `LifecycleFailure` export; rerun 1.2's command. Depends: 1.2.

## Phase 2: Schema Kernel and Reducer

- [x] 2.1 **RED**: in `tests/transition-table.test.ts`, encode every state×request cell, unknown `_tag` decode rejection before reduction, revision conflict, approval waiting, cancellation confirmation, safe interruption, and every failure tag; `pnpm nx test @effectify/app-builder-execution` fails. Depends: 1.3.
- [x] 2.2 **GREEN**: implement public tagged schemas/errors in `src/{lifecycle,transition-evidence,automatic-policy,failure}.ts`, reusing contracts refs/diagnostics without shadow DTOs; `pnpm nx test @effectify/app-builder-execution` passes. Depends: 2.1.
- [x] 2.3 **RED**: add UTF-16 ordering, `-0`, duplicate fact/secret classification, prior-result mismatch/unavailable, and exact replay cases to `tests/lifecycle-laws.test.ts`; `pnpm nx test @effectify/app-builder-execution` fails. Depends: 2.2.
- [x] 2.4 **GREEN/REFACTOR**: implement private normalization and total `reduce` in `src/lifecycle.ts`: normalize before replay/revision, append one immutable evidence record, return equivalent prior results exactly, and keep reducer free of I/O/ambient state; `pnpm nx test @effectify/app-builder-execution` passes. Depends: 2.3.

## Phase 3: Effect Boundary and Laws

- [x] 3.1 **RED**: add exhaustive counter, immutability, terminal closure, deterministic same-snapshot concurrency, and interrupted-service `Exit`/`Cause` cases in `tests/{lifecycle-laws,service-boundary}.test.ts`; `pnpm nx test @effectify/app-builder-execution` fails without sleeps. Depends: 2.4.
- [x] 3.2 **GREEN/REFACTOR**: add stateless `RunLifecycle.Service.transition` via named `Effect.fn` and `Layer.succeed` in `src/lifecycle.ts`; preserve interruption and add no `Ref`, cache, persistence, locks, executor, or cleanup; `pnpm nx test @effectify/app-builder-execution` passes. Depends: 3.1.

## Phase 4: Documentation and Focused Quality

- [x] 4.1 Document contracts, legal table, replay scope, and exclusions in `packages/app-builder/execution/README.md`; state no persistence, locks/executor, CLI, filesystem/process/global state, web, plugins, or analytics. Depends: 3.2.
- [x] 4.2 Run `pnpm nx run @effectify/app-builder-execution:test-coverage`, `pnpm nx run @effectify/app-builder-execution:typecheck`, `pnpm nx run @effectify/app-builder-execution:lint`, `pnpm nx run @effectify/app-builder-execution:build`, and `pnpm nx run @effectify/repo:format:check`; record passing output and changed-line count ≤3,000. Depends: 4.1.
