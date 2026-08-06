# Apply Progress: App Builder Run Store and Recovery

**Completed work units**: `contracts-and-format-foundations`, `durable-filesystem-boundary`, `recovery-and-typed-decisions`, `integration-and-apply-closure`  
**Execution mode**: Strict TDD  
**Delivery**: `auto-chain` / `feature-branch-chain`  
**PR boundary**: Existing child based on `feat/app-builder-run-lifecycle`  
**Runtime request**: `apply-store-recovery-batch-4-20260731`  
**Runtime authority token**: `sha256:2d2992ade7e1e28706b3352d005bb8e17b04b6f108fb4277f65659865430041a`  
**Runtime evidence goal**: `strict-tdd-final-integration-exports-and-task-closure`  
**Runtime authority disposition**: supplied context only; no acquire, begin, finish, settle, or reset action was invoked.  
**Evidence revision**: `sha256:009a1da41cdcff282bb0a2fcac505e5fbacf64fccc553e2599cb5136d8d30a7a` over ordered `.gitignore`, execution README/public-surface test, and `tasks.md` bytes.

## Completed Tasks

- [x] 1.1–1.3 Contracts-owned immutable wizard draft boundary.
- [x] 1.4–1.6 Canonical versioned persistence format and digest validation.
- [x] 2.1–2.3 Managed private filesystem boundary and deterministic/live capability seams.
- [x] 2.4–2.6 Immutable journal commit, truthful crash outcomes, and snapshot acceleration.
- [x] 3.1–3.3 Read-only recovery replay, closed outcomes, and authoritative snapshot acceleration.
- [x] 3.4–3.6 Explicit terminal-only cleanup, retention guards, public namespaces, and public-surface coverage.
- [x] 4.1 Git-ignored managed state plus package-facing storage, recovery, scope, and rollback documentation.
- [x] 4.2 Affected-package and repository-wide affected Nx test, typecheck, and lint gates.
- [x] 4.3 Cumulative strict-TDD, live-capability, cleanup, scope, and process evidence.

## Strict TDD Cycle Evidence

| Task    | Test file                                                         | Layer                                    | Safety net                      | RED                                                                               | GREEN                                                                        | TRIANGULATE                                                                          | REFACTOR                                                                |
| ------- | ----------------------------------------------------------------- | ---------------------------------------- | ------------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| 1.1–1.3 | `contracts/tests/wizard-draft.test.ts`                            | Unit                                     | Contracts baseline 64/64 passed | 3/3 failed before the module existed                                              | 3/3 passed                                                                   | Valid, malformed, and excluded CLI cases                                             | Frozen payload and exports; package checks passed                       |
| 1.4–1.6 | `execution/tests/persistence-format.test.ts`                      | Unit + crypto harness                    | Execution baseline 40/40 passed | Missing module/test collection failed                                             | 5/5 passed                                                                   | Digest vector, replay, stale snapshot, secret exclusion, and tamper                  | Deterministic format errors and version dispatch                        |
| 2.1–2.3 | `execution/tests/managed-path.test.ts`, `live-capability.test.ts` | Unit + Node integration                  | Execution baseline 45/45 passed | Missing managed-path boundary failed                                              | 4/4 path and 1/1 live tests passed                                           | Traversal, links, devices, modes, and unavailable capabilities                       | `Ref`/`Deferred` fake and no sleeps                                     |
| 2.4–2.6 | `execution/tests/run-store.test.ts`                               | Deterministic integration                | Execution baseline 45/45 passed | Missing run-store module failed                                                   | 6/6 passed                                                                   | Stale tail, pre-publish, indeterminate, journal-sync, and stale snapshot             | Journal-first proof and safe annotations; no lock operation             |
| 3.1–3.3 | `execution/tests/recovery.test.ts`                                | Deterministic integration                | Execution baseline 56/56 passed | Missing recovery module collected 0 tests and exited 1                            | 5/5 passed                                                                   | All four outcomes, orphan temps, stale snapshot, and hostile evidence sets           | Complete-chain validation keeps journals authoritative                  |
| 3.4–3.6 | `execution/tests/cleanup.test.ts`, `public-surface.test.ts`       | Deterministic integration + package unit | Execution baseline 56/56 passed | Missing cleanup module collected 0 tests and expanded export allowlist failed 1/2 | 2/2 cleanup and 2/2 public-surface tests passed                              | Terminal exact-tail cleanup; preservation paths; namespace-only exports              | Typed fake publication failure, terminal-only cleanup, and public JSDoc |
| 4.1     | `execution/tests/public-surface.test.ts`                          | Documentation contract unit              | Focused target → exit 0, 2/2    | Test-first package-documentation contract → exit 1, 2/4 failed                    | README plus ignore rule → exit 0, 4/4                                        | Separate namespace/scope and state/rollback contracts                                | None needed; tests remain explicit and independent                      |
| 4.2     | Nx package and affected targets                                   | Integration gate                         | N/A — verification-only task    | N/A — no production behavior changed                                              | Both package suites/typechecks and affected test/typecheck/lint gates passed | Contracts and execution packages plus test/typecheck/lint target classes             | N/A — no production source changed                                      |
| 4.3     | `execution/tests/live-capability.test.ts`                         | Node integration harness                 | Existing live suite was passing | N/A — evidence-only task                                                          | Focused live suite → exit 0, 1/1                                             | Real private-mode, file-sync, and directory-sync capability scenario remains covered | N/A — evidence-only task                                                |

