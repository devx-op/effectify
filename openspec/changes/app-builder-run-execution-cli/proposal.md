# Proposal: App Builder Run Execution CLI

## Intent

Retain the completed PE3–4 execution foundations and their evidence while rerouting product planning away from the obsolete thin CLI. PR #104 remains a no-merge integration tracker. This tracker is non-applicable to apply and does not authorize new implementation.

## Goals and Scope

### In Scope

- Preserve completed protocol, lifecycle, store/recovery, lock/executor/finalization, POSIX durability, and executable-slice authorities and evidence unchanged.
- Keep those foundations as prerequisites consumed by `app-builder-golden-monorepo`.
- Mark only pending `app-builder-execution-cli` as superseded, non-applicable, and forbidden to apply.

### Out of Scope

- Applying this tracker, reviving `app-builder-execution-cli`, or rewriting archived/completed evidence.
- Creating Golden specs, design, tasks, implementation, branches, commits, or PRs.

## Capabilities

### New Capabilities

None; each grandchild will own its capability contract.

### Modified Capabilities

None; existing contract specifications remain read-only dependencies.

## Proposed Grandchildren

| Order | Change                           | Disposition |
| ----- | -------------------------------- | ----------- |
| 1     | `app-builder-run-lifecycle`      | Completed and archived; authority/evidence retained |
| 2     | `app-builder-run-store-recovery` | Completed and archived; authority/evidence retained |
| 3     | `app-builder-run-lock-executor`  | Completed and archived with finalization; authority/evidence retained |
| 4     | `app-builder-execution-cli`      | **Superseded by `app-builder-golden-monorepo`; MUST NOT be applied** |

Completed protocol-contract children and the verified POSIX/executable vertical slice are also retained prerequisites. Their artifacts and task evidence are historical authorities, not tracker-owned work.

## Approach and Constraints

The retained dependency order is protocol → lifecycle → store/recovery → lock/executor/finalization → POSIX/executable foundation. The next product-planning route is the approved `app-builder-golden-monorepo` proposal. That proposal does not yet authorize specifications, design, tasks, or implementation.

## Affected Areas

| Area                              | Impact                     |
| --------------------------------- | -------------------------- |
| `packages/app-builder/execution/` | Retained completed authority; unchanged |
| `packages/app-builder/contracts/` | Retained completed authority; unchanged |
| `openspec/changes/app-builder-golden-monorepo/proposal.md` | Next proposal-only route |

## Dependency

- Completed protocol, lifecycle, store/recovery, lock/executor/finalization, and POSIX/executable evidence.

## Risks and Tradeoffs

| Risk                      | Mitigation                                                 |
| ------------------------- | ---------------------------------------------------------- |
| Crash/lock corruption     | Atomic persistence, stale-lock rules, scoped cleanup       |
| Unsafe resume/approval    | Typed guards, provenance, redaction, stop on ambiguity     |
| Stale thin CLI is applied | Explicit supersession and MUST NOT apply gate |

## Rollback Plan

No runtime rollback is needed for this documentation-only respecification. Revert only these tracker text changes; never alter retained implementation or evidence.

## Success Criteria

- [x] Completed foundations and their evidence remain traceable and unchanged.
- [x] Only pending `app-builder-execution-cli` is superseded and prohibited from apply.
- [ ] Product planning continues at `app-builder-golden-monorepo` without implying authorization beyond its approved proposal.
