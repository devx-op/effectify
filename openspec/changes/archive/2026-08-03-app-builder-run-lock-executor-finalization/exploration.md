## Exploration: App Builder Run Lock Executor Finalization

### Current State

The parent change is implemented on `feat/app-builder-run-lock-executor`, including approved native correction `ee126641d`. The correction hardened incomplete lock publication and workspace mutation boundaries, but it did not and must not be represented as correcting the independently verified finalization gaps.

Three root causes remain:

1. `RunExecutor.execute` captures the callback `Exit`, settles the process, and then rethrows every callback failure cause. Its request builder supports only `AcceptExecution | Complete`, `ExecutionResult.terminal` excludes `Cancelled`, and no `RequestCancellation` / `ConfirmCancellation` commits exist. Consequently, even an interruption-only callback cause plus confirmed process settlement cannot persist `Cancelled`. Conversely, a timeout already returns `TerminationTimedOut`, so the missing work is a proof-gated cancellation path that MUST NOT weaken timeout or indeterminate evidence retention.
2. `RunExecutor` calls `cleanup` inside `WorkspaceLock.withExclusive`; `cleanupClosed` immediately deletes the run directory, while the real compare-and-remove lock release occurs later in `withExclusive`'s success finalizer. If release detects changed metadata or fails durability, terminal run evidence is already gone. The API shape hides release outcome from the executor, making the required ordering impossible without a narrow finalization protocol.
3. `vitest.config.mts` includes only lifecycle-era source files in v8 coverage. The parent apply evidence also lacks independently reproducible TRIANGULATE and SAFETY NET records. Existing unit tests cover isolated lock and executor paths, but not interruption-only cancellation or the real release-before-delete chain.

The exact requirement gaps are therefore: parent R4 “Proven cancellation” is unimplemented/untested; parent R5 “Changed metadata or cleanup failure” and “Release after cleanup” are violated by deletion-before-release; and strict-TDD/coverage evidence cannot substantiate the files changed to close those gaps.

### Affected Areas

- `packages/app-builder/execution/src/run-executor.ts` — classify interruption-only callback causes, require confirmed process settlement, commit cancellation request and confirmation, and preserve timeout/indeterminate exits.
- `packages/app-builder/execution/src/workspace-lock.ts` — add a narrow release-aware finalization path so post-release work runs only after compare-remove and directory durability succeed.
- `packages/app-builder/execution/src/cleanup.ts` — split terminal validation/preparation from conditional evidence deletion; preserve evidence when release or post-release compare-delete fails.
- `packages/app-builder/execution/tests/run-executor.test.ts` — deterministic interruption, settlement, timeout, release failure, changed-evidence, ordering, and safety-net tests.
- `packages/app-builder/execution/tests/workspace-lock.test.ts` — prove release-aware continuation is skipped on release failure and runs only after successful release.
- `packages/app-builder/execution/vitest.config.mts` — include every implementation file changed by this follow-up in v8 coverage.
- `openspec/changes/app-builder-run-lock-executor-finalization/**` — strict-TDD triangulation and safety-net evidence for this distinct follow-up lineage.

### Approaches

1. **Release-aware conditional cleanup ticket (recommended)** — under ownership, validate terminal evidence and capture an opaque cleanup ticket bound to the exact run/tail evidence; compare-remove and durably release the lock; only then conditionally remove the run directory if its captured evidence is still unchanged.
   - Pros: release failure provably leaves evidence intact; post-release races fail closed; reuses the existing atomic compare-metadata directory primitive; keeps authority internal and does not widen into CLI/tool registry/plan semantics.
   - Cons: requires a small additive lock finalization seam and a two-phase cleanup API; tests must cover the race between release and conditional deletion.
   - Effort: Medium

2. **Stage terminal evidence before release, delete the staged tree after release** — atomically rename terminal evidence to an owner-specific retained tombstone, release the lock, then remove the tombstone.
   - Pros: strongest operational recoverability and simple post-release deletion semantics.
   - Cons: needs new durable atomic rename/restore primitives, recovery discovery rules, and more migration/test surface; unlikely to fit the bounded follow-up.
   - Effort: High

