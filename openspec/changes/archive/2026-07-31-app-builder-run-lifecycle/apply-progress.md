# Apply Progress: App Builder Run Lifecycle

**Mode**: Strict TDD

## Evidence Reconciliation

- **Objective**: `reconcile-apply-evidence` (native attempt ordinal 3)
- **Begin revision**: `sha256:a0d6cf9061de58ef394ae0e8a44aeb90a62e84284e5f408cc37998f92cc3d170`
- **Authority**: maintainer-authorized evidence reconciliation only; no implementation, API, behavior, scope, or test changes are authorized.
- **Historical RED caveat**: the cancelled worker did not retain exact historical RED output. Every RED status below is therefore a **fresh, controlled, reversible proof** run during this objective. It is not represented as evidence of the original authoring order.
- **Budget**: the explicit session review budget is 3,000 changed lines. No 400-line budget applies to this maintainer-authorized reconciliation objective.

## Completed Tasks

- [x] 1.1 Package boundary and Nx targets
- [x] 1.2 Root-only public-surface RED tests
- [x] 1.3 Four namespace leaves and public barrel
- [x] 2.1 State/request matrix and failure RED tests
- [x] 2.2 Tagged schemas, failures, and baseline reducer
- [x] 2.3 Normalization and replay RED tests
- [x] 2.4 Normalization, evidence append, replay, and total reducer
- [x] 3.1 Counter, immutability, closure, concurrency, and interruption RED tests
- [x] 3.2 Stateless Effect service and layer
- [x] 4.1 Lifecycle contract and exclusions documentation
- [x] 4.2 Coverage, typecheck, lint, build, and formatting verification

## TDD Cycle Evidence

`✅ Written` means the task's test or structural assertion is present. `RED` records the fresh controlled proof described above; `GREEN` records its restored, passing command. Command identifiers resolve verbatim in [Reproducible Commands](#reproducible-commands).

