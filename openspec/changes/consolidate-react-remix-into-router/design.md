# Design: Consolidate React Remix into React Router

## Technical Approach

Use two independently verifiable checkpoints inside this change.

1. **Checkpoint A — isolated RR7 bridge.** First port the protected RR8 runtime contract tests to `@effectify/react-remix` while it still uses Remix, so tests describe observed compatibility rather than a post-migration implementation. Then replace its framework imports with the exact React Router 7 family `7.18.2`, keep its public Effect-facing contract and a local deprecated `json` helper, add an application-owned RR7 Better Auth adapter, and convert `apps/react-remix-example` to an official RR7 Framework Mode application. The protected RR8 catalog, package, adapter, and example remain unchanged.
2. **Checkpoint B — gated RR8 retirement.** Publish migration/deprecation guidance, inventory all repository consumers and example scenarios, migrate only scenarios absent from the protected RR8 example, and open the retirement gate only when every documented consumer and scenario has evidence. Then delete all RR7/Remix transition surfaces and rerun RR8-only verification.

Checkpoint B is a later gated slice **within this OpenSpec change**, not a separate change. The proposal and specification define the final RR8-only state, so splitting it into a new change would allow this change to close in an impermanent dual-major state. It may use several small PRs, but retirement PRs cannot auto-chain until the documented support boundary and evidence gate are satisfied.

The implementation route is limited to the React integrations and examples; `packages/coding-agent` is not involved because this change explicitly scopes another subsystem.

## Architecture Decisions

| Decision                                                                                       | Alternatives                                                                | Rationale                                                                                                          |
| ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Retain `@effectify/react-remix` as the published, deprecated bridge                            | Add a new RR7 package plus re-export shim                                   | Preserves import compatibility without creating another temporary published name.                                  |
| Pin every RR7 importer directly to `7.18.2`                                                    | Add RR7 to the shared catalog; use ranges or aliases                        | Exact direct pins are observable and cannot alter or be mistaken for protected catalog `8.3.0`.                    |
| Keep the RR7 adapter at `apps/react-remix-example/app/lib/react-router7-better-auth.server.ts` | Publish a package; modify the RR8 adapter; create another workspace package | Application ownership makes it workspace-only by construction and prevents release discovery.                      |
| Adapter imports contexts only from `@effectify/react-remix`                                    | Copy context classes; import RR8 contexts                                   | Effect service identity is nominal at runtime; runtime and adapter must reference the same exported class objects. |
| Port RR8 contract tests before changing bridge imports                                         | Test only after migration                                                   | A red/green port freezes behavior independently from framework rewiring and exposes existing bridge defects first. |
| Implement bridge `json` locally with native `Response.json`                                    | Keep `@remix-run/node`; add `json` to RR8                                   | Preserves the bridge-only import without retaining Remix or contaminating RR8.                                     |
| Treat retirement as Checkpoint B of this change                                                | Close after RR7; open a future change                                       | The accepted final-state requirements prohibit indefinite dual-major support.                                      |
| Keep WU5 declarative and green under Remix execution                                           | Activate RR7 scripts/plugin before source migration                         | RR7 declarations and generated types can stage independently; the compiler/runtime switch must stay atomic.        |
| Use a reviewed scenario ledger                                                                 | Copy the whole RR7 example                                                  | Only unique scenarios transfer; protected RR8 behavior and demonstrations are never replaced.                      |

## Dependency and Ownership Boundaries

### Protected RR8 boundary

The following are read-only during Checkpoint A except for tests that assert they remain unchanged:

- `pnpm-workspace.yaml` catalog entries for `react-router`, `@react-router/dev`, `@react-router/node`, and `@react-router/serve`, all exactly `8.3.0`.
- Root direct RR8 framework dependencies in `package.json`.
- `packages/react/router/**` and its `react-router ^8.3.0` peer contract.
- `packages/react/router-better-auth/**` and its exact imports from `@effectify/react-router`.
- `apps/react-router-example/**`, including routes, middleware/readiness behavior, typegen, SSR entries, and build baseline.

Checkpoint B may add reviewed unique scenarios to `apps/react-router-example`, but cannot remove or simplify an existing RR8 scenario. It does not change the RR8 catalog/package/adapter family or behavior.

### RR7 importer pins

Direct manifest entries, never `catalog:`, provide the RR7 graph:

