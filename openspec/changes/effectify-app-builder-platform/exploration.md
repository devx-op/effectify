# Effectify App Builder Platform — Pre-Proposal Product Requirements Document

> Status: exploration/PRD consolidation only. This document is not an SDD proposal, specification, design, task plan, or implementation authorization.

## Executive Summary

Effectify will be an Effect-first application builder platform for developers who want to learn and apply robust, composable product architecture without starting from an empty Nx workspace or surrendering ownership of generated code. It will combine deterministic Nx generators, a provider-neutral CLI tool protocol, optional LLM orchestration, a planner-only web builder, lifecycle-aware migrations, and a governed plugin marketplace.

The v1 product must produce functional, compilable, tested applications whose source belongs entirely to the user and runs without an Effectify runtime. The default persistence path is native Effect v4 PostgreSQL through `@effect/sql-pg`, `effect/unstable/sql`, and `effect/unstable/schema`; Drizzle is a v1.2 follow-up, not the v1 default.

Effectify core is plugin-first and framework-agnostic. Framework, transport, persistence, authentication, UI, workflow, and deployment support are declared by plugins and resolved through a shared compatibility, planning, provenance, permission, and migration model. The initial official golden preset is an isomorphic React Router SSR application using native Effect SQL PostgreSQL, Better Auth, Better Auth UI, and Alchemy on Cloudflare; Hatchet remains optional. Its reference product is auth-first, organization-scoped Order Management.

## Current State

Effectify is a pnpm 10.14.0, Nx 23.1.0 TypeScript monorepo with package-oriented Effect integrations under `packages/`, application examples under `apps/`, and Astro/Starlight documentation at `apps/docs`. Nx resolves inferred build, test, typecheck, lint, development, and release targets. Vitest, `@effect/vitest`, Cypress, v8 coverage, oxlint, TSGo, and Oxfmt workflows are established.

Existing packages provide useful precedents—especially `@effectify/prisma`, Better Auth integrations, Hatchet, functional domain packages, and Loom—but the repository does not yet contain an app-builder CLI, local Nx generator plugin, capability manifest, compatibility solver, typed tool registry, shared generation plan, plugin marketplace, or online builder.

## Product Problem

Building a production Effect application currently requires developers to reconcile many independent decisions: workspace topology, DDD boundaries, Effect service composition, persistence, transport, authentication, testing, deployment, and evolving library APIs. Existing starters usually optimize initial scaffolding, hide architectural decisions, or become difficult to update once users edit the generated source.

Effectify must solve three connected problems:

1. **Starting well:** generate a coherent, production-oriented application from validated capabilities rather than a pile of unrelated templates.
2. **Continuing consistently:** add slices and architectural components after bootstrap using the same patterns and constraints.
3. **Evolving safely:** update manifests, plugins, and generated code without silently overwriting user changes or hiding migration risk.

## Target User and Jobs to Be Done

### Primary v1 user

A developer who wants to learn and apply Effect through standardized, robust, composable product-building patterns. The user values explicit architecture, typed effects, testability, and repeatable conventions, but does not want to reconstruct every integration from first principles.

### Jobs to be done

- Generate an Effect-first product that compiles, tests, builds, and explains its architecture.
- Compare valid framework and integration combinations before writing files.
- Inspect the planned workspace and representative source before generation.
- Initialize Effectify in an existing Nx workspace without replacing established tooling.
- Add a bounded context, complete functional slice, or individual component consistently.
- Let an LLM discover and invoke safe typed tools without configuring MCP.
- Pause a run for input or approval and resume it from another process.
- Upgrade Effectify, plugins, configuration, and generated code with inspectable migrations.
- Discover, install, approve, and update plugins with visible provenance and permissions.
- Remove Effectify from runtime concerns: generated applications remain ordinary user-owned Nx/Effect code.

## Product Principles

1. **User-owned source:** generated files are the user's source code, not a projection that requires Effectify at runtime.
2. **Inspectability before mutation:** planning, compatibility impact, provenance, file changes, and permissions are reviewable before writes.
3. **Domain-first architecture:** bounded contexts and workflows organize the product; frameworks, databases, auth providers, and deployment systems remain adapters.
4. **Determinism before inference:** reliable structural generation and transformation take precedence over LLM edits.
5. **One model, multiple surfaces:** CLI, web builder, LLM tools, previews, migrations, and plugins share typed capability and plan contracts.
6. **Progressive composition:** initial generation and later additions use small composable primitives rather than monolithic templates.
7. **Explicit support evidence:** official, experimental, community, unavailable, and pending-validation states are not conflated.
8. **Safe evolution:** divergence, skipped migrations, permission expansion, and compatibility changes are visible and persistent.
9. **Self-explanatory output:** repeated structural patterns, domain vocabulary, explicit Effect channels, and predictable composition replace tutorial comments and opaque wrappers.
10. **Plugin-defined integrations:** core never hardcodes a framework support matrix.

