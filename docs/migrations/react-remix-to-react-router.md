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

All dispositions below are deliberately `pending-review`. Candidate evidence makes each row reviewable but does not decide uniqueness, approve removal, or satisfy the parent-owned reviewer gate.

| ID                    | Surface                                                    | Disposition    | Evidence / justification                                                                                            | Reviewer | Complete |
| --------------------- | ---------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------- | -------- | -------- |
| shell                 | RR7 root shell                                             | pending-review | Candidate RR8: `app/app.tsx`, `app/root.tsx`, and `tests/routes/{app-shell,root}.test.tsx`.                         | PENDING  | NO       |
| navigation            | RR7 navigation links                                       | pending-review | Candidate RR8: `app/app-nav.tsx` and `tests/routes/app-nav.test.tsx`.                                               | PENDING  | NO       |
| login                 | `/login` UI flow                                           | pending-review | Candidate RR8: `app/routes/login.tsx` and route entry in `app/routes.tsx`.                                          | PENDING  | NO       |
| signup                | `/signup` UI flow                                          | pending-review | Candidate RR8: `app/routes/signup.tsx` and route entry in `app/routes.tsx`.                                         | PENDING  | NO       |
| auth-api              | `/api/auth/*` request, body, status, redirect, and cookies | pending-review | Candidate RR8: `app/routes/api.auth.ts` and `packages/react/router-better-auth/tests/handlers.test.ts`.             | PENDING  | NO       |
| auth-loader-guard     | Todo loader unauthorized redirect                          | pending-review | Candidate RR8: `tests/unit/auth-guard.test.ts` loader redirect assertion.                                           | PENDING  | NO       |
| auth-action-guard     | Todo action unauthorized redirect                          | pending-review | Candidate RR8: `tests/unit/auth-guard.test.ts` action redirect assertion.                                           | PENDING  | NO       |
| todo-create           | Todo create intent                                         | pending-review | Candidate RR8: `app/routes/todo-app.tsx`; focused create evidence is not yet accepted.                              | PENDING  | NO       |
| todo-update           | Todo update intent                                         | pending-review | Candidate RR8: `app/routes/todo-app.tsx`; focused update evidence is not yet accepted.                              | PENDING  | NO       |
| todo-delete           | Todo delete intent                                         | pending-review | Candidate RR8: `app/routes/todo-app.tsx`; focused delete evidence is not yet accepted.                              | PENDING  | NO       |
| todo-toggle           | Todo completion toggle intent                              | pending-review | Candidate RR8: `app/routes/todo-app.tsx`; focused toggle evidence is not yet accepted.                              | PENDING  | NO       |
| todo-validation       | Todo title and identifier validation                       | pending-review | Candidate RR8: `app/routes/todo-app.tsx`; behavior-level validation evidence remains pending.                       | PENDING  | NO       |
| test-loader-success   | `/test` loader success payload                             | pending-review | Candidate RR8 protocol evidence: `packages/react/router/tests/runtime.test.ts`; user-visible uniqueness unresolved. | PENDING  | NO       |
| test-blank-validation | `/test` blank-field validation                             | pending-review | Candidate RR8 todo validation in `app/routes/todo-app.tsx`; equivalence is unresolved.                              | PENDING  | NO       |
| test-action-success   | `/test` action success payload                             | pending-review | Candidate RR8 protocol evidence: `packages/react/router/tests/runtime.test.ts`; user-visible uniqueness unresolved. | PENDING  | NO       |
| demo-loader-success   | `/demo` loader success helper                              | pending-review | Candidate RR8: success-shape assertions in `packages/react/router/tests/runtime.test.ts`.                           | PENDING  | NO       |
| demo-loader-failure   | `/demo` loader failure helper                              | pending-review | Candidate RR8: loader failure status/body assertions in `packages/react/router/tests/runtime.test.ts`.              | PENDING  | NO       |
| demo-loader-redirect  | `/demo` loader redirect helper                             | pending-review | Candidate RR8: redirect status/header assertions in `packages/react/router/tests/runtime.test.ts`.                  | PENDING  | NO       |
| demo-action-success   | `/demo` action success helper                              | pending-review | Candidate RR8: action success-shape assertions in `packages/react/router/tests/runtime.test.ts`.                    | PENDING  | NO       |
| demo-action-failure   | `/demo` action failure helper                              | pending-review | Candidate RR8: action failure status/body assertions in `packages/react/router/tests/runtime.test.ts`.              | PENDING  | NO       |
| demo-action-redirect  | `/demo` action redirect helper                             | pending-review | Candidate RR8: redirect status/header assertions in `packages/react/router/tests/runtime.test.ts`.                  | PENDING  | NO       |
| api-placeholder       | `/api/*` commented HttpApiHandler placeholder              | pending-review | Removal candidate: source is commented and repository scan finds no executable handler consumer.                    | PENDING  | NO       |
| pico-styling          | Pico styling                                               | pending-review | Removal candidate: example-local presentation with no identified integration contract.                              | PENDING  | NO       |
| mock-store            | In-memory mock store                                       | pending-review | Removal candidate: example-local persistence detail; RR8 uses its own repository integration.                       | PENDING  | NO       |
| rr7-typegen           | RR7 generated route types                                  | pending-review | Candidate RR8: `typegen` target and `tests/react-router-readiness.test.ts`; transitional output is not reusable.    | PENDING  | NO       |
| rr7-route-map         | Explicit index, nested, and splat route map                | pending-review | Candidate RR8: `app/routes.tsx` and `tests/routes/app-shell.test.tsx`.                                              | PENDING  | NO       |
| rr7-hydration         | Browser hydration                                          | pending-review | Candidate RR8: `app/entry.client.tsx` and hydration assertions in `tests/routes/root.test.tsx`.                     | PENDING  | NO       |
| rr7-ssr               | Server rendering, readiness, status, and headers           | pending-review | Candidate RR8: `app/entry.server.tsx` and `tests/react-router-readiness.test.ts`.                                   | PENDING  | NO       |
| rr7-build             | Production framework build                                 | pending-review | Candidate RR8: Nx `build` target ordered after typegen plus protected build evidence.                               | PENDING  | NO       |

## Human gate before scenario transfer

Work unit 8 must not start until a human reviewer accepts each proposed disposition and records their name. The reviewer must confirm concrete existing RR8 evidence, approve each removal justification, and release only genuinely unique `transfer-to-rr8` rows. This document intentionally does not make those decisions.
