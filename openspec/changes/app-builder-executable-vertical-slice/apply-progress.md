# Apply Progress: Unit 1 — POSIX Adapter Conformance

**Status:** All tasks 1.1–2.5 are complete locally (10/10). Ordinal 6 completed within its authoritative 500-line cap. RDD remains disabled, so no review receipt, commit, delivery, or release claim is recorded.

## Completed Tasks

- [x] 1.1 ABI fixtures select exactly Darwin x64/arm64 and glibc Linux x64/arm64, rejecting unsupported runtimes.
- [x] 1.2 Koffi 3.1.4 bindings, direct dependency declaration, guarded smoke harness, and Nx demo target wiring.
- [x] 1.3 Deterministic adapter conformance tests for no-follow modes, EINTR/partial I/O, sync order, DIR ownership, publication failures, and sentinel rollback.
- [x] 1.4 Handle-relative POSIX durable filesystem wired behind the unchanged public contract.
- [x] 1.5 Formatter normalization and local acceptance evidence.

## TDD Cycle Evidence

| Task | Test file                                                            | Safety net                       | RED                                                                                     | GREEN                                                                 | REFACTOR                                                             |
| ---- | -------------------------------------------------------------------- | -------------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------- |
| 1.1  | `tests/posix-abi.test.ts`                                            | N/A (new)                        | `test ...posix-abi.test.ts` exited 1 before module creation                             | 3/3 passed                                                            | Profile fixtures centralized in `posix-abi.ts`                       |
| 1.2  | `tests/posix-abi.test.ts`                                            | N/A (new)                        | Reused the 1.1 missing-module RED contract                                              | Koffi layouts validated at binding construction; guarded smoke passed | Koffi-owned optional platform packages remain transitive             |
| 1.3  | `tests/posix-durable-file-system.test.ts`                            | Package baseline: 115/115 passed | Targeted test exited 1 before adapter creation                                          | 10/10 passed                                                          | Deterministic in-memory binding seam; no sleeps                      |
| 1.4  | `tests/durable-file-system.test.ts`, `tests/live-capability.test.ts` | Package baseline: 115/115 passed | Existing fail-closed adapter assertion failed after public contract expectation changed | Live adapter and private journal hierarchy passed                     | Unchanged `DurableFileSystemService` contract                        |
| 1.5  | All Unit 1 tests                                                     | N/A                              | N/A — evidence/refactor task                                                            | 128/128 package tests passed                                          | `pnpm nx run @effectify/repo:format` completed before final evidence |

## Work Unit Evidence

| Evidence          | Exact result                                                                                                                                                                                                   |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focused test      | `pnpm nx run @effectify/app-builder-execution:test -- tests/posix-abi.test.ts tests/posix-durable-file-system.test.ts` → exit 0; 2 files, 13 tests passed                                                      |
| Full package test | `pnpm nx run @effectify/app-builder-execution:test` → exit 0; 20 files, 128 tests passed                                                                                                                       |
| Lint              | `pnpm nx run @effectify/app-builder-execution:lint` → exit 0; one pre-existing warning in `src/workspace-lock.ts`                                                                                              |
| Typecheck         | `pnpm nx run @effectify/app-builder-execution:typecheck` → exit 0                                                                                                                                              |
| Runtime harness   | `node packages/app-builder/execution/demo/deny-network.cjs -- pnpm nx run @effectify/app-builder-execution:posix-smoke` → exit 0 on local Darwin arm64; private no-follow write and no-replace readback passed |
| Formatting        | `pnpm nx run @effectify/repo:format` → exit 0 before final verification                                                                                                                                        |
| Diff safety       | `git diff --check` and `git diff --no-index --check` for every new Unit 1 file → exit 0                                                                                                                        |
| Rollback boundary | Revert Koffi dependency/lock entries, `src/internal/posix-*`, public adapter wiring, smoke target/demo, and their tests together; Unit 2 executable workflow/report/CI files remain untouched                  |

## Mandatory CI Evidence Pending

- macOS x64 smoke result.
- glibc Linux x64 smoke result.
- glibc Linux arm64 smoke result.

## Attempt 1 Budget History (superseded)

- Charged cap: 950 changed lines.
- Current implementation estimate: 2,026 changed lines (tracked additions/deletions plus new Unit 1 source/test/config files; OpenSpec artifacts excluded).
- Historical result: this attempt was unresolved at the time. Its budget state is superseded by the maintainer-approved 1,700 cap and ordinal 4 terminal closure.