### Generated-code ownership definition

Ownership means the user may understand, edit, move, test, and operate generated code without Effectify remaining in the application runtime. Effectify retains only provenance and lifecycle metadata needed to plan future operations. Re-running a generator must inspect current code, detect divergence from provenance, produce a plan and diff, and require approval before overwriting or structurally changing user-edited files.

## v1 Goals

- Deliver a complete Effect-first generation platform through incremental v0.x capability releases culminating in v1.0.
- Prove the platform through the official isomorphic React Router SSR + native Effect SQL PostgreSQL + Better Auth + Better Auth UI + Alchemy/Cloudflare golden preset and its auth-first, organization-scoped Order Management reference product.
- Support greenfield creation, existing-workspace initialization, incremental generation, plugin lifecycle, and semantic updates.
- Provide deterministic Nx generator primitives that remain independently callable and LLM-composable.
- Provide stable JSON CLI input/output and an internal MCP-inspired typed tool registry with no MCP setup requirement.
- Generate bounded-context Nx architectures with enforceable dependency rules, tests, documentation, and golden applications.
- Deliver a planner-only builder, safe dual-level file preview, signed blueprints, and a governed plugin marketplace.
- Make native Effect PostgreSQL the verified v1 persistence default.
- Support framework-defined split and isomorphic transport topologies.
- Keep all mutations transactional where filesystem and tool boundaries permit, with explicit recovery evidence where they do not.

## Success Criteria

- A user can generate and run an official golden-path application within ten minutes on a documented supported environment.
- Untouched generated projects compile, typecheck, test, and build without manual fixes.
- A generated minimal slice is functional and compilable, not empty folder scaffolding.
- Incremental slice and component generators preserve Nx boundaries and existing workspace tooling.
- Identical pinned blueprint, registry snapshot, plugin versions, inputs, and workspace baseline produce the same plan and output digest.
- Any shell-capable LLM can list, describe, and call Effectify tools through JSON and complete a resumable callback flow.
- Destructive or compatibility-changing operations cannot apply without an approved plan and exact diff.
- Failed generation or migration does not leave an unreported partial state; rollback or recovery instructions are deterministic.
- Web-declared preview drift from local materialization is detected, classified, and explained.
- Every official preset has a versioned golden application regenerated and validated in CI.
- Remote anonymous analytics contain no code, prompts, secrets, raw diffs, file paths, or human responses.

## Explicit v1 Non-Goals

- Executing arbitrary marketplace plugin ESM in the browser or Effectify web infrastructure.
- Browser-based source editing or cloud execution of user workspaces.
- Managed application hosting.
- Polyglot plugin authoring, JavaScript-only plugin contracts, or non-Node plugin runtimes.
- Publication solely because a repository has a GitHub topic.
- Universal framework or platform support.
- Native-client deployment through Alchemy; only the deployable backend/infrastructure is supported.
- Generating provider files when the Alchemy plugin is absent.
- Silent compatibility substitution, permission expansion, destructive update, or user-file overwrite.
- Drizzle as a v1 default or a public `@effectify/drizzle` package before v1.2.
- Distributed transaction guarantees across provider/network side effects.
- A generic shared layered slice or cross-context imports of private domain/application projects.

## Complete User Journeys

### Web builder

1. The user opens the Astro/Starlight-hosted builder and selects a preset or composes plugin-defined capabilities.
2. The compatibility engine marks combinations as supported, experimental, incompatible, unavailable, or pending evidence and explains conflicts.
3. The builder creates only a typed plan: it does not execute marketplace plugin ESM.
4. A Better-T-Stack-inspired explorer shows declared folders and files through `@effectify/preview-protocol`; content is marked `available`, `dynamic`, or `unavailable`.
5. The user shares an editable URL representing design intent or requests an immutable signed blueprint pinned to registry snapshot, versions, digests, topology, and permissions.
6. Local `effectify new --from <blueprint>` materializes the authoritative Nx virtual tree, reports preview drift, shows the plan/diff, obtains approval, and writes transactionally.

### `effectify new`

1. Select the official golden preset—an isomorphic React Router SSR application with native Effect SQL PostgreSQL, Better Auth, Better Auth UI, and Alchemy/Cloudflare—or provide local configuration, editable builder intent, or a signed blueprint. Hatchet is an optional addition.
2. Resolve exact compatible plugin versions and permissions; never silently substitute.
3. Generate an immutable plan and declared preview.
4. Materialize a virtual Nx tree locally, run validations, and present exact changes.
5. Acquire the workspace mutation lock and require approval for writes.
6. Commit files, `effectify.json`, shared provenance, migration state, documentation, and tests as one controlled operation.
7. Run configured Nx verification and return structured JSON or human output with digests and recovery information.

