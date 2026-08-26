# Migrate from the React Remix bridge to React Router

This retained historical ledger records the completed migration from the temporary `@effectify/react-remix` React Router 7 bridge to the maintained `@effectify/react-router` integration on React Router 8.3.0.

Retirement gate: **OPEN**
Retirement completed: **YES**
Final supported bridge rollback version: `0.5.12-alpha.1`

Reviewer `kattsushi` authorized retirement. No release occurred between the serial cleanup heads. The maintained React Router family remains exact 8.3.0, and rollback restores bridge release `0.5.12-alpha.1` without changing RR8.

Historical paths in this ledger are evidence snapshots and do not assert current filesystem presence. OpenSpec records and consolidation-validator fixtures use the same historical-path semantics; active application, package, Nx, release, workspace, documentation, and lockfile surfaces must remain free of the retired graph.

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

Reviewer `kattsushi` accepted every consumer disposition on 2026-08-25. `Complete YES` means the migration evidence or retirement action is reviewed and complete; it does not authorize deletion. Surfaces marked for retirement remain intact until the separate parent-owned deletion decision.

| ID  | Surface                                                                      | Disposition               | Evidence / justification                                                                                                                                                                                     | Reviewer  | Complete |
| --- | ---------------------------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- | -------- |
| C01 | `.github/SETUP.md`                                                           | deprecate-reference       | Accepted retirement action: release setup labels the bridge temporary and retains its references until deletion is authorized.                                                                               | kattsushi | YES      |
| C02 | `CHANGELOG.md`                                                               | retained-until-retirement | Root release history records 0.5.12-alpha.1 as the final supported bridge rollback version.                                                                                                                  | kattsushi | YES      |
| C03 | `README.md`                                                                  | deprecate-reference       | Root package, install, and status surfaces direct new users to the maintained RR8 integration; remove bridge references only after authorization.                                                            | kattsushi | YES      |
| C04 | `apps/react-remix-example/app/lib/react-router7-better-auth.server.ts`       | remove-at-retirement      | RR8 replacement is proven by `packages/react/router-better-auth/tests/handlers.test.ts` and `packages/react/router-better-auth/tests/auth-guard.test.ts`; remove the local adapter only after authorization. | kattsushi | YES      |
| C05 | `apps/react-remix-example/app/lib/runtime.server.ts`                         | remove-at-retirement      | RR8 runtime replacement is proven by `packages/react/router/tests/runtime.test.ts`; retain this RR7 consumer until deletion is authorized.                                                                   | kattsushi | YES      |
| C06 | `apps/react-remix-example/app/routes/_index.tsx`                             | remove-at-retirement      | RR8 shell and transferred demo destinations are proven by `apps/react-router-example/tests/routes/app-shell.test.tsx` and `apps/react-router-example/tests/routes/demo.test.tsx`.                            | kattsushi | YES      |
| C07 | `apps/react-remix-example/app/routes/api.$.ts`                               | remove-at-retirement      | Accepted retirement action: the file contains only comments and `export {}`, so it has no executable consumer or observable behavior.                                                                        | kattsushi | YES      |
| C08 | `apps/react-remix-example/app/routes/demo.tsx`                               | remove-at-retirement      | All six unique helper scenarios transferred to `apps/react-router-example/app/routes/demo.tsx` and pass `apps/react-router-example/tests/routes/demo.test.tsx`.                                              | kattsushi | YES      |
| C09 | `apps/react-remix-example/app/routes/test.tsx`                               | remove-at-retirement      | Equivalent loader, validation, and action evidence passes in `apps/react-router-example/tests/routes/hatchet-crons.test.tsx` and `apps/react-router-example/tests/routes/demo.test.tsx`.                     | kattsushi | YES      |
| C10 | `apps/react-remix-example/app/routes/todos.tsx`                              | remove-at-retirement      | Every CRUD, toggle, and validation intent passes at `apps/react-router-example/tests/routes/todo-app.test.tsx`.                                                                                              | kattsushi | YES      |
| C11 | `apps/react-remix-example/package.json`                                      | remove-at-retirement      | Accepted retirement action: the RR7 importer and exact 7.18.2 pins remain intact until the graph cleanup is authorized.                                                                                      | kattsushi | YES      |
| C12 | `apps/react-remix-example/project.json`                                      | remove-at-retirement      | Accepted retirement action: transitional Nx targets remain available until source deletion is authorized.                                                                                                    | kattsushi | YES      |
| C13 | `apps/react-remix-example/tests/unit/config/react-router7-framework.test.ts` | remove-at-retirement      | RR8 route-map, typegen, and build evidence is complete; this transitional RR7 test remains until deletion is authorized.                                                                                     | kattsushi | YES      |
| C14 | `apps/react-remix-example/tests/unit/react-router7-better-auth.test.ts`      | remove-at-retirement      | RR8 adapter evidence passes at `packages/react/router-better-auth/tests/handlers.test.ts` and `packages/react/router-better-auth/tests/auth-guard.test.ts`.                                                  | kattsushi | YES      |
| C15 | `apps/react-remix-example/vitest.config.ts`                                  | remove-at-retirement      | Accepted retirement action: the bridge-only test alias remains until deletion is authorized.                                                                                                                 | kattsushi | YES      |
| C16 | `nx.json`                                                                    | retained-until-retirement | Accepted retirement action: the bridge remains releasable, and the app-local adapter remains absent from release projects until cleanup is authorized.                                                       | kattsushi | YES      |
| C17 | `packages/react/remix/CHANGELOG.md`                                          | retained-until-retirement | Package history labels 0.5.12-alpha.1 deprecated and usable for rollback.                                                                                                                                    | kattsushi | YES      |
| C18 | `packages/react/remix/README.md`                                             | deprecate-reference       | Public package documentation leads with deprecation and this migration guide; remove active support references only after authorization.                                                                     | kattsushi | YES      |
| C19 | `packages/react/remix/package.json`                                          | retained-until-retirement | Published metadata identifies the temporary RR7 7.18.2 bridge and version 0.5.12-alpha.1; retain it as the rollback artifact.                                                                                | kattsushi | YES      |
| C20 | `packages/react/remix/project.json`                                          | retained-until-retirement | Accepted retirement action: the bridge remains releasable until deletion authorization; the local adapter is not a project.                                                                                  | kattsushi | YES      |
| C21 | `packages/react/remix/src/lib/context.ts`                                    | retained-until-retirement | Public context classes remain deprecated exact RR7 identities until authorized deletion.                                                                                                                     | kattsushi | YES      |
| C22 | `scripts/verify-react-router-manifests.mjs`                                  | remove-at-retirement      | The manifest matrix proves bridge RR7 7.18.2 and protected RR8 8.3.0 isolation; remove the transitional guard only during authorized cleanup.                                                                | kattsushi | YES      |
| C23 | `vitest.config.ts`                                                           | remove-at-retirement      | Accepted retirement action: the root exclusion remains while the transitional app exists.                                                                                                                    | kattsushi | YES      |
| C24 | `pnpm-lock.yaml`                                                             | remove-at-retirement      | Accepted retirement action: importer snapshots retain RR7 7.18.2 until authorized graph cleanup; protected RR8 remains 8.3.0.                                                                                | kattsushi | YES      |

