# Proposal: Effectify App Builder Platform

## Intent

Enable developers to create and evolve Effect/Nx applications without surrendering source ownership. Generated applications remain user-owned and runtime-independent from Effectify.

## Scope

### In Scope

- Deterministic plans, Nx generation, typed JSON tools, resumable approvals, provenance, and migrations.
- A plugin-first core for framework, transport, persistence, auth, UI, workflow, and deployment.
- A planner-only builder, dual previews, signed blueprints, and governed marketplace.
- Incremental v0.x delivery to v1.0, proven by an auth-first, organization-scoped Order Management golden application.
- Official plugins: React Router, native Effect SQL, Better Auth, Better Auth UI, Hatchet, Alchemy, and experimental TanStack Solid.

### Out of Scope

- Hosted editing/execution, managed hosting, browser-executed marketplace plugins, universal framework support, or distributed provider transactions.
- Silent substitution, permission expansion, destructive migration, or overwrite of user-edited source.
- Drizzle or Prisma in v1. Native Effect PostgreSQL is the v1 default; `@effectify/drizzle` follows in v1.2, while Prisma remains beyond v1.

## Capabilities

### New Capabilities

- `platform-planning-execution`: Shared capability, plan, tool, approval, and callback contracts.
- `workspace-generation-lifecycle`: Greenfield/init/incremental Nx generation, provenance, updates, and migrations.
- `plugin-platform-marketplace`: Isolated plugins, permissions, evidence, registry governance, and lifecycle.
- `builder-preview-blueprints`: Planner-only composition, safe previews, shareable intent, and signed blueprints.
- `official-golden-platform`: Supported preset, functional DDD output, validation, and documentation.

### Modified Capabilities

None; no canonical OpenSpec capabilities exist yet.

## Approach

Share one typed model across CLI, generators, tools, plugins, builder, and lifecycle flows. Prefer deterministic Nx/AST operations over bounded LLM assistance; approve plans before mutation. Deliver reviewable v0.x milestones, then certify v1.0 through pinned plugins and golden CI.

## Affected Areas

| Area        | Impact       | Description                                                                                                                   |
| ----------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `packages/` | New/Modified | Platform/plugins reuse React Router, Better Auth, Hatchet, Loom, and domain precedents; `@effectify/prisma` stays outside v1. |
| `apps/docs` | Modified     | Builder, marketplace, and generated reference.                                                                                |
| `apps/`     | New          | Versioned golden/reference applications.                                                                                      |

## Risks

| Risk                     | Likelihood | Mitigation                                                                                      |
| ------------------------ | ---------- | ----------------------------------------------------------------------------------------------- |
| Support/API drift        | High       | Evidence states, pinned matrices, golden regeneration.                                          |
| Source/supply-chain harm | High       | Diff approval, divergence checks, isolated workers, signed releases, revocation.                |
| Review overload          | High       | `ask-on-risk`; tasks must split work near the 400-line budget or request an explicit exception. |

## Rollback Plan

Ship milestones independently; revert affected capabilities and restore checkpointed changes without adding a runtime dependency.

## Dependencies

- Node.js LTS, Nx, Effect v4, registry infrastructure, and official-plugin maintainers.

## Success Criteria

- [ ] Official generation completes within ten minutes; untouched output compiles, typechecks, tests, and builds.
- [ ] Plans are deterministic; writes require diffs and truthful failure recovery.
- [ ] Golden CI validates every supported preset and plugin matrix.