| Task ID | Test File                                                                        | Layer         | Safety Net                                                    | RED                                                                                                                                                                                            | GREEN                                                                                                                         | TRIANGULATE                                                                                                     | REFACTOR                                              |
| ------- | -------------------------------------------------------------------------------- | ------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| 1.1     | `packages/app-builder/execution/project.json` (inline structural assertion)      | Structural    | ✅ Passed — C1 exit 0; five required targets found            | ✅ Written — renamed only `test` target to `test-controlled-red`; C1 exit 1: `Missing target: test`                                                                                            | ✅ Passed — exact byte restoration; C1 exit 0 and SHA-256 matched                                                             | ✅ 5 target assertions: build, lint, test, coverage, typecheck                                                  | ➖ No refactor; config restored byte-for-byte         |
| 1.2     | `packages/app-builder/execution/tests/public-surface.test.ts`                    | Unit          | ✅ Passed — C2 exit 0; 1 file, 2 tests                        | ✅ Written — removed only root `RunLifecycle` export; C2 exit 1: 1 failed, 1 passed                                                                                                            | ✅ Passed — exact byte restoration; C2 exit 0; 2/2 passed                                                                     | ✅ Root allowlist plus hidden-leaf denial                                                                       | ➖ No refactor; barrel restored byte-for-byte         |
| 1.3     | `packages/app-builder/execution/tests/public-surface.test.ts`                    | Unit          | ✅ Passed — C2 exit 0; 1 file, 2 tests                        | ✅ Written — removed only root `AutomaticPolicy` namespace export; C2 exit 1: 1 failed, 1 passed                                                                                               | ✅ Passed — exact byte restoration; C2 exit 0; 2/2 passed                                                                     | ✅ Four namespace leaves and no internal symbols                                                                | ➖ No refactor; barrel restored byte-for-byte         |
| 2.1     | `packages/app-builder/execution/tests/transition-table.test.ts`                  | Unit          | ✅ Passed — C3 exit 0; 1 file, 4 tests                        | ✅ Written — disabled only the `Draft → Validate` reducer branch; C3 exit 1: 1 failed, 3 passed                                                                                                | ✅ Passed — exact byte restoration; C3 exit 0; 4/4 passed                                                                     | ✅ 80 state/request cells, unknown tag, revision, cancellation, interruption                                    | ➖ No refactor; reducer restored byte-for-byte        |
| 2.2     | `packages/app-builder/execution/tests/transition-table.test.ts`                  | Unit          | ✅ Passed — C3 exit 0; 1 file, 4 tests                        | ✅ Written — withheld only `RevisionConflict` from its public failure namespace; C3 exit 1: 2 failed, 2 passed                                                                                 | ✅ Passed — exact byte restoration; C3 exit 0; 4/4 passed                                                                     | ✅ Closed failure tags and typed result paths                                                                   | ➖ No refactor; failure module restored byte-for-byte |
| 2.3     | `packages/app-builder/execution/tests/lifecycle-laws.test.ts`                    | Unit          | ✅ Passed — C4 exit 0; 1 file, 6 tests                        | ✅ Written — preserved `-0` instead of normalizing it; C4 exit 1: 1 failed, 5 passed                                                                                                           | ✅ Passed — exact byte restoration; C4 exit 0; 6/6 passed                                                                     | ✅ UTF-16 order, duplicate facts/secrets, prior-result variants                                                 | ➖ No refactor; reducer restored byte-for-byte        |
| 2.4     | `packages/app-builder/execution/tests/lifecycle-laws.test.ts`                    | Unit          | ✅ Passed — C4 exit 0; 1 file, 6 tests                        | ✅ Written — replaced exact prior-result replay with `PriorResultMismatch`; C4 exit 1: 1 failed, 5 passed                                                                                      | ✅ Passed — exact byte restoration; C4 exit 0; 6/6 passed                                                                     | ✅ Immutable append, exact replay, unavailable/mismatched/conflicting prior data                                | ➖ No refactor; reducer restored byte-for-byte        |
| 3.1     | `packages/app-builder/execution/tests/{lifecycle-laws,service-boundary}.test.ts` | Unit          | ✅ Passed — C4 exit 0 (6/6) and C5 exit 0 (2/2)               | ✅ Written — removed only counter exhaustion guard: C4 exit 1, 1 failed/5 passed; separately replaced only test-controlled `Effect.interrupt` with `Effect.void`: C5 exit 1, 1 failed/1 passed | ✅ Passed — both exact byte restorations; C4 exit 0 (6/6), C5 exit 0 (2/2)                                                    | ✅ Counter exhaustion, immutable snapshots, terminal closure, concurrent equal results, interruption Exit/Cause | ➖ No refactor; source and test bytes restored        |
| 3.2     | `packages/app-builder/execution/tests/service-boundary.test.ts`                  | Unit          | ✅ Passed — C5 exit 0; 1 file, 2 tests                        | ✅ Written — replaced only `RunLifecycle.layer` with `Layer.empty`; C5 exit 1: 1 failed, 1 passed; missing service was reported                                                                | ✅ Passed — exact byte restoration; C5 exit 0; 2/2 passed                                                                     | ✅ Stateless layer plus pure reducer and interruption boundary                                                  | ➖ No refactor; layer restored byte-for-byte          |
| 4.1     | `packages/app-builder/execution/README.md` (inline documentation assertion)      | Documentation | ✅ Passed — C6 exit 0; 6 required lifecycle/exclusion phrases | ✅ Written — renamed only `## Deliberate exclusions`; C6 exit 1: missing required heading                                                                                                      | ✅ Passed — exact byte restoration; C6 exit 0 and SHA-256 matched                                                             | ✅ Authority, legal table, replay boundary, persistence/process exclusions                                      | ➖ No refactor; README restored byte-for-byte         |
| 4.2     | `packages/app-builder/execution/vitest.config.mts` (coverage target)             | Unit quality  | ✅ Passed — C7 exit 0; 5 files, 18 tests, all thresholds met  | ✅ Written — raised only line threshold from 95 to 101; C7 exit 1 after 18/18 tests passed because lines were 97.96%                                                                           | ✅ Passed — exact byte restoration; C7 exit 0; 18/18 passed, 96.27% statements, 93.96% branches, 100% functions, 97.96% lines | ✅ Five test files cover surface, table, laws, branches, and service                                            | ➖ No refactor; Vitest config restored byte-for-byte  |

