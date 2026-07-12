# React Router latest-major support

## WU1 latest-v7 checkpoint

React Router family is aligned at `7.18.1`; Node is `>=22.22`, React/ReactDOM `19.2.7`, Vite `8.1.3` (`>=7`), verified on Node `25.2.1`, and CI selects Node `22.22.0`. Rollback restores the `7.12.0` catalog and lockfile together and removes WU1 declarations, flags, targets, tests, workflows, and this record.

Authority: <https://reactrouter.com/upgrading/v7>. Framework Mode uses the Vite plugin, SSR, a custom server entry, nested routes, and route modules. Flags are enabled separately in `apps/react-router-example/react-router.config.ts`; this evidence does not claim browser behavior without a safe no-build request harness.

| Flag                                | WU1 decision and no-build evidence                                                                                                                                                                                                                             | v8 disposition / owner                                                                                                                    |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `v8_middleware`                     | **applicable-and-proven**: `migration:test` uses native `createStaticHandler` with the flag, proving ordering, `RouterContextProvider`, exact `Response` identity, and second-`next()` rejection. 7.18.1 server types define the one-call middleware contract. | Remove after WU2 v8 verification. This is router evidence, not an Effectify adapter; WU3 may evaluate an example-local server experiment. |
| `v8_splitRouteModules`              | **applicable-and-proven**: Nx typegen, typecheck, and generated `+routes.ts` cover root, API, and nested Hatchet modules.                                                                                                                                      | Remove after WU2 compiler verification.                                                                                                   |
| `v8_viteEnvironmentApi`             | **applicable-and-proven**: `migration:test` resolves the real development/production Vite config and observes `react-router`; typegen/typecheck pass.                                                                                                          | Remove when WU2 proves v8 treatment.                                                                                                      |
| `v8_passThroughRequests`            | **applicable-but-live-proof-deferred**: config/type acceptance passes; source has no local request normalizer or safe Framework request handler.                                                                                                               | WU3 proves document and `.data` URL/query/parameter preservation before removal.                                                          |
| `v8_trailingSlashAwareDataRequests` | **applicable-but-live-proof-deferred**: config/type acceptance passes; no no-build handler observes nested route/data URL identity.                                                                                                                            | WU3 proves nested document and `.data` slash variants before removal.                                                                     |

`migration:manifest` verifies direct v7 manifests; `migration:verify` verifies floors, catalog/lock alignment, flags, and no build/start dependency. Both are dependency-free Node Nx targets. Build-dependent Cypress e2e is excluded. WU1 authorizes no middleware package export, shared adapter, router-runtime change, or Better Auth ownership change.

## React Router 8.2.0 recovery and compatibility

Before publication, abort if the exact 8.2.0 family manifests, no-build migration verification, manifest verification, router tests, Better Auth compatibility evidence, typechecks, or lint do not pass. Confirm the published artifact declares the tested v8-only peer range and required Node/React floors; do not publish on installation-only evidence.

After publication, verify the registry package version, tarball metadata, peer dependencies, and release notes match the approved 8.2.0 compatibility decision, then run the published-consumer smoke and compatibility checks. Published packages are immutable: do not unpublish, retag, or mutate a release to recover. Fix defects only with a new forward version and publish it after the same pre-publication gates pass.

`@effectify/react-router` is compatible with React Router `^8.2.0`; without a deliberate passing dual-major matrix, do not claim v7 support from that artifact. React Router v7 consumers must remain on the preceding Effectify release line until they complete their own v8 migration.

## WU3 Better Auth and Framework Mode proof

`@effectify/react-router-better-auth` now reads the existing typed loader and action argument contexts directly. Its no-build target typechecks Better Auth, the router, and node Better Auth source together; no declarations were emitted and no package version was selected. The Unreleased package changelog records the compatibility evidence while Nx release policy remains the sole version authority.

Focused guard tests verify loader and action redirects retain status `302`, `Location`, and `Set-Cookie`, while successful loader/action responses retain their status and body. API handler tests verify both typed request contexts reach Better Auth unchanged.

The existing no-build `migration:test` target uses React Router 8.2.0's native static handler to prove document and `.data` request URL/response behavior, including the `.data` shape used for client navigation. This is request-level evidence only: it does not claim a browser, server start, build, or build-dependent e2e result.

The optional example-local server middleware remains deferred. The installed 8.2.0 types prove native server middleware has one `next()` returning `Response | void`, and the focused static-handler tests prove one-call enforcement, RouterContextProvider visibility, ordering, and Response identity. They do not prove an example-owned Effect scope finalizes on returned responses, thrown responses/errors, rejected downstream work, and interruption. Without that complete direct runtime proof, no middleware was added. No package middleware adapter, Better Auth middleware replacement, RouterContext ownership wrapper, instrumentation, Stream/Suspense, RouterProvider, or HydratedRouter wrapper was added.