### `effectify init`

1. Detect package manager, Nx version, project graph, current test runner, formatting/linting tools, and existing integrations.
2. Ask only for unresolved intent; preserve established tools unless explicitly changed.
3. Create `effectify.json` and shared `.effectify/` metadata without claiming ownership of unrelated files.
4. Reconcile selected plugins against inspected code and record adopted versus unmanaged artifacts.
5. Present and approve any normalization or generator installation changes before mutation.

### Incremental generators

- `effectify generate context <name>` creates the bounded-context Nx project group.
- `effectify generate slice <context>/<slice>` creates a minimal functional, compilable vertical slice with domain behavior, application workflow, contracts, adapters as selected, presentation when applicable, and tests.
- Component generators add entities/value objects, schemas, workflows, services, ports, adapters, endpoints, screens, events, and tests without generating a generic shared slice.
- Every generator exposes schema-described options, supports plan/dry-run/diff, records provenance, and is callable directly or through the tool registry.

### LLM JSON tool use

1. The agent runs `effectify tools list --json` and `effectify tools describe <tool> --json`.
2. It inspects project intent, actual code, divergence, compatibility, plans, and validations through read-only tools.
3. It calls deterministic generators or requests a bounded LLM-assisted transformation through `effectify tools call` using JSON stdin/stdout.
4. Mutation tools return a plan and diff requiring explicit approval; the registry is provider-neutral and MCP-inspired, but no MCP server is required.
5. An optional future MCP adapter may project the same registry without changing tool semantics.

### Resumable callbacks

1. A run that needs a prompt, compatibility decision, secret consent, plan approval, or external result persists a typed state transition.
2. It returns `input-required`, a continuation token, expected response schema, and non-sensitive context, then exits.
3. A later process submits the typed response and token.
4. The run validates token, state version, plugin/plan digests, lock ownership, and current file hashes before resuming.
5. Every transition and tool invocation remains locally traceable and deterministically testable.

### Updates and migrations

1. `effectify update` compares core, plugin, preset, manifest, registry, and generated-artifact versions.
2. It plans manifest migrations separately from code migrations and identifies divergence.
3. The transformation hierarchy is deterministic AST edits, composable Nx generators, validated textual transforms, then bounded LLM-assisted transformation as a last resort.
4. The user reviews compatibility impact, migrations, plan, and diff and may skip individual code migrations.
5. Skips are persisted and not repeatedly prompted. A later migration depending on a skipped migration must stop and explain the dependency.
6. The operation uses checkpoints/virtual trees where possible, acquires the mutation lock, verifies hashes, applies transactionally, validates, and records exact provenance and recovery state.

### Plugin discovery, install, and update

1. A scheduled discovery run queries GitHub topic `effectify-plugin` once per day; the topic supplies candidate repositories, not publication authority.
2. Detected candidates enter `pending-validation`; validation targets completion within one hour after detection and checks ownership, manifest, immutable release, integrity, compatibility, capabilities, permissions, package format, and installability.
3. Validated entries may become `published`; sensitive or permission-expanding changes enter `pending-review`; rejected, quarantined, deprecated, and revoked states remain visible to operators.
4. Installation pins an immutable release and digest, shows requested permissions and topology/file impact, and requires approval.
5. Plugins execute only in the out-of-process worker through the capability broker.
6. Updates apply automatically only when registry policy permits and permissions do not expand; otherwise the user reviews the new release, permissions, migrations, and diff.

## CLI, Tool Registry, Planning, and Execution

### JSON I/O

All significant commands support stable Effect Schema-defined JSON envelopes over stdin/stdout. Human rendering is a projection of the same result. Envelopes include protocol version, run ID, status, diagnostics, trace references, plan/output digests, callback schema, and typed failures. Stdout remains machine-readable in JSON mode; logs go to structured trace channels or stderr.

### Internal MCP-inspired registry

The registry owns tool identity, description, input/output/error Schemas, read/write classification, required plugin capabilities, permissions, resumability, idempotency, and version. Core commands and plugin tools use the same registry. Required discovery surfaces are `tools list`, `tools describe`, and `tools call`.

### Execution hierarchy

1. Pure inspection and validation.
2. Deterministic AST or Nx primitives.
3. Compositions of deterministic primitives.
4. Validated textual transforms where structural edits are impractical.
5. LLM planning/orchestration of registered tools.
6. Bounded LLM source transformation only when deterministic approaches cannot truthfully preserve intent.

LLMs never replace available deterministic transformations. All writes operate from an immutable plan containing expected baseline hashes, ordered operations, permissions, provenance, and validation steps.

### Plan, diff, and approval