## Reproducible Commands

The following commands are exact, executable commands used for the safety-net, fresh RED, and GREEN evidence above.

- **C1** — `node --input-type=module -e 'import { readFile } from "node:fs/promises"; const p=JSON.parse(await readFile("packages/app-builder/execution/project.json","utf8")); const targets=["build","lint","test","test-coverage","typecheck"]; for (const t of targets) if (!p.targets?.[t]) throw new Error("Missing target: "+t); console.log("project targets:",targets.join(","))'`
- **C2** — `pnpm exec vitest run --config packages/app-builder/execution/vitest.config.mts packages/app-builder/execution/tests/public-surface.test.ts`
- **C3** — `pnpm exec vitest run --config packages/app-builder/execution/vitest.config.mts packages/app-builder/execution/tests/transition-table.test.ts`
- **C4** — `pnpm exec vitest run --config packages/app-builder/execution/vitest.config.mts packages/app-builder/execution/tests/lifecycle-laws.test.ts`
- **C5** — `pnpm exec vitest run --config packages/app-builder/execution/vitest.config.mts packages/app-builder/execution/tests/service-boundary.test.ts`
- **C6** — `node --input-type=module -e 'import { readFile } from "node:fs/promises"; const text=await readFile("packages/app-builder/execution/README.md","utf8"); const required=["`RunLifecycle.reduce` is the sole transition authority","## Legal transitions","## Replay and policy boundary","## Deliberate exclusions","does **not** implement persistence or recovery","filesystem, process, clock, or global mutable state"]; for (const phrase of required) if (!text.includes(phrase)) throw new Error("Missing README contract: "+phrase); console.log("README contract phrases:",required.length)'`
- **C7** — `pnpm nx run @effectify/app-builder-execution:test-coverage`

## Work Unit Evidence

| Work unit                | Focused test command and exact result                                                                            | Runtime harness command/scenario and exact result                                                                     | Rollback boundary                                                                                                 |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Lifecycle implementation | `pnpm nx test @effectify/app-builder-execution` — exit 0; 5 files, 18 tests passed                               | `mktemp`-isolated Node consumer import — exit 0; root exposed exactly four namespaces and internal subpath was denied | Revert the additive package, its lockfile importer entry, and its SDD change together; contracts remain untouched |
| Evidence reconciliation  | C1–C7 — all fresh controlled RED mutations were restored and their focused GREEN checks passed as recorded above | N/A — this work unit modifies only evidence; the controlled proofs used no sleeps or external runtime                 | Revert only `openspec/changes/app-builder-run-lifecycle/apply-progress.md` and the matching Engram artifact       |

## Files Changed

| File                                                           | Action   | What was done                                                                                    |
| -------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------ |
| `openspec/changes/app-builder-run-lifecycle/apply-progress.md` | Modified | Replaced incomplete grouped/placeholder evidence with 11 truthful, reproducible strict-TDD rows. |
| `sdd/app-builder-run-lifecycle/apply-progress` (Engram)        | Updated  | Mirrors this final OpenSpec artifact exactly.                                                    |

## Remaining Tasks

None — all 11 implementation tasks are complete; this objective has no implementation work remaining.

## Issues Found

None affecting implementation. An initial README guard used a non-matching phrase and was corrected before any controlled mutation; it is not counted as RED evidence. A root-level Node import could not resolve the unlinked workspace package, so the final import proof uses an isolated temporary consumer symlink and the real package export map.

## Delivery and PR Boundary

