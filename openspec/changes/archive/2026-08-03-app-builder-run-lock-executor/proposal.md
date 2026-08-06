# Proposal: App Builder Run Lock and Executor

## Intent

Prevent concurrent builders from corrupting workspace or run evidence. Execute one resolved Effect callback under exclusive authority, producing typed outcomes for the later CLI without deriving behavior from `PassivePlan` or making unproven claims.

## Scope

### In Scope

- Atomic workspace lock-directory acquisition with opaque scope-bound ownership.
- Same-host process-instance evidence and explicit `LockRecoveryAuthority`; time is never authority.
- One public resolved Effect callback contract with identity and idempotency proof.
- Ownership-gated `RunStore.commit`, workspace mutation, and terminal cleanup.
- Effect-scoped child lifecycle through internal `ToolProcess`, truthful finalization, and deterministic tests.

### Non-Goals

- CLI commands, prompts, flags, signal registration, or rendering.
- Tool discovery/registry or executable semantics derived from `PassivePlan`.
- Distributed locks, leases, automatic salvage, or unlocked fallback.

## Capabilities

### New Capabilities

- `app-builder-run-lock-executor`: Exclusive ownership, callback execution, interruption, and finalization.

### Modified Capabilities

- `app-builder-run-store-recovery`: Require ownership for commits and terminal cleanup while preserving recovery evidence.

## Proposed Approach

`WorkspaceLock.withExclusive` atomically creates a private lock directory and yields unforgeable authority only within its Effect scope. Recovery requires explicit authority, unchanged metadata, and definitive same-host process-instance death; uncertainty blocks. `RunExecutor` commits `Ready -> Executing` under ownership before invoking the callback. Finalization stops the child, waits a bounded grace period, force-terminates when supported, persists only proven outcomes, revalidates terminal evidence, performs owned cleanup, then compare-before-removes the unchanged lock. `TerminationTimedOut` preserves evidence and never becomes `Cancelled`.

## Affected Areas

| Area                                                                                   | Impact                                      |
| -------------------------------------------------------------------------------------- | ------------------------------------------- |
| `packages/app-builder/execution/src/{workspace-lock,process-identity,run-executor}.ts` | New authority and orchestration             |
| `packages/app-builder/execution/src/{tool-process,workspace-mutator}.ts`               | Internal scoped adapters                    |
| `packages/app-builder/execution/src/{durable-file-system,run-store,cleanup,index}.ts`  | Ownership and atomic filesystem seams       |
| `packages/app-builder/execution/tests/`                                                | Race, recovery, process, and cleanup proofs |

## Compatibility and Migration

`effectify-run-store/1` bytes remain readable; no data migration occurs. Store and cleanup signatures may break source compatibility in this unreleased package to prevent unauthorized mutation.

## Risks

- Process identity may be unverifiable on some platforms; stale recovery then fails closed.
- Finalizer defects could create false lifecycle claims; ordering tests mitigate this.
- Scope may approach the 3,000-line budget; keep this child within the feature-branch chain.

## Rollback Plan

Remove executor/lock exports and gated integrations while preserving durable evidence; never delete locks or run state during rollback.

## Dependencies

- Draft PR #108 (`feat/app-builder-run-store-recovery`) and its canonical store/recovery capability.
- Later CLI supplies human-confirmed or authorized automation recovery authority.

## Measurable Acceptance Boundaries

- Exactly one contender acquires authority; every loser performs zero mutation.
- Recovery without explicit authority or definitive death proof performs zero takeover.
- Every commit and cleanup rejects missing/wrong ownership.
- Timeout returns `TerminationTimedOut`, preserves evidence, and does not claim `Cancelled`.
- Scope exit finalizes the child before compare-before-remove lock release.