## Behavior scenario inventory

Reviewer `kattsushi` accepted every disposition on 2026-08-25. Rows marked complete already have sufficient concrete evidence or an accepted removal justification. Incomplete `existing-rr8` rows require focused evidence tests, while only the six `/demo` rows authorize new product behavior.

| ID                    | Surface                                                    | Disposition               | Evidence / justification                                                                                                                                                                                                                                    | Reviewer  | Complete |
| --------------------- | ---------------------------------------------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | -------- |
| shell                 | RR7 root shell                                             | existing-rr8              | `apps/react-router-example/app/{app,root}.tsx` and `tests/routes/{app-shell,root}.test.tsx`.                                                                                                                                                                | kattsushi | YES      |
| navigation            | RR7 navigation links                                       | existing-rr8              | `apps/react-router-example/app/app-nav.tsx` and `tests/routes/app-nav.test.tsx`.                                                                                                                                                                            | kattsushi | YES      |
| login                 | `/login` UI flow                                           | existing-rr8              | `apps/react-router-example/app/routes/login.tsx` and `apps/react-router-example/tests/routes/login.test.tsx`.                                                                                                                                               | kattsushi | YES      |
| signup                | `/signup` UI flow                                          | existing-rr8              | `apps/react-router-example/app/routes/signup.tsx` and `apps/react-router-example/tests/routes/signup.test.tsx`.                                                                                                                                             | kattsushi | YES      |
| auth-api              | `/api/auth/*` request, body, status, redirect, and cookies | existing-rr8              | `apps/react-router-example/app/routes/api.auth.ts` and `apps/react-router-example/tests/routes/api.auth.test.ts`.                                                                                                                                           | kattsushi | YES      |
| auth-loader-guard     | Todo loader unauthorized redirect                          | existing-rr8              | `apps/react-router-example/tests/unit/auth-guard.test.ts` and `packages/react/router-better-auth/tests/auth-guard.test.ts`.                                                                                                                                 | kattsushi | YES      |
| auth-action-guard     | Todo action unauthorized redirect                          | existing-rr8              | `apps/react-router-example/tests/unit/auth-guard.test.ts` and `packages/react/router-better-auth/tests/auth-guard.test.ts`.                                                                                                                                 | kattsushi | YES      |
| todo-create           | Todo create intent                                         | existing-rr8              | `apps/react-router-example/app/routes/todo-app.tsx` and `apps/react-router-example/tests/routes/todo-app.test.tsx`: create mutation, redirect, and render.                                                                                                  | kattsushi | YES      |
| todo-update           | Todo update intent                                         | existing-rr8              | `apps/react-router-example/app/routes/todo-app.tsx` and `apps/react-router-example/tests/routes/todo-app.test.tsx`: update, redirect, and blank title.                                                                                                      | kattsushi | YES      |
| todo-delete           | Todo delete intent                                         | existing-rr8              | `apps/react-router-example/app/routes/todo-app.tsx` and `apps/react-router-example/tests/routes/todo-app.test.tsx`: delete, redirect, and missing id.                                                                                                       | kattsushi | YES      |
| todo-toggle           | Todo completion toggle intent                              | existing-rr8              | `apps/react-router-example/app/routes/todo-app.tsx` and `apps/react-router-example/tests/routes/todo-app.test.tsx`: two status mutations, redirects, and render.                                                                                            | kattsushi | YES      |
| todo-validation       | Todo title and identifier validation                       | existing-rr8              | `apps/react-router-example/app/routes/todo-app.tsx` and `apps/react-router-example/tests/routes/todo-app.test.tsx`: title/id failures; zero mutation.                                                                                                       | kattsushi | YES      |
| test-loader-success   | `/test` loader success payload                             | existing-rr8              | `apps/react-router-example/app/routes/hatchet-crons.tsx` and `tests/routes/hatchet-crons.test.tsx` prove loaded data and rendered output.                                                                                                                   | kattsushi | YES      |
| test-blank-validation | `/test` blank-field validation                             | existing-rr8              | `apps/react-router-example/tests/routes/hatchet-crons.test.tsx` proves each blank-field status/body and visible feedback.                                                                                                                                   | kattsushi | YES      |
| test-action-success   | `/test` action success payload                             | existing-rr8              | `apps/react-router-example/app/routes/demo.tsx` and `tests/routes/demo.test.tsx` prove the action success payload and rendered result through the RR8 runtime.                                                                                              | kattsushi | YES      |
| demo-loader-success   | `/demo` loader success helper                              | transfer-to-rr8           | `apps/react-router-example/app/routes/demo.tsx` and `tests/routes/demo.test.tsx` prove the loader success payload and rendered message through the RR8 runtime.                                                                                             | kattsushi | YES      |
| demo-loader-failure   | `/demo` loader failure helper                              | transfer-to-rr8           | `apps/react-router-example/tests/routes/demo.test.tsx` proves the modeled loader failure body and status 500 through the RR8 runtime.                                                                                                                       | kattsushi | YES      |
| demo-loader-redirect  | `/demo` loader redirect helper                             | transfer-to-rr8           | `apps/react-router-example/tests/routes/demo.test.tsx` proves the loader redirect preserves status 307 and `Location: /demo?outcome=success`.                                                                                                               | kattsushi | YES      |
| demo-action-success   | `/demo` action success helper                              | transfer-to-rr8           | `apps/react-router-example/app/routes/demo.tsx` and `tests/routes/demo.test.tsx` prove the action success payload and rendered message through the RR8 runtime.                                                                                             | kattsushi | YES      |
| demo-action-failure   | `/demo` action failure helper                              | transfer-to-rr8           | `apps/react-router-example/tests/routes/demo.test.tsx` proves the modeled action failure body and status 400 through the RR8 runtime.                                                                                                                       | kattsushi | YES      |
| demo-action-redirect  | `/demo` action redirect helper                             | transfer-to-rr8           | `apps/react-router-example/tests/routes/demo.test.tsx` proves the action redirect preserves status 303 and `Location: /demo?outcome=success`.                                                                                                               | kattsushi | YES      |
| api-placeholder       | `/api/*` commented HttpApiHandler placeholder              | remove-with-justification | Accepted removal: the RR7 file contains only comments and `export {}`; no executable or observable behavior exists.                                                                                                                                         | kattsushi | YES      |
| pico-styling          | Pico styling                                               | existing-rr8              | `apps/react-router-example/app/root.tsx` and `tests/routes/root.test.tsx` preserve the exact stylesheet and SRI descriptor.                                                                                                                                 | kattsushi | YES      |
| mock-store            | In-memory mock store                                       | remove-with-justification | Accepted removal: example-local module state would duplicate and weaken the protected Prisma-backed Todo example and its `tests/unit/lib/prisma.test.ts` evidence.                                                                                          | kattsushi | YES      |
| rr7-typegen           | RR7 generated route types                                  | existing-rr8              | `apps/react-router-example/project.json`, TypeScript configs, and `tests/unit/config/nx-cypress-target-contract.test.ts` prove typegen/build ordering.                                                                                                      | kattsushi | YES      |
| rr7-route-map         | Explicit index, nested, and splat route map                | existing-rr8              | `apps/react-router-example/app/routes.tsx` and `apps/react-router-example/tests/routes/route-map.test.ts` prove every explicit route destination, index selection, nested path matching, and exact splat params.                                            | kattsushi | YES      |
| rr7-hydration         | Browser hydration                                          | existing-rr8              | `apps/react-router-example/app/entry.client.tsx` and `tests/routes/root.test.tsx` exercise hydration and head stability.                                                                                                                                    | kattsushi | YES      |
| rr7-ssr               | Server rendering, readiness, status, and headers           | existing-rr8              | `apps/react-router-example/app/entry.server.tsx` and `apps/react-router-example/tests/routes/entry-server.test.ts` prove browser shell and bot/SPA all-content readiness, status/header/HTML fidelity, stream-error 500, and exact initial shell rejection. | kattsushi | YES      |
| rr7-build             | Production framework build                                 | existing-rr8              | `project.json`, `tests/unit/config/nx-cypress-target-contract.test.ts`, and `react-router-build-asset-contract.test.ts` prove build ordering/assets.                                                                                                        | kattsushi | YES      |

