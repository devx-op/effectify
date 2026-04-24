# @effectify/hatchet Implementation Tasks

## Executive Summary

This document defines the implementation tasks for `@effectify/hatchet`, an Effect v4 integration with Hatchet SDK v1.19.0. The package enables users to write Hatchet workflows as pure `Effect<A, E, R>` computations with dependency injection, typed errors, and automatic logging sync.

**Total Tasks**: 47 tasks across 9 phases

---

## Phase 1: Monorepo Setup

Set up the Nx package structure following `@effectify/prisma` patterns.

- [x] [TASK-001] Create `packages/hatchet/` directory structure

  - **Files**: `packages/hatchet/`
  - **Depends on**: None
  - **Spec ref**: REQ-NX-01, REQ-NX-02

- [x] [TASK-002] Create `packages/hatchet/project.json` with Nx configuration

  - **Files**: `packages/hatchet/project.json`
  - **Depends on**: TASK-001
  - **Spec ref**: REQ-NX-01, REQ-NX-02, REQ-NX-03, REQ-NX-04, REQ-NX-05

- [x] [TASK-003] Create `packages/hatchet/package.json` with dependencies

  - **Files**: `packages/hatchet/package.json`
  - **Depends on**: TASK-001
  - **Spec ref**: REQ-PKG-01, REQ-PKG-02, REQ-PKG-03, REQ-PKG-04, REQ-PKG-05, REQ-PKG-06

- [x] [TASK-004] Create `packages/hatchet/tsconfig.json`

  - **Files**: `packages/hatchet/tsconfig.json`
  - **Depends on**: TASK-001
  - **Spec ref**: REQ-TS-01, REQ-TS-04

- [x] [TASK-005] Create `packages/hatchet/tsconfig.lib.json`

  - **Files**: `packages/hatchet/tsconfig.lib.json`
  - **Depends on**: TASK-001, TASK-004
  - **Spec ref**: REQ-TS-02

- [x] [TASK-006] Create `packages/hatchet/tsconfig.spec.json`

  - **Files**: `packages/hatchet/tsconfig.spec.json`
  - **Depends on**: TASK-001, TASK-004
  - **Spec ref**: REQ-TS-03

- [x] [TASK-007] Create `packages/hatchet/vitest.config.ts`

  - **Files**: `packages/hatchet/vitest.config.ts`
  - **Depends on**: TASK-001
  - **Spec ref**: REQ-VITEST-01, REQ-VITEST-02, REQ-VITEST-03, REQ-VITEST-04

- [x] [TASK-008] Create `packages/hatchet/setup-tests.ts`

  - **Files**: `packages/hatchet/setup-tests.ts`
  - **Depends on**: TASK-001
  - **Spec ref**: REQ-VITEST-02

- [x] [TASK-009] Create `packages/hatchet/src/` directory structure

  - **Files**: `packages/hatchet/src/`
  - **Depends on**: TASK-001

- [x] [TASK-010] Add `packages/hatchet` to `nx.json` release.projects

  - **Files**: `nx.json`
  - **Depends on**: TASK-001
  - **Spec ref**: REQ-RELEASE-01, REQ-RELEASE-02

- [x] [TASK-011] Install dependencies with pnpm
  - **Files**: N/A
  - **Depends on**: TASK-002, TASK-003
  - **Spec ref**: REQ-PKG-02, REQ-PKG-03

---

## Phase 2: Core Module

Implement the core services: HatchetError, HatchetConfig, HatchetClientService, and HatchetStepContext.

- [x] [TASK-012] Create `packages/hatchet/src/core/error.ts` — HatchetError

  - **Files**: `packages/hatchet/src/core/error.ts`
  - **Depends on**: TASK-009
  - **Spec ref**: REQ-ERROR-01, REQ-ERROR-02, REQ-ERROR-03, REQ-ERROR-04

- [x] [TASK-013] Create `packages/hatchet/src/core/config.ts` — HatchetConfig

  - **Files**: `packages/hatchet/src/core/config.ts`
  - **Depends on**: TASK-012
  - **Spec ref**: REQ-CORE-01, REQ-CORE-02, REQ-CORE-03, REQ-CORE-04, REQ-CORE-05, REQ-CORE-06

- [x] [TASK-014] Create `packages/hatchet/src/core/client.ts` — HatchetClientService

  - **Files**: `packages/hatchet/src/core/client.ts`
  - **Depends on**: TASK-012, TASK-013
  - **Spec ref**: REQ-CLIENT-01, REQ-CLIENT-02, REQ-CLIENT-03, REQ-CLIENT-04, REQ-CLIENT-05

