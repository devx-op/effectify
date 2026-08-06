# Tasks: App Builder Executable Vertical Slice

## Review Workload Forecast

| Field                   | Value                                |
| ----------------------- | ------------------------------------ |
| Estimated changed lines | 1,400–2,150 (whole chain cap: 3,000) |
| 400-line budget risk    | High: both slices exceed 400         |
| Chained PRs recommended | Yes                                  |
| Delivery / chain        | exception-ok / feature-branch-chain  |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

Maintainer approved `size:exception` for Unit 1 (650–950) and Unit 2 (750–1,200): minimum autonomous behavioral slices; further division creates helper-only PRs. Retain 3,000-line chain cap. Use draft/no-merge tracker from `main`; PR #1 targets it, PR #2 targets PR #1; rebase polluted diffs.

### Suggested Work Units

| Unit | Budget / base                 | Focused test                                                                                                              | Runtime / result                                                                                                                                                                           | Rollback boundary                                          |
| ---- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| 1    | 650–950; PR #1 base = tracker | `pnpm nx run @effectify/app-builder-execution:test -- tests/posix-abi.test.ts tests/posix-durable-file-system.test.ts`    | `node packages/app-builder/execution/demo/deny-network.cjs -- pnpm nx run @effectify/app-builder-execution:posix-smoke` → exit 0, no-follow/private durable write                          | Koffi, POSIX internals, adapter wiring, smoke target/tests |
| 2    | 750–1,200; PR #2 base = PR #1 | `pnpm nx run @effectify/app-builder-execution:test -- tests/executable-operation.test.ts tests/executable-report.test.ts` | `node packages/app-builder/execution/demo/deny-network.cjs -- pnpm nx run @effectify/app-builder-execution:executable -- --workspace <persistent-dir> --approve` → exit 0, payload/reports | Demo, observer, reports, executable target, CI             |

Record focused-test pass, `pnpm nx run @effectify/app-builder-execution:test`, `pnpm nx run @effectify/app-builder-execution:lint`, `pnpm nx run @effectify/app-builder-execution:typecheck`, harness result, and rollback result per unit. Unit 2 records CI URL/result for macOS x64/arm64 and glibc Linux x64/arm64.

## Phase 1: POSIX Adapter and Conformance (Unit 1)

- [x] 1.1 **RED** — Add `tests/posix-abi.test.ts` fixtures for four Koffi 3.1.4 profiles: symbols, LP64 layouts/offsets, flags, errno aliases, varargs; reject Windows, musl, unknown, and non-glibc Linux.
- [x] 1.2 **GREEN** — Create `src/internal/{posix-abi,posix-bindings}.ts` and `demo/deny-network.cjs`; declare only `koffi@3.1.4` in `package.json`, verify Koffi-owned transitive optional profiles in `pnpm-lock.yaml`, and add `posix-smoke` to `project.json`/`tsconfig.demo.json`.
- [x] 1.3 **RED** — Add `tests/posix-durable-file-system.test.ts`: no-follow/modes, DIR ownership, partial/EINTR reads/writes and zero-write, full sync ordering, successful exchange-to-sentinel, mismatch swap-back, parent-sync failure/cleanup indeterminacy, and destination preservation for EEXIST/unsupported/uncertain rename outcomes.
- [x] 1.4 **GREEN** — Implement `src/internal/posix-durable-file-system.ts` and wire `src/durable-file-system.ts` without changing `DurableFileSystemService`; enforce temp write→sync→close→no-replace→parent-sync with fail-closed rollback.
- [x] 1.5 **REFACTOR/EVIDENCE** — Keep deterministic Effect tests beside adapter code and record the Unit 1 acceptance evidence.

## Phase 2: Approved Executable Workflow and CI (Unit 2)

- [x] 2.1 **RED** — Add `tests/executable-operation.test.ts`: missing approval zero calls; draft save/reload, local r0, durable r1–r3, exact Ready handoff, executor r4+/terminal; preparation-commit, callback, receipt/pre-cleanup observer, cleanup, and reacquisition failures block later callback/success.
- [x] 2.2 **GREEN** — Create `src/internal/executable-evidence.ts`; implement that workflow in `demo/operation.ts` and an internal `src/run-executor.ts` observer without changing public `RunExecutor.execute`, publishing pre-cleanup evidence first.
- [x] 2.3 **RED** — Add `tests/executable-report.test.ts` for fixed LF `generated.txt`, no-replace success/failure reports, report survival, and exact r1–r3/r4/terminal/output digests.
- [x] 2.4 **GREEN** — Create `demo/{main,report}.ts`; reuse Unit 1's `demo/deny-network.cjs`, require `--approve`, caller workspace, offline guard, no-replace output/reports, and truthful failure reports.
- [x] 2.5 **REFACTOR/EVIDENCE** — Add `executable` target and four-job `.github/workflows/ci.yml` matrix (`macos-15-intel`, `macos-15`, `ubuntu-24.04`, `ubuntu-24.04-arm`); frozen install then guarded smoke/executable runs and record Unit 2 acceptance.