## Human gate before scenario transfer

Reviewer `kattsushi` approved the 10 complete `existing-rr8` rows, the two accepted removals, the 11 evidence-hardening rows, and only the six `/demo` rows for product transfer. Work unit 8 may implement that bounded `/demo` slice and focused evidence tests; no other product scenario is authorized.

## Final RR8-only release evidence

Work unit 11 completed on clean child head `4535fc42f2eec9ec18e74c92e21b8d8f0784303d` under Node 24.19.0 and pnpm 10.14.0. Reviewer `kattsushi` accepted the complete RR8-only evidence on 2026-08-26 and authorized verify → sync → archive. This authorization does not publish a release.

### Maintained RR8 matrix

| Surface                          | Exact result                                                                                                                                                                                                                                                                                  |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Packages                         | `@effectify/react-router` passed 8/8 runtime tests and `@effectify/react-router-better-auth` passed 9/9 adapter tests; both passed `typecheck:no-build`, lint, and build against resolved React Router 8.3.0.                                                                                 |
| Runtime payload/failure          | Loader payload `{ ok: true, data }`, action payload `{ ok: true, response }`, loader modeled failure status 500/body, and action modeled failure status 400/body passed.                                                                                                                      |
| Redirect/headers/identity        | Runtime redirects preserved status 307, `Location`, and `Set-Cookie`; failed native `Response` and `Error` values preserved exact identity; defect/interruption fallback and logging assertions passed.                                                                                       |
| Better Auth                      | Loader/action request identity, successful response status/body, unauthorized status 302, `Location: /login`, and `Set-Cookie: returnTo=/todo-app` passed. App auth tests additionally preserved status 307, body, `Location`, trace header, exact response identity, and both cookie values. |
| Maintained app                   | Manifest and readiness passed at Node 24.19.0, React 19.2.7, and RR8 8.3.0; migration tests passed 9/9 and the full app passed 115/115 after building its declared `@effectify/hatchet` workspace prerequisite.                                                                               |
| Routes and transferred scenarios | Route-map/splat, shell/navigation, login/signup, auth, Todo create/update/delete/toggle/validation, test-equivalent scenarios, and all six transferred `/demo` loader/action success/failure/redirect outcomes passed. Demo redirects retained 307/303 and `Location: /demo?outcome=success`. |
| SSR                              | Browser shell readiness retained status 207, route header, HTML content type/body; bot and SPA mode used all-content readiness; stream failure returned 500; initial shell failure preserved exact throwable identity.                                                                        |
| Generated/type/build quality     | Clean typegen, typecheck, client/SSR production build, and lint passed. Generated `.react-router`, build/dist, Prisma generation/database changes, and touched tsbuildinfo were removed or restored.                                                                                          |