- [x] [TASK-015] Create `packages/hatchet/src/core/context.ts` — HatchetStepContext

  - **Files**: `packages/hatchet/src/core/context.ts`
  - **Depends on**: TASK-014
  - **Spec ref**: REQ-CONTEXT-01, REQ-CONTEXT-02, REQ-CONTEXT-03, REQ-CONTEXT-04, REQ-CONTEXT-05

- [x] [TASK-016] Create `packages/hatchet/src/core/index.ts` — Core exports

  - **Files**: `packages/hatchet/src/core/index.ts`
  - **Depends on**: TASK-012, TASK-013, TASK-014, TASK-015

- [ ] [TASK-017] Create `packages/hatchet/tests/unit/core.test.ts` — Core unit tests
  - **Files**: `packages/hatchet/tests/unit/core.test.ts`
  - **Depends on**: TASK-016
  - **Spec ref**: REQ-ERROR-01, REQ-ERROR-02, REQ-ERROR-03, REQ-ERROR-04, REQ-CORE-01, REQ-CORE-02, REQ-CORE-03, REQ-CORE-04, REQ-CORE-05, REQ-CORE-06, REQ-CLIENT-01, REQ-CLIENT-02, REQ-CLIENT-03, REQ-CLIENT-04, REQ-CLIENT-05, REQ-CONTEXT-01, REQ-CONTEXT-02, REQ-CONTEXT-03, REQ-CONTEXT-04, REQ-CONTEXT-05

---

## Phase 3: Effectifier Module

Implement the bridge that converts Effect → Promise for Hatchet task execution.

- [ ] [TASK-018] Create `packages/hatchet/src/effectifier/types.ts` — Internal types

  - **Files**: `packages/hatchet/src/effectifier/types.ts`
  - **Depends on**: TASK-015

- [ ] [TASK-019] Create `packages/hatchet/src/effectifier/execute.ts` — effectifyTask

  - **Files**: `packages/hatchet/src/effectifier/execute.ts`
  - **Depends on**: TASK-018, TASK-015
  - **Spec ref**: REQ-EFFECT-01, REQ-EFFECT-02, REQ-EFFECT-03, REQ-EFFECT-04, REQ-EFFECT-05, REQ-EFFECT-06, REQ-FACTORY-01, REQ-FACTORY-02, REQ-FACTORY-03, REQ-FACTORY-04

- [ ] [TASK-020] Create `packages/hatchet/src/effectifier/index.ts` — Effectifier exports

  - **Files**: `packages/hatchet/src/effectifier/index.ts`
  - **Depends on**: TASK-018, TASK-019

- [x] [TASK-021] Create `packages/hatchet/tests/unit/effectifier.test.ts` — Effectifier tests
  - **Files**: `packages/hatchet/tests/unit/effectifier.test.ts`
  - **Depends on**: TASK-020
  - **Spec ref**: REQ-EFFECT-01, REQ-EFFECT-02, REQ-EFFECT-03, REQ-EFFECT-04, REQ-EFFECT-05, REQ-EFFECT-06, REQ-FACTORY-01, REQ-FACTORY-02, REQ-FACTORY-03, REQ-FACTORY-04

---

## Phase 4: Workflow Module

Implement the declarative workflow builder matching Hatchet's API style.

- [ ] [TASK-022] Create `packages/hatchet/src/workflow/types.ts` — TaskOptions, WorkflowOptions

  - **Files**: `packages/hatchet/src/workflow/types.ts`
  - **Depends on**: TASK-019
  - **Spec ref**: REQ-TASK-02, REQ-WF-01, REQ-WF-02, REQ-WF-03, REQ-WF-04

- [ ] [TASK-023] Create `packages/hatchet/src/workflow/workflow.ts` — EffectWorkflow class

  - **Files**: `packages/hatchet/src/workflow/workflow.ts`
  - **Depends on**: TASK-022
  - **Spec ref**: REQ-WF-01, REQ-WF-02, REQ-WFTASK-01, REQ-WFTASK-02, REQ-WFTASK-03

- [ ] [TASK-024] Create `packages/hatchet/src/workflow/task.ts` — task() function

  - **Files**: `packages/hatchet/src/workflow/task.ts`
  - **Depends on**: TASK-022, TASK-023
  - **Spec ref**: REQ-TASK-01, REQ-TASK-02, REQ-TASK-03, REQ-TASK-04

- [ ] [TASK-025] Create `packages/hatchet/src/workflow/register.ts` — registerWorkflow()

  - **Files**: `packages/hatchet/src/workflow/register.ts`
  - **Depends on**: TASK-019, TASK-022, TASK-023, TASK-024
  - **Spec ref**: REQ-REG-01, REQ-REG-02, REQ-REG-03, REQ-REG-04, REQ-REG-05, REQ-REG-06, REQ-REG-07

- [ ] [TASK-026] Create `packages/hatchet/src/workflow/index.ts` — Workflow exports

  - **Files**: `packages/hatchet/src/workflow/index.ts`
  - **Depends on**: TASK-022, TASK-023, TASK-024, TASK-025

