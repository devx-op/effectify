# React Router Major Consolidation Specification

## Purpose

Define a bounded React Router 7 compatibility bridge for former Remix v2 consumers and the evidence-gated transition to `@effectify/react-router` as the sole maintained React Router 8 integration, without regressing or downgrading the protected React Router 8 stack.

## Requirements

### Requirement: Protected React Router 8 regression boundary

The system MUST preserve the existing React Router 8 catalog family, `@effectify/react-router` public behavior, React Router 8 Better Auth adapter behavior, example routes and capabilities, and their established verification baseline throughout the transition. The system MUST NOT downgrade, widen for React Router 7, replace, or repurpose the React Router 8 catalog, package, adapter, or example to provide bridge compatibility.

#### Scenario: RR7 checkpoint leaves RR8 unchanged

- GIVEN the React Router 8 catalog versions and regression baseline recorded before bridge work
- WHEN the RR7 bridge checkpoint is evaluated
- THEN the RR8 catalog versions and major-specific dependency ranges MUST remain unchanged
- AND the established RR8 package, Better Auth adapter, route, SSR, type, and build checks MUST pass independently of RR7 checks

#### Scenario: Cross-major catalog change is rejected

- GIVEN a proposed bridge dependency resolution that changes a protected RR8 catalog entry or makes an RR8 artifact claim RR7 compatibility
- WHEN the transition is validated
- THEN the checkpoint MUST fail
- AND the RR8 artifact MUST NOT be released with that dependency or compatibility claim

### Requirement: Isolated React Router 7 dependency graph

The deprecated `@effectify/react-remix` bridge and its transitional consumers MUST resolve a coherent React Router 7 framework dependency family that is observably isolated from the protected React Router 8 dependency graph. No RR7 dependency MUST satisfy an RR8 package's framework dependency, and no RR8 dependency MUST mask an RR7 bridge verification.

#### Scenario: Both major graphs are resolved

- GIVEN the bridge and the protected RR8 stack are present in the workspace
- WHEN manifests and the resolved dependency graph are inspected
- THEN bridge-owned framework dependencies MUST resolve to React Router 7
- AND protected RR8 framework dependencies MUST resolve to React Router 8
- AND each verification suite MUST execute against its declared major

#### Scenario: Mixed-major resolution is rejected

- GIVEN a lockfile or workspace resolution that causes a bridge check to use RR8 or an RR8 check to use RR7
- WHEN dependency isolation is validated
- THEN the RR7 checkpoint MUST fail
- AND retirement eligibility MUST NOT be granted from that evidence

### Requirement: Deprecated bridge public contract

During the transition, `@effectify/react-remix` MUST be identified as a deprecated and temporary RR7 bridge. Until its documented retirement, it MUST expose its established Effect-facing contract comprising action and loader argument contexts, the `Runtime` entry point, HTTP response models and helpers, and the legacy `json` compatibility export. Its runtime MUST preserve successful payloads, action and loader failure responses, redirect status and headers, and exact thrown `Response` and `Error` identity.

#### Scenario: Successful bridge execution

- GIVEN an RR7 loader or action invocation and an Effect program that succeeds with a supported payload
- WHEN the bridge runtime executes the program
- THEN the invocation arguments MUST be available through the matching bridge-owned context
- AND the returned payload MUST preserve the bridge's documented success shape

#### Scenario: Modeled failure and redirect

- GIVEN an Effect program that produces a modeled failure or redirect response
- WHEN the bridge runtime executes the program
- THEN an action or loader failure MUST retain its documented status and payload
- AND a redirect MUST retain its documented status, `Location`, and other headers

#### Scenario: Native throwable identity is preserved

- GIVEN an Effect program that throws an existing `Response` or `Error` instance
- WHEN the bridge runtime propagates the failure
- THEN the observed thrown value MUST be the exact original instance

#### Scenario: Legacy json remains bridge-only

- GIVEN a bridge consumer imports the legacy `json` export during the support window
- WHEN the consumer creates a JSON response
- THEN the export MUST remain available with its documented compatibility behavior
- AND the export MUST NOT be added to the RR8 package as a consolidation requirement

### Requirement: Exact major-specific context identity

Every RR7 runtime integration and RR7 adapter MUST consume the exact action and loader context objects exported by the RR7 bridge. Structurally similar contexts from the RR8 package or from duplicate class definitions MUST NOT be treated as interchangeable.