Read-only inspection/planning may run autonomously. Any destructive write, compatibility substitution, topology change, plugin/version change, permission expansion, migration, or overwrite requires an exact diff and explicit approval. Resumption must invalidate approval when baseline hashes or plan digests change.

### Traceability, observability, and testing

Each run links user intent, blueprint/preset, registry snapshot, plugin versions, tool calls, plan operations, file provenance, approvals, callbacks, diagnostics, validation results, and output digest. Detailed traces remain local. Tests cover schemas, state transitions, deterministic replay, callback continuation, lock behavior, broker capabilities, rollback, permission denial, and JSON compatibility.

### Concurrency and resumable state

Concurrent inspection and planning are allowed. Workspace mutations require one lock containing owner run and timestamp. Stale locks are diagnosed and released only by explicit action. Resumed runs verify hashes against the approved plan before writing.

## Project Configuration, State, Provenance, and Migrations

### `effectify.json`

This is the canonical project intent manifest. Configuration precedence is invocation flags, environment variables, project `effectify.json`, user-global configuration, then defaults. It records schema/core version, selected preset, plugin requirements, topology, capabilities, analytics opt-out, and project-level policy—not secrets or volatile run state.

### `.effectify/` split

Committed shared state:

- `.effectify/artifacts.json` — artifact ownership boundaries, generators, plugin/release digests, input fingerprints, output provenance, and divergence metadata.
- `.effectify/migrations.json` — applied, skipped, blocked, and superseded manifest/code migrations with dependency history.

Ignored local state:

- `.effectify/runs/`
- `.effectify/traces/`
- `.effectify/cache/`
- `.effectify/checkpoints/`

The directory itself must not be globally ignored. Shared files contain no secrets or sensitive absolute paths.

### Semantic migrations and transactional safety

Core, manifest schema, plugins, presets, and migration collections use SemVer. Migrations declare ranges, dependencies, idempotency, affected provenance, and rollback/recovery behavior. Filesystem edits are first applied to a virtual tree or checkpoint, validated, and committed under the mutation lock. External provider/network operations remain outside authoritative local transactions and must expose truthful partial-failure and compensation guidance.

## Plugin Platform

### Plugin-first core

Every framework, transport, persistence, auth, workflow, UI, and deployment integration is a plugin. Official and community plugins use identical manifests, worker runtime, compatibility, permission, preview, migration, and tool contracts. “Official” denotes Effectify ownership, validation, support, and release guarantees; it is not a privileged bypass.

### Naming, language, runtime, and handlers

- Official packages use `@effectify/plugin-*`.
- Community packages should use `@scope/effectify-plugin-*`; manifest identity remains authoritative.
- v1 authoring is modern TypeScript only.
- Distribution is compiled ESM-only with declarations, source maps, explicit export maps, and `@effectify/plugin-sdk` as a peer dependency.
- Production never executes raw TypeScript.
- Effectify CLI and workers support Node.js LTS only; package-manager detection may include pnpm, npm, yarn, and bun, but bun is not a v1 worker runtime.
- Handlers are Effect v4-native: `Effect<Output, PluginError, DeclaredCapabilities>`. Serializable Effect Schemas preserve tagged failures across the process boundary.

### Worker and capability broker

Plugins run out of process and request host operations through a broker. The closed, deny-by-default permission taxonomy includes scoped `workspace:read`, `workspace:write`, `process:execute`, `network:access`, `environment:read`, `secrets:read`, and `telemetry:emit`. Paths, hosts, commands, variables, and secret identities are narrowly scoped. Permission expansion requires renewed approval; secret access requires explicit per-use consent. Workers support timeouts, interruption, memory limits, structured failures, simulated test brokers, and virtual-tree diff review.

### Versioning and presets

Plugins release independently under SemVer and declare explicit compatibility ranges. Versioned official presets pin exact plugin versions and registry snapshots. Compatibility resolution may recommend alternatives but never silently changes versions, permissions, topology, architecture, or blueprints.

## Marketplace and Supply Chain

The marketplace is inspired by Herdr's topic discovery and R2 snapshot architecture while adding validation and governance Herdr does not provide.

- A scheduled discovery worker queries GitHub topic `effectify-plugin` once per day and writes candidate snapshots to R2-like immutable object storage. Detected candidates have a validation completion target of one hour.
- The validated registry, not GitHub search, is publication authority.
- A root `effectify-plugin.json` provides typed metadata; immutable npm/GitHub releases and digests are the installable units.
- Astro/Starlight and Pagefind present registry data at build time; the builder consumes the same signed typed snapshot.
- Registry states include `discovered`, `pending-validation`, `pending-review`, `published`, `rejected`, `quarantined`, `deprecated`, and `revoked`.
- Initial publication requires ownership and release verification, isolated install/test validation, compatibility checks, permission review, provenance/integrity evidence, and moderation.
- Later releases may publish automatically only when validation passes, identity is continuous, permissions do not expand, and policy does not flag sensitive changes.
- Stars, downloads, GitHub topics, and npm provenance are signals, never standalone trust guarantees.
- Revocation and quarantine must be distributable through new signed registry snapshots without mutating historical snapshots or signed blueprints. Blueprint execution performs a live revocation check and blocks revoked dependencies by default.

