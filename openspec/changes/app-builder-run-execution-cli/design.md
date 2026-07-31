# Design: App Builder Run Execution CLI

## Technical Approach

This tracker is **non-applicable to apply**: it creates no runtime code or tasks. PE3–4 delivery is four strict-TDD grandchildren consuming `@effectify/app-builder-contracts`; contracts remain read-only. The architecture separates pure lifecycle authority, crash-consistent state, exclusive mutation, and the product adapter. Nx generation, web, plugins, analytics, registry/marketplace, and broad scaffolding are excluded.

## Architecture Decisions

| Decision      | Choice and rationale                                                                                                                                                                                                                                                                                           | Rejected                                    |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| Intent        | One schema-decoded `CreationIntent` (`formatVersion`, `RunRef`, canonical workspace, `PassivePlan`, pinned inputs, secret-source references) after defaults. Wizard, flags, and drafts all cross this decoder; secret material stays ephemeral.                                                                | Separate interactive/automation DTOs drift. |
| Lifecycle     | `RunLifecycle` alone owns `Draft → Validated → AwaitingApproval → Ready → Executing → Succeeded/Failed/Cancelled/RecoveryRequired`; every revision appends immutable transition evidence.                                                                                                                      | Handlers/store mutating state.              |
| Policy        | An immutable Layer supplies exact `{ id, version }` evaluators. Evidence records normalized non-secret facts, redacted secret presence/source (never value/hash), and decision. Unknown versions stop.                                                                                                         | Mutable registry or ambient policy.         |
| Durability    | Journal event is authoritative: encode/validate, write same-directory temp, sync file, atomic rename, sync directory, then replace derived snapshot. Unsupported durability fails typed; revision/digest conflicts never overwrite.                                                                            | In-place JSON or snapshot authority.        |
| Resume        | Auto-resume requires valid journal chain, exact policy/contract versions, owned lock, stable operation key, and a transition plus tool operation explicitly marked idempotent. Corrupt, unknown, already-running, or non-idempotent work returns input-required/recovery-blocked before mutation.              | “Retry last step.”                          |
| Lock          | Atomic workspace lock-directory acquisition with scoped owner token and process identity; no lease/heartbeat in v1 because suspension creates false staleness. Recovery requires unchanged metadata, same-host definitive dead-owner proof, and explicit `LockRecoveryAuthority`; unknown/remote owners block. | `Semaphore`, timestamps, global maps.       |
| Unstable APIs | One concrete adapter imports current pinned `effect/unstable/cli` and process modules; it composes upstream APIs directly and is contract-tested, without wrapper/shadow APIs.                                                                                                                                 | Forking Effect CLI types.                   |

## Grandchild Dependency and File Ownership

`contracts → lifecycle → store/recovery → lock/executor → CLI`

| Grandchild                       | Exact ownership and API seam                                                                                                                                                                                 | Rollback boundary                                          |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| `app-builder-run-lifecycle`      | `packages/app-builder/execution/src/{creation-intent,lifecycle,automatic-policy,transition-evidence,failure}.ts`; exports schemas, `RunLifecycle`, policy service.                                           | Remove additive modules/package.                           |
| `app-builder-run-store-recovery` | same package: `{run-store,recovery,persistence-format,durable-file-system}.ts`; `RunStore`/`Recovery` consume lifecycle and require scoped write authority.                                                  | Revert storage modules/formats; retain lifecycle.          |
| `app-builder-run-lock-executor`  | same package: `{workspace-lock,process-identity,run-executor,workspace-mutator,tool-process}.ts`; `WorkspaceLock.withExclusive` provides write authority; executor is the only mutation/process caller.      | Revert executor/lock; persisted evidence remains readable. |
| `app-builder-execution-cli`      | `packages/app-builder/cli/src/{effect-cli-adapter,create-command,input-resolver,output,config,main}.ts`; `Command.make`, `Argument`, `Flag`, `Prompt`, `Command.runWith`; sole `NodeRuntime.runMain` wiring. | Remove CLI package; execution API remains.                 |

## Data Flow

```text
Argument/Flag or Prompt or draft → InputResolver → CreationIntent decoder
  → Recovery → WorkspaceLock(scope) → RunExecutor → WorkspaceMutator/ChildProcess
  → journal evidence → Output (human stderr/terminal | one JSON envelope stdout)
```

## Interfaces / Contracts

Services use `Context.Service`, `Layer.effect`, and named `Effect.fn("AppBuilder.<operation>")`. Boundary failures are `Schema.TaggedErrorClass` (intent, transition, policy, persistence, recovery, lock, process, output); unknown inputs use `Schema.decodeUnknownEffect`, without casts/unchecked throws. Config recipes build policy identity, state path, kill grace, and bounded retry schedules through `Config`/`ConfigProvider`, never `process.env`. Live Layers inject `FileSystem`, `Path`, `Terminal`, `Console`/`Stdio`, and `ChildProcessSpawner`; Scope/finalizers cancel children, record interruption when possible, then release owned locks. Subprocesses use executable plus argument arrays, canonical cwd, and explicit environment—never shell composition. Only proven-idempotent operations receive bounded `Schedule` retry.

## Testing Strategy

| Layer       | Proof                                                                                                                                                                                                    |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit        | Transition laws, policy versions/redaction, intent parity/defaults, resume decision table, typed failures.                                                                                               |
| Integration | Inject crash points around each sync/rename, malformed journals, owner races/stale recovery, cancellation/finalizers, fake process/output services.                                                      |
| CLI/E2E     | `Command.runWith` deterministic argv/Prompt layers; exactly one JSON stdout value; human stderr separation; child-process signal handshake. Use `TestClock`, `Deferred`, `Queue`, `Ref`; no real sleeps. |

## Threat Matrix

| Boundary                 | Applicability                                 | Safe/failure behavior and planned RED proof                                                                                                                                                                        |
| ------------------------ | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Documentation-like paths | N/A—no executable classification.             | No task.                                                                                                                                                                                                           |
| Git repository selection | N/A—workspace authority is not Git selection. | No task.                                                                                                                                                                                                           |
| Commit state             | N/A—no commits.                               | No task.                                                                                                                                                                                                           |
| Push state               | N/A—no pushes.                                | No task.                                                                                                                                                                                                           |
| PR commands              | N/A—no PR automation.                         | No task.                                                                                                                                                                                                           |
| Tool subprocess          | Applicable                                    | Literal executable/args, canonical cwd, allowlisted environment; metacharacters remain data, invalid cwd/exit/signal is typed. RED: spaces, `;`, `$()`, relative traversal, non-zero exit, interruption/finalizer. |

## Migration / Rollout

No migration. Deliver/revert grandchildren in dependency/reverse order; each must preserve PE3–4 requirement links and independently prove its API seam before the next begins.

## Open Questions

None.
