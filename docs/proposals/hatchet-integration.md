# Proposal: @effectify/hatchet Integration

## Intent

Create `@effectify/hatchet` — a native Effect v4 integration with Hatchet SDK v1.19.0 for defining workflows as pure Effects. This enables users to write Hatchet tasks using `Effect<A, E, R>` instead of async functions, leveraging typed errors, dependency injection via ServiceMap, and automatic logging sync.

## Scope

### In Scope

- `@effectify/hatchet` package with core, effectifier, workflow, logging, schema, and testing modules
- Effectifier bridge converting Effect → Promise using ManagedRuntime
- Workflow builder API: `workflow({ name }).task(task1).task(task2)` pattern
- HatchetStepContext service for injecting Hatchet context into Effects
- Custom Effect logger that syncs to Hatchet UI
- Schema validation utilities for workflow input
- Unit tests with mock context (>90% coverage)
- Integration tests with Docker Compose (Hatchet + PostgreSQL)
- README.md with usage examples
- Release configuration in nx.json

### Out of Scope

- React Router example app integration (deferred to future change)
- Support for older Hatchet SDK versions (v0.x)

## Approach

1. **Setup Package Structure** — Create `packages/hatchet/` following `@effectify/prisma` patterns (project.json, package.json, tsconfig.json, vitest.config.ts)

2. **Implement Core Modules** — Build HatchetConfig, HatchetClientService, HatchetStepContext, and HatchetError using ServiceMap.Service (NOT Context.Tag)

3. **Build Effectifier** — Create `effectifyTask` using ManagedRuntime.make(layer) to convert Effect → Promise with proper error propagation for Hatchet retries

4. **Create Workflow API** — Implement `workflow()` and `task()` functions matching Hatchet SDK v1 patterns (uses `.task()` not `.step()`)

5. **Add Logging & Schema** — Implement HatchetLogger using Effect.withLogger and getValidatedInput using Schema.decodeUnknown

6. **Write Tests** — Create unit tests with mock context and integration tests against Docker Compose

## Dependencies

- `@hatchet-dev/typescript-sdk: ^1.19.0` — Hatchet SDK (NOT yet installed)
- `effect: catalog:` — Effect v4 (already in monorepo)
- Docker Compose with Hatchet + PostgreSQL for integration tests

## Risks

| Risk                                         | Likelihood | Mitigation                                                      |
| -------------------------------------------- | ---------- | --------------------------------------------------------------- |
| Hatchet SDK API differs from PRD assumptions | Medium     | Use verified APIs: `.task()`, `ctx.input`, `ctx.parentOutput()` |
| Effect v4 APIs break during beta             | Low        | Use only verified APIs from `.effect-reference/`                |
| ManagedRuntime leak in effectifier           | Medium     | Ensure runtime disposal in worker lifecycle                     |

## Success Criteria

- [ ] Package builds without errors using `nx build @effectify/hatchet`
- [ ] Unit tests pass (>90% coverage) via `nx test @effectify/hatchet`
- [ ] Integration tests pass against Docker Compose Hatchet
- [ ] README.md provides complete usage documentation
- [ ] Workflow fails correctly trigger Hatchet retries
- [ ] Effect.log() output appears in Hatchet dashboard

## Affected Files

| Area                                           | Impact   | Description                                   |
| ---------------------------------------------- | -------- | --------------------------------------------- |
| `packages/hatchet/project.json`                | New      | Nx project configuration                      |
| `packages/hatchet/package.json`                | New      | Package manifest with Hatchet SDK dependency  |
| `packages/hatchet/tsconfig.json`               | New      | TypeScript configuration                      |
| `packages/hatchet/vitest.config.ts`            | New      | Test configuration                            |
| `packages/hatchet/src/index.ts`                | New      | Public exports                                |
| `packages/hatchet/src/core/*.ts`               | New      | Config, client, context, error modules        |
| `packages/hatchet/src/effectifier/*.ts`        | New      | Effect → Promise bridge                       |
| `packages/hatchet/src/workflow/*.ts`           | New      | Workflow builder API                          |
| `packages/hatchet/src/logging/*.ts`            | New      | Hatchet logger                                |
| `packages/hatchet/src/schema/*.ts`             | New      | Input validation                              |
| `packages/hatchet/src/testing/*.ts`            | New      | Test utilities                                |
| `packages/hatchet/tests/unit/*.test.ts`        | New      | Unit tests                                    |
| `packages/hatchet/tests/integration/*.test.ts` | New      | Integration tests                             |
| `packages/hatchet/README.md`                   | New      | Package documentation                         |
| `nx.json`                                      | Modified | Add release configuration for hatchet package |