## Builder and Preview Architecture

The v1 builder is a planner, not a hosted generator or code editor. It uses the shared compatibility engine and signed registry metadata, never web-executes marketplace ESM.

The file explorer follows Better T Stack's useful inspect-before-generate experience but separates:

- **Declared preview:** web-safe folders and representative content derived from signed deterministic recipes; files are `available`, `dynamic`, or `unavailable`.
- **Materialized preview:** authoritative local Nx virtual-tree output produced by the CLI with exact content and drift diagnostics.

`@effectify/preview-protocol` is an Effect Schema contract shared by builder, registry, plugins, blueprints, and CLI. Editable URLs encode current design intent and may re-resolve against current compatibility rules. Immutable signed blueprints bind exact registry snapshot, plugins, versions, permissions, topology, and preview/plan digests. They do not expire and remain inspectable. Execution performs live registry revocation checks and blocks revoked dependencies by default; an explicit future policy may govern exceptional override workflows without changing blueprint history.

## Generated Nx and Functional DDD Architecture

### Bounded-context project grouping

Each bounded context is a filesystem grouping containing independent Nx projects:

- `libs/<context>/contracts` — versionable Effect Schemas, IDs, DTOs, commands, events, and public Effect service protocols.
- `libs/<context>/domain` — aggregates, entities, value objects, invariants, and pure domain behavior.
- `libs/<context>/application` — workflows and Layers implementing public protocols and hiding internal requirements.
- `libs/<context>/infrastructure/<adapter>` — persistence and external-provider adapters.
- `libs/<context>/presentation/<adapter>` — HTTP, framework, CLI, or UI adapters where applicable.

These are internal Nx projects, not necessarily publishable packages. Other contexts may import only the owning context's `contracts`. They must not import its private domain, application, infrastructure, or presentation projects. Domain depends on no adapter; application depends on domain/contracts; adapters depend inward; composition roots provide Layers.

Public synchronous service protocols and boundary Schemas live in `contracts`; their implementing Layers live in `application`. Cross-context synchronous work uses narrow public Effect capabilities. Typed events are reserved for genuinely asynchronous decoupling; publication acknowledgement is not business completion.

Naming is kebab-case for CLI commands, paths, directories, and filenames; PascalCase for TypeScript types; camelCase for values and functions.

### Shared kernel versus platform

`shared/kernel` is intentionally minimal and contains only stable universal domain concepts accepted by participating contexts. It is not a generic layered slice. Reusable technical capabilities such as config, observability, HTTP, persistence foundations, and testing live under `platform/*`. Reusable business behavior stays with its bounded context or motivates a new context. Authentication remains a complete bounded context.

### Slice and component generators

A complete slice generator creates the smallest meaningful vertical behavior: boundary contract, domain model/invariant, application workflow with explicit `Effect<Success, Failure, Requirements>`, narrow functional dependencies, selected adapter, optional presentation endpoint/screen, and executable tests. It must compile and demonstrate behavior; empty CRUD folders are insufficient.

Component generators add one architecture element at a time and compose with existing slices. Broad generic repositories are avoided in favor of workflow-specific functions/services such as `FindOrder` or `SaveOrder`.

## Authentication Integration Profile

Better Auth and Better Auth UI are separate official plugins coordinated by a provider-owned integration profile. The profile—not core and not each generated slice—owns supported feature combinations, schema contributions, framework entrypoints, UI registry/package choice, route/session wiring, and version constraints. This minimizes repeated wrapper boilerplate while preserving visible generated composition and replaceable boundaries.

The initial golden preset is auth-first and includes email/password, email verification, account recovery, sessions, organizations, memberships, roles, and basic user administration. These capabilities support the organization-scoped Order Management reference product end to end. Magic links and other advanced capabilities are deferred to later v0.x milestones. Better Auth UI support is framework-specific and must not imply native UI support where none is evidenced.

## Persistence

### v1 native Effect PostgreSQL

The default is PostgreSQL using the current verified Effect v4 APIs:

- `@effect/sql-pg`
- `effect/unstable/sql`
- `effect/unstable/schema`
- `PgClient`, `PgMigrator`, `SqlClient`, `SqlSchema`, `SqlModel`, `Model`, and `VariantSchema`