## Attempt 2: Size Reduction (`unit-1-posix-size-reduction`)

**Native objective:** revision `sha256:b5bd97ed76e403856854c0af6d316bb87c4969f91f011016ee571571c321cbee`, ordinal 2; reduce the Unit 1 candidate from 2,310 to 1,500 changed lines or fewer without weakening behavior. This historical unresolved objective is superseded by the approved 1,700 cap and ordinal 4 closure.

### Audit and justified reductions

- Replaced repeated field-object ABI declarations with compact, reviewable `name:type:offset[:length]` layout tables. All exact offsets, widths, padding lengths, profile rejection, symbols, errno, modes, and flags remain explicit.
- Extracted the common sentinel exchange, restore, cleanup, and parent-sync path into `withSentinel`. The preserved metadata mutation operation names prevent an error-contract regression.
- Retained every test; no test was removed because the remaining explicit scenarios are not redundant.
- The package-manager update introduced unrelated resolver churn. A pure `koffi@3.1.4` lockfile update was measured separately at 144 added lines; it is not yet applied because this pass must not replace the lockfile through an unreviewed broad rewrite.

### Measured size

| Accounting area                                                                | Current lines |
| ------------------------------------------------------------------------------ | ------------: |
| Tracked diff (`git diff --numstat`, additions plus deletions)                  |           526 |
| New Unit 1 implementation/test/demo/config files                               |         1,386 |
| **Current reproducible candidate**                                             |     **1,912** |
| Current lockfile contribution                                                  |           380 |
| Pure Koffi-only lockfile contribution, separately reconstructed from `HEAD`    |           144 |
| **Audited defensible floor after lockfile normalization**                      |     **1,676** |
| OpenSpec tasks and apply-progress artifacts (outside implementation candidate) |            88 |

Historical conclusion: the 1,676-line floor was 176 lines above the then-active 1,500 objective. That objective was superseded by the maintainer-approved 1,700 cap; the final candidate is now closed.

### Attempt 2 verification

| Evidence              | Exact result                                                                                                                                           |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Focused tests         | `pnpm nx run @effectify/app-builder-execution:test -- tests/posix-abi.test.ts tests/posix-durable-file-system.test.ts` → exit 0; 13/13 passed          |
| Full package tests    | `pnpm nx run @effectify/app-builder-execution:test` → exit 0; 20 files, 128/128 passed                                                                 |
| Lint                  | `pnpm nx run @effectify/app-builder-execution:lint` → exit 0; one pre-existing `workspace-lock.ts:303` warning                                         |
| Typecheck             | `pnpm nx run @effectify/app-builder-execution:typecheck` → exit 0                                                                                      |
| Guarded runtime smoke | `node packages/app-builder/execution/demo/deny-network.cjs -- pnpm nx run @effectify/app-builder-execution:posix-smoke` → exit 0 on local Darwin arm64 |
| Diff check            | Tracked and every Unit 1 untracked file passed `git diff --check` / no-index whitespace checks                                                         |

### Attempt 2 Work Unit Evidence

| Evidence                                          | Required value                                                                                                                                           |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focused test command and exact result             | Focused ABI and adapter test command above; 13/13 passed                                                                                                 |
| Runtime harness command/scenario and exact result | Guarded local Darwin arm64 smoke creates a private no-follow file and reads it back with no-replace behavior; exit 0                                     |
| Rollback boundary                                 | Revert the compact ABI tables and sentinel helper together with the Unit 1 adapter, binding, smoke, dependency, and test files; Unit 2 remains untouched |

## Attempt 3: Koffi Lockfile Normalization (`unit-1-posix-size-reduction`)

**Native objective:** revision `sha256:cf36aa8de7843981a15bf3e431c797695d2a4aa8af859ef640cf71c4c2df0d00`, ordinal 3; normalize the Koffi dependency lockfile and finish Unit 1 at or below 1,700 changed lines. This evidence was reused by the ordinal 4 terminal closure.

- Replaced the resolver-churn lockfile variant with the audited Koffi-only lockfile update.
- `package.json` declares `koffi: 3.1.4` as the only direct native dependency; the lockfile retains 15 Koffi-owned optional platform packages plus their optional snapshots.
- `pnpm install --frozen-lockfile --offline --ignore-scripts` completed successfully, confirming lockfile consistency without network access.

### Final reproducible candidate

