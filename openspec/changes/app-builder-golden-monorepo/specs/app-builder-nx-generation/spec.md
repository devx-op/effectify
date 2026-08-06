# Delta for App Builder Nx Generation

## ADDED Requirements

### Requirement: Effect-First Todo Topology

Golden v1 generation MUST create `packages/todo/domain`, `packages/todo/application`, `packages/todo/infrastructure`, and `apps/todo-cli`. Domain MUST use Effect Schema, Brand, Data tagged unions, Match, Option/Either, typed errors, and rules; Application MUST own Effect use cases, ports, services, and Layers; Infrastructure MUST provide Live Layers/adapters; and the CLI MUST own Presentation and runtime Layer composition.

#### Scenario: Generate the Todo topology

- GIVEN an approved Todo generation plan
- WHEN it is applied
- THEN all four declared topology roots MUST be generated with their assigned responsibilities

#### Scenario: Enforce dependency direction

- GIVEN generated project dependencies are inspected
- WHEN a Domain or Application dependency points outward to Infrastructure or CLI
- THEN verification MUST fail

### Requirement: Bounded Presentation and Todo Behavior

Golden v1 MUST generate only CLI presentation; web and native presentations SHALL be future separate atomic presentation generators, not a universal Presentation package. The Todo CLI MUST provide durable local `add`, `list`, `complete`, and `remove`, typed business failures, deterministic ID/time ports with Test Layers, ordered user-visible events, and file-persistence Live and deterministic Test Layers.

#### Scenario: Execute durable Todo CRUD

- GIVEN a generated workspace using its file-persistence Live Layer
- WHEN a Todo is added, listed, completed, and removed
- THEN each result and event order MUST be user-visible and durable

#### Scenario: Test deterministic failure and time

- GIVEN deterministic ID, clock, and persistence Test Layers
- WHEN an invalid business operation is executed
- THEN it MUST return its typed error without ambient time or ID dependence

### Requirement: Retained Authority and Migration Boundary

Generation MUST consume compatible lifecycle, store/recovery, lock/executor, POSIX, and protocol authorities without weakening them. The superseded thin execution CLI MUST NOT be revived; speculative removals MUST NOT occur and any future removal SHALL be separately evidenced and reversible.

#### Scenario: Preserve retained authorities

- GIVEN Golden generation is requested
- WHEN it uses execution foundations
- THEN their existing authority boundaries MUST remain intact

#### Scenario: Reject superseded or destructive scope

- GIVEN a request attempts to enable the thin CLI route or delete retained infrastructure
- WHEN evaluated
- THEN it MUST be rejected with no deletion or revived behavior