### Final absence and release proof

- `consolidation:verify -- --expect=retired` returned `status: retired`, 24 consumer rows, 29 scenario rows, 0 pending rows, and rollback `0.5.12-alpha.1`.
- Nx listed 19 maintained projects and no bridge or retired app project. Release projects contain neither retired project.
- Protected-app `pnpm why` resolved `react-router`, `@react-router/dev`, `@react-router/node`, and `@react-router/serve` only at 8.3.0.
- Frozen install passed for all 19 workspace projects. Affected lint/typecheck/test/build passed for 19/17/6/15 projects, and repository formatting passed.
- Exact active-tree scans found zero physical retired roots; zero RR7/bridge/app terms outside the historical ledger, OpenSpec record, validator, and validator fixtures; zero active docs/workspace/release residue; and zero retired lockfile importer, React Router 7 snapshot, `7.18.2`, bridge package, or Remix framework package.
- The only lockfile `@remix-run/*` token is maintained RR8 transitive metadata `@remix-run/node-fetch-server`; it is explicitly allowed and is not RR7/bridge residue.
- The RR8 catalog resolves all four framework packages exactly to 8.3.0, the app resolves the same family to 8.3.0, and the package peer remains `^8.3.0`.
- The protected source/test/dependency/lock tree inventory stayed identical to the clean WU11 start; final lockfile SHA-256 remains `3a50b512a4ce21f35ab6a6e1d6758fd1ed74324af8ffdd271eeb32d83ba32e80`.

