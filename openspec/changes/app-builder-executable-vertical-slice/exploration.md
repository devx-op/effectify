## Exploration: App Builder Executable Vertical Slice

### Current State

The execution package already contains the durable kernel needed after a run is prepared, but it has no runnable application boundary.

Evidence:

- `DraftStore.persist/read` canonicalize and durably publish a `ValidatedWizardDraft` containing only `draftId`, `runRef`, `protocolRef`, and `passivePlan`.
- `RunStore.commit` requires a live workspace ownership capability, validates the expected journal tail, publishes immutable revision files, and treats snapshots only as acceleration records.
- `RunLifecycle` legally moves `Draft` r0 through `Validated` r1, `WaitingForApproval` r2, `Ready` r3, and `Executing` r4.
- `RunExecutor` accepts only a `Ready` snapshot plus its exact tail. It commits `AcceptExecution` before constructing the mutation context or invoking the callback, then commits the terminal outcome and performs exact-tail cleanup.
- `WorkspaceLock` supplies scoped, revocable ownership and compare-before-release behavior. Recovery is already explicit and fails closed.
- `WorkspaceMutator` checks logical and physical workspace containment before an application-owned callback can mutate a target.
- `@effectify/app-builder-execution` is an Nx library with `build`, `test`, `test-coverage`, `typecheck`, and `lint`; it has no `serve`, `run`, application, or demo target. `pnpm nx run @effectify/app-builder-execution:test` currently passes 18 files / 115 tests, and typecheck/build pass.
- The live blocker is deliberate: `DurableFileSystem.makeLive()` advertises `noFollowPaths: false`, every operation returns `UnsupportedDurability(noFollowPaths)`, and `live-capability.test.ts` proves no `.effectify` state is created. No other durable POSIX adapter exists in the repository.

Pure Node path-string APIs cannot truthfully satisfy the existing handle-relative no-follow guarantee across ancestor traversal. Setting `noFollowPaths: true` around `lstat`/`O_NOFOLLOW` would introduce a check/use race and is therefore not an acceptable shortcut.

The stale `app-builder-create-operation` plan correctly preserved revisions and authority, but optimized for a generic embedding service: callback resolver, approval authority, Config-owned grace, optional stale-lock recovery, broad error mapping, and three chained PRs. It still omitted the live filesystem adapter and executable target, so completing it would not produce a runnable slice. The new change supersedes that delivery plan and should reuse its proven lifecycle observations only; the stale change remains untouched until later archive/replacement work.

### Essential Guarantees

- Persist and reload the real draft through `DraftStore`; do not reconstruct it in memory.
- Keep `Draft` r0 unjournaled and durably commit legal revisions 1–3 under scoped ownership.
- Hand the exact `Ready` r3 snapshot and digest tail to `RunExecutor`; revision 4+ remains executor-owned.
- Preserve commit-before-callback: the deterministic output file can be created only through the callback after `AcceptExecution` r4 commits.
- Preserve immutable journals, digest chaining, directory/file synchronization, no-replace publication, private modes, no-follow path safety, compare-before-lock release, and fail-closed errors.
- Use explicit application-owned approval and callback inputs. The demo must not pretend passive draft material carries execution authority.
- Run through one Nx command and leave directly inspectable evidence: a deterministic output file and durable journal revisions.

### Affected Areas

- `packages/app-builder/execution/src/durable-file-system.ts` — current fail-closed live adapter; an honest POSIX implementation or adapter binding is the critical reusable prerequisite.
- `packages/app-builder/execution/src/{draft-store,run-store,lifecycle,persistence-format}.ts` — existing persistence and transition contracts to compose unchanged.
- `packages/app-builder/execution/src/{workspace-lock,workspace-mutator,run-executor}.ts` — existing ownership, commit-before-callback, mutation, and r4+ authority to preserve.
- `packages/app-builder/execution/src/index.ts` — expose only a deliberately supported POSIX adapter namespace if the adapter is intended for consumers; do not expose a generic lifecycle committer.
- `packages/app-builder/execution/tests/` — strict-TDD adapter conformance, real-filesystem integration, revision ordering, reload, and callback-order evidence.
- `packages/app-builder/execution/project.json` — add the single executable demo target after implementation.
- `packages/app-builder/execution/demo/` (candidate) — application-owned literals and orchestration only; keep demo policy out of reusable services.
- `openspec/changes/app-builder-create-operation/` — comparison-only stale plan, superseded by this change but not edited or applied.

### Explicit Cuts and Deferrals

| Defer                             | Why it is unnecessary for the first executable slice                                                                                              |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Generic callback resolver service | The demo owns one callback and passes its identity/effect directly. Add lookup only when multiple real consumers exist.                           |
| Generic approval service          | The demo obtains an explicit application-owned decision/receipt before preparation; no reusable policy transport is needed.                       |
| Advanced stale-lock recovery      | Run with `recover: false`; a held/stale lock fails closed. Existing recovery contracts remain intact.                                             |
| Broad Config and secret matrices  | Use no secrets/facts for the deterministic demo and a fixed application-owned termination grace. Config policy can follow a real deployment need. |
| Prompts and interactive input     | Inputs are explicit in the demo module; the Nx command is deterministic and non-interactive.                                                      |
| JSON/stdio protocol               | Human-inspectable console output plus filesystem evidence is enough for the first slice.                                                          |
| Windows support                   | This change is explicitly POSIX because the durability blocker is platform-specific.                                                              |
| Nx generators                     | One checked-in demo target does not justify a generator.                                                                                          |
| Registries and plugins            | One hard-coded passive plan/callback does not need discovery infrastructure.                                                                      |