| Accounting area                                                                 |     Added | Deleted |     Total |
| ------------------------------------------------------------------------------- | --------: | ------: | --------: |
| Tracked non-lockfile Unit 1 diff                                                |        33 |     113 |       146 |
| Koffi-only `pnpm-lock.yaml` diff                                                |       144 |       0 |       144 |
| New Unit 1 implementation/test/demo/config files                                |     1,386 |       0 |     1,386 |
| **Final Unit 1 candidate**                                                      | **1,563** | **113** | **1,676** |
| OpenSpec tasks/apply-progress artifacts, excluded from implementation candidate |       132 |       0 |       132 |

**Cap result:** 1,676 is 24 lines below the approved 1,700 hard cap.

### Attempt 3 Work Unit Evidence

| Evidence                                          | Exact result                                                                                                                                                 |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Focused test command and exact result             | `pnpm nx run @effectify/app-builder-execution:test -- tests/posix-abi.test.ts tests/posix-durable-file-system.test.ts` → exit 0; 2 files, 13/13 tests passed |
| Full package test                                 | `pnpm nx run @effectify/app-builder-execution:test` → exit 0; 20 files, 128/128 tests passed                                                                 |
| Lint                                              | `pnpm nx run @effectify/app-builder-execution:lint` → exit 0; one pre-existing warning in `src/workspace-lock.ts:303`                                        |
| Typecheck                                         | `pnpm nx run @effectify/app-builder-execution:typecheck` → exit 0                                                                                            |
| Runtime harness command/scenario and exact result | `node packages/app-builder/execution/demo/deny-network.cjs -- pnpm nx run @effectify/app-builder-execution:posix-smoke` → exit 0 on local Darwin arm64       |
| Lockfile validation                               | `pnpm install --frozen-lockfile --offline --ignore-scripts` → exit 0                                                                                         |
| Diff check                                        | `git diff --check` plus no-index whitespace checks for every Unit 1 untracked file → clean                                                                   |
| Rollback boundary                                 | Revert Koffi package/lockfile entries, POSIX internals, adapter wiring, smoke target/demo, and Unit 1 tests together; Unit 2 remains untouched               |

## Attempt 4: Final Closure (Artifact-only)

- Maintainer closure decision **#5372** authorized the unchanged 1,676-line candidate and a 320-line closure transaction.
- Ordinal 4 closed as an unchanged **0-line no-op**, reusing the final Unit 1 evidence above.
- Native runtime terminal evidence revision: `sha256:ebd519153ae44b5786ef63b7bb00b97e4f141a1063ef9b2ef21e722e15d4dafc`.
- Native terminal revision: `sha256:08c3f3e348eed957785f58358e9c661fe32c7ecda9c2508fcf56aca58f6dc359`.
- Native state: `complete: true`, `decision_required: false`, `next_action: complete`.

**Historical state:** Unit 1 remained complete locally before Unit 2 began. This statement is superseded by the authoritative ordinal-6 completion state below.

**Historical next recommendation:** Unit 1 candidate review/delivery. Superseded by the Unit 2 local completion below.

## Unit 2: Executable Workflow and CI (`unit-2-executable-workflow-ci`)

> **Invalidated local evidence:** The initial Unit 2 implementation manually fabricated r4/r5 and cleanup in `demo/operation.ts`. It did not invoke `RunExecutor`, which violates the spec's exclusive r4+ and cleanup ownership rule; it also omitted design-required `demo/report.ts`. All Unit 2 task checkboxes were restored to pending. The earlier Unit 2 evidence below is retained as historical debugging evidence only and MUST NOT be used for completion or delivery.

**Native objective:** revision `sha256:7246d1532608ca201e4605c8c126f20201d3fb778c128a1255cc1ee46da25082`, ordinal 5; maximum 1,200 changed lines. RDD is maintainer-disabled. No native lifecycle command, review, commit, push, PR mutation, merge, release, receipt, or delivery PASS was performed.

### Historical initial results (invalidated)

- [x] 2.1 RED executable operation tests.
- [x] 2.2 GREEN internal pre-cleanup evidence observer and deterministic operation.
- [x] 2.3 RED deterministic report tests.
- [x] 2.4 GREEN approved offline executable target and harness.
- [x] 2.5 CI matrix and local evidence.

### TDD Cycle Evidence

