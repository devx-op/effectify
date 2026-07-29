# Design: Effectify App Builder Platform

## Boundary and project map

```text
Astro/Starlight (`apps/docs`) + Solid island → contracts/planner → signed intent
CLI/tools → executor → plugin worker/broker → Nx Tree → owned workspace
```

| Project | Runtime / dependency rule |
|---|---|
| `packages/app-builder/{contracts,planner,preview-protocol,solid-builder}` | Browser-safe `/builder` island |
| `packages/app-builder/{execution,nx-plugin,cli,plugin-worker,registry,blueprints}` | Node-only |
| `packages/app-builder/plugin-sdk`, `packages/plugin-*` | SDK; no CLI dependency |
| `apps/{registry-worker,golden-react-router-order}`, `apps/docs` | Registry/golden/web host |

`@effectify/plugin-tanstack-solid` stays unrelated/experimental. Identity: `<workspace>-<context>-<layer>` plus `scope:*`, `layer:contracts|domain|application|infrastructure|presentation`, `runtime:neutral|browser|node`, `visibility:public|private`. Nx allows cross-context public contracts, inward adapters, no browser→Node imports.

## Typed execution and state

Schemas/brands define tools, plans, runs, provenance, migrations, plugins, previews, blueprints; tagged unions/errors decode boundaries. `Context.Service`/`Layer.effect`/`Effect.fn` preserve `Effect<Success, Failure, Requirements>`.

```ts
type PluginHandler<I, O, E, R> = (input: I) => Effect.Effect<O, E, R>
type IpcResult<O, E> = Succeeded<O> | Failed<E> | MissingRequirements
```

Manifests map `R`; workers supply granted Layers. IPC preserves `E` and rejects missing requirements pre-call. Versioned stdout is JSON-only; stderr/human output projects it.

Runs: `created→planned→input-required|awaiting-approval→approved→locked→applying→validating→succeeded|rolled-back|recovery-required`. Plans bind pins, operations, permissions, provenance, validations, hashes; mismatch invalidates approvals/tokens.

Deterministic Nx `Tree`; last-resort LLM patches have declared files/no authority. Lock+checkpoint+journal commits or rolls back. External effects expose idempotency/compensation; redacted traces link transitions.

## Adoption and lifecycle

`effectify init` inspects package manager, Nx graph/targets, runner, formatter/linter, integrations; exact-diff approval gates changes. Artifacts classify `adopted|unmanaged|diverged|managed`; conflicts pause. Precedence: flags→environment→`effectify.json`→user config→defaults.

Committed `.effectify/artifacts.json` stores ownership/fingerprints/digests/divergence; `.effectify/migrations.json` stores applied/skipped/blocked/superseded migration DAGs. Ignore `.effectify/{runs,traces,cache,checkpoints}/`. Skips block dependants. New workspaces default to Effect-aware Vitest; adopted runners remain absent approved change.

## Plugins, registry, builder, and blueprints

Plugins: modern TypeScript→compiled ESM, declarations, source maps, explicit exports, `@effectify/plugin-sdk` peer. Workers reject raw TypeScript, Bun, non-Node-LTS. IPC uses a deny-default broker with limits, expansion approval, per-use secret consent.

Daily `effectify-plugin` discovery creates `discovered→pending-validation`; validation targets one hour after detection. States add `pending-review|published|rejected|quarantined|deprecated|revoked`. Identity, immutable digest, provenance, format/installability/compatibility/capabilities/permissions gate signed snapshots. Install/update pins immutable digest, discloses permission/topology/file impact, requires approval; auto-publication/update additionally requires continuous identity, validation/policy success, no permission expansion.

Starlight’s Solid island excludes hosted execution, browser editing, managed hosting, plugin ESM. Outcomes: `supported|experimental|incompatible|unavailable|pending-evidence/validation`; registry maturity cannot promote experimental. URLs carry non-secret intent, no paths/content/approval/reproducibility. Previews label `available|dynamic|unavailable`. Non-expiring blueprints stay permanently inspectable, bind signature/snapshot/pins/permissions/topology/hashes; local-materialization authoritative diff needs normal approval; changed signatures/pins reject execution, revocation blocks by default.

