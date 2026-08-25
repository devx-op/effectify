# Migrate from the React Remix bridge to React Router

`@effectify/react-remix` is a deprecated, temporary React Router 7 bridge. New work should use `@effectify/react-router` and React Router 8.3.0; the bridge supports only the exact React Router 7.18.2 family while this repository completes the evidence-gated migration below.

Retirement gate: **CLOSED**
Final supported bridge rollback version: `0.5.12-alpha.1`

## Quick migration

1. Replace `@effectify/react-remix` with `@effectify/react-router` and replace the app-local RR7 Better Auth adapter with `@effectify/react-router-better-auth`.
2. Align `react-router`, `@react-router/dev`, `@react-router/node`, and `@react-router/serve` to exactly 8.3.0.
3. Generate framework types, run focused route/runtime tests, then run typecheck and build.
4. Record the migrated consumer and behavior evidence in this ledger; do not remove the bridge while the gate is CLOSED.

```bash
pnpm remove @effectify/react-remix
pnpm add @effectify/react-router @effectify/react-router-better-auth
pnpm add react-router@8.3.0 @react-router/dev@8.3.0 @react-router/node@8.3.0 @react-router/serve@8.3.0
pnpm nx run <app>:typegen
pnpm nx run <app>:typecheck
pnpm nx run <app>:build
```

## API and framework mapping

| Bridge or RR7 usage                                            | React Router 8 migration                                                                                                                                                                 |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Imports from `@effectify/react-remix`                          | Import the corresponding contexts, HTTP response models/helpers, and `Runtime` from `@effectify/react-router`.                                                                           |
| App-local `react-router7-better-auth.server.ts`                | Use `@effectify/react-router-better-auth`; do not publish or copy the local RR7 adapter.                                                                                                 |
| `LoaderArgsContext` / `ActionArgsContext`                      | Use the classes exported by `@effectify/react-router`. Context service identity is nominal: do not mix RR7 and RR8 classes or structural lookalikes.                                     |
| `Runtime.make(layer)`                                          | Recreate the runtime from the RR8 package. Preserve loader/action success shapes, modeled failure statuses, redirect headers, and native `Response` / `Error` identity in focused tests. |
| Bridge-only `json(data, init)`                                 | Use `Response.json(data, typeof init === "number" ? { status: init } : init)`. The RR8 package intentionally has no legacy `json` export.                                                |
| `react-router dev`, `react-router build`, `react-router-serve` | Keep the framework commands, but execute them against the exact RR8 8.3.0 dependency family and regenerate RR8 route types.                                                              |
| RR7 route arguments and generated `+types`                     | Regenerate with RR8 before typecheck; do not reuse `.react-router/types` output from the bridge app.                                                                                     |

The RR8 runtime deliberately preserves the bridge's Effect-facing response contract, but migration evidence must execute against RR8. A passing RR7 test is not RR8 evidence.

## Objective support boundary

The bridge is not a second maintained integration. During the temporary window it receives only fixes needed to preserve its documented contract on React Router 7.18.2; it does not gain features or claim React Router 8 support. The app-local RR7 Better Auth adapter remains workspace-only and absent from release projects.

Retirement becomes eligible only when all of these conditions are true:

- every repository consumer row is migrated or removed with concrete evidence;
- every behavior row has a parent-accepted disposition, named reviewer, and completed evidence;
- every `existing-rr8` or `transfer-to-rr8` row cites passing RR8 files/tests, and every removal has an accepted justification;
- `pnpm nx run @effectify/react-router-example:consolidation:verify -- --expect=open` reports `OPEN`;
- protected React Router remains exact 8.3.0.

A date, route presence, unrelated passing suite, or verbal decision cannot open the gate. Until it opens, retain the bridge package, RR7 app, local adapter, and rollback artifact `@effectify/react-remix@0.5.12-alpha.1`.

## Repository consumer inventory

`Complete` means retirement evidence is complete, not merely that the current surface is documented. `PENDING` reviewers are intentional and keep the gate closed.