| Task | Test file                                                         | Safety net                  | RED                                                                          | GREEN                                        | Triangulation / refactor                                       |
| ---- | ----------------------------------------------------------------- | --------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------- | -------------------------------------------------------------- |
| 2.1  | `tests/executable-operation.test.ts`                              | Package baseline 128/128    | Missing `demo/operation` → 2 files failed before tests loaded                | 3 operation tests passed                     | Approval, success handoff, and callback-failure paths          |
| 2.2  | `tests/executable-evidence.test.ts`, `tests/run-executor.test.ts` | Existing executor suite 7/7 | Missing evidence module; observer assertion expected `[4, 5]`, received `[]` | Evidence module and executor observer passed | Observer publishes before finalization cleanup                 |
| 2.3  | `tests/executable-report.test.ts`                                 | Package baseline 128/128    | Missing `demo/operation` → test file failed to load                          | 2 report tests passed                        | Stable success report and existing-output failure report       |
| 2.4  | `tests/executable-cli.test.ts`                                    | N/A (new entrypoint)        | Missing `demo/main` → test file failed to load                               | CLI parser and guarded live harness passed   | Explicit workspace/approval and repeated-output negative paths |
| 2.5  | CI matrix static validation                                       | Existing CI preserved       | N/A — structural configuration                                               | Ruby YAML matrix validation passed           | Triangulation skipped: one declarative four-runner matrix      |

### Work Unit Evidence

| Evidence                          | Exact result                                                                                                                                                                                                                                              |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focused tests                     | `pnpm nx run @effectify/app-builder-execution:test -- tests/executable-cli.test.ts tests/executable-evidence.test.ts tests/executable-operation.test.ts tests/executable-report.test.ts tests/run-executor.test.ts` → exit 0; 5 files, 15/15 tests passed |
| Full package tests                | `pnpm nx run @effectify/app-builder-execution:test` → exit 0; 24 files, 136/136 tests passed                                                                                                                                                              |
| Lint                              | `pnpm nx run @effectify/app-builder-execution:lint` → exit 0; pre-existing `src/workspace-lock.ts:303` warning only                                                                                                                                       |
| Typecheck                         | `pnpm nx run @effectify/app-builder-execution:typecheck` → exit 0                                                                                                                                                                                         |
| Guarded executable harness        | `deny-network.cjs -- pnpm nx run @effectify/app-builder-execution:executable -- --workspace <dedicated-temp-dir> --approve` → exit 0; fixed payload and success report produced                                                                           |
| Missing-approval negative harness | Guarded executable without `--approve` → Nx exit 1 (wrapped CLI exit 64); dedicated workspace remained empty                                                                                                                                              |
| Existing-output negative harness  | Guarded second approved executable → exit 1; pre-existing `generated.txt` unchanged and `failure-report.txt` records `stage=output`                                                                                                                       |
| Unit 1 regression                 | Guarded `posix-smoke` → exit 0                                                                                                                                                                                                                            |
| CI static validation              | Ruby YAML parse confirmed `macos-15-intel`, `macos-15`, `ubuntu-24.04`, and `ubuntu-24.04-arm` matrix runners                                                                                                                                             |
| Diff check                        | `git diff --check` and no-index checks for Unit 2 untracked files → clean                                                                                                                                                                                 |
| Rollback boundary                 | Revert executable demo/evidence/tests, executor observer seam, executable Nx target, and executable CI job together; Unit 1 adapter remains independent                                                                                                   |

### Ordinal 5 line count

| Area                                            |   Lines |
| ----------------------------------------------- | ------: |
| New Unit 2 demo/evidence/test files             |     332 |
| CI job                                          |      35 |
| `project.json` delta beyond the Unit 1 baseline |       7 |
| Executor observer seam                          |      17 |
| Executor observer test                          |      21 |
| **Total Unit 2 candidate**                      | **412** |

**Budget result:** 412 changed lines, within the 1,200-line maximum.

### Correction attempt: production executor integration

- Replaced the manual r4/r5 implementation with `RunExecutor.make`, a real `WorkspaceLock`, real `RunStore` commits, and `CleanupFinalization`.
- Added `demo/report.ts`, moved stable report rendering there, and made the executor pre-cleanup hook surface a typed `FinalizationPreserved` failure so receipt failure can stop cleanup/success.
- Focused deterministic tests now pass 5 files / 17 tests, including evidence that `RunExecutor` performs `removeTreeIfUnchanged` only after pre-cleanup evidence and that receipt/cleanup failures preserve the run tree and write truthful failure reports.
- The guarded live executable harness fails at the second durable run-store commit: `TailConflict` expects r1 but reads no journal tail. Investigation proved that Koffi returns a `BigInt` pointer from `readdir`; the current POSIX binding treats it as a record and returns an empty directory listing. Koffi requires `koffi.decode(pointer, direntType)`.