## Work Unit Evidence

| Evidence                                          | Result                                                                                                                                                                                                                                                                                                     |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focused test command and exact result             | `pnpm nx test @effectify/app-builder-contracts && pnpm nx test @effectify/app-builder-execution` → exit 0; 67/67 contracts and 65/65 execution tests passed. `pnpm nx run @effectify/app-builder-execution:test --args='tests/public-surface.test.ts'` → RED exit 1, 2/4 passed; GREEN exit 0, 4/4 passed. |
| Package typechecks                                | `pnpm nx typecheck @effectify/app-builder-contracts && pnpm nx typecheck @effectify/app-builder-execution` → exit 0.                                                                                                                                                                                       |
| Affected gates                                    | `pnpm nx affected --target=test` → exit 0; 15 projects and 2 dependencies. `pnpm nx affected --target=typecheck` → exit 0; 28 projects and 16 dependencies. `pnpm nx affected --target=lint` → exit 0; 30 projects, with only pre-existing warnings outside this work unit.                                |
| Runtime harness command/scenario and exact result | `pnpm nx run @effectify/app-builder-execution:test --args='tests/live-capability.test.ts'` → exit 0, 1/1. It uses a real Node temporary workspace to exercise restrictive directories/files plus file and directory sync; it does not execute, lock, repair, or retain workspace state.                    |
| Rollback boundary                                 | Revert `.gitignore`, `execution/README.md`, the two documentation-contract tests, and these task/evidence updates. Preserve existing `/.effectify/` state bytes; do not rewrite or delete evidence.                                                                                                        |

## Scope, Cleanup, and Process Evidence

- The public root remains namespace-only: `PersistenceFormat`, `ManagedPath`, `DurableFileSystem`, `RunStore`, `Recovery`, and `Cleanup` do not leak internal leaves.
- The documentation describes journal authority, non-executable recovery, terminal-only cleanup, `/.effectify/` retention, and rollback preservation.
- `git check-ignore -v .effectify/example-run-state` resolves to `.gitignore:/.effectify/`.
- Excluded scope remains excluded: no lock/executor, CLI behavior, automatic repair/salvage/migration/quarantine, database feature, commit, push, PR, review, archive, or independent SDD verification was introduced.
- Affected gates generated `packages/prisma/prisma/dev.db`, three TypeScript build-info files, and one Prisma build-info file; all were restored or removed before closure.
- No runtime-authority lifecycle command was invoked. No temporary managed state, background process, or external resource remains from this work unit.

