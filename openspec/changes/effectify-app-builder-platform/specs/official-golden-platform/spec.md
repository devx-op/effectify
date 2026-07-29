# Official Golden Platform Specification

## Purpose

Define the supported reference preset and its executable acceptance contract for v1.

## Requirements

### Requirement: Official preset and reference product

The initial preset MUST generate isomorphic React Router SSR with native Effect SQL PostgreSQL, Better Auth, Better Auth UI, and Alchemy/Cloudflare; Hatchet is optional. It MUST provide auth-first, organization-scoped Order Management with email/password, verification, recovery, sessions, organizations, memberships, roles, and user administration. A provider-owned Better Auth profile MUST define features, schema, entrypoints, UI, route/session wiring, and versions, minimizing wrappers while preserving application-specific Effect boundaries. Magic links/advanced auth are later v0.x.

#### Scenario: Generate the official preset

- GIVEN an approved preset on a documented supported environment
- WHEN generation finishes
- THEN the result MUST be an auth-first organization-scoped Order Management application within ten minutes

#### Scenario: Reject unsupported auth/UI claims

- GIVEN a framework lacks Better Auth UI evidence
- WHEN its combination is selected
- THEN it MUST NOT be presented as native or supported

#### Scenario: Preserve auth boundary

- GIVEN the profile is generated for an application capability
- WHEN auth integration is composed
- THEN it MUST wire integration without replacing the application's Effect capability boundary

### Requirement: Functional DDD and Nx boundaries

Contexts MUST isolate contracts, domain, application, infrastructure, and presentation. Domain MUST not depend on adapters; application MUST depend on domain/contracts; adapters MUST depend inward; cross-context access uses contracts only. `shared/kernel` contains stable universal domain concepts only; technical reuse lives in `platform/*`; no generic layered shared slice. Order behavior MUST include invariants, workflows, adapters, tests, and visible composition.

#### Scenario: Validate architecture

- GIVEN a freshly generated golden
- WHEN Nx validation runs
- THEN private imports and empty slices MUST fail

### Requirement: Persistence support boundaries

Native Effect SQL PostgreSQL MUST be the pinned, migration/golden-validated v1 default. Persistence keeps domain models ignorant and uses context-local adapters. Prisma has no official or experimental v1 integration. `@effectify/drizzle` MUST NOT be public/default in v1; v1.2 SHALL introduce it only as an Effect Schema-first descriptor/generation/validation boundary with codecs, mappers, and native-boundary contract tests.

#### Scenario: Certify the v1 persistence default

- GIVEN the official golden
- WHEN persistence is validated
- THEN it MUST use pinned native Effect SQL, never Prisma or Drizzle

#### Scenario: Enforce Drizzle boundary

- GIVEN a v1 Drizzle release request
- WHEN eligibility is evaluated
- THEN public exposure MUST be rejected until v1.2 criteria are met

### Requirement: Framework and deployment topology

Framework plugins MUST declare topology. The isomorphic preset SHALL generate one app with framework-owned server/client entrypoints and Layer composition, never an artificial API app. Alchemy is required here and MUST use validated Cloudflare topology; custom compositions MAY omit it and emit no provider files. Native clients MAY deploy backend/infrastructure only; RSC is explicit experimental opt-in. These constraints MUST NOT freeze provider APIs.

#### Scenario: Materialize topology

- GIVEN the official preset
- WHEN topology is generated
- THEN it MUST contain one isomorphic app and Cloudflare composition

### Requirement: Golden certification and documentation

Each official preset MUST own a versioned golden. CI MUST regenerate it and validate deterministic diff, matrix, migrations, Nx boundaries, typecheck, tests, build, and executable docs. Untouched output MUST compile, typecheck, test, and build without fixes. Docs and references MUST derive from validated artifacts.

#### Scenario: Detect CI drift

- GIVEN a pinned update changes golden output
- WHEN CI regenerates it
- THEN it MUST fail on unapproved output, migration, validation, or doc drift

### Requirement: Plugin maturity and test defaults

`@effectify/plugin-tanstack-solid` MUST remain experimental and MUST NOT be called stable without official evidence and golden validation. New workspaces MUST default to Vitest with Effect-aware testing; adopted workspaces retain their runner unless change is approved.

#### Scenario: Preserve support truth

- GIVEN TanStack Solid or an adopted test runner
- WHEN output is presented
- THEN Solid stays experimental and the runner unchanged without approval