### Historical blocked state (resolved by ordinal 6)

- The Unit 1 Koffi `readdir` pointer-decoding defect blocked the first production executor harness at durable revision 2. This state is resolved below.

## Ordinal 6: POSIX `readdir` Remediation and Unit 2 Completion

**Native objective:** revision `sha256:423c92ec177a4c277cb10215ab8269dd55e70d0ca5a52aa045c7911d090ac467`, ordinal 6; maximum 500 changed lines relative to the preserved partial Unit 2 baseline. RDD remains disabled; no native lifecycle command was called.

### Remediation TDD Evidence

| Work                                  | RED                                                                                                                                                                                                                                 | GREEN                                                                                                                                                                                                            |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Live directory enumeration            | `tests/posix-readdir.live.test.ts` failed: raw Koffi `readdir` returned a `BigInt` pointer, direct `koffi.decode(pointer, direntType)` found `journal-entry.json`, but `DurableFileSystem.makeLive().readDirectory()` returned `[]` | Changed the binding return to `void *` and decoded the non-null pointer with `koffi.decode(pointer, direntType)`; the live test passed 1/1                                                                       |
| Unit 2 production executor correction | Historical initial tests had RED missing-module/observer failures, but the first GREEN implementation was invalidated because it manually emitted r4/r5                                                                             | The corrected operation now persists/reloads a durable draft, commits r1–r3 via `RunStore`, hands exact Ready r3 to `RunExecutor`, lets it own r4/r5 and cleanup, and records typed pre-cleanup failure evidence |

### Final Work Unit Evidence

| Evidence                   | Exact result                                                                                                                                                                                                                                              |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Normalization              | `pnpm nx run @effectify/repo:format` → exit 0                                                                                                                                                                                                             |
| Focused Unit 1 regression  | `pnpm nx run @effectify/app-builder-execution:test -- tests/posix-readdir.live.test.ts` → exit 0; 1 file, 1/1 test passed                                                                                                                                 |
| Focused Unit 1 suite       | `pnpm nx run @effectify/app-builder-execution:test -- tests/posix-abi.test.ts tests/posix-durable-file-system.test.ts` → exit 0; 2 files, 13/13 tests passed                                                                                              |
| Focused Unit 2 suite       | `pnpm nx run @effectify/app-builder-execution:test -- tests/executable-cli.test.ts tests/executable-evidence.test.ts tests/executable-operation.test.ts tests/executable-report.test.ts tests/run-executor.test.ts` → exit 0; 5 files, 17/17 tests passed |
| Full package tests         | `pnpm nx run @effectify/app-builder-execution:test` → exit 0; 25 files, 139/139 tests passed                                                                                                                                                              |
| Lint                       | `pnpm nx run @effectify/app-builder-execution:lint` → exit 0; one pre-existing `src/workspace-lock.ts:303` warning                                                                                                                                        |
| Typecheck                  | `pnpm nx run @effectify/app-builder-execution:typecheck` → exit 0                                                                                                                                                                                         |
| Guarded POSIX smoke        | `node packages/app-builder/execution/demo/deny-network.cjs -- pnpm nx run @effectify/app-builder-execution:posix-smoke` → exit 0                                                                                                                          |
| Guarded executable success | Guarded `executable -- --workspace <temp> --approve` → exit 0; fixed payload, r1–r4, terminal r5, and output digest reported; executor run tree removed                                                                                                   |
| Missing-approval negative  | Guarded `executable -- --workspace <empty-temp>` → Nx exit 1 (CLI exit 64); workspace remained empty                                                                                                                                                      |
| Existing-output negative   | Guarded second approved invocation → exit 1; `generated.txt` unchanged and `failure-report.txt` contains `stage=output`                                                                                                                                   |
| CI static validation       | Ruby YAML parse confirmed `macos-15-intel`, `macos-15`, `ubuntu-24.04`, and `ubuntu-24.04-arm` runners                                                                                                                                                    |
| Diff checks                | `git diff --check` and no-index checks for all new source/test files → clean                                                                                                                                                                              |
| Rollback boundary          | Revert the `readdir` pointer decode with its live regression test; separately revert executable demo/report/evidence/tests, executor observer seam, executable target, and CI job together                                                                |

### Line Accounting