| ID  | Surface                                                                      | Disposition               | Evidence / justification                                                                           | Reviewer | Complete |
| --- | ---------------------------------------------------------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------- | -------- | -------- |
| C01 | `.github/SETUP.md`                                                           | deprecate-reference       | Release setup now labels the bridge temporary; remove its release references only after OPEN.      | PENDING  | NO       |
| C02 | `CHANGELOG.md`                                                               | retained-until-retirement | Root release history records 0.5.12-alpha.1 as the final supported bridge rollback version.        | PENDING  | NO       |
| C03 | `README.md`                                                                  | deprecate-reference       | Root package/install/status surfaces direct new users to the RR8 migration target.                 | PENDING  | NO       |
| C04 | `apps/react-remix-example/app/lib/react-router7-better-auth.server.ts`       | pending-migration         | Current RR7 consumer; target is `@effectify/react-router-better-auth` after scenario review.       | PENDING  | NO       |
| C05 | `apps/react-remix-example/app/lib/runtime.server.ts`                         | pending-migration         | Current `Runtime` consumer; target is `@effectify/react-router` with RR8 runtime tests.            | PENDING  | NO       |
| C06 | `apps/react-remix-example/app/routes/_index.tsx`                             | pending-migration         | Current package-facing landing content; destination depends on accepted scenario dispositions.     | PENDING  | NO       |
| C07 | `apps/react-remix-example/app/routes/api.$.ts`                               | remove-at-retirement      | Commented placeholder has no executable consumer; removal still needs parent acceptance.           | PENDING  | NO       |
| C08 | `apps/react-remix-example/app/routes/demo.tsx`                               | pending-migration         | Loader/action helper demonstration awaits behavior-by-behavior uniqueness review.                  | PENDING  | NO       |
| C09 | `apps/react-remix-example/app/routes/test.tsx`                               | pending-migration         | Loader/action form scenarios await behavior-by-behavior uniqueness review.                         | PENDING  | NO       |
| C10 | `apps/react-remix-example/app/routes/todos.tsx`                              | pending-migration         | Candidate RR8 destination is `app/routes/todo-app.tsx`; each intent remains separately gated.      | PENDING  | NO       |
| C11 | `apps/react-remix-example/package.json`                                      | remove-at-retirement      | RR7 app importer and exact 7.18.2 pins remain until all behavior rows complete.                    | PENDING  | NO       |
| C12 | `apps/react-remix-example/project.json`                                      | remove-at-retirement      | Nx app targets remain Checkpoint A evidence until retirement is authorized.                        | PENDING  | NO       |
| C13 | `apps/react-remix-example/tests/unit/config/react-router7-framework.test.ts` | remove-at-retirement      | Transitional route/typegen/version evidence is not copied when RR8 coverage is accepted.           | PENDING  | NO       |
| C14 | `apps/react-remix-example/tests/unit/react-router7-better-auth.test.ts`      | pending-migration         | Candidate RR8 evidence is `packages/react/router-better-auth/tests/{handlers,auth-guard}.test.ts`. | PENDING  | NO       |
| C15 | `apps/react-remix-example/vitest.config.ts`                                  | remove-at-retirement      | Test alias is bridge-only and remains until the old app is eligible for deletion.                  | PENDING  | NO       |
| C16 | `nx.json`                                                                    | retained-until-retirement | Bridge stays in release projects; the app-local adapter has no release project.                    | PENDING  | NO       |
| C17 | `packages/react/remix/CHANGELOG.md`                                          | retained-until-retirement | Package history labels 0.5.12-alpha.1 deprecated and usable for rollback.                          | PENDING  | NO       |
| C18 | `packages/react/remix/README.md`                                             | deprecate-reference       | Public package documentation leads with deprecation and this migration guide.                      | PENDING  | NO       |
| C19 | `packages/react/remix/package.json`                                          | retained-until-retirement | Published package description identifies the temporary RR7 7.18.2 bridge.                          | PENDING  | NO       |
| C20 | `packages/react/remix/project.json`                                          | retained-until-retirement | Published bridge remains releasable until OPEN; local adapter is not a project.                    | PENDING  | NO       |
| C21 | `packages/react/remix/src/lib/context.ts`                                    | retained-until-retirement | Public context classes are deprecated and remain exact RR7 identities during support.              | PENDING  | NO       |
| C22 | `scripts/verify-react-router-manifests.mjs`                                  | remove-at-retirement      | Checkpoint verifier proves RR7 7.18.2 and protected RR8 8.3.0 isolation.                           | PENDING  | NO       |
| C23 | `vitest.config.ts`                                                           | remove-at-retirement      | Root test exclusion references the transitional app and is removed with that app.                  | PENDING  | NO       |
| C24 | `pnpm-lock.yaml`                                                             | remove-at-retirement      | Importer snapshots retain RR7 7.18.2 until the gated graph cleanup.                                | PENDING  | NO       |