#### Scenario: Adapter reads bridge-provided context

- GIVEN an RR7 bridge invocation provides its action or loader context
- WHEN the transitional RR7 Better Auth adapter handles the invocation
- THEN the adapter MUST resolve the exact context instance owned by the bridge
- AND the request arguments observed by the adapter MUST match those supplied to the bridge invocation

#### Scenario: RR8 context cannot satisfy RR7 adapter

- GIVEN only an RR8-owned or separately defined lookalike context is available
- WHEN the RR7 adapter attempts to resolve its required context
- THEN the invocation MUST fail rather than silently accept the incompatible context

### Requirement: Workspace-only RR7 Better Auth adapter

A temporary RR7 Better Auth adapter MUST support bridge consumers without changing the RR8 Better Auth adapter. The temporary adapter MUST remain workspace-only, MUST NOT appear in publish or release surfaces, and MUST preserve authentication response body, status, redirect location, and all `Set-Cookie` header values.

#### Scenario: Authentication response is preserved

- GIVEN Better Auth returns a response containing a body, status, redirect location, and one or more `Set-Cookie` headers
- WHEN the RR7 adapter handles the response through the bridge context
- THEN the consumer MUST observe the same body and status
- AND the `Location` and every `Set-Cookie` value MUST be preserved

#### Scenario: Temporary adapter cannot be published

- GIVEN release or package publication candidates are enumerated during the bridge support window
- WHEN publication metadata is validated
- THEN the RR7 Better Auth adapter MUST be absent from publishable and releasable artifacts
- AND the existing RR8 Better Auth adapter MUST remain RR8-only

### Requirement: Official RR7 application-framework checkpoint

The former Remix example MUST become a genuine React Router 7 framework application for the bridge checkpoint. It MUST use RR7 framework commands and imports, an explicit route configuration preserving all existing public URLs and splat behavior, generated framework types included in type checking, and React Router browser and server rendering entry points. It MUST no longer depend on Remix runtime, development, serving, or UI packages at this checkpoint.

#### Scenario: Routes preserve URL behavior

- GIVEN the pre-migration example route inventory, including index, nested, and splat routes such as authentication endpoints
- WHEN the RR7 route configuration is evaluated
- THEN every inventoried URL and route role MUST map to an explicit RR7 route
- AND matching and parameter behavior MUST remain equivalent for those URLs

#### Scenario: Type generation precedes validation

- GIVEN a clean checkout without generated RR7 route types
- WHEN the RR7 example verification sequence runs
- THEN framework type generation MUST complete before type checking or build validation
- AND generated framework types MUST be included in the application's TypeScript inputs
- AND type checking and production build MUST succeed

#### Scenario: Browser and server rendering use RR7 framework contracts

- GIVEN client hydration and an SSR request for the migrated example
- WHEN its browser and server entries execute
- THEN hydration MUST use the RR7 framework browser entry contract
- AND SSR MUST use the RR7 framework server entry contract
- AND the rendered route response MUST preserve its expected status, headers, and content

#### Scenario: Remix framework residue blocks the checkpoint

- GIVEN the migrated RR7 application still imports or resolves a Remix framework runtime, development, serving, or UI package
- WHEN checkpoint evidence is assessed
- THEN the RR7 application checkpoint MUST fail

### Requirement: Unique-scenario inventory and migration

Before example consolidation, the system MUST maintain a reviewable inventory mapping every route, integration, user-visible behavior, and verification scenario from the former Remix/RR7 example to an existing RR8 equivalent, a required RR8 migration, or an explicitly justified removal. Only scenarios not already represented by the protected RR8 example SHOULD be added to it, and no protected RR8 scenario MAY be removed merely to eliminate overlap.

#### Scenario: Unique scenario is transferred

- GIVEN an inventoried RR7 scenario has no equivalent in the RR8 example and remains in scope
- WHEN consolidation is prepared
- THEN the scenario MUST be implemented or represented in the RR8 example
- AND corresponding RR8 verification evidence MUST pass before the RR7 source is deleted

#### Scenario: Duplicate scenario is not copied

- GIVEN an inventoried RR7 scenario is already demonstrably covered by an equivalent RR8 scenario
- WHEN the inventory is reviewed
- THEN the mapping MUST identify that RR8 equivalent
- AND consolidation SHOULD avoid creating a duplicate demonstration