| Scope                                               |         Lines |
| --------------------------------------------------- | ------------: |
| Historical local remediation estimate               |      66 / 500 |
| **Authoritative ordinal 6 changed lines**           | **498 / 500** |
| Cumulative Unit 2 new demo/evidence/test files      |           642 |
| Cumulative Unit 2 tracked target/CI/executor deltas |            82 |
| **Cumulative Unit 2 implementation total**          |       **724** |

### Authoritative Completion State

- [x] 2.1 RED executable operation coverage.
- [x] 2.2 GREEN production `RunExecutor` ownership and pre-cleanup evidence.
- [x] 2.3 RED deterministic reports and no-replace output coverage.
- [x] 2.4 GREEN guarded approved executable command and failure reports.
- [x] 2.5 CI matrix and local acceptance evidence.

**Native evidence revision:** `sha256:c6f4c886bdb7f08d60f7755392defcd48f5fcbc2c29640e32a5ec92166a60cae`.

**Native terminal revision:** `sha256:18f76ac3584d3ae3eaa4a2930102846c70399391a8c9b2ab096cc34a9cd5e983`.

**Native terminal state:** `complete=true`, `decision_required=false`, `next_action=complete`.

**Residual limitations:** real non-local CI remains pending for macOS x64 and glibc Linux x64/arm64. RDD is disabled, so no review receipt, commit, delivery, or release result exists.

**Next recommendation:** final SDD apply-contract validation, then independent SDD verify readiness/verification. Delivery remains blocked by RDD.

## Ordinal 8: Local Verification Scenario Completion

**Native objective:** revision `sha256:b994a32b43b5a63a2c00229592700bcd22c8a7611ea5caf7cd55a3455de3512d`, ordinal 8; maximum 300 changed lines. RDD remains disabled: no native lifecycle, review receipt, commit, delivery, or release action was invoked.

### Strict TDD Cycle Evidence

| Work                              | Safety net                                                       | RED                                                                                                                                             | GREEN                                                                                                               | REFACTOR                                                                                                                                                                                                |
| --------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| r1–r3 durable preparation commits | `tests/executable-operation.test.ts` → 5/5 existing tests passed | Added r1/r2 failure cases before the seam; focused command exited 1 because r1 incorrectly returned Success. Added the r3 case while still RED. | `tests/executable-operation.test.ts tests/executable-determinism.live.test.ts` → exit 0; 2 files, 9/9 tests passed. | Added the narrow optional `failPreparationCommitAt` test seam immediately before the selected `RunStore.commit`; prior journal evidence remains durable and executor/Ready handoff remains unreachable. |
| Two clean real workspaces         | N/A (new live scenario)                                          | The new scenario initially failed because `mkdtemp()` paths were not canonicalized like the CLI workspace input.                                | Same focused command → exit 0; byte-identical `generated.txt` and path-free byte-identical `success-report.txt`.    | Canonicalized the two test workspace paths with `realpath()`; no production determinism code changed.                                                                                                   |

### Work Unit Evidence

| Evidence             | Exact result                                                                                                                                                                                                                                                                                                           |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Formatting           | `pnpm nx run @effectify/repo:format` → exit 0                                                                                                                                                                                                                                                                          |
| Focused tests        | `pnpm nx run @effectify/app-builder-execution:test -- tests/executable-operation.test.ts tests/executable-determinism.live.test.ts --reporter=verbose` → exit 0; 2 files, 9/9 tests passed                                                                                                                             |
| Unit 2 focused suite | `pnpm nx run @effectify/app-builder-execution:test -- tests/executable-cli.test.ts tests/executable-evidence.test.ts tests/executable-operation.test.ts tests/executable-report.test.ts tests/run-executor.test.ts tests/executable-determinism.live.test.ts --reporter=verbose` → exit 0; 6 files, 21/21 tests passed |
| Full package tests   | `pnpm nx run @effectify/app-builder-execution:test --reporter=verbose` → exit 0; 26 files, 143/143 tests passed                                                                                                                                                                                                        |
| Lint                 | `pnpm nx run @effectify/app-builder-execution:lint` → exit 0; 3 warnings only: existing `src/workspace-lock.ts` warning plus two generated `dist-demo` copies                                                                                                                                                          |
| Typecheck            | `pnpm nx run @effectify/app-builder-execution:typecheck` → exit 0                                                                                                                                                                                                                                                      |
| Build                | `pnpm nx run @effectify/app-builder-execution:build` → exit 0                                                                                                                                                                                                                                                          |
| Runtime harness      | Guarded `executable -- --workspace <first-clean-temp> --approve` and a second guarded clean workspace run → both exit 0; `cmp` proved byte-identical `generated.txt` and `success-report.txt`, and both reports excluded their workspace path                                                                          |
| Diff safety          | `git diff --check` plus no-index whitespace checks for `demo/operation.ts`, `executable-operation.test.ts`, and `executable-determinism.live.test.ts` → clean                                                                                                                                                          |
| Rollback boundary    | Revert the `failPreparationCommitAt` seam in `demo/operation.ts` with the r1–r3 operation tests and deterministic live test; all prior Unit 2 executor, report, target, CI, and POSIX behavior remains independent                                                                                                     |

