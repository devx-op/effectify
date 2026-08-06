# Proposal: App Builder Run Lifecycle

## Intent

App Builder contracts describe passive runs and plans but not legal execution transitions or durable evidence. Developers, automation, and later adapters need one deterministic authority for approval gaps, cancellation races, and safely recoverable failures.

## Goals

- Own immutable snapshots, legal transitions, and append-only history.
- Return typed applied, waiting-for-approval, cancellation-requested, recoverable-interruption, and rejection/failure outcomes.
- Preserve PE3 lifecycle/approval traceability and a stable PE4 consumer seam without CLI behavior.
- Distinguish lifecycle-transition idempotency from future workspace-operation idempotency.

## Scope

### In Scope

- Schema-backed tagged snapshots, evidence, and a pure exhaustive reducer enforcing revisions and terminal closure.
- History containing previous state, next state, cause, and evidence.
- Stateless Effect services and versioned policy/approval request contracts; no policy rules.
- Explicit resumable `WaitingForApproval`, non-terminal `CancellationRequested`, and evidence-preserving `RecoverableInterruption` states.

### Out of Scope

- Persistence/recovery implementation, locks, execution, subprocesses, workspace mutation, CLI intent/wizard, Nx generation, filesystem/process/global state, web, plugins, or analytics.

## Capabilities

### New Capabilities

- `app-builder-run-lifecycle`: Immutable run states, legal transitions, typed outcomes, history, approval requests, and lifecycle idempotency.

### Modified Capabilities

None; App Builder contract specifications remain read-only.

## Approach and Constraints

Use `Schema.TaggedUnion` values, `Schema.TaggedErrorClass` failures, one pure total reducer, and thin `Context.Service`/`Effect.fn` services. Callers provide snapshots and facts; services retain no state. Missing approval blocks progression. Executing cancellation records a request; only later executor confirmation reaches `Cancelled`. A proven safe point yields `RecoverableInterruption`, never hidden success or automatic terminal failure.

This independently reviewable first grandchild creates the sole transition contract for later grandchildren. Its 750–1,100-line forecast remains below the 3,000-line budget.

## Affected Areas

| Area                              | Impact    | Description                                                           |
| --------------------------------- | --------- | --------------------------------------------------------------------- |
| `packages/app-builder/execution/` | New       | Lifecycle package boundary, five focused modules, metadata, and tests |
| `packages/app-builder/contracts/` | Unchanged | Supplies decoded identities, plans, outcomes, and diagnostics         |

## Dependencies and Traceability

- `@effectify/app-builder-contracts` and `app-builder-protocol-contracts`.
- Parent `app-builder-run-execution-cli`: PE3 lifecycle/approval; PE4 consumes but does not alter this API.

## Risks and Tradeoffs

| Risk                                                  | Mitigation                                    |
| ----------------------------------------------------- | --------------------------------------------- |
| State vocabulary drifts across descendants            | One exhaustive reducer and exported schemas   |
| Cancellation claims cleanup prematurely               | Require executor confirmation for `Cancelled` |
| Lifecycle idempotency is mistaken for mutation safety | Encode and document separate proofs           |
| Policy or persistence leaks into lifecycle            | Keep only request seams and immutable values  |

## Rollback Plan

Remove the additive execution package/modules before dependent grandchildren land; contracts remain unchanged.

## Success Criteria

- [ ] Every legal transition and typed non-transition outcome is explicit and exhaustive.
- [ ] Every applied transition appends immutable cause/evidence without mutating input.
- [ ] Later grandchildren can depend on the lifecycle without duplicating transition authority.