| Importer                                | Exact direct pins                                                                                                          |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `packages/react/remix/package.json`     | `react-router: "7.18.2"` as peer and dev dependency because public loader/action types and runtime redirects come from it. |
| `apps/react-remix-example/package.json` | `react-router`, `@react-router/dev`, `@react-router/node`, and `@react-router/serve`, each `"7.18.2"`.                     |

The application consumes `@effectify/react-remix: workspace:*`; it must not depend on `@effectify/react-router` or `@effectify/react-router-better-auth`. The local adapter uses `@effectify/node-better-auth` and the bridge but has no package manifest or publication metadata of its own. Existing React versions are changed only if RR7's verified peer contract requires it; no React change may flow into the protected RR8 importer.

The generated lockfile must show distinct importer snapshots and package resolutions for RR7 `7.18.2` and RR8 `8.3.0`. Verification rejects a bridge resolved to 8.x, an RR8 importer resolved to 7.x, a changed catalog value, a range in an RR7 framework entry, or an RR7 package added to root dependencies. `pnpm why`/lockfile evidence is recorded separately for each importer.

### Context identity contract

`packages/react/remix/src/lib/context.ts` remains the sole RR7 context owner and changes only its argument type imports to `react-router`:

```text
@effectify/react-remix Runtime
  provides LoaderArgsContext / ActionArgsContext (bridge class objects)
                         |
                         +--> RR7 route Effects
                         +--> app/lib/react-router7-better-auth.server.ts
```

The application adapter directly imports `ActionArgsContext`, `LoaderArgsContext`, and bridge response types/helpers from `@effectify/react-remix`; it must not define, wrap, barrel-copy, or dynamically select a context. A positive runtime test executes each adapter effect under the bridge runtime and proves the exact request reaches Better Auth. A negative test provides the RR8 context or a structurally identical local context and expects missing-service failure. Source-contract checks reject an import from `@effectify/react-router` in the RR7 application and reject any RR7 adapter reference in Nx release projects.

## Bridge Contracts and Runtime Flow

### Contract-test port precedes migration

Create `packages/react/remix/tests/runtime.test.ts` and the package Vitest/typecheck targets before replacing any framework import. Adapt only argument construction needed by the then-current Remix types. The initial tests mirror RR8 contracts:

- loader/action context injection and serializable success shapes;
- modeled loader failure as thrown JSON `Response` with status 500;
- modeled action failure as returned JSON `Response` with status 400;
- redirects returned by framework `redirect`, preserving status, `Location`, and headers;
- exact identity for successful raw `Response` handling and failed `Response`/`Error` propagation;
- defect/interruption generic responses and logging.

Where the old bridge fails a protected contract, the test is committed as RED before the smallest runtime port. The bridge runtime then adopts the RR8 cause traversal and response semantics while importing RR7 types/functions. This is a behavior port, not source sharing: importing runtime code from the RR8 package would couple major resolution and context identity.

### Request/control flow

```text
RR7 Framework loader/action args
        -> Runtime.make wrapper
        -> Layer.succeed(exact bridge context, args)
        -> consumer Effect (optionally local auth adapter/guard)
        -> ManagedRuntime exit
        -> payload, Response, redirect, or mapped failure
```

- `HttpResponseSuccess` returns `{ ok: true, data }` for loaders and `{ ok: true, response: data }` for actions.
- `HttpResponseFailure` throws a status-500 JSON response from loaders and returns a status-400 JSON response from actions.
- `HttpResponseRedirect` returns the `Response` produced by RR7 `redirect`; status, `Location`, and all supplied headers survive.
- An existing failed `Response` or `Error` is thrown unchanged for both wrappers. A successful raw `Response` follows the existing router contract unchanged (including auth headers).
- Defects and interruption are logged and mapped to generic loader 500/action 400 JSON responses without leaking defect details.
- Adapter handlers pass Better Auth's `Response` through unchanged, including body, status, `Location`, and multiple `Set-Cookie` values. Tests use `Headers.getSetCookie()` where available rather than collapsing cookies into a map.
- Guards use RR7's `redirect` and bridge contexts. Unauthorized requests redirect according to the caller's status/headers; transport or parse failures remain typed `Unauthorized` until guard policy handles them.

### Legacy `json` helper

