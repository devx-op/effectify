# Verification Report: App Builder Executable Vertical Slice

## Verdict

**PASS** under ordinary disabled/unmanaged policy.

This independent organic repository verification was completed at HEAD
`114f573fbe2402b1a15fd5e6f1663e6f37d245a0`. RDD was explicitly disabled and
unmanaged. No `review.start`, `sdd-attempt`, receipt flow, SDD runtime command,
or native-authority mutation was run. This verdict is not backed by, and does
not claim, a new RDD approval receipt.

| Metric                       |  Result |
| ---------------------------- | ------: |
| Requirements compliant       |   8 / 8 |
| Scenarios compliant          | 16 / 16 |
| Tasks complete and evidenced | 10 / 10 |
| Blocking findings            |       0 |
| GitHub Actions jobs passing  |   9 / 9 |

## Executive Summary

The approved command persists and reloads its draft, durably commits r1-r3,
hands exact Ready r3 to `RunExecutor`, and lets the executor own r4, terminal
evidence, and cleanup. It creates fixed output with no-replace semantics,
exports stable path-free evidence, preserves truthful failure evidence, and
fails closed at lock and durability boundaries.

The prior final report failed because real macOS x64 and glibc Linux x64/arm64
execution evidence did not yet exist. That historical result is superseded:
GitHub Actions run
[`31053129436`](https://github.com/devx-op/effectify/actions/runs/31053129436)
passed all nine jobs for feature HEAD
`114f573fbe2402b1a15fd5e6f1663e6f37d245a0`, including guarded POSIX smoke and
guarded executable execution on all four required platform profiles.

## Verification Policy

| Field              | Value                                                                  |
| ------------------ | ---------------------------------------------------------------------- |
| Policy             | Ordinary repository verification                                       |
| RDD                | Disabled and unmanaged for this execution                              |
| Receipt            | None created, required, referenced as current approval, or fabricated  |
| Native authority   | Unmodified                                                             |
| Verification actor | Independent ordinary-policy verifier, not the `sdd-verify` phase actor |
| Source revision    | `114f573fbe2402b1a15fd5e6f1663e6f37d245a0`                             |

Historical RDD/native-runtime records in `apply-progress.md` remain audit
history only. They are not authority for this ordinary-policy PASS.

## Local Evidence

The following checks were independently rerun with Nx cache disabled where
applicable:

| Check                 | Command                                                                                                                                                                                | Result                                                                  |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Focused POSIX adapter | `env NX_SKIP_NX_CACHE=true pnpm nx run @effectify/app-builder-execution:test -- tests/posix-durable-file-system.test.ts --reporter=verbose`                                            | 1 file, 14 / 14 tests passed                                            |
| Full package          | `env NX_SKIP_NX_CACHE=true pnpm nx run @effectify/app-builder-execution:test -- --reporter=verbose`                                                                                    | 27 files, 148 / 148 tests passed                                        |
| Typecheck             | `env NX_SKIP_NX_CACHE=true pnpm nx run @effectify/app-builder-execution:typecheck`                                                                                                     | Passed; contracts dependency built first                                |
| Lint                  | `env NX_SKIP_NX_CACHE=true pnpm nx run @effectify/app-builder-execution:lint`                                                                                                          | Passed with 0 errors and 1 pre-existing warning                         |
| Guarded POSIX smoke   | `env NX_SKIP_NX_CACHE=true node packages/app-builder/execution/demo/deny-network.cjs -- pnpm nx run @effectify/app-builder-execution:posix-smoke`                                      | Passed on local macOS arm64                                             |
| Guarded executable    | `env NX_SKIP_NX_CACHE=true node packages/app-builder/execution/demo/deny-network.cjs -- pnpm nx run @effectify/app-builder-execution:executable -- --workspace <clean-temp> --approve` | Passed; r1-r5, generated digest, payload, and readable report confirmed |
| Report format         | `pnpm exec oxfmt --check openspec/changes/app-builder-executable-vertical-slice/verify-report.md`                                                                                      | Passed after report update                                              |
| Diff safety           | `git diff --check`                                                                                                                                                                     | Passed after report update                                              |

The guarded executable produced the exact payload
`Effectify App Builder executable vertical slice\n` and a stable report naming
r1 Validated, r2 WaitingForApproval, r3 Ready, r4 Executing, terminal r5
Succeeded, and the generated-output digest.

The lint warning is the existing unused destructured `value` parameter at
`packages/app-builder/execution/src/workspace-lock.ts:303`. It is non-blocking
and outside this report-only verification change.

## GitHub Actions Evidence

| Field            | Value                                                                          |
| ---------------- | ------------------------------------------------------------------------------ |
| Run              | [`31053129436`](https://github.com/devx-op/effectify/actions/runs/31053129436) |
| Workflow         | `🧪 CI`                                                                        |
| Event            | `pull_request`                                                                 |
| Feature head SHA | `114f573fbe2402b1a15fd5e6f1663e6f37d245a0`                                     |
| Conclusion       | success, 9 / 9 jobs                                                            |

The pull-request jobs checked out merge commit
`2fe5b64ca5a896a1560f4f7206d86ee3b7853d6b`, which contains the exact feature
head above merged into the target base. The run metadata independently records
the requested feature head as `headSha`.

| Required profile  | Runner evidence                      | POSIX smoke | Executable | Job                                                                                            |
| ----------------- | ------------------------------------ | ----------- | ---------- | ---------------------------------------------------------------------------------------------- |
| macOS x64         | macOS 15.7.7, `macos-15` x64 image   | Passed      | Passed     | [`92464683617`](https://github.com/devx-op/effectify/actions/runs/31053129436/job/92464683617) |
| macOS arm64       | macOS 15.7.7, `macos-15-arm64` image | Passed      | Passed     | [`92464683585`](https://github.com/devx-op/effectify/actions/runs/31053129436/job/92464683585) |
| glibc Linux x64   | Ubuntu 24.04.4 x64                   | Passed      | Passed     | [`92464683565`](https://github.com/devx-op/effectify/actions/runs/31053129436/job/92464683565) |
| glibc Linux arm64 | Ubuntu 24.04.4 arm64                 | Passed      | Passed     | [`92464683551`](https://github.com/devx-op/effectify/actions/runs/31053129436/job/92464683551) |

Each platform job installed dependencies, then ran both targets through
`demo/deny-network.cjs`. The executable jobs reported the same fixed payload and
revision/digest sequence. The other five successful jobs were Type Check,
Build, Lint & Format, Test, and CI Summary.

## Requirement And Scenario Matrix

|   # | Requirement                          | Scenario                                    | Concrete evidence                                                                                                           | Result |
| --: | ------------------------------------ | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------ |
|   1 | Deterministic Approved Invocation    | Approved invocation                         | Guarded local executable, two-workspace live test, and four guarded CI executable jobs                                      | PASS   |
|   2 | Deterministic Approved Invocation    | Approval omitted                            | `executable-operation.test.ts` proves rejection before durable mutation; CLI parsing requires explicit approval             | PASS   |
|   3 | Durable Revision Handoff             | Ready handoff                               | Operation and executor tests prove durable r1-r3, exact Ready r3 handoff, executor-owned r4 and terminal evidence           | PASS   |
|   4 | Durable Revision Handoff             | Preparation cannot persist                  | Exact r1, r2, and r3 commit-failure tests prove no executor handoff or fabricated Ready state                               | PASS   |
|   5 | Immutable Generated Output           | First generated output                      | Guarded executable and report test prove exact fixed bytes and one no-replace publication                                   | PASS   |
|   6 | Immutable Generated Output           | Independent deterministic outputs           | `executable-determinism.live.test.ts` proves byte-identical output and path-free reports in two clean real workspaces       | PASS   |
|   7 | Immutable Generated Output           | Existing generated output                   | Report/operation evidence proves visible failure and preservation of the existing file                                      | PASS   |
|   8 | Truthful Exported Evidence           | Successful cleanup with evidence            | Executor observer publishes r4/terminal evidence before cleanup; report remains outside the removed run tree                | PASS   |
|   9 | Recoverable Failure and Lock Safety  | Intermediate failure                        | Callback, observer, cleanup, and terminal-finalization tests preserve recoverable evidence and emit failure without success | PASS   |
|  10 | Recoverable Failure and Lock Safety  | Lock reacquisition conflict                 | Workspace-lock tests prove losing, changed, ambiguous, or foreign ownership invokes no protected callback                   | PASS   |
|  11 | Handle-Relative No-Follow Durability | macOS x64/arm64 offline durable smoke       | CI jobs `92464683617` and `92464683585` passed guarded real-adapter smoke and executable targets                            | PASS   |
|  12 | Handle-Relative No-Follow Durability | glibc Linux x64/arm64 offline durable smoke | CI jobs `92464683565` and `92464683551` passed guarded real-adapter smoke and executable targets                            | PASS   |
|  13 | Handle-Relative No-Follow Durability | Symlinked protected path                    | Focused POSIX test fails closed before writing through a symlinked component                                                | PASS   |
|  14 | Private Sync and No-Replace Creation | Existing immutable output                   | Focused adapter test preserves destination for EEXIST; executable report test preserves existing generated output           | PASS   |
|  15 | Private Sync and No-Replace Creation | Unsatisfied platform primitive              | Adapter tests reject unsupported/uncertain rename and sync outcomes without fallback                                        | PASS   |
|  16 | Platform CI Proof                    | CI matrix evidence                          | Run `31053129436` passed all four real platform jobs with network-denied smoke execution                                    | PASS   |

## Task Evidence Matrix

| Task                          | Evidence                                                                                                                    | Result   |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------- | -------- |
| 1.1 ABI fixtures              | `posix-abi.test.ts` and `posix-bindings.test.ts` cover four profiles, symbols, layouts, flags, and unsupported runtimes     | Complete |
| 1.2 Bindings and smoke        | Koffi bindings, guarded network denial, Nx target, and all four CI installations/executions                                 | Complete |
| 1.3 Adapter RED coverage      | Focused 14 / 14 covers no-follow, modes, partial/EINTR I/O, sync, publication, sentinel, and rollback behavior              | Complete |
| 1.4 Adapter implementation    | Handle-relative adapter is wired behind the unchanged `DurableFileSystemService`; local and CI real-adapter runs pass       | Complete |
| 1.5 Unit 1 evidence           | Focused, package, lint, typecheck, smoke, format, and rollback evidence are recorded                                        | Complete |
| 2.1 Operation RED coverage    | Approval, r1-r3 failures, exact handoff, callback, observer, cleanup, and lock failure paths are tested                     | Complete |
| 2.2 Executor integration      | Real `RunExecutor` owns r4+, terminal state, pre-cleanup observation, and cleanup                                           | Complete |
| 2.3 Report RED coverage       | Stable LF report, exact revision/digest fields, and no-replace output behavior are tested                                   | Complete |
| 2.4 Executable implementation | Caller workspace, mandatory approval, guarded runtime, output, success report, and truthful failure reports are implemented | Complete |
| 2.5 Target and CI evidence    | Executable target and four-platform matrix passed in run `31053129436`                                                      | Complete |

## Historical Failures

The earlier 6/8-requirement, 13/16-scenario report correctly failed while real
macOS x64 and Linux x64/arm64 evidence was absent. Subsequent clean-checkout
dependency-ordering and POSIX binding corrections are present at the verified
HEAD. Run `31053129436` proves those former blockers are closed. Historical
failed runs and remediation records remain useful audit history but do not
describe the current candidate.

No unsupported claim from the failed report is carried forward: all four
platform claims now cite completed real jobs, and local behavior claims cite
current uncached test or guarded runtime execution.

## Residual Risks

- The pre-existing lint warning at `workspace-lock.ts:303` remains; lint has no errors.
- V8 coverage was not rerun in this ordinary verification, and prior coverage could not attribute every demo/POSIX file. Scenario evidence instead comes from focused tests, live tests, guarded local execution, and the four-platform CI matrix.
- Native POSIX ABI behavior remains sensitive to future OS, libc, Node, and Koffi changes. The explicit four-profile fixtures and real matrix are the regression boundary.
- Windows and musl Linux remain intentionally unsupported non-goals.

None of these residual risks blocks the specified vertical slice.

## Archive Readiness

The change is **ready to archive under ordinary disabled/unmanaged policy**:
requirements are 8/8, scenarios are 16/16, tasks are 10/10, local checks pass,
and the required four-platform CI proof passes at the verified feature head.

This statement is a substantive repository-readiness conclusion only. It does
not create an RDD receipt, perform archive/runtime commands, or alter native
authority.