- **Delivery**: one lifecycle PR from `feat/app-builder-run-lifecycle` to `feat/app-builder-run-execution-cli`; no further split.
- **Program topology**: `auto-chain` / `feature-branch-chain` describes the parent program topology only; it does not create another lifecycle slice.
- **Current work unit**: evidence reconciliation only.
- **Review budget**: 3,000-line maintainer-authorized session budget; this reconciliation is limited to this artifact and its Engram mirror.

## Final Verification

- `pnpm nx test @effectify/app-builder-execution` — exit 0; 5 files, 18 tests passed.
- `pnpm nx run @effectify/app-builder-execution:test-coverage` — exit 0; 5 files, 18 tests; 96.27% statements, 93.96% branches, 100% functions, and 97.96% lines.
- `pnpm nx run @effectify/app-builder-execution:typecheck` — exit 0.
- `pnpm nx run @effectify/app-builder-execution:lint` — exit 0; 0 warnings and 0 errors.
- `pnpm nx run @effectify/app-builder-execution:build` — exit 0; execution and contracts build targets completed.
- `tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT; mkdir -p "$tmp/node_modules/@effectify"; ln -s "$PWD/packages/app-builder/execution" "$tmp/node_modules/@effectify/app-builder-execution"; cd "$tmp"; node --input-type=module -e 'const root=await import("@effectify/app-builder-execution"); const expected=["AutomaticPolicy","LifecycleFailure","RunLifecycle","TransitionEvidence"]; if (JSON.stringify(Object.keys(root).sort()) !== JSON.stringify(expected)) throw new Error("Unexpected root exports: "+Object.keys(root).sort().join(",")); let denial; try { await import("@effectify/app-builder-execution/lifecycle") } catch (error) { denial=error }; if (denial?.code !== "ERR_PACKAGE_PATH_NOT_EXPORTED") throw new Error("Internal subpath was not denied: "+String(denial)); console.log("public root exports exactly four namespaces; internal subpath denied")'` — exit 0; public root import and subpath denial verified.
- `pnpm nx run @effectify/repo:format:check` — exit 0; all 23 matched files formatted.
- `pnpm nx affected --target=test` — exit 0; 15 projects and 2 dependency tasks passed. The generated `packages/prisma/prisma/dev.db` was restored to its pre-command bytes.
- `git diff --check && git diff --cached --check` — exit 0; clean.
- `find packages/app-builder/execution -type f \( -path '*/src/*' -o -path '*/tests/*' \) -print0 | sort -z | xargs -0 shasum -a 256 | shasum -a 256` — `4be6b1d3e06767bc86d069b2aebfa8fff286e4c23ab730ed2d35a1527fe807fb`, exactly matching objective start. Package metadata, README, and Vitest config SHA-256 values also matched objective start.
- **Scope audit**: the tracked diff remains only `pnpm-lock.yaml` (25 additions, 0 deletions); the untracked OpenSpec and execution-package path set is unchanged from objective start. The reconciliation artifact is 92 lines, below the 300-line objective cap; implementation source/test changed lines: 0.

## Status

11/11 tasks complete. Ready for review.

## Native Remediation Attempt 5 — Pending Parent Binding

- **Authority**: bounded remediation only; ordinal `5`; begin revision `sha256:603cb8a26124cf3b90ffb8c3d3e2970980f8fc248e67318fb78aed7cf558681d`.
- **Failed verification evidence**: `sha256:c2ed124a2596c357227b298368c8197eda3cb7853019bddeeb167d0844167597`.
- **Scope**: reject one prior replay whose valid top-level evidence diverges from its corresponding embedded history evidence. No API, state, policy, persistence, executor, or public-surface change.
- **Changed lines**: `101` additions and `7` deletions (`108` total), within the authorized 150-line cap; parent must bind the exact lineage/generation receipt before the remediation can be considered complete.

### Result Contract

