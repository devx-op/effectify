```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:0a60d1bb9df31b768acc629d8bbe02755d082bcf8738f540cabcda999e3da607
verdict: fail
blockers: 3
critical_findings: 3
requirements: 6/8
scenarios: 13/16
test_command: pnpm nx affected --target=test
test_exit_code: 0
test_output_hash: sha256:430402e8da47563e4227d48f72e08438faa5b6dd96a9810f72e261f1307ecea7
build_command: pnpm nx run @effectify/app-builder-execution:build
build_exit_code: 0
build_output_hash: sha256:77e130cfc43e2706d225af66e1df34a581839ee2f7c653f0983304bc27d5f2bf
```

## Verification Report

**Change**: app-builder-executable-vertical-slice  
**Version**: native verification objective ordinal 10  
**Mode**: Strict TDD  
**Platform observed locally**: macOS arm64  
**RDD**: disabled by maintainer decision; separate delivery limitation.

### Historical Verification and Remediation

Ordinal 7 independently returned **FAIL** at 4/8 requirements and 11/16 scenarios with five blockers. Authorized ordinal-8 remediation added exact r1/r2/r3 preparation-persistence failure tests and a live two-clean-workspace deterministic output/report test. Native remediation evidence is `sha256:ca352ae90827bd81c46b05a6da1ab5c95ad30a9f15d783ae823bdf7a56198d99`; no-op closure terminal revision is `sha256:585bf60be4566e888aece14db0e8984b9c0d1074e85c576ab6fed4c327493ab6`.

This ordinal-10 rerun independently confirms both local remediations. The historical FAIL remains relevant because its three non-local platform blockers are unresolved.

### Completeness

| Metric                               |       Value |
| ------------------------------------ | ----------: |
| Requirements total / fully compliant |       8 / 6 |
| Scenarios total / runtime compliant  |     16 / 13 |
| Scenarios partial / untested         |       1 / 2 |
| Tasks total / complete / incomplete  | 10 / 10 / 0 |

### Build and Test Execution

| Check                 | Command                                                                                                                                                | Exit | Evidence                                                                        |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---: | ------------------------------------------------------------------------------- |
| Affected tests        | `pnpm nx affected --target=test`                                                                                                                       |    0 | 15 affected projects; package 26 files, 143/143; `sha256:430402e8...cea7`       |
| Remediation focus     | `pnpm nx run @effectify/app-builder-execution:test -- tests/executable-operation.test.ts tests/executable-determinism.live.test.ts --reporter=verbose` |    0 | 2 files, 9/9; `sha256:54a5f847...a88c`                                          |
| Coverage              | `pnpm nx run @effectify/app-builder-execution:test-coverage`                                                                                           |    0 | 143/143; 97.07% lines, 93.03% branches; `sha256:128482c2...46aa`                |
| Lint                  | `pnpm nx run @effectify/app-builder-execution:lint`                                                                                                    |    0 | 0 errors, 3 warnings including two generated copies; `sha256:2cfd9f81...2721`   |
| Typecheck             | `pnpm nx run @effectify/app-builder-execution:typecheck`                                                                                               |    0 | Passed; `sha256:708c986b...c6ed`                                                |
| Build                 | `pnpm nx run @effectify/app-builder-execution:build`                                                                                                   |    0 | Passed; `sha256:77e130cf...f2bf`                                                |
| Guarded POSIX smoke   | `node .../deny-network.cjs -- pnpm nx run @effectify/app-builder-execution:posix-smoke`                                                                |    0 | Local macOS arm64 passed; `sha256:77974c53...bfa`                               |
| Two-workspace harness | Two guarded approved executable runs plus `cmp` and path checks                                                                                        |    0 | Outputs/reports byte-identical and path-free; `sha256:c7c8b129...bed1`          |
| CI YAML               | Ruby structural parse                                                                                                                                  |    0 | Four required runners and two offline commands present; `sha256:89cb6082...3c5` |
| Diff safety           | `git diff --check`                                                                                                                                     |    0 | Clean; empty-output hash `sha256:e3b0c442...b855`                               |

### Spec Compliance Matrix

|   # | Requirement                          | Scenario                                    | Current runtime evidence                                                           | Result       |
| --: | ------------------------------------ | ------------------------------------------- | ---------------------------------------------------------------------------------- | ------------ |
|   1 | Deterministic Approved Invocation    | Approved invocation                         | Guarded executable and package suite                                               | ✅ COMPLIANT |
|   2 | Deterministic Approved Invocation    | Approval omitted                            | Negative harness and operation test                                                | ✅ COMPLIANT |
|   3 | Durable Revision Handoff             | Ready handoff                               | Operation/executor tests and harness                                               | ✅ COMPLIANT |
|   4 | Durable Revision Handoff             | Preparation cannot persist                  | Exact r1, r2, and r3 commit-failure tests prove no executor/output/cleanup/success | ✅ COMPLIANT |
|   5 | Immutable Generated Output           | First generated output                      | Harness and report tests                                                           | ✅ COMPLIANT |
|   6 | Immutable Generated Output           | Independent deterministic outputs           | Live test plus independent two-workspace guarded harness                           | ✅ COMPLIANT |
|   7 | Immutable Generated Output           | Existing generated output                   | Negative harness and report test                                                   | ✅ COMPLIANT |
|   8 | Truthful Exported Evidence           | Successful cleanup with evidence            | Report/executor tests and harness                                                  | ✅ COMPLIANT |
|   9 | Recoverable Failure and Lock Safety  | Intermediate failure                        | Callback, receipt, cleanup tests                                                   | ✅ COMPLIANT |
|  10 | Recoverable Failure and Lock Safety  | Lock reacquisition conflict                 | Workspace-lock callback exclusion test                                             | ✅ COMPLIANT |
|  11 | Handle-Relative No-Follow Durability | macOS x64/arm64 offline durable smoke       | Local arm64 only; real macOS x64 job absent                                        | ⚠️ PARTIAL   |
|  12 | Handle-Relative No-Follow Durability | glibc Linux x64/arm64 offline durable smoke | ABI/unit fixtures only; no real Linux jobs                                         | ❌ UNTESTED  |
|  13 | Handle-Relative No-Follow Durability | Symlinked protected path                    | POSIX adapter test                                                                 | ✅ COMPLIANT |
|  14 | Private Sync and No-Replace Creation | Existing immutable output                   | Adapter/executable tests                                                           | ✅ COMPLIANT |
|  15 | Private Sync and No-Replace Creation | Unsatisfied platform primitive              | Unsupported/uncertain primitive tests                                              | ✅ COMPLIANT |
|  16 | Platform CI Proof                    | CI matrix evidence                          | YAML valid; required real results absent for macOS x64 and Linux x64/arm64         | ❌ UNTESTED  |