## Behavior scenario inventory

Reviewer `kattsushi` accepted every disposition on 2026-08-25. Rows marked complete already have sufficient concrete evidence or an accepted removal justification. Incomplete `existing-rr8` rows require focused evidence tests, while only the six `/demo` rows authorize new product behavior.

| ID                    | Surface                                                    | Disposition               | Evidence / justification                                                                                                                                           | Reviewer  | Complete |
| --------------------- | ---------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- | -------- |
| shell                 | RR7 root shell                                             | existing-rr8              | `apps/react-router-example/app/{app,root}.tsx` and `tests/routes/{app-shell,root}.test.tsx`.                                                                       | kattsushi | YES      |
| navigation            | RR7 navigation links                                       | existing-rr8              | `apps/react-router-example/app/app-nav.tsx` and `tests/routes/app-nav.test.tsx`.                                                                                   | kattsushi | YES      |
| login                 | `/login` UI flow                                           | existing-rr8              | `apps/react-router-example/app/routes/login.tsx` and `apps/react-router-example/tests/routes/login.test.tsx`.                                                      | kattsushi | YES      |
| signup                | `/signup` UI flow                                          | existing-rr8              | `apps/react-router-example/app/routes/signup.tsx` and `apps/react-router-example/tests/routes/signup.test.tsx`.                                                    | kattsushi | YES      |
| auth-api              | `/api/auth/*` request, body, status, redirect, and cookies | existing-rr8              | `apps/react-router-example/app/routes/api.auth.ts` and `apps/react-router-example/tests/routes/api.auth.test.ts`.                                                  | kattsushi | YES      |
| auth-loader-guard     | Todo loader unauthorized redirect                          | existing-rr8              | `apps/react-router-example/tests/unit/auth-guard.test.ts` and `packages/react/router-better-auth/tests/auth-guard.test.ts`.                                        | kattsushi | YES      |
| auth-action-guard     | Todo action unauthorized redirect                          | existing-rr8              | `apps/react-router-example/tests/unit/auth-guard.test.ts` and `packages/react/router-better-auth/tests/auth-guard.test.ts`.                                        | kattsushi | YES      |
| todo-create           | Todo create intent                                         | existing-rr8              | `apps/react-router-example/app/routes/todo-app.tsx`; focused create mutation/redirect/render evidence is required.                                                 | kattsushi | NO       |
| todo-update           | Todo update intent                                         | existing-rr8              | `apps/react-router-example/app/routes/todo-app.tsx`; focused update mutation/validation evidence is required.                                                      | kattsushi | NO       |
| todo-delete           | Todo delete intent                                         | existing-rr8              | `apps/react-router-example/app/routes/todo-app.tsx`; focused delete mutation evidence is required.                                                                 | kattsushi | NO       |
| todo-toggle           | Todo completion toggle intent                              | existing-rr8              | `apps/react-router-example/app/routes/todo-app.tsx`; focused toggle mutation/render evidence is required.                                                          | kattsushi | NO       |
| todo-validation       | Todo title and identifier validation                       | existing-rr8              | `apps/react-router-example/app/routes/todo-app.tsx`; focused title and identifier validation evidence is required.                                                 | kattsushi | NO       |
| test-loader-success   | `/test` loader success payload                             | existing-rr8              | `apps/react-router-example/app/routes/hatchet-crons.tsx` and `tests/routes/hatchet-crons.test.tsx` prove loaded data and rendered output.                          | kattsushi | YES      |
| test-blank-validation | `/test` blank-field validation                             | existing-rr8              | `apps/react-router-example/tests/routes/hatchet-crons.test.tsx` proves each blank-field status/body and visible feedback.                                          | kattsushi | YES      |
| test-action-success   | `/test` action success payload                             | existing-rr8              | `apps/react-router-example/app/routes/demo.tsx` and `tests/routes/demo.test.tsx` prove the action success payload and rendered result through the RR8 runtime.     | kattsushi | YES      |
| demo-loader-success   | `/demo` loader success helper                              | transfer-to-rr8           | `apps/react-router-example/app/routes/demo.tsx` and `tests/routes/demo.test.tsx` prove the loader success payload and rendered message through the RR8 runtime.    | kattsushi | YES      |
| demo-loader-failure   | `/demo` loader failure helper                              | transfer-to-rr8           | `apps/react-router-example/tests/routes/demo.test.tsx` proves the modeled loader failure body and status 500 through the RR8 runtime.                              | kattsushi | YES      |
| demo-loader-redirect  | `/demo` loader redirect helper                             | transfer-to-rr8           | `apps/react-router-example/tests/routes/demo.test.tsx` proves the loader redirect preserves status 307 and `Location: /demo?outcome=success`.                      | kattsushi | YES      |
| demo-action-success   | `/demo` action success helper                              | transfer-to-rr8           | `apps/react-router-example/app/routes/demo.tsx` and `tests/routes/demo.test.tsx` prove the action success payload and rendered message through the RR8 runtime.    | kattsushi | YES      |
| demo-action-failure   | `/demo` action failure helper                              | transfer-to-rr8           | `apps/react-router-example/tests/routes/demo.test.tsx` proves the modeled action failure body and status 400 through the RR8 runtime.                              | kattsushi | YES      |
| demo-action-redirect  | `/demo` action redirect helper                             | transfer-to-rr8           | `apps/react-router-example/tests/routes/demo.test.tsx` proves the action redirect preserves status 303 and `Location: /demo?outcome=success`.                      | kattsushi | YES      |
| api-placeholder       | `/api/*` commented HttpApiHandler placeholder              | remove-with-justification | Accepted removal: the RR7 file contains only comments and `export {}`; no executable or observable behavior exists.                                                | kattsushi | YES      |
| pico-styling          | Pico styling                                               | existing-rr8              | `apps/react-router-example/app/root.tsx` and `tests/routes/root.test.tsx` preserve the exact stylesheet and SRI descriptor.                                        | kattsushi | YES      |
| mock-store            | In-memory mock store                                       | remove-with-justification | Accepted removal: example-local module state would duplicate and weaken the protected Prisma-backed Todo example and its `tests/unit/lib/prisma.test.ts` evidence. | kattsushi | YES      |
| rr7-typegen           | RR7 generated route types                                  | existing-rr8              | `apps/react-router-example/project.json`, TypeScript configs, and `tests/unit/config/nx-cypress-target-contract.test.ts` prove typegen/build ordering.             | kattsushi | YES      |
| rr7-route-map         | Explicit index, nested, and splat route map                | existing-rr8              | `apps/react-router-example/app/routes.tsx`; focused matcher/splat evidence is required before completion.                                                          | kattsushi | NO       |
| rr7-hydration         | Browser hydration                                          | existing-rr8              | `apps/react-router-example/app/entry.client.tsx` and `tests/routes/root.test.tsx` exercise hydration and head stability.                                           | kattsushi | YES      |
| rr7-ssr               | Server rendering, readiness, status, and headers           | existing-rr8              | `apps/react-router-example/app/entry.server.tsx`; focused readiness/status/header/error evidence is required before completion.                                    | kattsushi | NO       |
| rr7-build             | Production framework build                                 | existing-rr8              | `project.json`, `tests/unit/config/nx-cypress-target-contract.test.ts`, and `react-router-build-asset-contract.test.ts` prove build ordering/assets.               | kattsushi | YES      |

## Human gate before scenario transfer

Reviewer `kattsushi` approved the 10 complete `existing-rr8` rows, the two accepted removals, the 11 evidence-hardening rows, and only the six `/demo` rows for product transfer. Work unit 8 may implement that bounded `/demo` slice and focused evidence tests; no other product scenario is authorized.
