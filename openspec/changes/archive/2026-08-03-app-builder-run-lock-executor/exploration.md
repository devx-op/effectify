# Exploration: App Builder Run Lock and Executor

> Exploration only. This artifact does not authorize proposal, specification, design, tasks, implementation, or the later CLI surface.

## Current State

The dependency chain is implemented through `@effectify/app-builder-execution`: lifecycle is the sole pure transition authority, and store/recovery owns canonical journals, optimistic tail validation, read-only recovery, and fail-closed retention. `RecoverableInterruption` deliberately has no outgoing lifecycle transition, while `ResumeCandidate` is non-executable and names `exclusive-run-ownership` and `executor-idempotency` as unmet authorities. `cleanupClosed` validates terminal evidence and always returns `ExclusiveAuthorityRequired`; no component can currently delete run state with proven ownership.

No workspace lock, process identity, mutation authority, child-process adapter, or run executor exists. `RunStore.commit` can detect observed tail conflicts but explicitly does not lock. `DurableFileSystem` can create private directories/files and remove trees, but it has no atomic exclusive-directory acquisition, metadata replacement, or compare-before-remove operation suitable for a lock protocol. The bundled live durable adapter also advertises `noFollowPaths: false`, so it fails closed before real persistence or locking.

The contracts-owned `PassivePlan` contains `ToolStep`, `CallbackStep`, and `ContinuationStep` references, but no executable command, tool implementation registry, workspace mutation program, or idempotency declaration. Therefore the current codebase cannot truthfully derive a subprocess or mutation operation from a plan.

Upstream Effect v4 supports the required lifecycle shape: scoped acquisition/release through `Effect.acquireRelease`/`acquireUseRelease`, uninterruptible acquisition/finalization with restored interruption for the critical section, scoped child handles, signal-driven main-fiber interruption in `NodeRuntime`, bounded `Schedule` retry, and deterministic `Deferred`/`Queue`/`Ref`/`TestClock` tests. Current Alchemy uses Effect `ChildProcess.make` plus `ChildProcessSpawner` and scoped child handles, but its auth lock is intentionally best-effort, heartbeat/mtime based, and allowed to continue unlocked; that lock policy is NOT suitable for authoritative workspace mutation.

## Exact Capability Gap

| Concern                  | Existing guarantee                                          | Missing authority                                                                                                            |
| ------------------------ | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Exclusive lock ownership | Optimistic journal tail CAS only                            | Atomic workspace-wide acquisition, opaque owner capability, rejection diagnostics                                            |
| Stale owner              | Recovery reports state facts only                           | Same-host process identity, PID-reuse-safe death proof, explicit recovery authority, unchanged-metadata takeover             |
| Execution authorization  | Lifecycle can enter `Executing`                             | A boundary proving lifecycle readiness, lock ownership, exact operation identity, and idempotency before effects             |
| Process lifecycle        | None                                                        | Literal executable/arguments, canonical cwd, explicit environment, typed exit/signal/spawn outcomes, scoped termination      |
| Cleanup authority        | Terminal validation ends at `ExclusiveAuthorityRequired`    | Ownership-bound deletion after revalidation and compare-before-remove                                                        |
| Failure semantics        | Lifecycle/store failures are closed and evidence preserving | Ordered interruption/finalization policy that never claims cleanup, cancellation, safe interruption, or commit without proof |

## Affected Areas

- `packages/app-builder/execution/src/workspace-lock.ts` — workspace-wide scoped ownership, rejection/recovery outcomes, and opaque authority.
- `packages/app-builder/execution/src/process-identity.ts` — stable owner metadata and same-host definitive liveness/death proof.
- `packages/app-builder/execution/src/run-executor.ts` — sole orchestration of recovery, lifecycle transitions, mutation/process execution, persistence, cancellation, and completion.
- `packages/app-builder/execution/src/workspace-mutator.ts` — authority-gated workspace effects; exact operation vocabulary remains unresolved.
- `packages/app-builder/execution/src/tool-process.ts` — Effect v4 child-process adapter with literal argv, canonical cwd, explicit environment, and scoped shutdown.
- `packages/app-builder/execution/src/{durable-file-system,run-store,cleanup,index}.ts` — likely unavoidable seam changes for atomic lock operations, ownership-bound state writes/cleanup, and exports; this exceeds the tracker's original additive-file list and needs proposal approval.
- `packages/app-builder/execution/tests/` — deterministic owner race, stale recovery, authority, process, cancellation, and cleanup suites.
- `packages/app-builder/contracts/src/passive-record.ts` and `tool-declaration.ts` — read-only evidence of the unresolved plan-to-operation mapping; this child should not redefine these contracts.

## Approaches

1. **Atomic lock directory plus opaque scoped authority (recommended)** — atomically create one private workspace lock directory, write canonical owner metadata, and expose ownership only inside `WorkspaceLock.withExclusive`.
   - Pros: fail-closed, inspectable diagnostics, explicit cleanup authority, independent of wall-clock leases, compatible with Effect scopes and deterministic fakes.
   - Cons: requires stronger filesystem primitives and platform-specific process identity; stale takeover is a careful multi-step protocol.
   - Effort: High

