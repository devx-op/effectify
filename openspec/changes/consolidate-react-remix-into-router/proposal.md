# Proposal: Consolidate React Remix into React Router

## Intent

End with `@effectify/react-router` as the sole maintained RR8 integration without abandoning Remix v2 consumers mid-migration. A deprecated RR7 bridge provides a bounded transition while protecting the existing RR8 stack.

## Scope

### In Scope

- Retain `@effectify/react-remix` as the deprecated RR7 bridge, replace Remix imports with isolated RR7 framework dependencies, and add runtime coverage.
- Preserve legacy `json` during the bridge and remove it with the bridge at RR8 consolidation.
- Keep the context-correct RR7 Better Auth adapter workspace-only; never publish it or broaden the RR8 adapter.
- Migrate the former Remix example to RR7 conventions, then transfer only scenarios not already covered by the RR8 example.
- End RR7 support after documented consumer and scenario migration; remove all RR7/Remix-only code, dependencies, docs, release, workspace, and lockfile surfaces.

### Out of Scope

- Downgrading, widening, replacing, or repurposing the RR8 catalog, package, adapter, example, or behavior.
- Permanent dual-major support or duplicate examples.

## Capabilities

### New Capabilities

- `react-router-major-consolidation`: Isolated RR7 migration, retirement gates, and the final RR8-only state.

### Modified Capabilities

None; no existing OpenSpec capabilities are present.

## Approach

Use two checkpoints. First, isolate RR7, make `@effectify/react-remix` a tested bridge, add a workspace-only adapter using the bridge's exact contexts, and migrate the example through official RR7 framework conventions. Second, inventory scenarios, transfer unique coverage to RR8, document migration/deprecation, confirm consumers have migrated, and delete transitional surfaces.

## Affected Areas

| Area                                                  | Impact             | Description                             |
| ----------------------------------------------------- | ------------------ | --------------------------------------- |
| `packages/react/remix`                                | Modified/Removed   | Tested RR7 bridge, then retired         |
| `apps/react-remix-example`                            | Modified/Removed   | RR7 checkpoint and scenario source      |
| RR7 Better Auth workspace code                        | New/Removed        | Unpublished bridge adapter              |
| `packages/react/router*`, `apps/react-router-example` | Protected/Modified | Preserve behavior; add unique scenarios |
| Docs, release, workspace, lockfile                    | Modified           | Migration and cleanup                   |

## Risks

| Risk                               | Likelihood | Mitigation                                        |
| ---------------------------------- | ---------- | ------------------------------------------------- |
| Context identity mismatch          | High       | Runtime and adapter share bridge-owned contexts   |
| RR8 regression                     | Medium     | Isolate RR7 and gate on RR8 checks                |
| Premature removal or scenario loss | Medium     | Require migration evidence and scenario inventory |

## Rollback Plan

Before retirement, revert the failing checkpoint while retaining the bridge. After retirement, restore its final release and missing scenario temporarily; never downgrade RR8.

## Dependencies

- Isolated RR7 resolution selected during design without changing RR8 pins.
- Documented consumer and unique-scenario inventories.

## Success Criteria

- [ ] RR7 bridge is tested and isolated; its adapter remains workspace-only.
- [ ] Existing RR8 behavior and catalog remain green.
- [ ] Documented consumers migrate and unique scenarios survive on RR8.
- [ ] All transitional surfaces, including `json`, are removed, leaving one maintained RR8 integration.