## Golden architecture

React Router SSR golden: `identity-access`+`orders`. Better Auth’s profile generates email/password, verification, recovery, sessions, organizations, memberships, roles, basic user administration, schema/routes/UI/session wiring without wrappers. `CurrentPrincipal`, `RequireMembership`, `AuthorizeRole`, `CreateOrder`, `ListOrders`, `ChangeOrderStatus`, `AdministerMembership` enforce organization ID. Hatchet optional; magic links/advanced auth later v0.x; unsupported Better Auth UI is never supported.

Contexts generate `{contracts,domain,application,infrastructure/<adapter>,presentation/<adapter>}`; `shared/kernel` is domain, `platform/*` technical. Root `PgClient.layer`; contexts own codecs/mappers/repositories/migrations; global tooling coordinates schemas only. Versioned seam admits v1.2 `@effectify/drizzle`; v1 none.

Versioned topology yields one isomorphic app with framework-owned entrypoints, no artificial API. Native deploys backend/infrastructure only; RSC explicit experimental opt-in. Alchemy adapter emits `alchemy.run.ts`; core pins adapter compatibility, not provider APIs. Absent Alchemy emits nothing.

## Verification, operations, and delivery

Test IPC/Effect channels, replay/callback/rollback, hostile broker, runner preservation, Nx/SQL, registry/revocation, preview privacy/drift, golden journeys. Golden CI regenerates typecheck, Vitest, E2E, build, migrations, Starlight ≤10min; cache hashes, bound reads, serialize writes.

Anonymous analytics are enabled by default with project opt-out and coarse metadata. Diagnostics require separate explicit preview/redaction/consent, deletion, ≤30-day retention. Rollback reverts slices/checkpoints; external recovery reports compensation.

Vertical seams: schema; CLI verb; state transition; generator+fixture; adoption ledger; worker/each permission; registry transition/signature; island→preview→URL→blueprint; golden shell→auth→organizations/roles→each order capability→SQL→deployment. Include RED tests; chain over 400 lines; forbid capability PRs.

## Decisions

| Choice | Rationale / rejected alternative |
|---|---|
| Starlight/Solid | No standalone builder |
| Tree/workers | No direct/in-process writes |
| Typed IPC | No flattened errors |
| Alchemy adapter | No frozen provider API |
| Effect SQL v1 | No Prisma/Drizzle v1 |

## Threat matrix

| Boundary | Applicability; safe/failure behavior; planned RED tests |
|---|---|
| Documentation-like paths | Applicable: data unless execution permission; otherwise deny. RED: `requirements.txt`, `CMakeLists.txt`, executable MD/MDX, `README.sh`. |
| Git repository selection | Applicable: canonical root only; reject traversal/alternate repo. RED: `git -C`, relative, absolute selectors. |
| Commit state | N/A: no commit automation. |
| Push state | N/A: no push automation. |
| PR commands | N/A: no PR automation. |

## Requirement traceability

| Capability | Requirement groups → design |
|---|---|
| Planning/execution | Protocol→schemas; replay→hash-bound plan; approval/lock/recovery→state/journal; callbacks/privacy→run store+default-on analytics+separate diagnostics |
| Workspace lifecycle | Ownership→Tree; adoption→classification; DDD→tagged projects; ledgers→manifest/migration DAG; testing→new Effect Vitest/adopted runner; updates→hash gates |
| Plugin/marketplace | Parity→SDK/manifest; isolation→broker; authority→daily validation/signing; lifecycle→pins+impact approval+identity/validation/no-expansion automation; revocation→live feed |
| Builder/blueprints | Planner→execution/editing/hosting exclusions+outcomes; preview→labels/local authority; URLs→private intent; blueprints→non-expiry+inspection+diff approval+pin/signature/revocation gates |
| Golden platform | Preset/auth→profile+Hatchet/magic/UI constraints; DDD→Nx; persistence→SQL/seam; topology→one-app/native/RSC/Alchemy; certification/docs→CI/Starlight; maturity/tests→experimental Solid+runner defaults |

## Gate

Signing-key custody/rotation/revocation requires named infrastructure ownership.