2. **OS advisory lock adapter** — hold an OS file lock for the scope and keep metadata alongside it.
   - Pros: kernel release on process death; strong mutual exclusion where supported.
   - Cons: portability/network-filesystem semantics vary; owner diagnostics and explicit stale takeover are adapter-dependent; likely introduces a native dependency and complicates deterministic tests.
   - Effort: High

3. **Lease/heartbeat lock** — refresh lock timestamps and take over after a configured stale window.
   - Pros: operationally familiar and easy to diagnose.
   - Cons: suspension, event-loop starvation, clock changes, and long operations can create false staleness and concurrent writers; contradicts the tracker decision against heartbeat authority.
   - Effort: Medium, but unacceptable safety risk

## Recommendation

Use approach 1, with these boundaries:

- `WorkspaceLock.withExclusive(input, use)` performs interrupt-safe acquisition and release. It rejects immediately when a live, remote, unknown, changed, or unverifiable owner exists. It MAY recover only when an explicit `LockRecoveryAuthority` is supplied, owner metadata is unchanged, the owner is on the same host, and death plus process-instance mismatch is proven.
- Keep the owner capability opaque and scope-bound (private symbol/closure, no public constructor or serializable token). `RunExecutor` is the only public consumer that can invoke `WorkspaceMutator`, `ToolProcess`, execution-time store commits, or terminal cleanup.
- Keep lock scope workspace-wide, not run-wide, because the protected resource is workspace mutation. Store `runRef`, host identity, PID, process-start identity, and a random owner nonce only as diagnostics/compare-and-remove evidence; timestamps are observational, never authority.
- Model lock wait, termination grace, and retry windows as `Duration.Input` at the package boundary and normalize internally. Do not add shadow duration unions.
- Spawn only a literal executable plus argument array, canonical workspace-contained cwd, and explicit allowlisted environment. Never parse a command string or enable a shell. Use Effect's `ChildProcessSpawner` handle within `Effect.scoped`.
- Finalization order is: stop/interrupt child, await bounded grace, force termination when supported, record cancellation or recoverable interruption only when its proof exists, preserve any indeterminate journal state, perform ownership-bound cleanup only after terminal revalidation, then compare-and-remove the unchanged owned lock. Lock release MUST still run if evidence persistence fails.
- Retry only operations carrying explicit stable operation identity and proven idempotency, using a bounded `Schedule`. Spawn, arbitrary mutation, lock takeover, and non-idempotent operations are never retried merely because they failed or were interrupted.
- Do not implement CLI commands, prompts, flags, signal registration, stdout/stderr rendering, tool discovery, or a tool registry in this child. `NodeRuntime.runMain` and product signal wiring remain in the CLI child; this package reacts to fiber interruption.

### Likely Public API

```ts
WorkspaceLock.withExclusive(input, use)
// Effect<A, WorkspaceLockFailure | E, Scope | ProcessIdentity | LockFileSystem | R>

RunExecutor.execute(input)
// Effect<ExecutionOutcome, ExecutionFailure, RunLifecycle.Service | RunStore...>

ToolProcess.run(command)
// command = { executable, args, cwd, environment, terminationGrace: Duration.Input }
```

`RunExecutor.execute` should accept an already resolved, schema-validated execution operation with stable identity and an explicit idempotency proof. It must not infer executable behavior from `PassivePlan`. The exact owner of that operation contract is a product decision required before proposal.

### Core Invariants

1. At most one valid workspace mutation authority exists for a workspace.
2. A lock metadata record is diagnostic evidence, not authority; authority exists only in the scoped capability returned by successful atomic acquisition.
3. Takeover requires explicit authority, definitive same-host dead-owner proof, and byte/identity-stable metadata through compare-and-remove.
4. No process or workspace mutation starts before `Ready -> Executing` is durably committed under ownership.
5. No success/failure/cancellation/recoverable claim is persisted unless the corresponding runtime fact is proven.
6. Scope exit always attempts child finalization before lock release; release removes only the caller's unchanged owner record.
7. Non-idempotent operations execute at most once per acquired operation identity and are never automatically resumed.
8. Lock rejection, process failure, interruption, persistence failure, and cleanup failure preserve evidence and never silently continue unlocked.

### Failure Modes

- `LockHeld`: safe owner/recovery diagnostics, no mutation.
- `LockOwnerUnverifiable` / `RemoteOwner`: no takeover.
- `LockRecoveryUnauthorized` / `LockChanged`: no removal or acquisition claim.
- `ProcessIdentityUnavailable`: fail closed when definitive ownership/death proof is required.
- `SpawnFailed`, `InvalidWorkingDirectory`, `UnexpectedExit`, `ProcessSignaled`, `TerminationTimedOut`: typed process outcomes without shell-expanded data.
- `ExecutionNotReady`, `OperationIdentityMismatch`, `IdempotencyUnproven`: reject before mutation.
- `PersistenceIndeterminate`: preserve lock until finalization; after release, later recovery blocks or requires input according to canonical evidence.
- `CleanupPreserved`: terminal result may remain valid while state evidence is retained; never convert cleanup failure into execution failure retroactively.

