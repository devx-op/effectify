# Design: App Builder Run Lock and Executor

## Technical Approach

Requirement keys: **R1** atomic scoped ownership, **R2** authorized stale recovery, **R3** resolved callback/owned mutation, **R4** truthful interruption, **R5** safe finalization/compatibility. The execution package adds a workspace-wide private lock and runs one already-resolved Effect callback; it does not inspect `PassivePlan`, discover tools, or define CLI behavior.

```text
execute → exclusive mkdir/CAS → commit Ready→Executing → restore(callback)
                                                    ↓ exit/interruption
lock retained ← timeout/uncertainty ← stop→wait→force?→settle
lock release ← compare-remove ← owned cleanup ← terminal revalidation ← proven commit
```

## Architecture Decisions

| Choice                                                                                                                                                                            | Rejected alternative / tradeoff                                                         | Maps     |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | -------- |
| Runtime capability object minted by `WorkspaceLock`, recorded in a private `WeakMap`, and invalidated by scope finalization                                                       | Structural brand/token (forgeable); ambient/default service (authority leak)            | R1,R3    |
| Exclusive `0700` directory creation plus handle-relative compare-and-swap/remove primitives                                                                                       | Advisory file, lease/age, check-then-delete, unlocked fallback                          | R1,R2,R5 |
| Recovery requires a supplied `LockRecoveryAuthority.Service`, byte-identical owner metadata, and `ProcessIdentity` = definitive `Dead` for the same host/boot/process-start tuple | PID-only/TTL/automatic salvage; uncertainty deliberately blocks                         | R2       |
| `Effect.uninterruptibleMask`: acquisition, commits, evidence checks, cleanup, release masked; callback and bounded waits use `restore`                                            | Fully interruptible finalizer (partial claims) or fully masked callback (uncancellable) | R3–R5    |
| Callback invocation is never automatically replayed after start; only determinate, idempotent filesystem steps retry                                                              | Generic retries or retry after indeterminate publication                                | R3,R5    |
| `ToolProcess` stays internal and argv-based; no shell, registry, or executable classification                                                                                     | Public child-process/CLI abstraction                                                    | R3,R4    |

## Modules and Contracts

| File                                                                                                                  | Action / boundary                                                                                                                                                           |
| --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/ownership.ts`                                                                                                    | Create dependency-free issuer/validator and scoped authority state; prevents cycles.                                                                                        |
| `src/workspace-lock.ts`                                                                                               | Create `Context.Service`/`Layer.effect`, metadata schemas, acquire/takeover/release.                                                                                        |
| `src/process-identity.ts`                                                                                             | Create service returning `Alive                                                                                                                                             | Dead | Unknown | ForeignHost`; live adapter proves boot/process-start identity. |
| `src/run-executor.ts`                                                                                                 | Create public `execute(options, callback)` and state machine.                                                                                                               |
| `src/tool-process.ts`, `src/workspace-mutator.ts`                                                                     | Create internal service/layers; ownership-bound mutation and scoped child control.                                                                                          |
| `src/{durable-file-system,managed-path,run-store,cleanup,index}.ts`                                                   | Modify atomic seams/layout, require authority, and add only `WorkspaceLock`, `LockRecoveryAuthority`, `RunExecutor` to existing exports; never export `ToolProcess`/issuer. |
| `tests/{workspace-lock,run-executor,ownership}.test.ts`, `tests/durable-file-system-fake.ts`, `tests/public-types.ts` | Create/modify deterministic race, ordering, and surface proofs.                                                                                                             |

`OwnerMetadata` is canonical schema data `{format, workspaceDigest, hostId, bootId, pid, processStart, nonce}`. `CallbackIdentity` contains `runRef`, `attemptId`, and `IdempotencyProof` (`SingleAttempt` or `ReplaySafe(key)`). The sole callback shape is `(context: ExecutionContext) => Effect.Effect<Outcome,E,R>`; context carries the opaque live authority and ownership-bound mutation operations, never `ToolProcess`. Boundary errors use `Schema.TaggedErrorClass` (`LockHeld`, `RecoveryDenied`, `OwnershipRejected`, `LockEvidenceChanged`, `InvalidExecutionInput`, `TerminationTimedOut`) and direct `new ErrorType({...})`, without factories.

## Algorithms and Ordering

Acquisition validates absolute workspace/canonical managed descendants, atomically creates the lock, writes/syncs canonical owner bytes, then syncs the parent. Partial/missing evidence is an ambiguous retained lock. Takeover reads bytes once, obtains explicit recovery approval, proves same-host instance death, then calls atomic `replacePrivateDirectoryIfMetadataUnchanged`; any mismatch preserves the old lock. Release calls `removePrivateDirectoryIfMetadataUnchanged` with original bytes and active authority.

Executor requires `Ready`; the owned `Executing` commit completes before callback invocation. On exit it requests stop, waits bounded `Duration.Input`, force-stops only when supported, and waits a second bounded window. Only confirmed settlement permits terminal commit, recovery revalidation, owned cleanup, and lock release. `TerminationTimedOut`, indeterminate commit, cleanup failure, or changed metadata retains lock/evidence and never records `Cancelled`. Inputs reject infinite/negative windows, NUL environment data, inherited unsafe environment, symlink/cross-device paths, and cwd outside workspace.

## Testing Strategy and Threat Matrix

`@effect/vitest`, `TestClock`, `Deferred`, `Latch`, and stateful filesystem/process/identity test layers prove two-contender races, PID reuse/foreign/unknown owners, metadata swaps, expired/foreign authority, commit-before-callback, finalizer order, force support, timeout evidence, idempotent retry bounds, hostile paths/env, and unchanged v1 reads.

| Boundary                 | Applicability / response / RED proof                                                                                                                   |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Documentation-like paths | N/A — no classification or registry.                                                                                                                   |
| Git repository selection | N/A — no Git commands.                                                                                                                                 |
| Commit state             | N/A — no VCS commits.                                                                                                                                  |
| Push state               | N/A — no push.                                                                                                                                         |
| PR commands              | N/A — no PR automation.                                                                                                                                |
| Child process lifecycle  | Applicable — argv/no-shell, workspace cwd, validated env; spawn/stop/force/timeout failures preserve evidence; fake-process RED tests cover each case. |

## Compatibility, Rollout, and Work Units

No data migration: `effectify-run-store/1` bytes remain unchanged; lock metadata is separate. `RunStore.commit` and cleanup intentionally break source compatibility by requiring live authority. Feature-branch-chain units: (1) atomic FS/authority, (2) lock/identity/recovery, (3) owned store/mutation/cleanup, (4) executor/process/public surface and tests; keep total authored change within 3,000 lines. No open questions block design.
