# Tasks: App Builder Run Lock and Executor

## Review Workload Forecast

| Field                      | Value                                                              |
| -------------------------- | ------------------------------------------------------------------ |
| Estimated changed lines    | 2.3k–2.8k additions + deletions                                    |
| Configured 3,000-line risk | Medium; four coupled boundaries                                    |
| 400-line budget risk       | High                                                               |
| Chained PRs recommended    | Yes                                                                |
| Suggested split            | Four child PRs after draft #108; never combine the later CLI child |
| Delivery / chain           | ask-on-risk / feature-branch-chain                                 |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

Rationale: approved chain; ask only to start this child.

### Suggested Work Units

| Unit | Goal                | Likely PR/base | Focused test command                                | Runtime harness      | Rollback boundary     |
| ---- | ------------------- | -------------- | --------------------------------------------------- | -------------------- | --------------------- |
| 1    | Atomic FS/authority | #1 → tracker   | `pnpm nx run @effectify/app-builder-execution:test` | fake FS race         | FS/authority files    |
| 2    | Lock recovery       | #2 → #1 branch | `pnpm nx run @effectify/app-builder-execution:test` | fake identity swap   | lock/identity files   |
| 3    | Owned evidence      | #3 → #2 branch | `pnpm nx run @effectify/app-builder-execution:test` | fake journal cleanup | gated integrations    |
| 4    | Executor API        | #4 → #3 branch | `pnpm nx run @effectify/app-builder-execution:test` | TestClock/process    | executor/exports/docs |

## Phase 1: Authority and Atomic Filesystem

- [x] 1.1 **RED:** Add `tests/ownership.test.ts` and fake-FS race/CAS tests: one `0700` winner; no-follow/metadata failures cause zero loser mutation.
- [x] 1.2 **GREEN:** Create `src/ownership.ts`; extend `src/{durable-file-system,managed-path}.ts` with handle-relative private create, compare replace/remove, scoped workspace checks, and syncs.
- [x] 1.3 **REFACTOR:** Private `WeakMap` issuer, scope invalidation; run `pnpm nx run @effectify/app-builder-execution:typecheck`.

## Phase 2: Lock and Recovery

- [x] 2.1 **RED:** Add `tests/workspace-lock.test.ts`: race/indeterminate acquisition, dead same-host takeover, PID reuse/foreign/unknown owner, and changed bytes retain lock and skip callback.
- [x] 2.2 **GREEN:** Create `src/{workspace-lock,process-identity}.ts`: canonical metadata, explicit recovery authority, definitive instance death, compare-remove release.
- [x] 2.3 **REFACTOR:** `Context.Service`/`Layer.effect`, tagged errors, masked evidence; run `pnpm nx run @effectify/app-builder-execution:test`.

## Phase 3: Owned Evidence Migration

- [x] 3.1 **RED:** Extend `tests/{run-store,cleanup,recovery}.test.ts`: missing/expired/foreign authority, terminal owned cleanup, unchanged `effectify-run-store/1` reads, zero effects.
- [x] 3.2 **GREEN:** Gate `src/{run-store,cleanup}.ts`; create internal `src/workspace-mutator.ts`; migrate all commit/cleanup callers, fixtures, and fakes in this PR so it builds.
- [x] 3.3 **REFACTOR:** Remove ungated paths; run `pnpm nx run @effectify/app-builder-execution:typecheck` and `pnpm nx run @effectify/app-builder-execution:test`.

## Phase 4: Executor and Process Lifecycle

- [x] 4.1 **RED:** Add `tests/run-executor.test.ts` fake-process/TestClock cases: commit-before-callback, no replay, argv/no-shell, unsafe cwd/env, stop/force/settle, cleanup/release failure, timeout evidence.
- [x] 4.2 **GREEN:** Create internal `src/tool-process.ts` and public `src/run-executor.ts`: identity, `Duration.Input`, scoped lifecycle, proven terminal commit; never map timeout to `Cancelled`.
- [x] 4.3 **REFACTOR:** Revalidate before owned cleanup then release; preserve uncertainty; run `pnpm nx run @effectify/app-builder-execution:test`.

## Phase 5: Public Surface and Verification

- [x] 5.1 **RED:** Update `tests/{public-types,public-surface}.ts`: export only `WorkspaceLock`, `LockRecoveryAuthority`, `RunExecutor`; reject `ToolProcess`/issuer.
- [x] 5.2 **GREEN/REFACTOR:** Update `src/index.ts` and `README.md` compatibility/no-migration guidance; run `pnpm nx affected --target=test`, `pnpm nx affected --target=typecheck`, `pnpm nx affected --target=lint`, and `pnpm nx affected --target=build`.
