# Proposal: App Builder Run Execution CLI

## Intent

Track PE3–4 trustworthy run execution without an unreviewable implementation change. Protocol contracts define passive records but not transitions, approvals, recovery, locks, or execution. Developers and automation need `effectify create` for setup, CI, recovery, and concurrency. One Effect-first CLI must share validated intent across interactive and non-interactive paths and fail before unsafe mutation.

## Goals and Scope

### In Scope

- Bound lifecycle policy, persistence/recovery, exclusive execution, and CLI orchestration.
- Record policy identity/version, evaluated non-secret inputs, redacted secrets, and outcome.
- Auto-resume only explicitly idempotent safe transitions; stop on ambiguity.
- Enforce single-writer workspace locks with owner/recovery diagnostics.
- Keep strict JSON stdout separate from human output.
- Support Prompt-based `effectify create`, equivalent flags, defaults, validation, and restorable intent drafts.

### Out of Scope

- Applying this tracker or creating its grandchildren.
- Nx generation, web UI, analytics, plugin SDK, registry, marketplace, or broad scaffolding.

## Capabilities

### New Capabilities

None; each grandchild will own its capability contract.

### Modified Capabilities

None; existing contract specifications remain read-only dependencies.

## Proposed Grandchildren

| Order | Change                           | Boundary                                    |
| ----- | -------------------------------- | ------------------------------------------- |
| 1     | `app-builder-run-lifecycle`      | States, transitions, approvals, idempotency |
| 2     | `app-builder-run-store-recovery` | Durable state, drafts, validation, resume   |
| 3     | `app-builder-run-lock-executor`  | Cross-process lock, execution, cancellation |
| 4     | `app-builder-execution-cli`      | Commands, Prompt/flags, output, runtime     |

## Approach and Constraints

Use Effect v4 services, layers, named effects, config, scopes, typed errors, and deterministic tests. Build on `effect/unstable/cli` `Command`/`Argument`/`Flag`/`Prompt`; handlers only decode, invoke, and render. Dependency order: policy → state → execution → CLI.

This tracker is never applied: four correctness domains need independent strict-TDD evidence, rollback, and feature-branch-chain review below 3,000 lines each.

## Affected Areas

| Area                              | Impact                     |
| --------------------------------- | -------------------------- |
| `packages/app-builder/execution/` | Future grandchildren only  |
| `packages/app-builder/cli/`       | Future CLI grandchild only |
| `packages/app-builder/contracts/` | Read-only dependency       |

## Dependency

- Completed `feat/app-builder-protocol-contracts`, present in current branch ancestry.

## Risks and Tradeoffs

| Risk                      | Mitigation                                                 |
| ------------------------- | ---------------------------------------------------------- |
| Crash/lock corruption     | Atomic persistence, stale-lock rules, scoped cleanup       |
| Unsafe resume/approval    | Typed guards, provenance, redaction, stop on ambiguity     |
| Unstable Effect CLI APIs  | Pin current v4 imports and certify behavior                |
| Delayed user-facing value | Accept sequencing to protect correctness and reviewability |

## Rollback Plan

Cancel this tracker before grandchild creation. After delivery starts, revert grandchildren in reverse dependency order; keep protocol contracts unchanged.

## Success Criteria

- [ ] PE3–4 remains traceable through four dependency-ordered grandchild boundaries.
- [ ] Every approved rule has one owner and no tracker implementation task.
- [ ] Grandchildren can be delivered independently under strict TDD and budget.