`packages/react/remix/src/lib/json.ts` owns the temporary helper and `src/index.ts` re-exports it with `@deprecated` documentation. Its contract is:

```ts
json<T>(data: T, init?: number | ResponseInit): Response
```

A numeric init becomes `{ status: init }`; an object init passes status, status text, and headers to `Response.json`. The helper always emits JSON content type, preserves caller headers, and uses native serialization/error behavior. Focused tests cover no init, numeric status, object status/custom headers, and type usability. No Remix dependency remains merely to supply `json`, and the helper is never copied into `@effectify/react-router`. Checkpoint B deletes it with the bridge.

## Official RR7 Application Migration

`apps/react-remix-example` remains the bridge demonstration during Checkpoint A and reaches RR7 Framework Mode through two green boundaries.

**WU5 — declarative staging under Remix execution (forecast 550–720 changed lines).** Add exact direct RR7 `7.18.2` dependencies, `react-router.config.ts` with SSR enabled, `app/routes.ts`, `.react-router/types/**/*`, `rootDirs: [".", "./.react-router/types"]`, and a dedicated RR7 `typegen` target ordered before typecheck/build. Keep the WU4 Remix `build`/`dev`/`start` scripts, Remix Vite plugin, active entries/source, and exact legacy Remix dependencies executable. RR7 packages and declarations are dormant preparation, not evidence that RR7 runtime activation is complete.

**WU6 — atomic RR7 activation (forecast 580–900 changed lines).** In one green transaction, switch scripts to `react-router dev`/`react-router build`/`react-router-serve`, switch Vite to `reactRouter()`, remove all legacy Remix dependencies, replace UI/route APIs with `react-router`, stream conversion with `@react-router/node`, hydration with `HydratedRouter` from `react-router/dom`, and SSR with `ServerRouter` plus RR7 `EntryContext`/`AppLoadContext`. The same transaction migrates entries and remaining source, preserves the application-owned RR7 Better Auth adapter, and proves no active Remix residue. A state with RR7 execution and Remix-shaped source is never a publishable PR boundary.

The explicit Checkpoint A route map staged in WU5 preserves existing URLs and splats:

| URL                 | Route module/role                                                                                           |
| ------------------- | ----------------------------------------------------------------------------------------------------------- |
| `/`                 | `routes/_index.tsx`, index/home                                                                             |
| `/demo`             | response helper demonstrations                                                                              |
| `/test`             | loader/action form and validation                                                                           |
| `/todos`            | authenticated in-memory CRUD                                                                                |
| `/login`, `/signup` | Better Auth UI flows                                                                                        |
| `/api/auth/*`       | local RR7 Better Auth loader/action adapter                                                                 |
| `/api/*`            | existing API placeholder route, retained as an explicit mapping even though its implementation is commented |

Route tests assert matching and splat params, especially `/api/auth/session`; source scans assert no active `@remix-run/*`, `RemixBrowser`, `RemixServer`, `remix vite:*`, or `remix-serve` references. SSR tests assert status, headers, HTML content, bot/browser readiness selection, and stream-error status handling.

## Consumer and Unique-Scenario Inventory

Create one reviewable ledger at `docs/migrations/react-remix-to-react-router.md`. It combines deprecation guidance, repository consumer status, and a scenario table so support cannot end from an undocumented spreadsheet or verbal decision. Each row records source, URL/integration/behavior/test, disposition (`existing RR8`, `transfer to RR8`, or `remove with justification`), RR8 destination/evidence, reviewer, and completion state.

The initial repository inventory is:

| RR7 source/scenario                                       | Initial classification to validate                                     | Required disposition evidence                                                                                                   |
| --------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Root shell, nav, login, signup                            | Existing RR8 equivalents                                               | Route/component tests and mapped RR8 files.                                                                                     |
| `/api/auth/*`, response headers/cookies                   | Existing RR8 equivalent                                                | RR8 auth route plus adapter handler tests.                                                                                      |
| Auth-guard redirect for todo loader/action                | Existing RR8 equivalent                                                | RR8 todo route and auth-guard tests.                                                                                            |
| Todo create/update/delete/toggle and validation           | Existing RR8 equivalent at `/todo-app`                                 | Map each intent separately; do not infer CRUD from route presence.                                                              |
| `/test` loader success, blank validation, action success  | Candidate duplicate of runtime and todo validation                     | Review behavior-by-behavior; transfer only a user-visible scenario lacking RR8 evidence.                                        |
| `/demo` helper success/failure/redirect for loader/action | Package tests cover protocol; user-visible demonstration may be unique | Reviewer decides whether an RR8 demo route adds unique value; otherwise cite package and route evidence with removal rationale. |
| `/api/*` commented HttpApiHandler placeholder             | Removal candidate                                                      | Record that no executable scenario exists; repository scan confirms no consumer.                                                |
| Pico styling/in-memory mock store                         | Example-local implementation detail                                    | Remove if no unique integration behavior is identified.                                                                         |
| RR7 typegen, explicit routes, hydration, SSR, build       | Transitional verification only                                         | Checkpoint A evidence; not copied because RR8 already has stronger readiness coverage.                                          |

