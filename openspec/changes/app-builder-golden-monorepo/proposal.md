# Proposal: App Builder Golden Monorepo

## Intent

Effectify has execution foundations but no intent-to-workspace operation. Golden v1 replaces the record-only CLI premise with an executable Todo Nx monorepo harness.

## Goals and Product Scope

- Generate `packages/todo/{domain,application,infrastructure}` and `apps/todo-cli` with Effect Domain, Application use cases/ports, Infrastructure Live adapters, and CLI Presentation/runtime.
- Make every generator atomic, idempotent, composable, independently plannable/replayable, and shared by initial preset and later evolution.
- Provide durable `add`, `list`, `complete`, and `remove` with visible events.
- Expose only `catalog`, `plan`, `generate`, `verify`, `replay`, `explain`, and `doctor` CLI tools.
- Preserve and consume lifecycle/store/recovery/lock/executor/POSIX authority.

## Trust Boundary

Intent selects a catalog. Community plugins MUST be preinstalled allowlisted packages; arbitrary code is forbidden. Each generator owns files/regions, records canonical provenance/ownership, plans before mutation, detects conflicts, preserves unrelated user code, and proves same-input zero diff. `GenerationBlock`s produce dependency-aware, conflict-checked `FilePlan`s; Nx Devkit `Tree` is only the mutation adapter, never the planning/domain model.

## Non-Goals

- Web/native presentations, universal Presentation package, Effect AI, MCP, marketplace, or arbitrary execution.
- Speculative infrastructure removal or byte-identical pnpm lock metadata.

## Capabilities

### New Capabilities

- `app-builder-creation-catalog`: Finite intent/catalog.
- `app-builder-generation-planning`: Atomic plans, ownership, provenance, dependencies, and conflicts.
- `app-builder-nx-generation`: One-way preset/evolution mutation.
- `app-builder-cli-tools`: Stable command protocol.
- `app-builder-deterministic-replay`: Semantic replay evidence.
- `app-builder-nested-workspace-e2e`: Isolated execution and zero-diff proof.
- `app-builder-golden-showcase`: Root-graph-excluded generated example.

### Modified Capabilities

None. Existing specifications remain consumed authorities.

## Visible Acceptance Contract

The workspace MUST install pinned packages; pass nested Nx graph/tests/typecheck/build; execute Todo behavior; separate JSON stdout/human stderr; stream only with `--events=jsonl`; and end with one terminal envelope. Users MUST add a domain model, use case, port, integration/adapter, event capability, or presentation without regenerating unrelated areas. Same-input replay MUST preserve unrelated code, match semantic digests, and yield zero diff. E2E uses OS-temp isolation/local distribution; showcase is separately verified.

## Migration and Rollout

PR #104 remains no-merge. Completed evidence stays; the pending thin CLI is superseded. Delivery uses visible sub-3,000-line feature-branch-chain slices. Removal stays lazy, evidence-driven, and reversible.

## Risks and Rollback

- **Risk:** Nx leakage, trust expansion, lock variance, or root-graph pollution. **Mitigation:** enforce boundaries/proof.
- **Rollback:** reverse Golden slices; retain execution foundations/evidence; remove showcase/catalog additions independently.

## Success Criteria

- [ ] Pinned intent generates/verifies isolated topology and Todo behavior.
- [ ] Preset and evolution use identical atomic generators; additions change only owned files/regions.
- [ ] Same-input replay preserves unrelated code, matches canonical evidence, and yields zero generated-tree diff.
- [ ] No arbitrary code boundary, root-graph pollution, or regression of retained execution authority exists.

## Assumptions and Authorization

Ratified decisions are closed; service graphs/algorithms belong to design. This proposal authorizes no specs, design, tasks, implementation, branches, or tracker edits.