One top-level `PgClient.layer` provides the shared physical client as both `PgClient` and generic `SqlClient`. Each bounded context owns local persistence views/repository Layers depending on `SqlClient`; it does not create a separate physical pool. An aggregate schema exists only for global migration/tooling coordination, not as a shared application repository or cross-context model.

Database rows are persistence models. `SqlSchema`/`SqlModel` provide runtime codecs, and explicit mappers decode rows into domain models. `SqlModel.makeRepository` is appropriate only when the model truthfully represents a table row; richer aggregates use explicit codecs and mapping. Domain schemas remain persistence-ignorant.

The `unstable` path is not characterized as unsafe or unfit. It indicates API evolution: Effect minor releases may change these APIs. Effectify must pin a verified Effect version/commit range, isolate generated persistence conventions behind local adapters, and validate migrations and golden applications before updating the pin.

### v1.2 Drizzle follow-up

Publish public npm package `@effectify/drizzle` in v1.2. It is Effect Schema-first with explicit SQL descriptors for details domain schemas cannot infer, including indexes, foreign keys, defaults, generated columns, relations, and dialect types. It generates or validates Drizzle tables, supplies codecs/mappers, and runs contract tests against native Effect boundaries.

Official `drizzle-orm/effect-schema` works table → Effect Schema; it does not derive tables from Effect Schema. The Effectify adapter therefore owns the reverse descriptor/generation contract rather than claiming official Drizzle provides it. Prisma is entirely deferred beyond v1 and is neither an official nor experimental v1 integration. `effect-qb` is a later advanced integration.

## Transport and Framework Topology

Framework plugins declare execution modes, entrypoints, rendering strategies, transport capabilities, composition roots, deployment recipes, and compatibility. Core derives topology from those declarations.

- **Client SPA/native mode:** separate `apps/app` and `apps/api`. The API exposes an Effect-native HTTP contract; the client consumes generated typed transport boundaries.
- **Isomorphic mode:** one `apps/app` with framework-owned server/client entrypoints and Layer composition. No artificial standalone API app is generated unless the framework plugin declares it.

All transport and framework integrations are plugins. Framework support is never a hardcoded core switch.

## Optional Alchemy Topology

`@effectify/plugin-alchemy` is optional for custom compositions and required by the initial official golden preset. It is based on verified current Alchemy `main` behavior:

- One root `alchemy.run.ts` per generated workspace deployment unit by default.
- Cloudflare `Website.Vite` for SPA, SSR, and RSC modes.
- SPA mode deploys an Effect-native backend Worker and injects its public URL into the Vite frontend.
- Isomorphic mode deploys one Vite Worker and binds infrastructure to the framework server runtime.
- Native clients deploy only their backend/infrastructure through Alchemy.
- No provider-specific files are emitted when Alchemy is not selected.
- Only native Alchemy deployment resources are supported; no shell-wrapper backend.
- RSC is explicit opt-in and experimental, never inferred.

Because Alchemy evolves rapidly, the official plugin and presets pin validated versions and golden applications.

## Initial Official Plugins and Maturity

| Plugin                             | v1 maturity intent                       | Notes                                                                                                                                       |
| ---------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `@effectify/plugin-react-router`   | Supported golden path                    | Initial preset uses isomorphic SSR.                                                                                                         |
| `@effectify/plugin-effect-sql`     | Supported default                        | Native PostgreSQL with pinned Effect v4 APIs.                                                                                               |
| `@effectify/plugin-better-auth`    | Supported golden path                    | Initial preset includes email/password, verification, recovery, sessions, organizations, memberships, roles, and basic user administration. |
| `@effectify/plugin-better-auth-ui` | Supported golden path for React Router   | Provider-owned profile; no implied native UI.                                                                                               |
| `@effectify/plugin-hatchet`        | Supported optional integration           | Effect-first workflow boundary, independently selectable.                                                                                   |
| `@effectify/plugin-alchemy`        | Supported golden path with pinned matrix | Required by the initial Cloudflare preset; optional in custom compositions; RSC explicitly experimental.                                    |
| `@effectify/plugin-tanstack-solid` | Experimental                             | Must not be presented as stable until official upstream evidence and golden compatibility tests justify promotion.                          |

Additional frameworks and native/desktop targets remain plugin candidates whose maturity is registry evidence, not a core promise. `tanstack-native` remains community prototype evidence and Native SDK mobile remains experimental.

## Testing and Quality of Generated Applications

New projects default to Vitest and Effect-aware testing; existing workspaces retain their current runner unless the user approves a change. Generated tests form a pyramid:

1. Pure domain/invariant unit tests.
2. Application workflow tests with test Layers and typed failures.
3. Reusable port contract suites run by every adapter.
4. Optional database/integration tests for selected adapters.
5. Presentation integration tests when a concrete boundary exists.
6. E2E tests only for complete user journeys with an actual presentation surface.

