# Proposal: App Builder Run Lock Executor Finalization

## Intent

Close the parent executor's verified finalization gaps without attaching them to the exhausted `review-lock-executor-delivery` correction. Persist cancellation only from proven interruption and process settlement, and never delete terminal evidence before lock release is proven.

## Proposal Question Round

The approved scope resolves the product rules: fail closed on uncertain cancellation, preserve changed evidence after release, and deliver this as a separate bounded work unit. No open product decision remains.

## Scope

### In Scope

- Persist `RequestCancellation` then `ConfirmCancellation` only for interruption-only callback causes plus confirmed process settlement/termination.
- Release unchanged lock metadata durably before conditionally deleting unchanged terminal evidence.
- Record reproducible RED/GREEN/TRIANGULATE/SAFETY NET evidence and cover every corrected implementation file.

### Out of Scope

- CLI, tool registry, `PassivePlan` derivation, a new lock model, or unrelated refactoring.
- Tombstone/rename recovery protocols or public cleanup authority.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `app-builder-run-lock-executor`: Truthful cancellation and release-before-delete finalization.
- `app-builder-run-store-recovery`: Authority-bound preparation followed by unchanged-evidence conditional deletion after release.

## Approach

Use a release-aware finalization seam. Under live ownership, classify the callback cause, settle the child, persist only proven cancellation, and capture an opaque cleanup ticket bound to exact terminal evidence. Compare-remove and durably release the lock; then delete only if terminal evidence still matches. Preserve evidence on timeout, mixed causes, adapter/commit/release failure, or any mismatch.

## Affected Areas

| Area                                                                          | Impact   | Description                                         |
| ----------------------------------------------------------------------------- | -------- | --------------------------------------------------- |
| `packages/app-builder/execution/src/{run-executor,workspace-lock,cleanup}.ts` | Modified | Proof-gated cancellation and two-phase finalization |
| `packages/app-builder/execution/tests/{run-executor,workspace-lock}.test.ts`  | Modified | Deterministic ordering and safety-net proofs        |
| `packages/app-builder/execution/vitest.config.mts`                            | Modified | Corrected-file coverage                             |

## Risks

| Risk                                     | Likelihood | Mitigation                                                            |
| ---------------------------------------- | ---------- | --------------------------------------------------------------------- |
| New owner changes evidence after release | Medium     | Atomic unchanged-evidence compare-delete                              |
| Work exceeds the 400-line target         | Medium     | Keep the narrow seam; report overage honestly rather than omit proofs |

## Rollback Plan

Revert this follow-up's cancellation branch, release-aware seam, cleanup ticket, tests, and coverage entries as one unit. Preserve all retained lock/run evidence; no data migration is required.

## Dependencies

- Parent `app-builder-run-lock-executor` plus approved correction `ee126641d`; separate lineage from `review-lock-executor-delivery`.

## Success Criteria

- [ ] `Cancelled` is persisted only with both required proofs; timeout and indeterminate paths retain evidence.
- [ ] Release failure or changed terminal evidence prevents deletion.
- [ ] Strict-TDD triangulation/safety-net evidence is reproducible and corrected files satisfy unchanged coverage thresholds.