The ledger also lists every repository import of `@effectify/react-remix`, every root/docs/release mention, and the last published bridge version. An unmapped or incomplete row closes the retirement gate. “Existing RR8” requires a concrete file/test reference; “remove” requires a reviewed justification; “transfer” requires passing RR8 evidence. Only rows marked `transfer` may add RR8 product/example code.

## Documentation, Deprecation, and Support Boundary

At Checkpoint A:

- Update `packages/react/remix/README.md`, package description, and public JSDoc to say “deprecated temporary React Router 7 bridge,” exact supported family `7.18.2`, bridge-only `json`, migration target, and no RR8 support claim.
- Add root README deprecation status and direct new users to `@effectify/react-router`; retain the package listing only while the bridge is supported.
- The migration document maps imports (`@effectify/react-remix` to `@effectify/react-router`, local adapter to `@effectify/react-router-better-auth`), framework dependencies/commands, contexts, runtime output/failure behavior, and `json` replacement with `Response.json`.
- Define support as ending only after all documented repository consumers are migrated and all scenario rows have reviewed completed dispositions. Do not use a date alone or claim permanent RR7/RR8 co-maintenance.
- Release a final deprecated bridge version and record it as the rollback artifact. The local adapter is never listed in release metadata and never published.

At Checkpoint B remove the bridge package listing/install command/status row, migration-era release entry, old example references, and obsolete setup instructions. Keep a concise historical migration note only if repository documentation policy requires it; it must not imply active RR7 support.

## File Changes

| Area/file                                                                  | Checkpoint A action                                                                                              | Checkpoint B action                                                         |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `packages/react/remix/src/lib/{context,runtime}.ts`, `src/index.ts`        | Port RR8 behavior to RR7 imports and deprecate exports                                                           | Delete package.                                                             |
| `packages/react/remix/src/lib/json.ts`                                     | Add bridge-only compatibility helper                                                                             | Delete with bridge.                                                         |
| `packages/react/remix/tests/**`, `vitest.config.ts`, TypeScript/Nx config  | Add contract, identity, json, typecheck, test targets                                                            | Delete with bridge after evidence is archived.                              |
| `packages/react/remix/package.json`, README/changelog                      | Exact `react-router: 7.18.2` peer/dev pins and deprecation docs                                                  | Remove release/package surfaces.                                            |
| `apps/react-remix-example/package.json`, project/Nx/TS/Vite configs        | WU5 stages RR7 pins/config/typegen under Remix; WU6 activates RR7 commands/plugin and removes Remix dependencies | Delete app/importer.                                                        |
| `apps/react-remix-example/react-router.config.ts`, `app/routes.ts`         | WU5 adds dormant SSR/config and explicit route map                                                               | Delete app.                                                                 |
| `apps/react-remix-example/app/**`                                          | WU6 atomically replaces Remix imports/entries while retaining the local adapter                                  | Delete after scenario gate.                                                 |
| `apps/react-remix-example/app/lib/react-router7-better-auth.server.ts`     | Add workspace-only handlers and guards using bridge contexts                                                     | Delete.                                                                     |
| `apps/react-remix-example/tests/**`                                        | Add adapter identity/headers, route map, SSR, residue tests                                                      | Delete after evidence is captured.                                          |
| `docs/migrations/react-remix-to-react-router.md`                           | Add migration, support gate, consumer/scenario ledger                                                            | Mark complete; retain historical migration note only per docs policy.       |
| `apps/react-router-example/**`                                             | No behavior change                                                                                               | Add only ledger rows classified unique; preserve all existing routes/tests. |
| `pnpm-workspace.yaml`, root `package.json`                                 | Protected RR8 values unchanged; remove Remix catalog entries only when unused                                    | Remove RR7/Remix-only entries; retain all RR8 `8.3.0` entries.              |
| `pnpm-lock.yaml`                                                           | Regenerate with isolated 7.18.2 and 8.3.0 graphs                                                                 | Regenerate to remove all RR7/Remix importers/resolutions.                   |
| `nx.json`, root README/CHANGELOG, `.github/SETUP.md`, global Vitest config | Deprecation/checkpoint wiring; bridge remains releasable, local adapter absent                                   | Remove bridge/example release, exclusion, docs, and setup references.       |

