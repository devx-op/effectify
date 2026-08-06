# Tasks: App Builder Run Lock Executor Finalization

## Review Workload Forecast

| Field                   | Value                                                        |
| ----------------------- | ------------------------------------------------------------ |
| Estimated changed lines | 360–410                                                      |
| 400-line budget risk    | Medium                                                       |
| Chained PRs recommended | No                                                           |
| Suggested split         | One bounded follow-up in the current lock-executor PR branch |
| Delivery strategy       | exception-ok                                                 |
| Chain strategy          | feature-branch-chain                                         |

Decision needed before apply: Yes
Chained PRs recommended: No
Chain strategy: feature-branch-chain
400-line budget risk: Medium

### Suggested Work Units

| Unit | Goal                                               | Likely PR                | Focused test command                                | Runtime harness                                         | Rollback boundary                                   |
| ---- | -------------------------------------------------- | ------------------------ | --------------------------------------------------- | ------------------------------------------------------- | --------------------------------------------------- |
| 1    | Proof-gated cancellation and release-aware cleanup | Current lock-executor PR | `pnpm nx run @effectify/app-builder-execution:test` | Deterministic fake lock→store→executor→filesystem chain | Finalization sources, fakes, tests, coverage config |

## Phase 1: RED Proofs and Contracts

- [x] 1.1 RED: In `tests/run-executor.test.ts`, prove only interruption-only + `Settled` commits `RequestCancellation` then `ConfirmCancellation`; mixed Cause, adapter failure, partial commit, and timeout retain evidence. Run `pnpm nx run @effectify/app-builder-execution:test`.
- [x] 1.2 RED: In `tests/workspace-lock.test.ts` and `tests/cleanup.test.ts`, prove release precedes deletion; release/capture failure, post-release append/manifest mismatch, deletion failure, and interruption after release preserve evidence. Run `pnpm nx run @effectify/app-builder-execution:test`.
- [x] 1.3 RED: In `tests/public-types.ts`, prove public `Cleanup.cleanup` remains non-mutating and no cleanup ticket/finalizer is exported. Run `pnpm nx run @effectify/app-builder-execution:test`.

## Phase 2: GREEN Finalization

- [x] 2.1 Add `Settled | TimedOut`, Cause classification, ordered cancellation commits, and additive `Cancelled` result handling in `src/run-executor.ts`; keep unknown outcomes fail-closed. Run `pnpm nx run @effectify/app-builder-execution:test`.
- [x] 2.2 Add internal `withExclusiveFinalized` in `src/workspace-lock.ts`: durable compare-release then ownership invalidation then post-release continuation; retain `withExclusive` behavior. Run `pnpm nx run @effectify/app-builder-execution:test`.
- [x] 2.3 Create opaque single-use tickets in `src/cleanup-finalization.ts`; make `src/cleanup.ts` preserve public calls; add exact run-tree compare-remove capability in `src/durable-file-system.ts` and `tests/durable-file-system-fake.ts`. Run `pnpm nx run @effectify/app-builder-execution:test`.
- [x] 2.4 GREEN: Wire `RunExecutor` preparation → successful release → conditional exact-tree deletion; suppress completion on all preparation, release, comparison, or cleanup failures. Run `pnpm nx run @effectify/app-builder-execution:test`.

## Phase 3: Refactor and Evidence

- [x] 3.1 REFACTOR: Deduplicate deterministic test fixtures without weakening interruption, timeout, changed-evidence, v1 recovery, takeover, or completion safety nets. Run `pnpm nx run @effectify/app-builder-execution:test`.
- [x] 3.2 Add all corrected sources to `vitest.config.mts`; pass `pnpm nx run @effectify/app-builder-execution:test-coverage` at existing 95/95/95/90 thresholds.
- [x] 3.3 Record reproducible RED, GREEN, TRIANGULATE (interrupt-only/mixed/timeout), and SAFETY NET results in these task checkboxes during apply. Run `pnpm nx run @effectify/app-builder-execution:test`.

## Phase 4: Full Verification

- [x] 4.1 Run `pnpm nx run @effectify/app-builder-execution:typecheck`, `pnpm nx run @effectify/app-builder-execution:lint`, and `pnpm nx run @effectify/app-builder-execution:test-coverage`.
- [x] 4.2 Run `pnpm nx affected --target=test`, `pnpm nx affected --target=typecheck`, `pnpm nx affected --target=lint`, `pnpm nx affected --target=build`, `pnpm nx run @effectify/repo:format:check`, and `git diff --check`.

## Final Evidence Closure

- The missing post-release crash proof now uses the deterministic fake filesystem and real `WorkspaceLock`/`CleanupFinalization`/`Recovery` boundaries. It injects a defect after durable lock release and before deletion, proves terminal evidence remains recoverable, then reacquires the lock and safely retries conditional cleanup.
- `src/tool-process.ts` is now included in corrected-file coverage and has behavior-based validation and inactive-service tests. Existing 95/90/95/95 thresholds remain unchanged.
- Independent verification remains pending; this receipt does not change the recorded failed verification verdict.
