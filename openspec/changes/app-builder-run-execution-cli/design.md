# Design: App Builder Run Execution CLI

## Technical Approach

This tracker is **non-applicable to apply** and remains PR #104's no-merge integration record. Protocol, lifecycle, crash-consistent state, exclusive mutation/finalization, POSIX durability, and executable-slice authorities are completed prerequisites retained with their evidence. Only the pending thin `app-builder-execution-cli` plan is superseded by `app-builder-golden-monorepo` and MUST NOT be applied. The Golden remains proposal-only; no specs, design, tasks, or implementation are authorized here.

## Architecture Decisions

| Decision      | Choice and rationale                                                                                                                                                                                                                                                                                           | Rejected                                    |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| Intent        | One schema-decoded `CreationIntent` (`formatVersion`, `RunRef`, canonical workspace, `PassivePlan`, pinned inputs, secret-source references) after defaults. Wizard, flags, and drafts all cross this decoder; secret material stays ephemeral.                                                                | Separate interactive/automation DTOs drift. |
| Lifecycle     | `RunLifecycle` alone owns `Draft → Validated → AwaitingApproval → Ready → Executing → Succeeded/Failed/Cancelled/RecoveryRequired`; every revision appends immutable transition evidence.                                                                                                                      | Handlers/store mutating state.              |
| Policy        | An immutable Layer supplies exact `{ id, version }` evaluators. Evidence records normalized non-secret facts, redacted secret presence/source (never value/hash), and decision. Unknown versions stop.                                                                                                         | Mutable registry or ambient policy.         |
| Durability    | Journal event is authoritative: encode/validate, write same-directory temp, sync file, atomic rename, sync directory, then replace derived snapshot. Unsupported durability fails typed; revision/digest conflicts never overwrite.                                                                            | In-place JSON or snapshot authority.        |
| Resume        | Auto-resume requires valid journal chain, exact policy/contract versions, owned lock, stable operation key, and a transition plus tool operation explicitly marked idempotent. Corrupt, unknown, already-running, or non-idempotent work returns input-required/recovery-blocked before mutation.              | “Retry last step.”                          |
| Lock          | Atomic workspace lock-directory acquisition with scoped owner token and process identity; no lease/heartbeat in v1 because suspension creates false staleness. Recovery requires unchanged metadata, same-host definitive dead-owner proof, and explicit `LockRecoveryAuthority`; unknown/remote owners block. | `Semaphore`, timestamps, global maps.       |
| Historical thin CLI | Superseded and non-applicable; its former adapter decision confers no implementation authority. | Reviving the old CLI plan. |

## Grandchild Dependency, Status, and File Ownership

`contracts → lifecycle → store/recovery → lock/executor/finalization → POSIX/executable foundation → Golden product planning`

| Grandchild | Status | Exact ownership and API seam | Rollback boundary |
| ---------- | ------ | ---------------------------- | ----------------- |
| `app-builder-run-lifecycle` | Completed/archived | `packages/app-builder/execution/src/{creation-intent,lifecycle,automatic-policy,transition-evidence,failure}.ts`; schemas, `RunLifecycle`, policy service. | Historical boundary retained. |
| `app-builder-run-store-recovery` | Completed/archived | Same package: `{run-store,recovery,persistence-format,durable-file-system}.ts`; lifecycle-consuming durable state/recovery. | Historical boundary retained. |
| `app-builder-run-lock-executor` | Completed/archived with finalization | Same package: `{workspace-lock,process-identity,run-executor,workspace-mutator,tool-process}.ts`; exclusive mutation/process authority and release-safe finalization. | Historical boundary retained. |
| `app-builder-execution-cli` | **Superseded; MUST NOT apply** | Historical planned thin adapter only; no implementation ownership remains. | N/A; no work may start. |

Completed protocol-contract children and the verified POSIX/executable vertical slice keep their own archived or active evidence and are consumed as prerequisites; this tracker does not rewrite or absorb them.

## Data Flow

```text
Retained protocol/lifecycle/store/lock/POSIX authorities
  → app-builder-golden-monorepo proposal
  → future specs/design/tasks only after separate authorization
```

## Interfaces / Contracts

Services use `Context.Service`, `Layer.effect`, and named `Effect.fn("AppBuilder.<operation>")`. Boundary failures are `Schema.TaggedErrorClass` (intent, transition, policy, persistence, recovery, lock, process, output); unknown inputs use `Schema.decodeUnknownEffect`, without casts/unchecked throws. Config recipes build policy identity, state path, kill grace, and bounded retry schedules through `Config`/`ConfigProvider`, never `process.env`. Live Layers inject `FileSystem`, `Path`, `Terminal`, `Console`/`Stdio`, and `ChildProcessSpawner`; Scope/finalizers cancel children, record interruption when possible, then release owned locks. Subprocesses use executable plus argument arrays, canonical cwd, and explicit environment—never shell composition. Only proven-idempotent operations receive bounded `Schedule` retry.

## Testing Strategy

| Layer       | Proof                                                                                                                                                                                                    |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit        | Transition laws, policy versions/redaction, intent parity/defaults, resume decision table, typed failures.                                                                                               |
| Integration | Inject crash points around each sync/rename, malformed journals, owner races/stale recovery, cancellation/finalizers, fake process/output services.                                                      |
| CLI/E2E     | Pending thin CLI tests are non-applicable. Future product acceptance belongs to separately authorized Golden artifacts. |

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

No migration. Retain completed authorities and evidence unchanged. Route only future product planning to `app-builder-golden-monorepo`; do not create or apply its later phases from this tracker.

## Open Questions

None.