#### Scenario: Unmapped scenario prevents deletion

- GIVEN any former Remix/RR7 route, integration, behavior, or verification scenario lacks a reviewed disposition
- WHEN retirement is requested
- THEN the retirement gate MUST remain closed
- AND the source example MUST NOT be deleted

### Requirement: Documented and bounded retirement gate

The bridge documentation MUST declare deprecation, migration guidance to the RR8 package and adapter, the support boundary, and objective retirement conditions. The RR7 bridge and adapter MUST NOT become indefinite supported surfaces. Retirement MUST require evidence that all documented repository consumers have migrated and all scenario-inventory dispositions are complete.

#### Scenario: Retirement gate opens

- GIVEN migration guidance and the support boundary are published
- AND every documented consumer is mapped to completed RR8 migration evidence
- AND every unique scenario has an accepted RR8 disposition with passing evidence
- WHEN the retirement conditions are evaluated
- THEN the bridge MUST be eligible for removal

#### Scenario: Premature deletion is rejected

- GIVEN a documented consumer has not migrated, a required scenario has not transferred, or migration guidance is absent
- WHEN deletion of an RR7 transitional surface is proposed
- THEN deletion MUST be blocked
- AND the bridge MUST remain available under its declared temporary support boundary

#### Scenario: Indefinite support is rejected

- GIVEN bridge documentation omits objective retirement conditions or presents RR7 and RR8 as permanently co-maintained integrations
- WHEN the support policy is reviewed
- THEN the transition checkpoint MUST fail
- AND the documentation MUST NOT be accepted as satisfying the retirement gate

### Requirement: Final RR8-only repository state

After the retirement gate opens, `@effectify/react-router` and its RR8 Better Auth adapter MUST be the sole maintained React Router integration surfaces. The repository MUST remove the RR7 bridge, its legacy `json` export, the workspace-only RR7 Better Auth adapter, the former Remix/RR7 example, and all RR7/Remix-only source, dependency, documentation, release, workspace, and lockfile references. The final state MUST retain the protected RR8 catalog and behavior.

#### Scenario: Retirement cleanup is complete

- GIVEN the documented retirement gate has opened
- WHEN final repository references and the resolved workspace graph are inspected
- THEN no RR7 bridge, temporary adapter, old example, `json` compatibility export, Remix-only package, RR7-only package, or associated publish/release entry MUST remain
- AND the maintained integration documentation MUST direct consumers to the RR8 package and adapter

#### Scenario: RR8-only verification passes

- GIVEN all transitional surfaces have been removed
- WHEN final consolidation verification runs
- THEN the RR8 package, Better Auth adapter, example routes, type generation, type checking, SSR behavior, tests, and build MUST pass against the protected RR8 dependency family
- AND no passing result MAY depend on an RR7 or Remix artifact

### Requirement: Release and rollback evidence

Each checkpoint and final retirement MUST produce reviewable evidence that distinguishes RR7 bridge verification from RR8 regression verification, records release-surface changes, and states the applicable rollback boundary. A rollback MUST restore the last supported transitional release or missing scenario when necessary, and MUST NOT downgrade or otherwise mutate the protected RR8 stack.

#### Scenario: Bridge checkpoint evidence is recorded

- GIVEN the isolated RR7 bridge and migrated RR7 example are candidates for the transitional checkpoint
- WHEN checkpoint evidence is assembled
- THEN it MUST identify the tested RR7 dependency resolution and bridge public-contract results
- AND it MUST separately identify the unchanged RR8 dependency resolution and RR8 regression results
- AND it MUST record that the RR7 adapter is excluded from publication

#### Scenario: Final retirement evidence is recorded

- GIVEN the retirement gate is open and cleanup is complete
- WHEN final release evidence is assembled
- THEN it MUST include consumer migration status, scenario inventory dispositions, transitional-surface absence, release metadata cleanup, and passing RR8-only verification
- AND it MUST identify the final supported bridge release needed for rollback

#### Scenario: Rollback preserves protected RR8 state

- GIVEN a failure occurs before or after retirement
- WHEN rollback is invoked
- THEN pre-retirement rollback MUST retain or restore the bridge checkpoint as needed
- AND post-retirement rollback MAY temporarily restore the final bridge release or a missing scenario
- BUT rollback MUST NOT downgrade, widen, replace, or repurpose the protected RR8 catalog, package, adapter, or example
