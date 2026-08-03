# Design: App Builder Run Lock Executor Finalization

## Technical Approach

Correct only the parent verifier's blockers. `RunExecutor` will require an interruption-only callback `Cause` plus determinate child settlement before committing `RequestCancellation` then `ConfirmCancellation`. Terminal work prepares an exact-evidence ticket under ownership; a release-aware bracket durably releases, invalidates ownership, then conditionally deletes. Uncertainty preserves evidence and suppresses `ExecutionResult`.

## Architecture Decisions

| Decision                | Choice and rationale                                                                                                                                                                                                                                                                    | Rejected tradeoff                                                                                                                                                |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Effect finalizer order  | Add `WorkspaceLock.withExclusiveFinalized`; preserve `withExclusive`. Successful `use` returns a value plus payload. `acquireUseRelease` runs `release → invalidate ownership → afterRelease`; release failure fails the effect and skips `afterRelease`, matching Effect v4 semantics. | Preflight release proves nothing; cleanup inside `use` recreates evidence loss.                                                                                  |
| Cancellation proof      | Private settlement result is `Settled                                                                                                                                                                                                                                                   | TimedOut`; adapter failures remain typed failures. Only `Cause.hasInterruptsOnly`plus`Settled` enters the two deterministic attempt-scoped cancellation commits. | Any-interrupt or boolean-only branching can misclassify mixed causes and timeouts. |
| Cleanup authority       | Create internal `cleanup-finalization.ts`. A private `WeakMap` backs a single-use ticket containing no ownership capability, only run identity, verified tail, and exact tree manifest. Preparation checks ownership around capture.                                                    | Structural/public tickets are forgeable; tombstone recovery exceeds scope.                                                                                       |
| Post-release comparison | Add an optional filesystem primitive that atomically removes only when the complete run-tree manifest is unchanged. Missing support, mismatch, or failure preserves it. Comparing only the old tail misses appended journals.                                                           | Metadata-only lock CAS is unsafe; an optional seam preserves adapter compatibility and fails closed.                                                             |
| Public API              | Keep callback `ExecutionOutcome` unchanged. Widen `ExecutionResult` to a completion/cancelled union; `terminal` may be `Cancelled`. Existing `Cleanup.cleanup` becomes non-mutating/preserved, and no ticket/finalizer is root-exported.                                                | Allowing callbacks to return `Cancelled` would bypass proof; retaining public immediate deletion violates release ordering.                                      |

## Data Flow

```text
callback Exit → settle child → success Complete OR proven cancellation commits
      ↓ mixed/unknown/timeout                 ↓
retain lock + evidence                 prepare exact ticket (owner live)
                                              ↓
durable lock compare-remove → invalidate owner → exact-tree compare-remove
           failure: preserve/skip                 mismatch/failure: preserve/fail
```

`acquireUseRelease` masks finalizers. The nested mask restores only the callback, so captured interruption permits settlement and commits. Crashes before release retain lock and evidence; crashes after release but before deletion retain evidence; deletion is one all-or-preserve operation.

## File Changes

| File                                                         | Action        | Description                                                                                       |
| ------------------------------------------------------------ | ------------- | ------------------------------------------------------------------------------------------------- |
| `src/run-executor.ts`                                        | Modify        | Cause classification, settlement result, cancellation commits, result union, finalization payload |
| `src/workspace-lock.ts`                                      | Modify        | Add release-aware bracket; preserve existing method                                               |
| `src/cleanup.ts`, `src/cleanup-finalization.ts`              | Modify/Create | Disable public immediate deletion; internal ticket preparation/deletion                           |
| `src/durable-file-system.ts`                                 | Modify        | Optional exact-tree atomic removal contract                                                       |
| `tests/{run-executor,workspace-lock,cleanup}.test.ts`        | Modify        | Deterministic unit and real-chain proofs                                                          |
| `tests/durable-file-system-fake.ts`, `tests/public-types.ts` | Modify        | Race/failure seam and compatibility assertions                                                    |
| `vitest.config.mts`                                          | Modify        | Include every corrected source file                                                               |

## Interfaces / Contracts

`withExclusiveFinalized` passes no ownership to `afterRelease`; only successful release invokes it. Tickets are single-use. Cancellation, preparation, release, comparison, or cleanup failure cannot claim completion.

## Testing Strategy

| Layer       | Proof                                                                                                                                                                                                                  |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit        | Interruption-only/settled versus mixed cause, stop/force/timeout/adapter failures; cancellation commit order and partial-commit retention; release skip/order; ticket forgery, append/change mismatch, cleanup failure |
| Integration | Real fake-filesystem `WorkspaceLock → RunStore → RunExecutor → cleanup → release` ordering, including changed lock metadata and post-release append                                                                    |
| Safety net  | Existing success/failure completion, force/no-force timeout, takeover/release, v1 recovery, public namespaces/types                                                                                                    |

Strict TDD persists reproducible RED/GREEN outputs, TRIANGULATE contrasts, and SAFETY NET results. `pnpm nx run @effectify/app-builder-execution:test-coverage` retains 95/95/95/90 thresholds and includes `run-executor.ts`, `workspace-lock.ts`, `cleanup.ts`, `cleanup-finalization.ts`, and `durable-file-system.ts`.

## Threat Matrix

| Boundary                 | Applicability                            | Safe/failure behavior and planned RED proof                                                                                                                            |
| ------------------------ | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Documentation-like paths | N/A — no classification/execution change | None                                                                                                                                                                   |
| Git repository selection | N/A — no Git commands                    | None                                                                                                                                                                   |
| Commit state             | N/A — no VCS commits                     | None                                                                                                                                                                   |
| Push state               | N/A — no push                            | None                                                                                                                                                                   |
| PR commands              | N/A — no PR automation                   | None                                                                                                                                                                   |
| Child process lifecycle  | Applicable                               | Only interruption-only plus confirmed absence/exit/termination cancels; mixed cause, adapter failure, and timeout preserve evidence. RED tests cover each distinction. |

## Migration / Rollout

No data migration; `effectify-run-store/1` bytes remain readable. Roll back these production seams, tests, and coverage entries as one unit, never by deleting retained evidence. Target 360–400 changed lines by reusing fakes and table-driven cases; exact-tree CAS and full-chain proofs MUST NOT be omitted if coverage pushes the change above 400. No CLI/tool-registry scope.

## Open Questions

None.
