# Tasks: App Builder Run Store and Recovery

## Review Workload Forecast

| Field                   | Value                             |
| ----------------------- | --------------------------------- |
| Estimated changed lines | 2,400–2,900                       |
| Cached child budget     | 3,000 lines                       |
| 400-line budget risk    | High                              |
| Chained PRs recommended | No — child remains reviewable     |
| Suggested split         | Existing child only               |
| Delivery / chain        | auto-chain / feature-branch-chain |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: feature-branch-chain
400-line budget risk: High

### Suggested Work Units

| Unit | Goal           | Likely PR                         | Focused test command                                                                             | Runtime harness                                | Rollback boundary                                                      |
| ---- | -------------- | --------------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------- | ---------------------------------------------------------------------- |
| 1    | Complete child | Current child; base = prior child | `pnpm nx test @effectify/app-builder-contracts && pnpm nx test @effectify/app-builder-execution` | Live capability suite in a temporary workspace | Contracts, execution exports, and `/.effectify/`; preserve state bytes |

## Phase 1: Contracts and Format Foundation

- [x] 1.1 RED: add `contracts/tests/wizard-draft.test.ts` public types for valid/invalid drafts and excluded CLI intent/defaults.
- [x] 1.2 GREEN: create `contracts/src/wizard-draft.ts`; decode `DraftId`/`ValidatedWizardDraft` and export from `contracts/src/index.ts`.
- [x] 1.3 REFACTOR: freeze passive drafts, document ownership, and pass contracts Nx test/typecheck.
- [x] 1.4 RED: add `execution/tests/persistence-format.test.ts` laws for versions, canonical bytes/digests, predecessor, replay, stale snapshots, and secret exclusion.
- [x] 1.5 GREEN: create `execution/src/persistence-format.ts` using `effectify-run-store/1`, `effectify-cjson/1`, and SHA-256 payload digests.
- [x] 1.6 REFACTOR: centralize tagged format failures and prove deterministic encode/decode law tests.

## Phase 2: Durable Boundary and Commit

- [x] 2.1 RED: add `execution/tests/managed-path.test.ts` for encoded-ID round trips, traversal, links, non-directory ancestors, device changes, and 0700/0600 defenses.
- [x] 2.2 GREEN: create `execution/src/managed-path.ts` and `durable-file-system.ts`; reject unsupported ACL, no-replace, file-sync, or directory-sync.
- [x] 2.3 REFACTOR: add `execution/tests/live-capability.test.ts` and `Ref`/`Deferred` fake logs; use no sleeps.
- [x] 2.4 RED: add `execution/tests/run-store.test.ts` for tail CAS conflicts and every crash stage: pre-publish, indeterminate publish, synced journal, and stale snapshot.
- [x] 2.5 GREEN: create `execution/src/run-store.ts` with exclusive temp/write/sync/publish and truthful receipts, never locking.
- [x] 2.6 REFACTOR: verify immutable journals, snapshot acceleration only, safe spans, and focused execution tests.

## Phase 3: Read-Only Recovery and Retention

- [x] 3.1 RED: add `execution/tests/recovery.test.ts` for replay, four outcomes, orphan temps, no writes, and malformed/version/gap/duplicate/digest/evidence/prior-result blocks.
- [x] 3.2 GREEN: create `execution/src/recovery.ts`; return only typed closed outcomes and non-executable candidates naming lock/executor authorities.
- [x] 3.3 REFACTOR: consolidate complete-chain validation; ensure snapshots are ignored unless tail-identical.
- [x] 3.4 RED: add `execution/tests/cleanup.test.ts` for terminal expected-tail cleanup and preservation of drafts, nonterminal, invalid, and ambiguous evidence.
- [x] 3.5 GREEN: create `execution/src/cleanup.ts`; revalidate before explicit removal; never repair, salvage, migrate, quarantine, or clean implicitly.
- [x] 3.6 REFACTOR: export all execution modules through `execution/src/index.ts`; add JSDoc and public API tests.

## Phase 4: Integration Verification

- [x] 4.1 Add `/.effectify/` to `.gitignore`; update package-facing documentation with scope and rollback preservation semantics.
- [x] 4.2 Run `pnpm nx test` and `pnpm nx typecheck` for both affected packages, then `pnpm nx affected --target=test`, `--target=typecheck`, and `--target=lint`.
- [x] 4.3 Record RED/GREEN/REFACTOR and live-capability evidence; confirm excluded scope stayed excluded.

## Remediation: Pre-Verification Findings

- [x] R1 (F1) RED/GREEN durable, contracts-owned draft persistence with validation-before-write and zero-write invalid failures.
- [x] R2 (F2) RED/GREEN exact cross-revision prior-result snapshot/history correspondence validation.
- [x] R3 (F3) RED/GREEN canonical commit encoding that prevents value/bytes/text split authority before mutation.
- [x] R4 (F4) RED/GREEN no-follow directory-handle capability proof or typed fail-closed durable adapter behavior.

## Final Correction: F3 Canonical Byte Equality

- [x] R3b (F3) RED/GREEN byte-for-byte comparison of journal and snapshot encoded inputs against canonical JSON bytes derived from schema-validated material, including decode-equivalent malformed UTF-8 zero-write regressions.
