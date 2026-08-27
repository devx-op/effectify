# Exploration: Consolidate React Remix into React Router

## Objective

Explore a staged migration that ends with `@effectify/react-router` as the single maintained Effect integration for React Router 8, while providing a deliberately temporary React Router 7 bridge for Remix v2 consumers. The existing React Router 8 catalog, package, example, tests, and Better Auth integration are protected and must not be downgraded or repurposed as the bridge.

## Repository evidence

- `@effectify/react-remix` publicly exports `ActionArgsContext`, `LoaderArgsContext`, the `HttpResponse*` model and helpers, `Runtime.make(...)`, and `json`. Its framework types and runtime imports come from `@remix-run/node`; its package has no test target or package-owned tests.
- `@effectify/react-router` already exposes the same core context/response/runtime shape, except for the Remix `json` re-export. It is bound to `react-router ^8.3.0`, requires Node `>=22.22`, and has focused runtime tests covering payloads, redirects, response/error identity, defects, interruption, and logging.
- The two response-model files are functionally equivalent. The React Router runtime is the more mature implementation: it uses current Effect cause APIs, native `Response.json`, React Router argument types, and tested redirect/error semantics. Consolidation should therefore move consumers toward this implementation rather than copy the older Remix runtime over it.
- `apps/react-remix-example` is still a Remix v2 application (`@remix-run/*` 2.17.5, Remix scripts/plugin, `RemixBrowser`, and `RemixServer`) but already imports the RR8-owned `@effectify/react-router-better-auth`. That mixes Remix request contexts with an adapter that reads contexts from `@effectify/react-router`, creating the cross-major/context-identity mismatch the transition must remove.
- `@effectify/react-router-better-auth` directly imports `ActionArgsContext` and `LoaderArgsContext` from the RR8 package. Its existing handlers and tests are part of the protected RR8 stack and should remain RR8-only.
- The workspace catalog pins the protected family to React Router 8.3.0 (`react-router`, `@react-router/dev`, `@react-router/node`, and `@react-router/serve`) and React 19.2.7. The RR8 example already uses the React Router Vite plugin, `react-router` scripts/typegen, `react-router.config.ts`, explicit `app/routes.tsx`, `HydratedRouter`, `ServerRouter`, and extensive readiness/route tests.
- Repository documentation records that v7 support must not be claimed by the v8 artifact without a deliberate dual-major matrix. This supports a separate transitional boundary rather than widening the RR8 package peer range.
- Root release/docs surfaces still list `@effectify/react-remix`; eventual retirement therefore affects more than source deletion (README, release setup/changelogs, lockfile/workspace graph, and the Remix example).

## Official Remix v2 to React Router 7 migration sequence

The transitional example should follow the official migration shape rather than simulate compatibility only inside Effectify:

1. Replace `@remix-run/react`, `@remix-run/dev`, `@remix-run/node`, and `@remix-run/serve` with the corresponding React Router framework packages (`react-router`, `@react-router/dev`, `@react-router/node`, and `@react-router/serve`) at an isolated RR7 version.
2. Change CLI scripts from `remix vite:*`/`remix-serve` to `react-router dev`, `react-router build`, `react-router typegen`, and `react-router-serve` as appropriate.
3. Replace the Remix Vite plugin with `reactRouter()` from `@react-router/dev/vite`.
4. Add React Router framework configuration and an explicit `app/routes.ts`/`app/routes.tsx` route configuration that preserves the existing route URLs, including splats such as the Better Auth endpoint.
5. Include generated `.react-router/types` in TypeScript configuration and run type generation before typecheck/build.
6. Replace route/UI/server imports from `@remix-run/*` with React Router equivalents.
7. Replace `RemixBrowser` with `HydratedRouter`, and replace `RemixServer` with `ServerRouter`; source stream helpers and framework types from the React Router packages.

These steps should be treated as the RR7 bridge checkpoint, not the final platform version. The final checkpoint repeats version-sensitive verification against the existing RR8 family without changing its catalog pins or established application behavior.

## Recommended staged topology

### Stage 1: isolated RR7 bridge