```yaml
schema: gentle-ai.apply-result/v1
change: app-builder-run-lifecycle
artifact_store: hybrid
status: partial
implementation_tasks_complete: 11/11
remediation_attempt_ordinal: 5
failed_evidence_revision: sha256:c2ed124a2596c357227b298368c8197eda3cb7853019bddeeb167d0844167597
authority_revision: sha256:603cb8a26124cf3b90ffb8c3d3e2970980f8fc248e67318fb78aed7cf558681d
next_recommended: parent-bind-remediation-receipt-then-sdd-verify
```

No `gentle-ai.remediation-result/v1` or `gentle-ai.remediation-evidence/v1` receipt is emitted here: the parent owns the required exact lineage ID and generation binding. Emitting guessed receipt fields would make the remediation invalid.

### Strict TDD Cycle Evidence

| Task              | Test file                      | Layer | Safety net                                                                                       | RED                                                                                   | GREEN                                                               | Triangulate                                         | Refactor                                                                  |
| ----------------- | ------------------------------ | ----- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------- |
| 2.4 remediation 5 | `tests/lifecycle-laws.test.ts` | Unit  | `pnpm nx run @effectify/app-builder-execution:test -- tests/lifecycle-laws.test.ts` — 6/6 passed | Added divergent embedded-history cause case; command exited 1 with 1 failed, 6 passed | Added complete `TransitionEvidence` structural equality; 7/7 passed | Added a divergent normalized-facts case; 8/8 passed | Extracted `sameTransitionEvidence`; focused test remained 8/8 after Oxfmt |

### Work Unit Evidence

| Work unit                                | Focused test command and exact result                                                                                | Runtime harness command/scenario and exact result     | Rollback boundary                                                                                     |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Prior-result replay evidence consistency | `pnpm nx run @effectify/app-builder-execution:test -- tests/lifecycle-laws.test.ts` — exit 0; 1 file, 8 tests passed | N/A — pure in-memory reducer with no runtime boundary | Revert `src/lifecycle.ts` helper/check and the two `lifecycle-laws.test.ts` regression cases together |

### Verification Receipts

- `pnpm nx test @effectify/app-builder-execution` — exit 0; 5 files, 21 tests passed.
- `pnpm nx run @effectify/app-builder-execution:test-coverage` — exit 0; 95.86% statements, 94.55% branches, 100% functions, 97.33% lines.
- `pnpm nx run @effectify/app-builder-execution:typecheck`, `:lint`, and `:build` — exit 0.
- `pnpm exec oxfmt --write` and `--check` on the two remediation files — exit 0.
- `pnpm nx affected --target=test` — exit 0; 15 projects and 2 dependency tasks passed. The generated Prisma database change was restored.
- `git diff --check && git diff --cached --check` — exit 0. Repository format check is exit 1 only because the pre-existing `verify-report.md` is unformatted; it was not changed in this bounded remediation.

## Focused Remediation — Deep Immutability (Pending Parent Binding)

- **Authority**: one bounded fix for failed verification evidence `sha256:ab9edc6805356e89b173da9c9f7109f44de386185611b753807be6ea20ead2d6`; no SDD runtime, review, lineage, commit, or push transition was performed.
- **Scope**: clone, schema-decode, and deeply freeze newly returned transition evidence and snapshots so caller-owned nested contract values cannot rewrite them.
- **Changed implementation/test lines**: 92 additions and 9 deletions (101 total), within the authorized 200-line cap.

### Strict TDD Cycle Evidence

| Task                          | Test file                                                     | Layer | Safety net                                                                                               | RED                                                                    | GREEN                                          | Triangulate                                                                              | Refactor                                                                                           |
| ----------------------------- | ------------------------------------------------------------- | ----- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Deep-immutability remediation | `packages/app-builder/execution/tests/lifecycle-laws.test.ts` | Unit  | `pnpm nx run @effectify/app-builder-execution:test -- tests/lifecycle-laws.test.ts` — exit 0; 9/9 passed | Added two mutation probes; command exited 1 with 2 failed and 9 passed | Same focused Nx command — exit 0; 11/11 passed | Caller-owned contract/fact/cause mutation plus returned evidence/history mutation probes | Extracted schema-validated deep-copy/deep-freeze helpers; package suite remained 25/25 after Oxfmt |