Use `@effect/vitest`, TestClock, Deferred, Queue, Layers, and deterministic synchronization rather than sleeps or broad global mocks. Nx targets own test/typecheck/build/lint execution. Golden preset CI regenerates from scratch and checks deterministic diff, Nx boundaries, migrations, typecheck, tests, build, and docs.

## Documentation

Documentation is part of every implementation work unit. Package documentation is colocated at `packages/*/docs` and aggregated into Astro/Starlight. CLI references and option schemas are generated from the typed registry; snippets come from compilable fixtures; examples and links run in CI; structural previews come from the real planner. Each official preset owns a versioned generated golden application that is also the source for validated examples.

## Analytics and Diagnostics

Anonymous product analytics are enabled by default with project-level opt-out in `effectify.json`. Remote events may include coarse command/tool identity, plugin/version, duration buckets, failure tags, callback outcomes, and completion metrics. They must exclude code, prompts, secrets, raw diffs, file contents, absolute paths, and human responses.

Detailed traces remain local under `.effectify/traces/`. Diagnostic submission is a separate explicit action that previews and redacts a bundle before upload; analytics consent never implies diagnostic submission consent. Explicitly submitted diagnostic bundles are retained for at most 30 days, expire automatically, and support immediate deletion on request.

## Delivery Intent and Reviewability

Development proceeds through coherent v0.x capability milestones beginning at v0.1 and culminating in the complete v1.0 platform. Foundation work precedes the initial official golden preset and its auth-first, organization-scoped Order Management application. Magic links and advanced auth capabilities follow in later v0.x milestones. Exact milestone and work-unit assignments remain deferred to the future tasks phase.

The implementation will exceed the 400 changed-line review budget many times. Under `ask-on-risk`, future planning must split work into independently reviewable vertical slices or obtain an explicit size exception before apply. This PRD does not authorize implementation.

## Risks and Mitigations

- **Combinatorial support matrix:** use plugin-declared compatibility, evidence states, official presets, and golden applications.
- **User-source damage:** require divergence detection, immutable plans, exact diffs, approvals, hash checks, checkpoints, and migration ledgers.
- **Effect SQL API evolution:** pin verified versions, isolate adapters, and continuously validate generated fixtures; do not characterize `unstable` as inherently unsafe.
- **Plugin supply chain:** immutable releases, broker isolation, deny-by-default permissions, moderation, revocation, and signed registry snapshots.
- **Preview overclaim:** label declared content availability and make local materialization authoritative.
- **DDD ceremony:** generate meaningful behavior and absorb Nx configuration; do not create empty layers or a generic shared slice.
- **Marketplace freshness and GitHub limits:** run daily candidate discovery, target validation within one hour of detection, and use registry authority rather than live search as the product database.
- **Auth matrix drift:** provider-owned profiles and pinned compatibility tests keep Better Auth core/UI/framework features explicit.
- **External side effects:** keep network/provider calls outside local authoritative transactions and expose truthful recovery paths.
- **Broad initiative review load:** enforce reviewable delivery units under the 400-line budget.

## Assumptions

- Node.js LTS remains the supported CLI/worker runtime for v1.
- Nx remains the deterministic workspace and generator substrate.
- Effect v4 APIs can be pinned and tested at official preset boundaries.
- Official plugin maintainers can operate validation, moderation, signing, and revocation infrastructure.
- Users accept committed provenance/migration metadata and ignored local traces/runs.

## Remaining Genuine Product Decisions

No unresolved product decisions currently block explicit human review of this PRD. Exact package boundaries, milestone assignments, implementation sequencing, and migration algorithms belong to proposal/design/tasks and are intentionally not decided here.

## Roadmap and Follow-Ups

- Incremental v0.x releases: typed capability/plan foundation, CLI/tool registry, deterministic generators, the official React Router/Effect SQL/Better Auth/Alchemy golden preset, lifecycle/migrations, plugin runtime/registry, docs/marketplace, builder/preview, and later advanced auth capabilities including magic links.
- v1.0: complete approved platform scope centered on the auth-first, organization-scoped Order Management reference product and validated official preset matrix. Prisma remains outside v1.
- v1.2: public `@effectify/drizzle` with Effect Schema-first descriptors, generated/validated tables, codecs, and contract tests.
- Beyond v1: Prisma, `effect-qb`, additional frameworks, mature native/desktop plugins, optional MCP adapter, and non-TypeScript worker runtimes only when evidence and governance justify them.

## Source Register and Research Evidence

