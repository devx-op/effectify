# `@effectify/app-builder-execution`

Deterministic lifecycle and durable-storage boundary for App Builder PE3–4 runs. It consumes the passive identities and diagnostics from `@effectify/app-builder-contracts`; it does not redefine those records.

## Public API

The package root exports explicit module namespaces:

- `RunLifecycle` — tagged lifecycle snapshots, transition requests and results, the pure `reduce` function, `makeDraft`, and the stateless Effect service.
- `TransitionEvidence` — immutable transition evidence and contract-reference schemas.
- `AutomaticPolicy` — policy request, receipt, decision, fact, and redacted-secret schemas.
- `LifecycleFailure` — the closed typed failure set.
- `PersistenceFormat` — canonical versioned journal and snapshot codecs.
- `ManagedPath` — workspace-local managed-state path validation and layout helpers.
- `DurableFileSystem` — Effect-first durable filesystem capability boundary.
- `DraftStore` — contracts-validated passive draft persistence without CLI behavior.
- `RunStore` — immutable journal commit boundary without cross-process lock claims.
- `Recovery` — read-only journal validation and non-executable recovery decisions.
- `Cleanup` — explicit terminal-only retention cleanup after exact-tail validation.

`RunLifecycle.reduce` is the sole transition authority. It accepts a snapshot, request, and caller-provided prior-result material, then returns a new immutable result or a typed failure. It never mutates the supplied snapshot or holds state between calls.

## Legal transitions

| Current state               | Request                                        | Next state / result       |
| --------------------------- | ---------------------------------------------- | ------------------------- |
| `Draft`                     | `Validate`                                     | `Validated`               |
| `Validated`                 | `RequireApproval`                              | `WaitingForApproval`      |
| `WaitingForApproval`        | matching idempotent approved `ResolveApproval` | `Ready`                   |
| `Ready`                     | `AcceptExecution`                              | `Executing`               |
| `Executing`                 | `Complete(Succeeded \| Failed)`                | `Succeeded` or `Failed`   |
| `Draft` through `Executing` | `RequestCancellation`                          | `CancellationRequested`   |
| `CancellationRequested`     | `ConfirmCancellation`                          | `Cancelled`               |
| `Executing`                 | `RecordRecoverableInterruption`                | `RecoverableInterruption` |

All other novel pairs return `LifecycleFailure.IllegalTransition`. Terminal snapshots (`Succeeded`, `Failed`, and `Cancelled`) have no outgoing transition. `CancellationRequested` is deliberately non-terminal: it records intent only and never claims cleanup. `RecoverableInterruption` records a proven safe point; this package does not resume it.

Every applied transition appends exactly one evidence item with prior/next revisions, sequence, state tags, request identity, normalized non-secret facts, redacted secret descriptors, and protocol/plan references. Values or hashes for secrets are never represented.

## Replay and policy boundary

Facts and secret descriptors are normalized with exact UTF-16 key ordering; `-0` becomes `0`. Equal duplicate keys collapse, while divergent duplicates, a fact/secret key reuse, or a conflicting request identity return `LifecycleFailure.ConflictingDuplicate`.

Lifecycle idempotency is limited to a transition request. An equivalent request identity and normalized semantic body returns the exact caller-provided prior result without appending history. A missing, inconsistent, or conflicting prior result returns a typed lifecycle failure. This is not proof that a future workspace operation is idempotent.

Policy is an external seam. The package defines approval requests and receipts only; it contains no policy registry or evaluation rules. Missing, denied, or non-idempotent approval stays in `WaitingForApproval`.

`RunLifecycle.Service` wraps the pure reducer using `Effect.fn` and `Layer.succeed`. It remains stateless and preserves fiber interruption.

## Durable storage and recovery boundary

`RunStore` persists immutable, versioned journal segments under the workspace-local `/.effectify/` root. Snapshots are disposable read acceleration only; the journal remains the recovery authority.

`DraftStore` persists and reads only canonical `ValidatedWizardDraft` material through the same managed durable boundary. Invalid drafts cause no managed filesystem mutation; CLI intent, prompts, and defaults remain excluded.

The bundled Node adapter fails closed with `UnsupportedDurability` because path-string APIs cannot prove directory-handle-relative no-follow behavior. A live platform adapter must prove that capability before this package reads, publishes, or cleans managed paths.

`Recovery` validates the complete journal set and returns only closed recovery outcomes. A recovery candidate identifies unmet lock and executor/idempotency authorities. It does not execute a workspace operation, acquire a lock, repair, salvage, migrate, quarantine, or remove evidence.

`Cleanup` is explicit and terminal-only. It revalidates recovery evidence and an exact expected tail before removing a run tree; invalid, nonterminal, ambiguous, and draft evidence remains retained.

## Deliberate exclusions

This package does **not** implement cross-process locks, executors, subprocess execution, CLI intent or wizard behavior, automatic repair/salvage/migration/quarantine/cleanup, databases, Nx generation, web features, plugins, or analytics. Later children may adapt these boundaries without duplicating lifecycle transition rules.

## Rollback

Before dependent children land, rollback can remove the additive storage/recovery namespaces and the `/.effectify/` ignore rule. Preserve state bytes for diagnosis; rollback must not rewrite or delete workspace evidence. `@effectify/app-builder-contracts` remains unchanged.