### Work Unit Evidence

| Work unit                         | Focused test command and exact result                                                  | Runtime harness command/scenario and exact result                                                      | Rollback boundary                                                                                               |
| --------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| Deep immutable transition results | `pnpm nx run @effectify/app-builder-execution:test` — exit 0; 5 files, 25 tests passed | N/A — pure in-memory reducer with no runtime boundary, I/O, executor, persistence, or external service | Revert `src/lifecycle.ts` and `tests/lifecycle-laws.test.ts` together; no public API or contract package change |

### Verification Receipts

- `pnpm nx run @effectify/app-builder-execution:typecheck` — exit 0.
- `pnpm nx run @effectify/app-builder-execution:lint` — exit 0; 0 warnings and 0 errors.
- `pnpm nx run @effectify/app-builder-execution:build` — exit 0.
- `pnpm exec oxfmt --check packages/app-builder/execution/src/lifecycle.ts packages/app-builder/execution/tests/lifecycle-laws.test.ts` — exit 0.
- `pnpm nx affected --target=test` — exit 0; 15 projects and 2 dependency tasks passed. The generated Prisma database was restored to its prior bytes.
- `git diff --check && git diff --cached --check` — exit 0.

### Ownership and Immutability Semantics

`reduce` now deep-copies schema-backed values before freezing them: evidence copies normalized facts/secrets and request contracts, and the returned snapshot copies its nested state while cloning prior history evidence. The newest history entry intentionally remains the exact same deeply frozen evidence object returned at the result root, preserving the existing transition/replay identity contract without a mutable alias. Caller mutation after reduction cannot alter snapshot, evidence, or history contract references.

### Result Contract

```yaml
schema: gentle-ai.apply-result/v1
change: app-builder-run-lifecycle
artifact_store: hybrid
status: partial
implementation_tasks_complete: 11/11
failed_evidence_revision: sha256:ab9edc6805356e89b173da9c9f7109f44de386185611b753807be6ea20ead2d6
next_recommended: parent-bind-remediation-receipt-then-sdd-verify
```

No `gentle-ai.remediation-result/v1` or `gentle-ai.remediation-evidence/v1` receipt is emitted: the parent owns the required lineage ID, generation, and fix-batch binding. The pre-acquired runtime attempt was not acquired, settled, or otherwise transitioned by this executor.

## Focused Remediation — Lifecycle Replay Invariants

- **Failed evidence revision**: `sha256:f0058065f2f582e8ca9dde83c3191f80a75523bd4c1a2a86480cb011839fb643`.
- **Scope**: evidence normalization only; implementation semantics are unchanged in this stage.
- **Implementation/test delta from candidate tree `1d85d9ecf9dd50f2e7fe8d0a817066260cb4ee2d`**: `34` changed lines in `src/lifecycle.ts` plus `97` additions in `tests/lifecycle-branches.test.ts` = `131` total.
- **Focused command**: `pnpm nx run @effectify/app-builder-execution:test -- tests/lifecycle-branches.test.ts`.

### RED / GREEN Invariants

| Invariant                  | RED at failed evidence                                                   | GREEN remediation evidence                                                  |
| -------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| Draft ownership            | `makeDraft` retained caller-owned contract aliases.                      | Draft contract references are detached and deeply frozen.                   |
| Replay policy request      | `WaitingForApproval` replay accepted a forged top-level `policyRequest`. | Replay requires the top-level policy request to match the persisted result. |
| Replay history consistency | Replay accepted divergent trailing embedded-history evidence.            | Replay rejects history whose corresponding evidence diverges.               |
| Approval normalization     | `RequireApproval` stored original policy facts and secrets.              | The waiting snapshot and result store normalized policy inputs.             |

### Normalization Boundary

Oxfmt is the only command run in this stage, limited to `src/lifecycle.ts`, `tests/lifecycle-branches.test.ts`, and this merged evidence artifact. Tests and checks remain deferred to verification.