3. **Preflight release then keep the current cleanup/finalizer order** — compare metadata before cleanup and assume the later finalizer will release.
   - Pros: minimal code.
   - Cons: not a proof; metadata or durability can change after preflight, recreating the verified evidence-loss defect. Unacceptable.
   - Effort: Low

### Recommendation

Use approach 1 and keep it internal/additive:

- Enrich `settleChild` from `boolean` to a determinate result (`Settled` or `TerminationTimedOut`), while typed process failures remain indeterminate failures.
- Treat cancellation as proven only when `Cause.hasInterruptsOnly(callbackExit.cause)` is true **and** child absence/exit/termination settlement is confirmed. Commit `RequestCancellation` from `Executing`, then `ConfirmCancellation`, using deterministic attempt-scoped request/confirmation identifiers. Widen `ExecutionResult.terminal` to include `Cancelled`. Any timeout returns `TerminationTimedOut`; mixed failure/defect causes, process-adapter failure, commit failure, or unknown settlement retain existing/indeterminate evidence and MUST NOT persist `Cancelled`.
- Add an additive release-aware lock operation (or an internal third continuation on `withExclusive`) whose post-release continuation executes only after unchanged-metadata removal and parent-directory sync succeed. Preserve current `withExclusive` behavior for compatibility.
- Refactor cleanup into “prepare under live ownership” and “conditionally delete after proven release.” The preparation captures exact terminal/tail bytes in an opaque internal ticket; deletion reuses the durable compare-metadata directory mutation so a newly acquired writer or changed evidence causes preservation rather than deletion.
- Add deterministic RED cases first, triangulate interruption-only vs mixed cause vs timeout/termination failure, then add safety-net cases for existing success/failure completion, lock invalidation, cleanup failure, and changed metadata. Include `run-executor.ts`, `workspace-lock.ts`, `cleanup.ts`, and any newly changed helper in coverage; do not weaken thresholds.

Compatibility is narrow. Persisted `effectify-run-store/1` and lock bytes remain unchanged. `RunExecutor.ExecutionResult` widens additively to `Cancelled`; exhaustive consumers may receive a source-level compile failure, which is appropriate for a new truthful outcome in the unreleased `0.0.0` package. Keep existing `WorkspaceLock.withExclusive` intact and add a finalization seam rather than changing its callback signature. Cleanup preparation/tickets should remain internal so no new public authority can be forged.

Rollback boundary is the cancellation branch, release-aware lock seam, two-phase cleanup internals, focused tests, and coverage include entries. Reverting that unit restores parent behavior without deleting or migrating locks/run evidence. Do not roll back by deleting retained evidence.

A strict 400 changed-line budget is **possible but not comfortably reliable**. A disciplined implementation is approximately 90–130 production lines, 190–250 test lines, and under 20 configuration/type lines (roughly 300–400 total). Coverage-driven branch tests or an extra durable-filesystem primitive would push it beyond 400; therefore approach 2 and public API expansion must remain out of scope. Forecast risk: Medium, near the ceiling.

No product decision blocks proposal. The parent decisions already establish truthful cancellation, fail-closed indeterminate handling, ownership-gated cleanup, no CLI/tool-registry expansion, and evidence preservation. The remaining choices are implementation architecture and verification mechanics.

### Risks

- Releasing before conditional deletion permits a new owner to acquire; deletion must atomically compare the captured terminal evidence and preserve on any mismatch.
- Persisting `RequestCancellation` but failing `ConfirmCancellation` leaves truthful nonterminal evidence; recovery must retain it rather than synthesize `Cancelled`.
- Mixed causes containing interruption plus failure/defect must not be collapsed into cancellation; use interruption-only classification.
- Adding changed files to the existing 95/90 coverage thresholds may expose untested legacy branches and threaten the 400-line target.
- The follow-up must maintain separate OpenSpec/Engram and review lineage; it must not claim membership in exhausted `review-lock-executor-delivery` correction work.

### Ready for Proposal

Yes. Proposal can proceed with no blocking product decision. It should state that this is a new bounded follow-up, adopt the release-aware conditional cleanup ticket, require interruption-only plus confirmed settlement for `Cancelled`, retain all timeout/indeterminate evidence, and treat 400 lines as a near-ceiling target rather than a guaranteed limit.
