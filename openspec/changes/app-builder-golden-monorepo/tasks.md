# Tasks: App Builder Golden Monorepo

## Review Workload Forecast

Estimated changed lines: 4,020 total; 360–680 per child PR
400-line budget risk: High
Chained PRs recommended: Yes
Decision needed before apply: No
Resolved delivery strategy: auto-chain
Resolved chain strategy: feature-branch-chain
Chain strategy: feature-branch-chain

All children are below 3,000 lines; further 400-line splitting becomes infrastructure-only.

### Feature Branch Chain

Draft tracker targets `main`; PR #104 stays unchanged. Children target predecessors; one writer/source. `T`: `pnpm nx affected --target=test`.

Branches: 01-plan→tracker; 02-generate→01-plan; 03-todo→02-generate; 04-evolve→03-todo; 05-protocol→04-evolve; 06-replay→05-protocol; 07-nested→06-replay; 08-showcase→07-nested.

| PR (base; est.)       | Finish; test; runtime proof                 | Rollback              |
| --------------------- | ------------------------------------------- | --------------------- |
| 01 plan (tracker;470) | plan envelope; T; Todo-plan fixture         | generation + plan CLI |
| 02 generate (01;560)  | four-root tree; T; generate fixture         | adapter + preset      |
| 03 todo (02;490)      | CRUD/events; T; Todo CLI                    | Todo templates        |
| 04 evolve (03;520)    | owned addition; T; evolution fixture        | atomic generators     |
| 05 protocol (04;510)  | JSON/JSONL CLI; T; stdin/file               | CLI protocol          |
| 06 replay (05;430)    | zero-diff replay; T; fixture                | replay evidence       |
| 07 nested (06;680)    | isolated Nx/cleanup; T; intended e2e target | e2e harness           |
| 08 showcase (07;360)  | drift check; T; CI fixture                  | example + CI          |

R01–R17/S01–S32 are ordered below; T1/T2 are mandatory RED tests. PR 07 defines its intended E2E target.

## Phase 1: Catalog Plan (PR 01)

- [x] 1.1 RED `packages/app-builder/generation/tests/planner.test.ts`: R01/R02/R05 S01–S04,S09; reject selectors before mutation.
- [x] 1.2 GREEN/REFACTOR `packages/app-builder/generation/src/{intent,catalog,planner}.ts`, `packages/app-builder/cli/src/plan.ts`: canonical Todo plan; retain `contracts`/`execution` and PR #104.

## Phase 2: Generate Topology (PR 02)

- [x] 2.1 RED `packages/app-builder/nx-plugin/tests/apply-plan.test.ts`: R03/R04/R06 S05–S08,S10–S11; conflict and direction failures.
- [x] 2.2 GREEN/REFACTOR `packages/app-builder/nx-plugin/src/apply-plan.ts`, `packages/app-builder/generation/src/todo-preset.ts`: single `Tree` apply; four roots.

## Phase 3: Todo Behavior (PR 03)

- [x] 3.1 RED generated `packages/todo/**/tests`: R07/R08 S12–S15; fixed ports, failures, durable ordered events.
- [x] 3.2 GREEN/REFACTOR `packages/app-builder/generation/src/templates/todo/{domain,application,infrastructure,cli}.ts`: CRUD Live/Test Layers via retained executor/lock/mutator.

## Phase 4: Post-generation Evolution (PR 04)

- [ ] 4.1 RED `packages/app-builder/generation/tests/evolution.test.ts`: R03/R04 S05–S08; model/use-case/port/integration-adapter/event/presentation additions own leaves only.
- [ ] 4.2 GREEN/REFACTOR `packages/app-builder/generation/src/generators/{model,use-case,port,integration-adapter,event,presentation}.ts`: shared preset blocks, manifests, provenance, idempotence.

## Phase 5: Closed CLI Protocol (PR 05)

- [ ] 5.1 RED `packages/app-builder/cli/tests/protocol.test.ts`: R09–R11 S16–S20, T1/T2; reject docs, shell/traversal/env, signals, automation.
- [ ] 5.2 GREEN/REFACTOR `packages/app-builder/cli/src/{main,protocol,commands}.ts`: stdin XOR file, exits, stderr, JSONL, one terminal envelope.

## Phase 6: Replay (PR 06)

- [ ] 6.1 RED `packages/app-builder/generation/tests/replay.test.ts`: R12/R13 S21–S24; semantic dependencies and changed-output pre-write failure.
- [ ] 6.2 GREEN/REFACTOR `packages/app-builder/generation/src/{cjson,provenance,replay}.ts`: pinned frozen replay, canonical digests, zero-diff evidence.

## Phase 7: Nested E2E (PR 07)

- [ ] 7.1 RED `packages/app-builder/e2e/tests/golden.e2e.test.ts`: R14/R15 S25–S28; failed/interrupted cleanup and root exclusion.
- [ ] 7.2 GREEN/REFACTOR `packages/app-builder/e2e/**`: OS-temp distribution, isolated registry/Nx/pnpm, nested graph/test/typecheck/build/CRUD/regeneration.

## Phase 8: Showcase and Closure (PR 08)

- [ ] 8.1 RED `examples/app-builder-todo`, `.github/workflows/ci.yml`: R16/R17 S29–S32; drift fails without rewrite.
- [ ] 8.2 GREEN/REFACTOR `examples/app-builder-todo/**`, `.github/workflows/ci.yml`: public-command exclusion; final R01–R17/S01–S32, T, typecheck, build, clean-diff matrix.