| Source                                                                                                                        | Evidence status                                                                                                   | Product implication                                                                                                                      |
| ----------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Scott Wlaschin, _Domain Modeling Made Functional_, ISBN 978-1-68050-254-1, B5.0 (2017-11-20)                                  | Authoritative user-supplied text; publisher metadata confirms ISBN, date, and content-complete status.            | Functional DDD principles constrain generated architecture but do not prescribe a copied folder tree.                                    |
| [Native SDK introduction](https://native-sdk.dev/introduction) and [platform matrix](https://native-sdk.dev/platform-support) | Canonical documentation for `vercel-labs/native`; pre-1.0, with desktop more mature and mobile experimental.      | Candidate plugin evidence, not universal-mobile v1 support.                                                                              |
| [`NathanWalker/tanstack-native`](https://github.com/NathanWalker/tanstack-native)                                             | Community prototype, not official TanStack/NativeScript evidence; one commit and no releases at validation.       | Experiment only; cannot establish supported v1 compatibility.                                                                            |
| [Alchemy getting started](https://alchemy.run/getting-started/) and `.effect-reference/alchemy/`                              | Canonical docs/source; evolving release channel and current main evidence.                                        | Pinned, topology-aware plugin required by the initial Cloudflare preset and optional in custom compositions; no blanket provider claims. |
| [Better Auth UI](https://better-auth-ui.com/)                                                                                 | Canonical independent MIT project docs; React/Solid package and copied registry surfaces; no evidenced native UI. | Framework-specific official profile, not universal UI support.                                                                           |
| [Nx local generators](https://nx.dev/docs/kb/local-generators)                                                                | Official Nx documentation; local plugins and in-memory `Tree` generators are preferred.                           | Nx generators are deterministic execution primitives, not the product model.                                                             |
| [shadcn registry](https://ui.shadcn.com/docs/registry) and [CLI](https://ui.shadcn.com/docs/cli)                              | Official source-distribution model with init/add, no-overwrite defaults, dry-run, and diff.                       | Inspires inspectable source installation while Effectify owns its schema and lifecycle.                                                  |
| Herdr, commit `1491b7dd9c992ef0ad2b763f3e450befaf25c47f`                                                                      | Source-traced topic discovery, Cloudflare Worker/R2 snapshots, blacklist, and local install behavior.             | Reuse candidate-feed/snapshot ideas; add typed validation, moderation, permissions, provenance, and registry authority.                  |
| Effect v4 upstream commit `96ced895a07f89b2dd03c3e470884f7e25063696`                                                          | Verified canonical source/tests for beta.102 SQL/schema APIs.                                                     | Supports native PostgreSQL v1 design with pinned-version API-evolution risk.                                                             |
| `drizzle-orm/effect-schema` and `drizzle-orm/effect-postgres`                                                                 | Official integration direction verified as table → Effect Schema.                                                 | Requires Effectify-owned Effect Schema-first descriptors for v1.2 reverse generation/validation.                                         |

## Explicit Approval Checklist

Before an SDD proposal is authorized, reviewers should confirm:

- [ ] The primary user, product problem, and user-owned code definition are correct.
- [ ] Native Effect PostgreSQL—not Drizzle—is accepted as the v1 default.
- [ ] The v1.2 `@effectify/drizzle` direction accurately states official Drizzle's table → Effect Schema behavior.
- [ ] Plugin-first core, out-of-process execution, permissions, marketplace governance, and official/community distinction are accepted.
- [ ] Builder planner-only behavior, preview levels, editable URLs, and immutable blueprints are accepted.
- [ ] Nx bounded-context projects and strict cross-context dependency rules are accepted.
- [ ] Shared kernel/platform separation and provider-owned auth profile are accepted.
- [ ] The initial official preset—React Router SSR, native Effect SQL PostgreSQL, Better Auth, Better Auth UI, and Alchemy/Cloudflare, with Hatchet optional—is accepted.
- [ ] The auth-first, organization-scoped Order Management reference product and initial auth capability set are accepted.
- [ ] Daily marketplace discovery, one-hour validation target, non-expiring inspectable blueprints, default revocation blocking, and 30-day diagnostic retention are accepted.
- [ ] Prisma is accepted as entirely beyond v1, with no official or experimental v1 status.
- [ ] Framework topology and Alchemy rules are accepted.
- [ ] v1 goals, success criteria, non-goals, analytics policy, and testing/documentation requirements are accepted.
- [ ] No unresolved product decisions remain that block PRD approval.
- [ ] Future delivery will respect `ask-on-risk` and the 400 changed-line review budget.

## Recommendation

Conduct explicit human review against the approval checklist. If the user approves the PRD, a separate, explicitly authorized SDD proposal phase may use it as input. Do not create proposal, spec, design, tasks, or implementation from this exploration run.

## Ready for Proposal

**Ready for explicit human PRD review.** The consolidated product decisions are complete and internally consistent. `sdd-propose` remains unauthorized until the user explicitly approves this PRD.
