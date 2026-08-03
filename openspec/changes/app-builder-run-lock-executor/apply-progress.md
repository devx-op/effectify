# Apply Progress: App Builder Run Lock and Executor

**Mode:** Strict TDD
**Delivery:** `exception-ok` / `size:exception` — one approved work unit; no later CLI child included.
**Status:** 14/14 tasks complete

## Completed Tasks

- [x] 1.1–1.3 Authority and atomic filesystem
- [x] 2.1–2.3 Workspace lock and recovery
- [x] 3.1–3.3 Ownership-gated evidence
- [x] 4.1–4.3 Executor and process lifecycle
- [x] 5.1–5.2 Public surface and full verification

## TDD Cycle Evidence

| Task | RED — test written first                                                               | GREEN — implementation passes                                     | REFACTOR                                               |
| ---- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------ |
| 1.1  | `pnpm nx run @effectify/app-builder-execution:test` failed: missing `src/ownership.js` | Ownership and fake-FS tests pass in 90-test suite                 | Kept issuer private in a `WeakMap`                     |
| 1.2  | Covered by 1.1 acceptance tests                                                        | Durable filesystem and managed-path changes pass                  | Consolidated scoped lock layout                        |
| 1.3  | Covered by 1.1 acceptance tests                                                        | `pnpm nx run @effectify/app-builder-execution:typecheck` exited 0 | Invalidated opaque scoped authority                    |
| 2.1  | Focused suite failed: workspace lock modules missing                                   | Lock/recovery tests pass in 90-test suite                         | N/A — acceptance coverage retained                     |
| 2.2  | Covered by 2.1 acceptance tests                                                        | Workspace lock and process identity implementation passes         | Canonical metadata and compare-remove release retained |
| 2.3  | Covered by 2.1 acceptance tests                                                        | Focused suite exited 0: 16 files, 90 tests                        | Kept uncertainty and masked evidence explicit          |
| 3.1  | Focused ownership/cleanup assertions failed before gates existed                       | Run store, cleanup, recovery tests pass in 90-test suite          | N/A — compatibility reads remain unchanged             |
| 3.2  | Covered by 3.1 acceptance tests                                                        | Ownership-gated callers and fake fixtures pass                    | Centralized private mutation gate                      |
| 3.3  | Covered by 3.1 acceptance tests                                                        | Typecheck and focused suite exited 0                              | Removed ungated mutation paths                         |
| 4.1  | Focused suite failed: run-executor/tool-process modules missing                        | Executor and process lifecycle tests pass in 90-test suite        | N/A — explicit terminal-state mapping retained         |
| 4.2  | Covered by 4.1 acceptance tests                                                        | Run executor accepts `Duration.Input`; focused suite exited 0     | Kept child-process type internal                       |
| 4.3  | Covered by 4.1 acceptance tests                                                        | Cleanup/release behavior passes in 90-test suite                  | Revalidation occurs before cleanup and release         |
| 5.1  | Public type/surface tests failed before root exports and documentation were updated    | Public surface tests pass in 90-test suite                        | Root exports remain intentionally minimal              |
| 5.2  | Covered by 5.1 acceptance tests                                                        | Formatting and all affected targets exited 0                      | README documents compatibility and non-goals           |

## Work Unit Evidence

| Work unit               | Focused test command and result                                                   | Runtime harness command/scenario and result                                                                       | Rollback boundary                                                                    |
| ----------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Atomic FS and authority | `pnpm nx run @effectify/app-builder-execution:test` — exit 0, 16 files / 90 tests | Fake FS race/CAS scenario — exactly one `0700` winner and no loser mutation                                       | `ownership.ts`, `durable-file-system.ts`, `managed-path.ts`, ownership/fake-FS tests |
| Lock and recovery       | `pnpm nx run @effectify/app-builder-execution:test` — exit 0, 16 files / 90 tests | Fake identity swap scenario — only definitive dead same-host owner is recoverable                                 | `workspace-lock.ts`, `process-identity.ts`, `lock-recovery-authority.ts`, lock tests |
| Owned evidence          | `pnpm nx run @effectify/app-builder-execution:test` — exit 0, 16 files / 90 tests | Fake journal cleanup scenario — missing/expired/foreign authority produces zero mutation                          | `run-store.ts`, `cleanup.ts`, `workspace-mutator.ts`, integration tests              |
| Executor API            | `pnpm nx run @effectify/app-builder-execution:test` — exit 0, 16 files / 90 tests | Fake `ToolProcess` and TestClock scenarios — commit precedes callback, argv-only spawn, timeout evidence retained | `run-executor.ts`, `tool-process.ts`, root exports, README, executor/public tests    |

## Final Verification

The following chained command exited 0 after source normalization:

```sh
pnpm nx run @effectify/repo:format:check && pnpm nx affected --target=test && pnpm nx affected --target=typecheck && pnpm nx affected --target=lint && pnpm nx affected --target=build
```

- Formatting: passed.
- Affected tests: passed.
- Affected typecheck: passed.
- Affected lint: passed.
- Affected build: passed.
- `git diff --check`: passed.

## Review Boundary

- Changed-line budget: 2,156 text lines after removing generated test/build artifacts; within the 3,000-line exception budget.
- Excluded scope: CLI, prompts, flags, signals, tool registry, passive-plan derivation, leases, distributed locks, and automatic salvage.
- No runtime apply attempt state was acquired, settled, reset, or otherwise modified.