- [ ] [TASK-027] Create `packages/hatchet/tests/unit/workflow.test.ts` — Workflow tests
  - **Files**: `packages/hatchet/tests/unit/workflow.test.ts`
  - **Depends on**: TASK-026
  - **Spec ref**: REQ-WF-01, REQ-WF-02, REQ-WF-03, REQ-WF-04, REQ-TASK-01, REQ-TASK-02, REQ-TASK-03, REQ-TASK-04, REQ-WFTASK-01, REQ-WFTASK-02, REQ-WFTASK-03, REQ-REG-01, REQ-REG-02, REQ-REG-03, REQ-REG-04, REQ-REG-05, REQ-REG-06, REQ-REG-07

---

## Phase 5: Logging Module

Implement automatic log synchronization between Effect.log() and Hatchet UI.

- [ ] [TASK-028] Create `packages/hatchet/src/logging/hatchet-logger.ts` — HatchetLogger

  - **Files**: `packages/hatchet/src/logging/hatchet-logger.ts`
  - **Depends on**: TASK-015
  - **Spec ref**: REQ-LOG-01, REQ-LOG-02, REQ-LOG-03, REQ-LOG-04, REQ-LOG-05, REQ-WLOG-01, REQ-WLOG-02, REQ-WLOG-03

- [ ] [TASK-029] Create `packages/hatchet/src/logging/index.ts` — Logging exports

  - **Files**: `packages/hatchet/src/logging/index.ts`
  - **Depends on**: TASK-028

- [ ] [TASK-030] Create `packages/hatchet/tests/unit/logger.test.ts` — Logger tests
  - **Files**: `packages/hatchet/tests/unit/logger.test.ts`
  - **Depends on**: TASK-029
  - **Spec ref**: REQ-LOG-01, REQ-LOG-02, REQ-LOG-03, REQ-LOG-04, REQ-LOG-05, REQ-WLOG-01, REQ-WLOG-02, REQ-WLOG-03

---

## Phase 6: Schema Module

Implement input validation utilities using Effect Schema.

- [ ] [TASK-031] Create `packages/hatchet/src/schema/get-validated-input.ts` — getValidatedInput

  - **Files**: `packages/hatchet/src/schema/get-validated-input.ts`
  - **Depends on**: TASK-015
  - **Spec ref**: REQ-SCHEMA-01, REQ-SCHEMA-02, REQ-SCHEMA-03, REQ-SCHEMA-04, REQ-SCHEMA-05, REQ-SCHEMA-06

- [ ] [TASK-032] Create `packages/hatchet/src/schema/index.ts` — Schema exports

  - **Files**: `packages/hatchet/src/schema/index.ts`
  - **Depends on**: TASK-031

- [ ] [TASK-033] Create `packages/hatchet/tests/unit/schema.test.ts` — Schema tests
  - **Files**: `packages/hatchet/tests/unit/schema.test.ts`
  - **Depends on**: TASK-032
  - **Spec ref**: REQ-SCHEMA-01, REQ-SCHEMA-02, REQ-SCHEMA-03, REQ-SCHEMA-04, REQ-SCHEMA-05, REQ-SCHEMA-06

---

## Phase 7: Testing Module

Implement testing utilities for unit testing tasks.

- [ ] [TASK-034] Create `packages/hatchet/src/testing/mock-context.ts` — Test utilities

  - **Files**: `packages/hatchet/src/testing/mock-context.ts`
  - **Depends on**: TASK-015
  - **Spec ref**: REQ-MOCK-01, REQ-MOCK-02, REQ-MOCK-03, REQ-MOCK-04, REQ-MOCK-05, REQ-RUNTEST-01, REQ-RUNTEST-02, REQ-RUNTEST-03, REQ-RUNTEST-04

- [ ] [TASK-035] Create `packages/hatchet/src/testing/index.ts` — Testing exports
  - **Files**: `packages/hatchet/src/testing/index.ts`
  - **Depends on**: TASK-034

---

## Phase 8: Public API

Create the main public exports for the package.

- [ ] [TASK-036] Create `packages/hatchet/src/index.ts` — Main public exports

  - **Files**: `packages/hatchet/src/index.ts`
  - **Depends on**: TASK-016, TASK-020, TASK-026, TASK-029, TASK-032, TASK-035

- [ ] [TASK-037] Verify build passes with `nx build @effectify/hatchet`

  - **Files**: N/A
  - **Depends on**: TASK-036, TASK-010, TASK-011

- [ ] [TASK-038] Verify tests pass with `nx test @effectify/hatchet`

  - **Files**: N/A
  - **Depends on**: TASK-017, TASK-021, TASK-027, TASK-030, TASK-033, TASK-035, TASK-036