### Reusable Versus Demo-Only Boundaries

| Reusable package boundary                                                                                                                  | Demo-only application composition                            |
| ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| Truthful POSIX `DurableFileSystemService` implementation with conformance tests                                                            | Fixed workspace/output path and deterministic file contents  |
| Existing `DraftStore`, `RunStore`, `WorkspaceLock`, `RunExecutor`, lifecycle, and persistence contracts                                    | Construction of one validated draft and one approval receipt |
| A package-internal transition/reduce/encode/commit helper only if duplication between preparation and executor would otherwise be material | Direct callback identity/effect; no resolver service         |
| Existing typed failures and ownership capability                                                                                           | Fixed empty facts/secrets and fixed termination grace        |

No new public `CreateOperation`, `CallbackResolver`, `ApprovalAuthority`, registry, or generic lifecycle commit service is required. A small demo-local preparation function can compose existing public namespaces, while any reduce/encode/commit extraction remains package-internal.

### Approaches

1. **Honest POSIX adapter plus package-local executable target** — implement the missing handle-relative filesystem capability, then compose draft persistence/reload, demo-owned approval/callback, r1–r3 preparation, and `RunExecutor` in one target.
   - Pros: Produces the requested one-command proof; preserves all durability claims; leaves the adapter reusable; keeps product policy in the demo.
   - Cons: POSIX handle-relative operations are the dominant engineering work and may require a small native binding/helper because Node does not expose `openat`-style primitives directly.
   - Effort: High, approximately 1,400–2,100 changed lines including strict-TDD and integration evidence.

2. **Generic CreateOperation first, adapter later** — implement the stale resolver/approval/Config/recovery plan before a live target.
   - Pros: Broad embedding API and exhaustive authority modeling.
   - Cons: Still cannot run; repeats the overengineering already rejected; estimated 800–1,040 lines before addressing the real blocker.
   - Effort: High and mis-prioritized.

3. **Node path-string or fake-backed demo** — claim no-follow after `lstat`/`O_NOFOLLOW`, or persist journals in the existing fake while writing only the output file to disk.
   - Pros: Smallest apparent diff, likely below 700 lines.
   - Cons: Weakens no-follow/check-use guarantees or gives a false demonstration; violates the requested durability and commit-before-callback proof.
   - Effort: Low, but unacceptable.

### Recommendation

Choose approach 1 and optimize for one coherent vertical PR. The narrowest honest target is:

```text
pnpm nx run @effectify/app-builder-execution:demo
  -> create temporary or caller-selected POSIX workspace
  -> persist and read back one canonical draft
  -> create one explicit application-owned Approved receipt and callback identity
  -> acquire ownership and commit Validated r1, WaitingForApproval r2, Ready r3
  -> release and hand exact r3 tail to RunExecutor
  -> RunExecutor commits Executing r4 before callback
  -> callback uses context.mutate to create one deterministic file
  -> terminal revision commits; command prints workspace, output path, and observed revision sequence
```

The POSIX adapter must be proven before the orchestration is considered executable. During proposal/design, spike the smallest maintainable mechanism for handle-relative syscalls (native binding/helper versus a justified existing platform facility). If that mechanism alone pushes the forecast above the 3,000-line review budget, split only at the autonomous boundary: PR 1 POSIX adapter + real-filesystem conformance, PR 2 executable lifecycle slice. Otherwise keep one vertical PR; the current estimate fits the 3,000-line budget.

Suggested authored-line forecast:

| Work unit                                                               |        Estimate |
| ----------------------------------------------------------------------- | --------------: |
| POSIX adapter/binding and real-filesystem conformance                   |       700–1,100 |
| Internal r1–r3 preparation composition and tests                        |         300–450 |
| Demo target, deterministic callback, reload/observable integration test |         300–450 |
| Public-surface/docs/target wiring                                       |         100–150 |
| **Total**                                                               | **1,400–2,150** |

### Risks

- Node's lack of handle-relative path APIs can force a native/platform helper; pretending `lstat` plus final-component `O_NOFOLLOW` is equivalent would be a security regression.
- `RunExecutor` performs terminal cleanup, so the demo must print/capture revision evidence before cleanup or intentionally configure the observable proof around retained journal semantics without weakening cleanup.
- Preparation and executor use separate lock scopes; the handoff must preserve r1–r3 and fail without callback if reacquisition loses the race.
- Demo-local approval must still produce a receipt exactly matching the lifecycle policy request; hard-coded authority is explicit, not implicit.
- The stale change is currently untracked in the working tree; supersession must not delete or silently mutate it during this exploration.

### Ready for Proposal

Yes. No product decision blocks proposal. The proposal should state that `app-builder-executable-vertical-slice` supersedes the implementation intent of `app-builder-create-operation`, keeps the old artifacts for comparison/audit only, and gates the vertical slice on a truthful POSIX durability mechanism. The only technical investigation that may alter delivery slicing is the handle-relative adapter mechanism; it does not justify restoring the deferred generic services.