## Line Budget

- Phase 4 native documentation/test/ignore delta: **42 additions, 4 deletions = 46 changed lines**.
- Phase 4 task-checkbox delta: **3 additions, 3 deletions = 6 changed lines**.
- Phase 4 measured subtotal: **52 changed lines**, below the hard **451-line** allowance. Apply-progress is excluded from the manifest to avoid self-reference.

## Remaining Tasks

None. All task IDs 1.1–4.3 are marked complete in `tasks.md`.

## Remediation Work Unit: Pre-Verification Four-Finding Remediation

**Execution mode**: Strict TDD  
**Delivery**: `auto-chain` / `feature-branch-chain`, bounded remediation within the current child  
**Runtime request**: `apply-store-recovery-remediation-20260731`  
**Runtime authority token**: `sha256:c6d1c4f1043a8352c21f759505bc8a5f3a09908775ff8fbd146854ef8488cdab`  
**Runtime evidence goal**: `strict-tdd-drafts-chain-canonical-bytes-and-no-follow`  
**Runtime authority disposition**: supplied context only; no acquire, begin, finish, settle, or reset action was invoked.  
**Evidence revision**: `sha256:fcf255cd8be441e74468fcb986b0e9e4546d87076827296f976bdf7870c4c292` over the sorted path-and-SHA-256 manifest for the remediation source, tests, README, and `tasks.md` (excluding this self-referential progress artifact).

### Completed Remediation Tasks

- [x] R1 / F1: Added `DraftStore` with contracts-owned validation before managed-path creation, canonical durable draft write/read, and invalid-draft zero-write behavior.
- [x] R2 / F2: Added exact predecessor-result replay, snapshot/history extension, and historic `PriorTransitionResult` correspondence validation.
- [x] R3 / F3: Validated journal and snapshot value/text/bytes canonical equality and digests before any filesystem effect.
- [x] R4 / F4: Made the bundled Node adapter fail closed with typed `UnsupportedDurability(noFollowPaths)` and preflighted recovery and cleanup.

### Strict TDD Cycle Evidence

| Task    | Test file                       | Layer                        | Safety net                                                                         | RED                                                                                                                                                                         | GREEN                        | TRIANGULATE                                                                                          | REFACTOR                                                                                   |
| ------- | ------------------------------- | ---------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| R1 / F1 | `tests/draft-store.test.ts`     | Deterministic integration    | `pnpm nx test @effectify/app-builder-execution` → exit 0, 65/65 before remediation | Focused target → exit 1, 0 collected because `draft-store` did not exist                                                                                                    | Focused target → exit 0, 2/2 | Valid durable round trip and malformed-id zero-write branch                                          | Shared managed layout/capability boundary; focused suite remained green                    |
| R2 / F2 | `tests/recovery.test.ts`        | Deterministic integration    | Same 65/65 execution baseline                                                      | Focused target → exit 1, 5/6; a disconnected revision was accepted. A second explicit historic-prior mismatch also failed RED before its correspondence guard was restored. | Focused target → exit 0, 6/6 | Valid two-revision extension, disconnected result/history, corresponding prior, and mismatched prior | Extracted canonical-result and predecessor-extension helpers; focused suite remained green |
| R3 / F3 | `tests/run-store.test.ts`       | Deterministic integration    | Same 65/65 execution baseline                                                      | Focused target → exit 1, 6/7; different bytes were committed                                                                                                                | Focused target → exit 0, 7/7 | Different bytes and different text both produce zero operations                                      | Reused encoded validation for journals and snapshots; focused suite remained green         |
| R4 / F4 | `tests/live-capability.test.ts` | Live Node capability harness | Same 65/65 execution baseline                                                      | Focused target → exit 1, 1/1 failing; the adapter advertised unsafe path-string operations                                                                                  | Focused target → exit 0, 1/1 | Typed preflight protects read, publication, and cleanup paths without a managed write                | Removed the unprovable path-string live implementation; focused suite remained green       |