- [ ] [TASK-039] Verify lint passes with `nx lint @effectify/hatchet`
  - **Files**: N/A
  - **Depends on**: TASK-036

---

## Phase 9: Integration Tests

Create integration tests against real Hatchet engine.

- [ ] [TASK-040] Create `packages/hatchet/tests/integration/docker-compose.yml`

  - **Files**: `packages/hatchet/tests/integration/docker-compose.yml`
  - **Depends on**: TASK-036
  - **Spec ref**: REQ-DOCKER-01, REQ-DOCKER-02, REQ-DOCKER-03, REQ-DOCKER-04, REQ-DOCKER-05

- [ ] [TASK-041] Create `packages/hatchet/tests/integration/workflow.test.ts` — Integration tests

  - **Files**: `packages/hatchet/tests/integration/workflow.test.ts`
  - **Depends on**: TASK-040
  - **Spec ref**: REQ-INT-01, REQ-INT-02, REQ-INT-03, REQ-INT-04, REQ-INT-05

- [ ] [TASK-042] Run integration tests with Docker Compose
  - **Files**: N/A
  - **Depends on**: TASK-040, TASK-041

---

## Phase 10: Documentation & Release

Finalize package for release.

- [x] [TASK-043] Create `packages/hatchet/README.md` — Package documentation

  - **Files**: `packages/hatchet/README.md`
  - **Depends on**: TASK-036, TASK-038

- [ ] [TASK-044] Verify package.json exports are correct

  - **Files**: `packages/hatchet/package.json`
  - **Depends on**: TASK-003, TASK-036

- [ ] [TASK-045] Create TypeScript declaration files verification

  - **Files**: N/A
  - **Depends on**: TASK-037

- [ ] [TASK-046] Verify release configuration in nx.json

  - **Files**: `nx.json`
  - **Depends on**: TASK-010

- [ ] [TASK-047] Test nx release dry-run for hatchet package
  - **Files**: N/A
  - **Depends on**: TASK-046

---

## Task Dependencies Graph

```
Phase 1: Monorepo Setup
├── TASK-001 ─┬─► TASK-002 ─┬─► TASK-003 ─┬─► TASK-011
│            │             │             │
│            │             │             └─► TASK-010 ──► TASK-046
│            │             │
│            │             ├─► TASK-004 ─┬─► TASK-005
│            │             │             └─► TASK-006
│            │             │
│            │             └─► TASK-007
│            │
│            └─► TASK-008
│
└─► TASK-009 ─┬─► TASK-012 ──► TASK-013 ──► TASK-014 ──► TASK-015 ──► TASK-016
              │                                                        │
              ├─► TASK-018 ──► TASK-019 ──┬─► TASK-020 ──► TASK-021 ──┤
              │                            │                           │
              │                            ├─► TASK-022 ──► TASK-023 ──► TASK-024 ──► TASK-025 ──► TASK-026 ──► TASK-027
              │                            │                           │
              │                            └─► TASK-028 ──► TASK-029 ──► TASK-030
              │
              ├─► TASK-031 ──► TASK-032 ──► TASK-033
              │
              └─► TASK-034 ──► TASK-035

Phase 8: Public API
TASK-016, TASK-020, TASK-026, TASK-029, TASK-032, TASK-035 ──► TASK-036 ──┬─► TASK-037
                                                                         ├─► TASK-038
                                                                         └─► TASK-039

Phase 9: Integration Tests
TASK-036 ──► TASK-040 ──► TASK-041 ──► TASK-042

Phase 10: Documentation
TASK-036, TASK-038 ──► TASK-043 ──► TASK-044 ──► TASK-045 ──► TASK-047
```

---

## Completion Criteria

- [ ] All 47 tasks completed
- [ ] Build passes: `nx build @effectify/hatchet`
- [ ] Unit tests pass (>90% coverage): `nx test @effectify/hatchet`
- [ ] Lint passes: `nx lint @effectify/hatchet`
- [ ] Integration tests pass with Docker Compose
- [ ] Release configuration verified in nx.json
- [ ] README.md complete with usage examples

---

## Key Technical Decisions

| Decision                                | Rationale                                     |
| --------------------------------------- | --------------------------------------------- |
| `ServiceMap.Service` over `Context.Tag` | Context module doesn't exist in Effect v4     |
| `ManagedRuntime.make(layer)`            | `Effect.runtime<R>()` doesn't exist in v4     |
| `Effect.withLogger(effect, logger)`     | `Logger.replace` doesn't exist in v4          |
| `workflow.task()` not `workflow.step()` | SDK v1.19.0 uses task terminology             |
| `ctx.input` property                    | SDK v1.19.0 has input as property, not method |

---

**Document Version**: 1.0.0\
**Created**: March 2026\
**Phase**: Tasks Breakdown
