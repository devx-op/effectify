# Tasks: App Builder Run Execution CLI Tracker

## Review Workload Forecast

| Grandchild                       | Estimated changed lines | 3,000-line risk | PR boundary                          |
| -------------------------------- | ----------------------: | --------------- | ------------------------------------ |
| `app-builder-run-lifecycle`      |               900–1,300 | Low             | PR #1; base = feature/tracker branch |
| `app-builder-run-store-recovery` |             1,200–1,800 | Low             | PR #2; base = PR #1 branch           |
| `app-builder-run-lock-executor`  |             1,100–1,700 | Low             | PR #3; base = PR #2 branch           |
| `app-builder-execution-cli`      |               900–1,400 | Low             | PR #4; base = PR #3 branch           |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
3,000-line budget risk: Low

Delivery strategy: `auto-chain`. The aggregate roadmap exceeds one review unit; every grandchild remains under 3,000 lines. If a child forecast exceeds 3,000, split that child before apply; never use this tracker as a size exception.

> **NON-APPLICABLE TRACKER — NEVER APPLY.** This roadmap has no runtime tasks and creates no child artifacts now. Each unchecked item authorizes one independent grandchild lifecycle only.

## Dependency Gate

`app-builder-protocol-contracts` (read-only) → lifecycle → store/recovery → lock/executor → CLI. Start a successor only after its predecessor has completed its own explore → proposal → spec → design → tasks → apply → verify → archive lifecycle and recorded evidence.

## Grandchild Roadmap

- [ ] **1. `app-builder-run-lifecycle`** — **Dependency:** `app-builder-protocol-contracts`. **Lifecycle:** independent explore→proposal→spec→design→tasks→apply→verify→archive. **Scope/paths:** only `packages/app-builder/execution/src/{creation-intent,lifecycle,automatic-policy,transition-evidence,failure}.ts`; consume, never redefine, contracts. **Strict TDD:** RED legal idempotent approval provenance plus absent/non-idempotent/denied/unknown-policy failures; GREEN only `CreationIntent`, `RunLifecycle`, policy Layer, and typed failures; REFACTOR while preserving laws. **Evidence:** focused Vitest/Nx result, deterministic policy-layer receipt, and PE3 lifecycle/approval scenario links in its verify report. **Rollback:** remove additive lifecycle modules/package. **PR:** #1 base tracker branch.

- [ ] **2. `app-builder-run-store-recovery`** — **Dependency:** archived lifecycle child. **Lifecycle:** independent explore→proposal→spec→design→tasks→apply→verify→archive. **Scope/paths:** only `packages/app-builder/execution/src/{run-store,recovery,persistence-format,durable-file-system}.ts`; consume lifecycle and scoped write authority. **Strict TDD:** RED sync/rename crash points, malformed journal, digest/revision conflict, safe-idempotent resume, and corrupt/ambiguous/unauthorized stop-before-mutation; GREEN journal authority and recovery services; REFACTOR durable seams. **Evidence:** injected filesystem crash harness, `pnpm nx affected --target=test`, and PE3 recovery/draft scenario links. **Rollback:** revert storage formats/modules; retain lifecycle. **PR:** #2 base PR #1 branch.

- [ ] **3. `app-builder-run-lock-executor`** — **Dependency:** archived store/recovery child. **Lifecycle:** independent explore→proposal→spec→design→tasks→apply→verify→archive. **Scope/paths:** only `packages/app-builder/execution/src/{workspace-lock,process-identity,run-executor,workspace-mutator,tool-process}.ts`; executor alone mutates/spawns. **Strict TDD:** RED owner race, authorized stale recovery, remote/unknown-owner block, cancellation finalizer/no non-idempotent retry, and applicable subprocess cases (spaces, `;`, `$()`, traversal, non-zero exit, signal); GREEN scoped lock/executor; REFACTOR finalizers. **Evidence:** deterministic `Deferred`/`Queue`/`TestClock` harness, Nx test receipt, PE3 exclusive-execution traces. **Rollback:** revert lock/executor; journal evidence stays readable. **PR:** #3 base PR #2 branch.

- [ ] **4. `app-builder-execution-cli`** — **Dependency:** archived lock/executor child. **Lifecycle:** independent explore→proposal→spec→design→tasks→apply→verify→archive. **Scope/paths:** only `packages/app-builder/cli/src/{effect-cli-adapter,create-command,input-resolver,output,config,main}.ts`; current Effect v4 `effect/unstable/cli` `Command.make`, `Argument`, `Flag`, `Prompt`, `Command.runWith`, defaults/drafts/output adapter, and sole `NodeRuntime.runMain` wiring. No generation beyond this adapter. **Strict TDD:** RED wizard/flags/default parity, missing non-interactive input before mutation, draft resume, one JSON stdout envelope, and human stderr separation; GREEN adapter; REFACTOR without shadow CLI APIs. **Evidence:** deterministic argv/Prompt/output harness, Nx test receipt, PE4 interface-parity traces. **Rollback:** remove CLI package; execution API remains. **PR:** #4 base PR #3 branch.

## Exclusions

Nx generation, web UI, plugins, analytics, marketplace/registry, and broad scaffolding are excluded. Retarget/rebase any polluted child diff before review.