### Work Unit Evidence

| Evidence                                          | Result                                                                                                                                                                                                                                                                                                           |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focused test command and exact result             | `pnpm nx test @effectify/app-builder-execution` → exit 0; 12/12 files and 69/69 tests passed. `pnpm nx typecheck @effectify/app-builder-contracts && pnpm nx typecheck @effectify/app-builder-execution` → exit 0. `pnpm nx lint @effectify/app-builder-execution` → exit 0; 0 warnings, 0 errors.               |
| Targeted formatting                               | `pnpm exec oxfmt --write` and `--check` for remediation paths → exit 0.                                                                                                                                                                                                                                          |
| Runtime harness command/scenario and exact result | `pnpm nx run @effectify/app-builder-execution:test --args='tests/live-capability.test.ts'` → exit 0, 1/1. A real temporary workspace proves the Node adapter returns typed `UnsupportedDurability(noFollowPaths)` before managed read/publication/cleanup, and `lstat(<workspace>/.effectify)` remains `ENOENT`. |
| Cleanup evidence                                  | The live harness removes its temporary workspace in `finally`; it creates no managed state. `Cleanup.cleanup` returns `CleanupPreserved(UnsupportedDurability)` before deletion is attempted.                                                                                                                    |
| Rollback boundary                                 | Revert `DraftStore`, draft layouts, encoded commit validation, recovery correspondence checks, no-follow capability preflight, their tests, README, and R1–R4 task lines. Preserve every existing `/.effectify/` byte.                                                                                           |

### Diagnosis and Process Evidence

- F1 was caused by a contracts schema without a managed durable draft adapter; `DraftStore` is CLI-agnostic and decodes untrusted material before it asks the filesystem to create any directory.
- F2 was caused by validating each segment internally while accepting a digest-linked but lifecycle-disconnected successor; recovery now replays from the exact preceding result and matches all historical prior-result records to an earlier segment.
- F3 was caused by treating `Encoded.value` as authority while writing its independently constructible `bytes`; commit now requires value/text/bytes equality and validates both digests before `prepareRunJournalDirectory`.
- F4 was caused by Node path-string APIs advertising no-follow safety that they cannot prove against TOCTOU substitution. The live adapter now exposes `noFollowPaths: false` and rejects every operation with typed `UnsupportedDurability`; supported adapters must provide directory-handle-relative proof.
- No lock/executor, CLI behavior, automatic repair/salvage/migration/quarantine, database, native review, independent SDD verification, commit, push, PR, archive, or runtime-authority lifecycle action was introduced.

### Line Budget

- Native candidate lifetime: **3,000 changed lines**.
- Baseline supplied by the maintainer: **2,807 changed lines**.
- Remediation delta: **193 changed lines** against the **993-line** hard additional allowance.
- Remaining allowance: **800 changed lines**. The remediation is within budget.

### Runtime Authority Settlement Evidence

- **request_id**: `apply-store-recovery-remediation-20260731`
- **work_unit**: `pre-verify-four-finding-remediation`
- **evidence_goal**: `strict-tdd-drafts-chain-canonical-bytes-and-no-follow`
- **token**: `sha256:c6d1c4f1043a8352c21f759505bc8a5f3a09908775ff8fbd146854ef8488cdab`
- **evidence_revision**: `sha256:fcf255cd8be441e74468fcb986b0e9e4546d87076827296f976bdf7870c4c292`
- **authority_actions_invoked**: `[]`
- **settlement**: `not-invoked-by-apply`