### Line Accounting and Result

| Scope                           |   Added | Deleted |         Total |
| ------------------------------- | ------: | ------: | ------------: |
| `demo/operation.ts` seam        |       7 |       0 |             7 |
| r1–r3 operation tests           |      70 |       0 |            70 |
| deterministic live test         |      31 |       0 |            31 |
| **Ordinal 8 source/test delta** | **108** |   **0** | **108 / 300** |

- Tasks 1.1–2.5 remain visibly complete in `tasks.md` (10/10).
- Real non-local CI remains pending for macOS x64 and glibc Linux x64/arm64; this local verification does not claim those profiles passed.
- The prior ordinal-6 authoritative terminal state remains the recorded native completion state. Ordinal 8 adds local verification evidence only.

## Ordinal 12: Clean-checkout Dependency Pipeline Remediation

**Status:** The three-line configuration correction is locally proven in a fresh sibling worktree. Native runtime attempt 12 remains active; this executor did not begin, reset, or finish an attempt.

### Proven Root Cause

`@effectify/app-builder-contracts` exports declarations only from `dist/src/index.d.ts`. A clean checkout has no such file. The `build` target already declared `dependsOn: ["^build"]`, but `typecheck`, `posix-smoke`, and `executable` did not, so their TypeScript compilations ran before the static `@effectify/app-builder-contracts` dependency was built. The missing-declaration error caused the downstream `never` diagnostics; no source type cast is warranted.

### Strict TDD Cycle Evidence

| Task                         | Layer                      | Safety Net                                                          | RED                                                                                                                                                              | GREEN                                                                  | TRIANGULATE                                                                                 | REFACTOR                                                         |
| ---------------------------- | -------------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| CI dependency build ordering | Clean-checkout integration | Fresh worktree at `b69b721`; contracts declaration confirmed absent | Exact affected typecheck, guarded POSIX smoke, and guarded executable commands each exited 1 with TS2307 for contracts and `run-executor.ts:262` `never` cascade | Same commands exited 0 after target dependencies built contracts first | Three independent consumers prove the same prerequisite: typecheck, POSIX smoke, executable | Added only `dependsOn: ["^build"]` to the three consumer targets |

### Work Unit Evidence

| Evidence                    | Exact result                                                                                                                                                                                                                                                                                             |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focused configuration check | `pnpm nx show project @effectify/app-builder-execution --json` reports `dependsOn: ["^build"]` for `typecheck`, `posix-smoke`, and `executable`; candidate config matches the primary worktree byte-for-byte                                                                                             |
| Focused tests               | `pnpm nx run @effectify/app-builder-execution:test -- tests/posix-abi.test.ts tests/executable-cli.test.ts --reporter=verbose` → exit 0; 2 files, 4/4 tests passed                                                                                                                                       |
| Exact affected typecheck    | Fresh clean worktree: `pnpm nx affected --target=typecheck --base=origin/feat/app-builder-run-lock-executor --head=HEAD --parallel=1 --verbose` → exit 0; Nx ran `@effectify/app-builder-contracts:build` before execution typecheck and completed 28 projects / 17 dependencies                         |
| Exact guarded POSIX smoke   | Fresh clean worktree after removing contract dist: `node packages/app-builder/execution/demo/deny-network.cjs -- pnpm nx run @effectify/app-builder-execution:posix-smoke` → exit 0; Nx built contracts first. Repeated with `NX_SKIP_NX_CACHE=true` → exit 0 and compiled contracts without cache reuse |
| Exact guarded executable    | Fresh clean worktree after removing contract dist: `node packages/app-builder/execution/demo/deny-network.cjs -- pnpm nx run @effectify/app-builder-execution:executable -- --workspace <clean-temp> --approve` → exit 0; contracts built first and `generated.txt` plus `success-report.txt` existed    |
| Formatting                  | `pnpm exec oxfmt --check packages/app-builder/execution/project.json` → exit 0                                                                                                                                                                                                                           |
| Rollback boundary           | Revert the three `dependsOn: ["^build"]` entries in `packages/app-builder/execution/project.json`; source, public APIs, and existing task completion remain untouched                                                                                                                                    |