### Serial cleanup accounting

No release occurred between any serial cleanup heads. Generated counts are lockfile additions plus deletions; binary counts are tracked bytes deleted.

| Green cleanup head                       | Authored lines | Generated lines | Binary deletion |
| ---------------------------------------- | -------------: | --------------: | --------------: |
| PR10a retire RR7 tests / stage validator |            936 |               0 |         0 bytes |
| PR10b remove retired scenarios           |            911 |               0 |         0 bytes |
| PR10c reduce app to static shell         |            455 |               0 |    57,344 bytes |
| PR10c prune auth dependencies            |             63 |              56 |         0 bytes |
| PR10c prune database dependencies        |             70 |             158 |         0 bytes |
| PR10c prune serve edge                   |             95 |               8 |         0 bytes |
| PR10c normalize React catalog            |              8 |              82 |         0 bytes |
| PR10c retire static app node             |            358 |               0 |         0 bytes |
| PR10c prune retired importer             |              5 |             909 |         0 bytes |
| PR10d retire bridge tests/docs           |            610 |               0 |         0 bytes |
| PR10d retire bridge release graph        |            812 |              38 |         0 bytes |

The supported rollback remains bridge release `0.5.12-alpha.1` plus its matching RR7 importer, workspace, release, and lockfile graph; restoring it reopens the retirement gate and does not alter maintained RR8 8.3.0.