No `gentle-ai.remediation-result/v1` all-done receipt was emitted: the supplied authority context does not include the required persisted `lineage_id`, `generation`, mode-specific `fix_batch`, or `failed_evidence_revision`. The implementation evidence is ready for the parent authority to validate and settle without this executor invoking settlement.

## Remaining Tasks

None. Tasks 1.1–4.3 and remediation IDs R1–R4 are marked complete in `tasks.md`.

## Final Correction: F3 Canonical Byte Equality

**Execution mode**: Strict TDD  
**Delivery**: `auto-chain` / `feature-branch-chain`, bounded correction within the current child  
**Evidence revision**: `sha256:933eb1940af7110cd0f0f1414c1e75a431a6eb23f47e710cdf280a25d5e17900` over the ordered path-and-SHA-256 manifest for `run-store.ts`, `run-store.test.ts`, and `tasks.md`; this self-referential progress artifact is excluded.
**Line allowance**: 107 additions, 9 deletions, 116 changed lines of the 183-line hard allowance (67 remaining), across source, test, task ledger, and progress evidence.

### Completed Correction

- [x] R3b / F3: Compare journal and snapshot `Encoded.bytes` byte-for-byte with canonical JSON bytes of their schema-validated decoded values before any `DurableFileSystem` service acquisition; preserve existing typed failures.
- [x] R3b / F3: Add separate journal and snapshot regressions where malformed `0xff` replaces canonical UTF-8 `U+FFFD`, `TextDecoder` still produces the canonical text, and the durable operation log remains empty.

### Strict TDD Cycle Evidence

| Task     | Test file                           | Layer                            | Safety net                                                                                         | RED                                                                                        | GREEN                      | TRIANGULATE                                        | REFACTOR                                                                          |
| -------- | ----------------------------------- | -------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | -------------------------- | -------------------------------------------------- | --------------------------------------------------------------------------------- |
| R3b / F3 | `execution/tests/run-store.test.ts` | Deterministic Effect integration | `pnpm nx run @effectify/app-builder-execution:test --args='tests/run-store.test.ts'` → exit 0, 7/7 | Same command → exit 1, 7 passed / 2 failed; malformed journal and snapshot bytes committed | Same command → exit 0, 9/9 | Separate journal and snapshot malformed-byte cases | Extracted `sameBytes`; no lossy `TextDecoder` remains in the production preflight |

### Work Unit Evidence

| Evidence                                          | Result                                                                                                                                                                                                                                                      |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focused test command and exact result             | `pnpm nx run @effectify/app-builder-execution:test --args='tests/run-store.test.ts'` → exit 0; 1/1 file, 9/9 tests.                                                                                                                                         |
| Focused typecheck                                 | `pnpm nx typecheck @effectify/app-builder-execution` → exit 0.                                                                                                                                                                                              |
| Runtime harness command/scenario and exact result | The focused Effect integration command above executes `RunStore.commit` with each malformed journal/snapshot input and a deterministic durable-service log; both reject with `MalformedPersistenceFormat` before service acquisition, logging exactly `[]`. |
| Rollback boundary                                 | Revert only `execution/src/run-store.ts`, `execution/tests/run-store.test.ts`, and the R3b task/progress entries; preserve all existing `/.effectify/` evidence bytes.                                                                                      |

### Runtime Authority Settlement Evidence

- request_id: `apply-store-recovery-f3-byte-equality-20260731`
- work_unit: `canonical-byte-equality-correction`
- evidence_goal: `strict-tdd-malformed-utf8-journal-and-snapshot-zero-write`
- token: `sha256:8201098c01962795069c0c192eedcea3abe2f5a038d7b1488980f7d3fdc8bc59`
- lineage_id, generation, fix_batch, and failed_evidence_revision: not supplied in the acquired authority context.
- authority_actions_invoked: `[]`; settlement: `not-invoked-by-apply`.

No all-done remediation receipt is emitted because the required persisted settlement fields are unavailable. No runtime authority lifecycle action was invoked.