Generated build output and `.react-router/types` are not committed unless existing repository policy says otherwise.

## Verification Matrix

| Gate                  | Checkpoint A evidence                                                                                                                                          | Checkpoint B evidence                                                                                                                                            |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Version isolation     | Manifest assertions and lockfile/importer resolution show RR7 `7.18.2` only for bridge/example and RR8 `8.3.0` for protected importers; catalog diff is empty. | Repository/lockfile scan contains no 7.x or Remix-only framework resolution; RR8 remains 8.3.0.                                                                  |
| Bridge package        | Nx test, typecheck/no-build, lint, build; runtime/json/context contracts.                                                                                      | Package absent from Nx graph, workspace, docs, and release projects.                                                                                             |
| RR7 adapter           | Positive exact-context tests, negative RR8/lookalike test, auth body/status/Location/multiple-cookie tests, publication scan.                                  | Source and references absent.                                                                                                                                    |
| RR7 app               | WU5 declarations/routes, clean typegen→typecheck, Remix build/tests; WU6 atomic RR7 activation, no-Remix scan, RR7 SSR/runtime/build.                          | App and importer absent after ledger completion.                                                                                                                 |
| Protected RR8 package | Existing `test`, `typecheck:no-build`, lint, build against 8.3.0, run separately from RR7.                                                                     | Same checks after all RR7 deletion.                                                                                                                              |
| Protected RR8 adapter | Existing tests, no-build typecheck, lint, build; source dependency remains RR8-only.                                                                           | Same checks; no transitional import.                                                                                                                             |
| Protected RR8 app     | Existing migration manifest/verify/test, full tests, typegen, typecheck, lint where defined, SSR/readiness, production build.                                  | Same plus focused tests for each transferred unique scenario.                                                                                                    |
| Inventory/support     | All consumers/scenarios listed; deprecation and objective gate published; retirement still closed.                                                             | Every row reviewed/completed, consumers migrated, final bridge version recorded.                                                                                 |
| Cleanup/release       | Bridge listed as deprecated release candidate; local adapter absent.                                                                                           | Scans cover `@effectify/react-remix`, `react-remix-example`, `@remix-run`, RR7 pins, bridge `json`, release projects, setup/docs, workspace graph, and lockfile. |
| Repository quality    | `pnpm nx affected` targets as applicable and changed-file formatting check.                                                                                    | RR8-only affected tests/typecheck/lint/build and formatting check.                                                                                               |

All commands run through Nx where a target exists. Evidence names the dependency major under test and does not report RR7 app success as RR8 success. A failed protected RR8 check blocks either checkpoint even when RR7 checks pass.

## Auto-Chain Work-Unit Sequence

Each implementation PR is independently reviewable, targets fewer than 1,000 changed lines, and stops rather than bundling unrelated cleanup. Exact line counts are checked before opening each PR.