**Compliance summary**: 13/16 compliant; 1 partial; 2 untested.

### Local Remediation Confirmation

| Remediated obligation             | Static confirmation                                               | Runtime confirmation                                                                              |
| --------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Preparation persistence failure   | Narrow `failPreparationCommitAt: 1                                | 2                                                                                                 | 3`seam immediately precedes selected`RunStore.commit` | Three tests pass and assert preserved prior journals, absent failed journal, no output, no cleanup, no success, truthful failure report |
| Independent deterministic outputs | Test creates and canonicalizes two distinct clean real workspaces | Live test and separate harness prove identical payload/report bytes and no workspace path leakage |

The seams remain internal to the executable demo input and do not change public `DurableFileSystemService` or `RunExecutor.execute` contracts.

### Correctness and Design Coherence

| Area                                         | Status | Notes                                                                         |
| -------------------------------------------- | ------ | ----------------------------------------------------------------------------- |
| Exact supported platform scope               | ✅     | Darwin x64/arm64 and glibc Linux x64/arm64 only; musl/Windows/unknown reject. |
| Koffi ABI and readdir decode                 | ✅     | Explicit profile data and pointer decode regression remain passing locally.   |
| Durable no-follow/no-replace/sync semantics  | ✅     | Static implementation and deterministic failure tests remain coherent.        |
| Real executor r4+/terminal/cleanup ownership | ✅     | `RunExecutor` remains the production execution path.                          |
| Report/digest/public contract behavior       | ✅     | Stable path-free evidence and unchanged public signatures.                    |
| Four-platform runtime proof                  | ❌     | CI wiring exists without required non-local job results.                      |

### TDD Compliance

| Check                   | Result | Details                                                                                                   |
| ----------------------- | ------ | --------------------------------------------------------------------------------------------------------- |
| TDD evidence reported   | ✅     | Apply-progress records safety net, RED, GREEN, refactor, and closure evidence.                            |
| RED/GREEN files exist   | ✅     | Remediation test and production seam are present.                                                         |
| Current GREEN confirmed | ✅     | Focused 9/9, full 143/143, and coverage 143/143 passed.                                                   |
| Triangulation           | ✅     | Preparation failure is triangulated at r1/r2/r3; determinism uses two real workspaces.                    |
| Safety net              | ✅     | Existing five operation tests passed before the new seam; live test is new.                               |
| Assertion quality       | ✅     | Assertions exercise production calls and verify journal/output/cleanup/report behavior and byte equality. |

**TDD compliance**: 6/6 checks passed.

### Test Layer Distribution and Coverage

- Deterministic unit/integration: 142 tests across 25 files.
- Live POSIX/executable integration: 2 tests across 2 files.
- Independent command harness: two guarded clean-workspace executions.
- Aggregate coverage: 97.07% lines / 93.03% branches.
- Complete per-changed-file coverage remains unavailable because V8 omits several demo/POSIX files.

### Issues Found

**CRITICAL**

1. Required real macOS x64 smoke/executable CI evidence remains absent; local macOS arm64 cannot prove x64 behavior.
2. Required real glibc Linux x64 and arm64 smoke/executable evidence remains absent; ABI fixtures cannot substitute for runtime execution.
3. The four-runner CI matrix is structurally correct, but the mandatory all-four passing CI result does not exist.

**WARNING**

- V8 coverage does not emit complete per-changed-file coverage for all new demo/POSIX files.
- Lint reports one source warning and two generated `dist-demo` copies, with zero errors.

**SUGGESTION**

- Preserve job URLs and immutable result identifiers when the three pending non-local jobs run, then rerun verification without changing local implementation.

### Residual Blockers and Next Action

Obtain real passing evidence for macOS x64 and glibc Linux x64/arm64 from the configured CI jobs. Then rerun independent SDD verification. Do not archive while these spec-required runtime scenarios remain incomplete.

### RDD Delivery Limitation

RDD remains disabled by maintainer decision. No native review, receipt, commit, push, PR, merge, release, or lifecycle command was attempted. Delivery unavailability is separate from this substantive spec verdict.

### Verdict

**FAIL** — both authorized local scenario remediations are independently verified and now compliant, improving the result to 6/8 requirements and 13/16 scenarios. Mandatory real non-local platform CI evidence remains absent and blocking.
