# `@effectify/app-builder-execution`

Deterministic, in-memory lifecycle authority for App Builder PE3–4 runs. It consumes the passive identities and diagnostics from `@effectify/app-builder-contracts`; it does not redefine those records or own their persistence.

## Public API

The package root exports exactly four namespaces:

- `RunLifecycle` — tagged lifecycle snapshots, transition requests and results, the pure `reduce` function, `makeDraft`, and the stateless Effect service.
- `TransitionEvidence` — immutable transition evidence and contract-reference schemas.
- `AutomaticPolicy` — policy request, receipt, decision, fact, and redacted-secret schemas.
- `LifecycleFailure` — the closed typed failure set.

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

## Deliberate exclusions

This package does **not** implement persistence or recovery; locks, executors, cleanup, or subprocess execution; CLI intent or wizard behavior; filesystem, process, clock, or global mutable state; Nx generation; web features; plugins; or analytics. Later children may adapt this lifecycle authority at those boundaries without duplicating its transition rules.

## Rollback

Before dependent children land, rollback is the removal of this additive `packages/app-builder/execution` package. `@effectify/app-builder-contracts` remains unchanged.