1. **Bridge contract port RED:** package test/Vitest/typecheck wiring and behavior tests only; no framework migration.
2. **Bridge contract implementation:** smallest runtime/cause/response changes to pass the ported tests while still on the pre-migration dependency, plus local `json` contract tests if separable under the limit.
3. **RR7 dependency isolation:** exact bridge pin/import changes, local `json` implementation/export, lockfile assertions; protected RR8 regression run.
4. **Workspace-only adapter:** add the app-local handlers/guards and exact/negative context and header tests; remove all app use of protected RR8 adapter.
5. **RR7 declarative staging under Remix execution:** exact direct pins, React Router config/routes, generated inputs/rootDirs, and typegen/Nx wiring; retain WU4 Remix scripts/plugin and legacy dependencies so CI stays green (forecast 550–720).
6. **Atomic RR7 activation and source migration:** switch scripts/plugin, remove legacy Remix dependencies, and migrate entries/route/UI imports, `HydratedRouter`, `ServerRouter`, node stream types, and SSR/residue tests together (forecast 580–900). Do not publish a mixed execution/source boundary.
7. **Deprecation and inventory:** package/root docs, migration/consumer/scenario ledger, final bridge release metadata; verify retirement gate remains closed.
8. **Unique-scenario transfers:** one or more RR8-only PRs, grouped by coherent unique scenario and below 1,000 lines; no duplicate rows transfer.
9. **Retirement-gate evidence:** documentation-only/evidence slice marking every consumer and scenario disposition complete and naming the rollback version. It authorizes but does not perform deletion.
10. **Final RR8 consolidation cleanup:** delete bridge, local adapter, old app, `json`, and release/docs/workspace references; split deletion from lockfile/release cleanup if required by the line cap, but do not release an intermediate state with dangling references.
11. **RR8-only release verification:** regenerated graph/lockfile absence checks and the full protected RR8 matrix; no product code.

Auto-chain may proceed through Checkpoint A and documentation. It pauses before work unit 8 for reviewed uniqueness decisions and before work unit 10 until work unit 9 proves the support gate. Thus “delivery auto-chain” does not bypass human-fixed retirement conditions.

## Rollout and Rollback

### Rollout

- Baseline and record the protected RR8 catalog and verification results.
- Land Checkpoint A work units in dependency order and release the deprecated bridge only after isolated RR7 and independent RR8 evidence pass.
- Keep the bridge available while consumers follow the migration guide and the scenario ledger is completed.
- Transfer only accepted unique scenarios, rerunning protected RR8 verification after each slice.
- Open the gate with a distinct evidence change, then remove transitional surfaces and release the RR8-only repository state.

### Rollback

- Before Checkpoint A release, revert the failing work unit; never alter RR8 to make RR7 pass.
- During the support window, roll back app/config/adapter slices to the last coherent RR7 checkpoint. Manifest and lockfile rollback must restore all four exact `7.18.2` importer pins together.
- If a transferred RR8 scenario regresses, revert only that scenario slice while retaining the bridge and ledger row as incomplete.
- After retirement, restore the recorded final bridge release or missing scenario temporarily only when necessary. Restore bridge package, app-local adapter, importer pins, workspace/release metadata, and matching lockfile as one coherent rollback; never downgrade, widen, or repurpose RR8.
- A post-retirement bridge restoration reopens the support gate and requires fresh isolation and dual-checkpoint evidence before another deletion.

## Failure Modes and Safeguards

| Failure                                                         | Safeguard / fail-closed behavior                                                                      |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| RR7 resolves through catalog to RR8                             | Exact direct pins plus importer/lockfile assertion fail Checkpoint A.                                 |
| Adapter imports structurally similar/RR8 context                | Positive identity and negative lookalike tests fail; source scan blocks merge.                        |
| Redirect is thrown/returned inconsistently or headers disappear | Runtime and adapter contract tests assert identity, status, `Location`, and all cookies.              |
| `json` keeps Remix installed                                    | Dependency/residue scan fails; helper must be bridge-local.                                           |
| Typecheck passes only with stale generated types                | Clean generated directory, run Nx typegen, then typecheck/build.                                      |
| RR7 execution activates against Remix-shaped source             | WU5 retains Remix scripts/plugin; WU6 switches runtime, dependencies, entries, and source atomically. |
| Filename routing changes a URL or splat                         | Explicit route map and matcher tests block Checkpoint A.                                              |
| Duplicate scenario is copied to RR8                             | Ledger requires proof of absence and reviewed `transfer` disposition.                                 |
| Example/package is deleted early                                | Any incomplete consumer/scenario row keeps retirement gate closed.                                    |
| Release includes local adapter                                  | Adapter has no package manifest; release-project and package enumeration tests reject it.             |
| Cleanup mutates protected RR8                                   | Recorded catalog diff and complete RR8 regression matrix block release.                               |

## Open Questions

None. Human decisions, RR7 family `7.18.2`, protected RR8 `8.3.0`, workspace-only adapter ownership, bridge-only `json`, uniqueness policy, and support boundary are fixed.