- Keep `@effectify/react-router` and `@effectify/react-router-better-auth` unchanged as RR8-owned artifacts.
- Turn the deprecated Remix integration into, or place a thin compatibility facade over, a narrowly scoped RR7 bridge that preserves the useful public Effect boundary (`Runtime`, contexts, `HttpResponse*`, helpers) while replacing `@remix-run/*` types/imports with RR7 `react-router` types/imports.
- Preserve `Runtime` namespace usage during the bridge if source compatibility is desired; the RR8 package already exposes `Runtime` the same way, despite its README showing a stale root-level `make` example.
- Decide explicitly whether the legacy `json` export remains as a local compatibility helper during deprecation or becomes a documented breaking removal. It must not force a Remix dependency into the consolidated RR8 package.
- Create a separate transitional RR7 Better Auth adapter that imports the bridge's context classes. Do not broaden or conditionally load the existing RR8 Better Auth adapter, because Effect context identity and framework argument types must come from one major-specific owner.
- Migrate `apps/react-remix-example` through the official RR7 framework steps and make it consume only the RR7 bridge and RR7 Better Auth adapter. Pin RR7 locally/through a version alias or another isolation mechanism; do not replace the workspace's RR8 catalog entries.

### Stage 2: final RR8 consolidation

- Migrate any remaining bridge consumers to `@effectify/react-router` and the existing RR8 Better Auth adapter.
- Prefer consolidating demonstrations into the protected `apps/react-router-example`; if the migrated former Remix example remains temporarily, it must become an RR8 app and stop presenting itself as a separate supported Remix stack.
- Retire the RR7-only Better Auth adapter and the deprecated Remix/RR7 bridge after a declared support window and migration notes.
- Remove obsolete Remix packages/catalog entries only after repository-wide references and lockfile importers are gone. No removal should alter the RR8 8.3.0 catalog family or its existing application capabilities.

## Compatibility and verification boundaries

- The bridge needs package-owned tests because `@effectify/react-remix` currently has none. Minimum contracts should mirror the RR8 runtime tests: context injection, success data shape, action/loader failure shape, redirects with headers/status, and exact thrown `Response`/`Error` identity.
- Better Auth tests must prove that the isolated RR7 adapter reads the same RR7 context instances provided by the bridge and preserves auth response status, body, `Location`, and `Set-Cookie`.
- The migrated RR7 example should verify route manifest/config, typegen, typecheck, focused route tests, and build using Nx. This evidence must not be reported as RR8 evidence.
- Final consolidation should rerun the protected RR8 package tests, Better Auth tests/no-build typecheck, example readiness/migration tests, typegen, typecheck, and build. Existing RR8 catalog and route/stack behavior form a regression boundary, not migration material to simplify away.
- Package metadata and documentation must never imply that one artifact supports both v7 and v8 unless both majors are installed and tested independently. The preferred model is two explicit, temporary ownership boundaries followed by deletion of the RR7 one.

## Risks and constraints

- **Context identity:** structurally identical context classes from two packages are not interchangeable; the runtime and Better Auth adapter must import the same class definitions.
- **Peer resolution:** adding RR7 directly to the shared catalog could downgrade or produce misleading tests for the protected RR8 package. Isolation must be observable in manifests and lockfile resolution.
- **Behavior drift:** copying the older Remix runtime would regress tested cause handling and response semantics. The bridge should port the RR8 behavior backward where RR7 APIs permit it.
- **Route migration:** Remix filename conventions are not automatically equivalent to explicit React Router routes. Wildcards, index routes, and URL preservation need a checked route map.
- **Public API retirement:** removing `@effectify/react-remix` requires deprecation and migration guidance because it is published and listed in root documentation/release setup.
- **Example overlap:** merging examples without an explicit feature inventory could lose demonstrations. The RR8 catalog/stack, including Better Auth, Hatchet, Prisma, query, route tests, SSR entries, and build/readiness checks, is protected.

## Decisions needed in proposal/design

1. Choose the bridge package identity: retain `@effectify/react-remix` as a deprecated RR7 facade or introduce an explicitly named RR7 package and make Remix a re-exporting deprecation shim.
2. Choose the isolated RR7 Better Auth package name and confirm it is unpublished/temporary or released with a clear support window.
3. Define the RR7 version and installation isolation mechanism without changing the RR8 catalog pins.
4. Define the legacy `json` compatibility policy and exact deprecation/removal release boundaries.
5. Inventory which former Remix example routes/features must be moved into the RR8 example before the old example can be removed.

## Recommended conclusion

Proceed with a two-checkpoint change: first establish a tested RR7 bridge plus a context-correct, isolated RR7 Better Auth adapter and migrate the Remix example using the official framework steps; then move all consumers to the already-tested RR8 packages and retire the transitional artifacts. The proposal should explicitly prohibit downgrading, widening, or replacing the existing RR8 catalog/package/example stack.