### Test Strategy

- RED owner-race test with a `Deferred` gate: exactly one acquisition succeeds and the loser receives the winning diagnostics.
- Table-driven stale-owner matrix: live, dead same-host with authority, dead without authority, PID reused/process-start mismatch, remote, unknown, changed metadata, malformed metadata, removal/acquisition race.
- Scope/finalizer tests with `Queue`/`Ref`: acquisition interruption, body success/failure/defect/interruption, release failure, child graceful exit, forced termination, timeout, and exact ordering.
- Executor state matrix: not-ready rejection; durable `AcceptExecution` before invocation; success/failure commit; cancellation request then confirmation only after cleanup; proven safe-point interruption; unproven interruption preserved as blocked recovery.
- Retry tests using `TestClock`: zero retries for non-idempotent work; exact bounded attempts only for explicitly idempotent operations.
- Subprocess adapter tests: spaces, `;`, `$()`, hostile cwd/traversal, explicit environment, non-zero exit, signal, and output backpressure; metacharacters remain literal data.
- Cleanup authority tests: wrong owner, changed owner, stale tail, nonterminal/corrupt state, terminal exact tail, removal failure, and no deletion without lock capability.
- Focused Nx target: `pnpm nx test @effectify/app-builder-execution`; typecheck, lint, build, and affected gates follow in later phases.

### Migration and Compatibility

This should be additive for consumers and preserve `effectify-run-store/1` bytes. Existing lifecycle snapshots and journals require no migration. However, making `RunStore.commit` or `cleanupClosed` require ownership would be a source-level breaking change inside the unreleased `0.0.0` package; decide whether to tighten those APIs now or add executor-only authority-bound wrappers. Rollback removes lock/executor exports and leaves durable evidence readable.

### Review-Risk Forecast

The tracker forecast of 1,100–1,700 changed lines is optimistic if the child must add cross-platform process identity, strengthen `DurableFileSystem`, retrofit store/cleanup authority, and build adversarial process tests. A realistic forecast is 2,100–2,900 authored changed lines: within the maintainer-approved 3,000-line child budget but high cognitive risk. Keep one child only if product questions resolve to a narrow operation contract; otherwise split filesystem lock/identity from executor orchestration before apply while preserving the feature-branch chain.

## Explicit Scope and Non-Goals

In scope: workspace-wide ownership, stale-owner decision/proof, opaque execution authority, resolved-operation execution, child-process lifecycle, cancellation/finalization, ownership-bound cleanup, typed failures, deterministic tests.

Out of scope: CLI commands/prompts/flags/output/signal registration; mapping user input to intent; tool discovery/registry; generating plans; changing contract record shapes; broad scaffolding; web/UI; analytics; plugins; registry/marketplace; database-backed coordination; remote/distributed locks; automatic salvage or migration.

## Product Questions Required Before Proposal

1. **Who owns the executable operation contract?** `PassivePlan` has references but no executable/mutator semantics. Must this child introduce an execution-operation schema/service, or will a separately resolved operation callback be injected by a later tool registry?
2. **Which platforms/filesystems are supported for definitive process-instance death proof?** If PID birth identity cannot be proven, should stale recovery always block (recommended) or is reduced assurance acceptable?
3. **Who may supply `LockRecoveryAuthority`?** Is stale recovery an explicit user-confirmed capability that the later CLI may request, an automation policy capability, or both? The lock layer must not infer consent from elapsed time.
4. **Must all `RunStore.commit` and terminal cleanup calls become ownership-gated?** If yes, the child needs permission to modify existing store/cleanup/durable APIs beyond the tracker's additive file list; if no, define precisely which state writes are allowed outside the executor lock.
5. **What is the cancellation truth when a child cannot be terminated within the grace window?** Recommended: retain ownership while bounded finalization runs, return `TerminationTimedOut`, do not confirm `Cancelled`, and preserve evidence for manual recovery.

## Risks

- PID-only liveness checks are unsafe because of reuse; timestamp-only stale checks are unsafe because of suspension and starvation.
- The current fail-closed live durable adapter cannot support a real lock until a no-follow, atomic lock filesystem capability exists.
- Effect child-process APIs are unstable and should remain isolated behind one adapter.
- Finalizer ordering can create false lifecycle claims if interruption is translated before child and persistence facts are known.
- Retrofitting authority into existing public store methods may widen scope and review cost.
- The unresolved plan-to-operation mapping is the primary proposal blocker.

## Ready for Proposal

No. The architecture direction is clear, but proposal must wait for answers to the executable-operation ownership and store/cleanup authority questions; platform support and stale-recovery authority should also be explicit rather than inferred.