### CI Evidence Pending

- Run 31018934264 remains failed evidence only; all four matrix jobs and affected typecheck independently failed before smoke execution with the same missing-contract declaration.
- A new CI run is required to prove macOS x64/arm64 and glibc Linux x64/arm64. This local remediation makes no claim about those non-local runtimes.

### Line Accounting

- Production correction: `packages/app-builder/execution/project.json` +3/-0 lines, within the 200-line remediation cap.
- Existing tasks remain 10/10 checked; this bounded pipeline correction requires no task checkbox change.

## Ordinal 13: Fresh-Clean Test Target Diagnosis

**Status:** The final verifier recorded two independent failures. The first was procedural; the second was a real candidate configuration defect. No native review or SDD-attempt lifecycle command was invoked, and abandoned lineage `review-a36ec2588cd32df8` was not used.

### Root Cause and Correct Invocation

- `--skip-nx-cache` after Nx's `--` delimiter is forwarded to Vitest, which exits with `CACError: Unknown option \`--skipNxCache\``. Nx 23.1.0 help documents the flag as an Nx option; it must precede `--`.
- The verifier's second command used valid Nx flag placement. Its file-load failure was candidate-caused: `test` lacked `dependsOn: ["^build"]`, so a clean checkout could not resolve `@effectify/app-builder-contracts` from its absent `dist` entry point. `posix-abi.test.ts` passed 3/3 because it does not import the contracts-dependent execution path; `executable-cli.test.ts` imports it through `recovery.ts`.
- Preferred cache-disabled focused command: `env NX_SKIP_NX_CACHE=true pnpm nx run @effectify/app-builder-execution:test -- tests/posix-abi.test.ts tests/executable-cli.test.ts --reporter=verbose`. The environment avoids forwarding a cache flag to Vitest.

### Strict TDD Cycle Evidence

| Task                                 | Layer                      | Safety Net                                                                     | RED                                                                                                                                                                                        | GREEN                                                                                                         | TRIANGULATE                                                                                         | REFACTOR                                                    |
| ------------------------------------ | -------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Fresh-clean test dependency ordering | Clean-checkout integration | Primary focused command passed 4/4 while existing contracts `dist` was present | Fresh sibling worktree at `b69b721d9`, with no contracts/execution `dist`, exited 1: `executable-cli.test.ts` failed to resolve `@effectify/app-builder-contracts`; POSIX ABI remained 3/3 | Added `dependsOn: ["^build"]` to `test`; the same cache-disabled command built contracts first and passed 4/4 | All four contracts consumers now declare the prerequisite: typecheck, test, POSIX smoke, executable | Four declarative lines only; no source, test, or API change |

### Work Unit Evidence

| Evidence                   | Exact result                                                                                                                                                                                  |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fresh-clean RED stderr     | `Error: Failed to resolve entry for package "@effectify/app-builder-contracts"` at `src/recovery.ts:3`; 1 failed file, 1 passed file, 3 passed tests                                          |
| Focused GREEN              | Cache-disabled focused command above → exit 0; contracts built first; 2 files, 4/4 tests passed                                                                                               |
| Affected typecheck         | `env NX_SKIP_NX_CACHE=true pnpm nx affected --target=typecheck --base=origin/feat/app-builder-run-lock-executor --head=HEAD --parallel=1 --verbose` → exit 0; 28 projects and 17 dependencies |
| Full package test          | Cache-disabled package test → exit 0; 26 files, 144/144 tests passed                                                                                                                          |
| Runtime harness            | Cache-disabled guarded POSIX smoke and approved executable → exit 0; executable produced `generated.txt` and `success-report.txt`                                                             |
| Formatting and diff safety | `pnpm exec oxfmt --check packages/app-builder/execution/project.json` and `git diff --check` → exit 0                                                                                         |
| Cleanup and rollback       | Removed generated `dist-demo`, temporary executable workspace, and typecheck `tsbuildinfo`; rollback is the four `dependsOn: ["^build"]` entries only                                         |

### Line Accounting

- Final production correction: `packages/app-builder/execution/project.json` +4/-0 lines, within the 200-line cap.
- Existing tasks remain 10/10 checked; this bounded remediation has no task checkbox delta.
