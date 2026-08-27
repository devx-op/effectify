# Apply Progress: Consolidate React Remix into React Router

## Structured Status Consumed

- Change: `consolidate-react-remix-into-router` (explicit parent selection; native status confirmed it exists).
- Artifact store: `both` for this delegated run: OpenSpec is authoritative on disk and Engram mirrors the planning artifacts.
- Native apply state: `ready`; dependencies `proposal/specs/design/tasks: all_done`, `apply: ready`.
- Action context: `repo-local`; workspace root and allowed edit root are `/Users/skynet/devx-op/effectify`; warnings: none.
- Runtime authority: parent reported `proceed` for work unit `bridge-contract-red`, evidence goal `focused-red-contract-suite`, maximum 1,000 changed lines. The parent owns settlement; no attempt token is persisted here.
- Delivery path: `auto-chain`, `feature-branch-chain`; this run is limited to Work unit 1 / PR 1.

## Workload / PR Boundary

- Completed boundary: **PR 1 — bridge contract RED**.
- Allowed changes: package-owned runtime tests, Vitest configuration, test TypeScript inputs, and Nx `test` / `typecheck:no-build` targets.
- No runtime implementation, manifest, catalog, lockfile, protected RR8 package/adapter/app, or framework dependency migration was changed.
- Changed-line count: **365 authored additions + deletions** (230 package test/wiring lines, 6 task-checkbox line changes, and 129 apply-progress lines); generated-line changes: **0**.

## Completed Tasks and Persisted Checkboxes

All three implementation-owned Work unit 1 rows are visibly marked `- [x]` in `tasks.md`:

1. Added the complete package-owned bridge runtime contract suite and test/typecheck wiring without runtime changes.
2. Captured the focused expected RED result and successful test-port typecheck.
3. Confirmed protected RR8 regression behavior, exact RR8 catalog `8.3.0`, pre-migration bridge dependencies, and an empty protected diff.

## Files Changed

- `packages/react/remix/tests/runtime.test.ts` (new)
- `packages/react/remix/vitest.config.ts` (new)
- `packages/react/remix/tsconfig.spec.json` (new)
- `packages/react/remix/tsconfig.json`
- `packages/react/remix/project.json`
- `openspec/changes/consolidate-react-remix-into-router/tasks.md` (Work unit 1 checkboxes only)
- `openspec/changes/consolidate-react-remix-into-router/apply-progress.md` (new cumulative evidence)

## RED Evidence

Focused command: `pnpm nx run @effectify/react-remix:test -- tests/runtime.test.ts`

- Exit code: `1` (expected RED).
- Compilation/import succeeded; Vitest executed 8 tests.
- Result: **4 passed, 4 failed**.
- Exact current behavior gaps:
  1. Redirect contract: loader result was `{ ok: false, errors: ["Redirecting..."] }`, not a native `Response`; assertion `expect(result).toBeInstanceOf(Response)` failed at `runtime.test.ts:84`.
  2. Action failed-`Error` identity: the promise resolved a status-400 JSON `Response` instead of rejecting with the exact `actionError`; assertion `.rejects.toBe(actionError)` failed at `runtime.test.ts:148`.
  3. Loader defect/interruption logging: observed `logs.length === 0`, expected `2`; assertion failed at `runtime.test.ts:170`.
  4. Action defect/interruption logging: observed `logs.length === 0`, expected `2`; assertion failed at `runtime.test.ts:187`.

Passing bridge contracts already observed in the same focused run: exact loader/action context injection and success shapes, modeled loader/action failures, successful raw `Response` handling plus failed `Response` identity, and loader failed-`Error` identity.

## Commands Run

| Command                                                                                                                                                                            | Exit | Observed result                                                                                                |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---: | -------------------------------------------------------------------------------------------------------------- |
| `pnpm nx run @effectify/react-router:test -- tests/runtime.test.ts` (pre-change safety net)                                                                                        |    0 | RR8 focused suite: 8/8 passed.                                                                                 |
| `pnpm nx run @effectify/react-router:typecheck:no-build` (pre-change safety net)                                                                                                   |    0 | RR8 source typecheck passed.                                                                                   |
| `git diff --exit-code -- pnpm-workspace.yaml package.json pnpm-lock.yaml packages/react/router packages/react/router-better-auth apps/react-router-example` (pre-change)           |    0 | Protected diff empty.                                                                                          |
| `pnpm nx run @effectify/react-remix:test -- tests/runtime.test.ts`                                                                                                                 |    1 | Expected RED: 4/8 assertions failed as listed above.                                                           |
| `pnpm nx run @effectify/react-remix:typecheck:no-build`                                                                                                                            |    0 | Runtime contract tests and package source compile without errors.                                              |
| `pnpm nx run @effectify/react-router:test -- tests/runtime.test.ts` (post-change)                                                                                                  |    0 | Protected RR8 focused suite: 8/8 passed.                                                                       |
| `pnpm nx run @effectify/react-router:typecheck:no-build` (post-change)                                                                                                             |    0 | Protected RR8 source typecheck passed.                                                                         |
| `git diff --exit-code -- pnpm-workspace.yaml package.json pnpm-lock.yaml packages/react/router packages/react/router-better-auth apps/react-router-example` (post-command cleanup) |    0 | Protected diff empty. The tracked RR8 `.tsbuildinfo` touched by `tsc` was restored to its clean pre-run state. |

Version evidence: `pnpm-workspace.yaml` retains `react-router: 8.3.0`. The bridge remains pre-migration with `@remix-run/node`, `@remix-run/react`, and `effect` peer/dev dependencies using `catalog:`; no RR7 pin or React Router dependency was introduced.

## TDD Cycle Evidence

| Task                      | Test File                                                | Layer               | Safety Net                                        | RED                                                        | GREEN                                           | TRIANGULATE                                                                                                                           | REFACTOR                                               |
| ------------------------- | -------------------------------------------------------- | ------------------- | ------------------------------------------------- | ---------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Work unit 1 contract port | `packages/react/remix/tests/runtime.test.ts`             | Runtime integration | RR8 8/8 passed; bridge had no package-owned suite | Confirmed 4 specific failures after successful compilation | Deferred by explicit PR boundary to Work unit 2 | Contract inputs cover loader/action, redirect metadata, throwable identity, defects, interruption, and logs; runtime changes deferred | N/A; production runtime is protected in this RED slice |
| Test/typecheck wiring     | `project.json`, `tsconfig.spec.json`, `vitest.config.ts` | Structural          | Existing package build wiring inspected           | Focused suite was runnable and RED                         | Wiring/typecheck passed                         | Skipped: structural target wiring has one execution outcome                                                                           | No further refactor needed                             |

Test summary: 8 contract tests authored; 4 currently pass and 4 intentionally fail. No production functions were created or modified.

## Deviations From Design

None. The RED suite uses Remix `LoaderFunctionArgs` / `ActionFunctionArgs` construction because dependency migration is explicitly deferred.

## Cumulative Task State

The following Work unit 2 rows are now complete in the persisted tasks artifact; every exact unchecked Work unit 3+ row below remains outstanding:

- [x] GREEN: port the smallest RR8 cause traversal and response mapping behavior into `packages/react/remix/src/lib/runtime.ts` without importing RR8 implementation code or context classes; make `pnpm nx run @effectify/react-remix:test -- tests/runtime.test.ts` pass. <!-- sdd-owner: implementation -->
- [x] TRIANGULATE: add focused edge cases in `packages/react/remix/tests/runtime.test.ts` for both loader and action paths, non-default redirect status/custom headers, exact throwable identity, defect/interruption generic bodies, and logger observation; run `pnpm nx run @effectify/react-remix:test -- tests/runtime.test.ts -t "redirect|identity|defect|interrupt"`. Runtime harness: the focused tests execute real `ManagedRuntime` exits and inspect returned/thrown native `Response` values. <!-- sdd-owner: implementation -->
- [x] REFACTOR only after green, then run `pnpm nx run-many --targets=test,typecheck:no-build,lint,build --projects=@effectify/react-remix,@effectify/react-router` and `pnpm nx run @effectify/repo:format:check`; separately record bridge and RR8 results and confirm the protected RR8 diff remains empty with `git diff --exit-code -- pnpm-workspace.yaml package.json pnpm-lock.yaml packages/react/router packages/react-router-better-auth apps/react-router-example`. <!-- sdd-owner: implementation -->
- [ ] RED: add `packages/react/remix/tests/json.test.ts` and a concrete dependency-isolation check under `scripts/verify-react-router-manifests.mjs` (or its exact consolidation-specific successor) that fails until bridge peer/dev `react-router` pins are exactly `7.18.2`, catalog/root RR8 remains `8.3.0`, and no bridge import uses `@remix-run/*`; run `pnpm nx run @effectify/react-remix:test -- tests/json.test.ts` and `pnpm nx run @effectify/react-router-example:migration:manifest` and record the expected failures. <!-- sdd-owner: implementation -->
- [ ] GREEN: change `packages/react/remix/package.json` and `src/lib/{context,runtime}.ts` to exact direct RR7 `7.18.2`; implement `src/lib/json.ts` with `Response.json`, numeric/object init handling, native serialization, caller headers, and `@deprecated` export from `src/index.ts`; regenerate `pnpm-lock.yaml` with `pnpm install --lockfile-only`. <!-- sdd-owner: implementation -->
- [ ] TRIANGULATE dependency isolation using `pnpm nx run @effectify/react-remix:test -- tests/json.test.ts`, `pnpm nx run @effectify/react-remix:test -- tests/runtime.test.ts`, `pnpm nx run @effectify/react-router-example:migration:manifest`, `pnpm why react-router --filter @effectify/react-remix`, and `pnpm why react-router --filter @effectify/react-router-example`; evidence must show RR7 `7.18.2` for the bridge and RR8 `8.3.0` for the protected app in distinct importer snapshots. Runtime harness: `json.test.ts` reads native response bodies/status/headers; dependency commands are non-runtime evidence. <!-- sdd-owner: implementation -->
- [ ] REFACTOR and verify `pnpm nx run-many --targets=test,typecheck:no-build,lint,build --projects=@effectify/react-remix,@effectify/react-router`, `pnpm nx run @effectify/repo:format:check`, and scans proving no `json` export was added under `packages/react/router/**` and no RR7 entry was added to root `package.json` or the `pnpm-workspace.yaml` React Router catalog. <!-- sdd-owner: implementation -->
- [ ] RED: add `apps/react-remix-example/tests/unit/react-router7-better-auth.test.ts` covering exact bridge action/loader contexts, rejection of RR8/lookalike contexts, request identity, body/status/`Location`, and every `Headers.getSetCookie()` value; run `pnpm nx run @effectify/react-remix-example:test -- tests/unit/react-router7-better-auth.test.ts` and record expected failures. <!-- sdd-owner: implementation -->
- [ ] GREEN: implement `apps/react-remix-example/app/lib/react-router7-better-auth.server.ts` using direct imports from `@effectify/react-remix` and `@effectify/node-better-auth`, preserve the native auth `Response`, implement RR7 redirect/typed `Unauthorized` guard policy, and replace all app imports of `@effectify/react-router-better-auth`. <!-- sdd-owner: implementation -->
- [ ] TRIANGULATE with `pnpm nx run @effectify/react-remix-example:test -- tests/unit/react-router7-better-auth.test.ts -t "context|cookie|redirect|Unauthorized"` and `pnpm nx run @effectify/react-remix-example:test -- tests/unit/routes/api-auth.test.ts`; runtime harness: execute adapter effects under `@effectify/react-remix` runtime and record exact request identity and multiple-cookie observations. <!-- sdd-owner: implementation -->
- [ ] REFACTOR and verify publication/version isolation with `pnpm nx show projects --type=lib`, `pnpm nx show project @effectify/react-remix-example --json`, `pnpm nx run-many --targets=test,typecheck:no-build,lint,build --projects=@effectify/react-router,@effectify/react-router-better-auth`, and `pnpm nx run @effectify/repo:format:check`; scans must find no RR8 adapter import in `apps/react-remix-example`, no local adapter in `nx.json` release projects, and no protected RR8 diff. <!-- sdd-owner: implementation -->
- [ ] RED: add focused configuration/route-map assertions at `apps/react-remix-example/tests/unit/config/react-router7-framework.test.ts` for exact pins/scripts, SSR config, explicit `/`, `/demo`, `/test`, `/todos`, `/login`, `/signup`, `/api/auth/*`, and `/api/*` mappings, splat params, `.react-router/types/**/*`, and `typegen` dependencies; run `pnpm nx run @effectify/react-remix-example:test -- tests/unit/config/react-router7-framework.test.ts` and record expected failures. <!-- sdd-owner: implementation -->
- [ ] GREEN: update `apps/react-remix-example/{package.json,project.json,vite.config.ts,tsconfig.json}`, add `react-router.config.ts` and `app/routes.ts`, remove only obsolete Remix/Nx exclusions when native plugin inference is verified, add dedicated Nx `typegen`, and make `typecheck`/`build` depend on it; regenerate `pnpm-lock.yaml` with `pnpm install --lockfile-only`. <!-- sdd-owner: implementation -->
- [ ] TRIANGULATE route matching with `pnpm nx run @effectify/react-remix-example:test -- tests/unit/config/react-router7-framework.test.ts -t "route|splat|typegen"`, then clean generated types and run `rm -rf apps/react-remix-example/.react-router && pnpm nx run @effectify/react-remix-example:typegen`; runtime harness: N/A because this slice establishes configuration and route declarations but does not yet migrate executable browser/server entries. <!-- sdd-owner: implementation -->
- [ ] Verify version isolation with `pnpm nx run @effectify/react-router-example:migration:manifest`, `pnpm why react-router --filter @effectify/react-remix-example`, `pnpm why react-router --filter @effectify/react-router-example`, and `pnpm nx run @effectify/repo:format:check`; record all four RR7 app packages as `7.18.2`, all protected family packages as `8.3.0`, and no RR7 root/catalog dependency. <!-- sdd-owner: implementation -->
- [ ] RED: add/extend `apps/react-remix-example/tests/unit/config/react-router7-framework.test.ts`, `tests/unit/entry-server.test.ts`, and focused route tests to assert RR7 imports, `HydratedRouter`, `ServerRouter`, `@react-router/node` streaming, route statuses/headers/content, bot/browser readiness, stream-error status, URLs, and `/api/auth/session` splat params; run the focused files through `pnpm nx run @effectify/react-remix-example:test -- tests/unit/config/react-router7-framework.test.ts tests/unit/entry-server.test.ts tests/unit/routes/api-auth.test.ts tests/unit/routes/test-route.test.ts` and record expected failures. <!-- sdd-owner: implementation -->
- [ ] GREEN: migrate `apps/react-remix-example/app/{entry.client.tsx,entry.server.tsx,root.tsx,components/**,routes/**,lib/**}` from active `@remix-run/*` APIs to RR7 `react-router`, `react-router/dom`, and `@react-router/node`, preserving every explicit route behavior and using only the local RR7 adapter. <!-- sdd-owner: implementation -->
- [ ] TRIANGULATE executable route/SSR behavior with `pnpm nx run @effectify/react-remix-example:test -- tests/unit/entry-server.test.ts tests/unit/routes/api-auth.test.ts tests/unit/routes/test-route.test.ts` and the complete app harness `pnpm nx run @effectify/react-remix-example:test`; record status, headers, HTML marker, readiness path, splat param, redirect, and cookie evidence. <!-- sdd-owner: implementation -->
- [ ] REFACTOR only after green, then run `rm -rf apps/react-remix-example/.react-router && pnpm nx run @effectify/react-remix-example:typegen && pnpm nx run @effectify/react-remix-example:typecheck && pnpm nx run @effectify/react-remix-example:build`, `pnpm nx run @effectify/react-remix-example:lint` if `pnpm nx show project @effectify/react-remix-example --json` exposes it, and `pnpm nx run @effectify/repo:format:check`; scan for active `@remix-run/*`, `RemixBrowser`, `RemixServer`, `remix vite:`, and `remix-serve` residue and require zero matches. <!-- sdd-owner: implementation -->
- [ ] Complete the independent protected regression boundary with `pnpm nx run-many --targets=test,typecheck:no-build,lint,build --projects=@effectify/react-router,@effectify/react-router-better-auth`, `pnpm nx run @effectify/react-router-example:migration:manifest`, `pnpm nx run @effectify/react-router-example:migration:verify`, `pnpm nx run @effectify/react-router-example:migration:test`, `pnpm nx run @effectify/react-router-example:test`, `pnpm nx run @effectify/react-router-example:typegen`, `pnpm nx run @effectify/react-router-example:typecheck`, and `pnpm nx run @effectify/react-router-example:build`; evidence must label this as RR8 `8.3.0`, never as RR7 evidence. <!-- sdd-owner: implementation -->
- [ ] RED: create a fail-closed ledger validation test/target with concrete source at `scripts/verify-react-router-consolidation.mjs` and Nx target `@effectify/react-router-example:consolidation:verify`; require consumer rows, scenario rows, disposition, concrete RR8 evidence or removal justification, reviewer, completion, final bridge version, and gate state, then run `pnpm nx run @effectify/react-router-example:consolidation:verify` and record failure while the ledger is absent/incomplete. <!-- sdd-owner: implementation -->
- [ ] GREEN: add `docs/migrations/react-remix-to-react-router.md` with import/command/context/runtime/`json` migration guidance, objective support boundary, every repository import/docs/release consumer, and behavior-level rows from the design; update `packages/react/remix/{README.md,package.json,CHANGELOG.md}`, public JSDoc, root `README.md`/relevant setup docs, and release metadata to identify a deprecated temporary RR7 `7.18.2` bridge and record the final supported rollback version. <!-- sdd-owner: implementation -->
- [ ] TRIANGULATE the closed gate with `pnpm nx run @effectify/react-router-example:consolidation:verify`, repository scans for `@effectify/react-remix`, `react-remix-example`, `@remix-run`, RR7 pins, root/docs/release mentions, and `pnpm nx show projects --json`; the command must pass inventory completeness while reporting retirement `CLOSED` because uniqueness/reviewer/completion evidence is pending. Runtime harness: N/A because this slice validates documentation, release surfaces, and ledger state. <!-- sdd-owner: implementation -->
- [ ] Verify publication and version boundaries with `pnpm nx show project @effectify/react-remix --json`, `pnpm nx show project @effectify/react-router-better-auth --json`, `pnpm nx run @effectify/react-router-example:migration:manifest`, and `pnpm nx run @effectify/repo:format:check`; local RR7 adapter must be absent from release projects and protected RR8 must remain exact `8.3.0`. <!-- sdd-owner: implementation -->
- [ ] RED for each accepted row: add the focused test at the exact RR8 destination named in `docs/migrations/react-remix-to-react-router.md`, run `pnpm nx run @effectify/react-router-example:test -- <accepted-test-path>`, and record the behavior-specific failure; do not start work for rows marked `existing RR8`, `remove`, pending, or reviewer-empty. <!-- sdd-owner: implementation -->
- [ ] GREEN each accepted row with the smallest change under `apps/react-router-example/app/**`, preserving all existing RR8 routes and tests; rerun `pnpm nx run @effectify/react-router-example:test -- <accepted-test-path>` and update only that ledger row with concrete file/test evidence. <!-- sdd-owner: implementation -->
- [ ] TRIANGULATE each scenario via `pnpm nx run @effectify/react-router-example:test -- <accepted-test-path>`, `pnpm nx run @effectify/react-router-example:test`, and, when the row crosses SSR/routes, `pnpm nx run @effectify/react-router-example:migration:test`; runtime harness is the focused RR8 route/component/SSR test and must record the row's user-visible result, or explicit `N/A` only for an accepted non-runtime documentation scenario. <!-- sdd-owner: implementation -->
- [ ] REFACTOR and verify each PR with `pnpm nx run @effectify/react-router-example:consolidation:verify`, `pnpm nx run @effectify/react-router-example:typegen`, `pnpm nx run @effectify/react-router-example:typecheck`, `pnpm nx run @effectify/react-router-example:build`, `pnpm nx run-many --targets=test,typecheck:no-build,lint,build --projects=@effectify/react-router,@effectify/react-router-better-auth`, and `pnpm nx run @effectify/repo:format:check`; `pnpm why react-router --filter @effectify/react-router-example` must remain `8.3.0`. <!-- sdd-owner: implementation -->
- [ ] RED: strengthen `scripts/verify-react-router-consolidation.mjs` tests/fixtures so one missing consumer, incomplete scenario, reviewer-empty row, missing evidence target, or absent rollback version returns nonzero; run `pnpm nx run @effectify/react-router-example:consolidation:verify -- --expect=open` and record expected failure before completion. <!-- sdd-owner: implementation -->
- [ ] GREEN: update only `docs/migrations/react-remix-to-react-router.md` and permitted evidence metadata so every repository consumer and scenario has a reviewed completed disposition, all evidence references exist and pass, and the final supported bridge version is explicit; then run `pnpm nx run @effectify/react-router-example:consolidation:verify -- --expect=open`. <!-- sdd-owner: implementation -->
- [ ] TRIANGULATE gate evidence with `pnpm nx run @effectify/react-router-example:migration:manifest`, `pnpm nx run @effectify/react-router-example:migration:verify`, `pnpm nx run @effectify/react-router-example:migration:test`, `pnpm nx run @effectify/react-router-example:test`, and `pnpm nx run-many --targets=test,typecheck:no-build,lint,build --projects=@effectify/react-router,@effectify/react-router-better-auth`; runtime harness: the RR8 app/package focused suites supply the referenced evidence, while this evidence-only slice itself is `N/A`. <!-- sdd-owner: implementation -->
- [ ] Record the rollback boundary and clean evidence diff using `git diff --stat`, `git diff -- docs/migrations/react-remix-to-react-router.md scripts/verify-react-router-consolidation.mjs`, and `pnpm nx run @effectify/repo:format:check`; confirm no bridge/app/local-adapter file is deleted in this PR. <!-- sdd-owner: implementation -->
- [ ] RED: add final-absence assertions to `scripts/verify-react-router-consolidation.mjs` for `@effectify/react-remix`, `react-remix-example`, local adapter, bridge `json`, `@remix-run/*`, RR7-only pins/resolutions, release projects, setup/docs/workspace references, and Nx graph nodes; run `pnpm nx run @effectify/react-router-example:consolidation:verify -- --expect=retired` and record expected failures before deletion. <!-- sdd-owner: implementation -->
- [ ] GREEN PR 10a: delete `packages/react/remix/**` and `apps/react-remix-example/**`, including the local adapter and bridge `json`, while preserving evidence needed in the migration ledger; keep this source-deletion slice below 1,000 changed lines or split by coherent package/app deletion without releasing an intermediate state. <!-- sdd-owner: implementation -->
- [ ] GREEN PR 10b: remove obsolete entries from `nx.json`, `pnpm-workspace.yaml`, root/package docs and setup/release surfaces, regenerate `pnpm-lock.yaml` with `pnpm install --lockfile-only`, and remove all now-unused Remix/RR7-only resolutions while preserving React Router catalog/root `8.3.0`. <!-- sdd-owner: implementation -->
- [ ] TRIANGULATE absence/version isolation with `pnpm nx run @effectify/react-router-example:consolidation:verify -- --expect=retired`, `pnpm nx show projects --json`, `pnpm why react-router --filter @effectify/react-router-example`, `pnpm nx run @effectify/react-router-example:migration:manifest`, and repository scans over source, docs, release config, workspace config, and `pnpm-lock.yaml`; runtime harness: N/A for deletion itself, with executable RR8 behavior verified in work unit 11. <!-- sdd-owner: implementation -->
- [ ] REFACTOR only cleanup-script/docs wording after absence checks pass, then run `pnpm nx affected --target=lint`, `pnpm nx affected --target=typecheck`, `pnpm nx affected --target=test`, `pnpm nx affected --target=build`, and `pnpm nx run @effectify/repo:format:check`; record authored and generated line counts separately for PR 10a/10b and verify neither child contains dangling references. <!-- sdd-owner: implementation -->
- [ ] Verify the maintained packages with `pnpm nx run-many --targets=test,typecheck:no-build,lint,build --projects=@effectify/react-router,@effectify/react-router-better-auth`; runtime harness: `packages/react/router/tests/runtime.test.ts` and the adapter suite must record payload, modeled failure, redirect/header, cookie, and throwable-identity results against RR8 `8.3.0`. <!-- sdd-owner: implementation -->
- [ ] Verify the maintained app with `pnpm nx run @effectify/react-router-example:migration:manifest`, `pnpm nx run @effectify/react-router-example:migration:verify`, `pnpm nx run @effectify/react-router-example:migration:test`, `pnpm nx run @effectify/react-router-example:test`, `rm -rf apps/react-router-example/.react-router && pnpm nx run @effectify/react-router-example:typegen`, `pnpm nx run @effectify/react-router-example:typecheck`, and `pnpm nx run @effectify/react-router-example:build`; runtime harness evidence must include routes, auth, SSR/readiness, status, headers, and each transferred unique scenario. <!-- sdd-owner: implementation -->
- [ ] Verify final graph/release absence with `pnpm nx run @effectify/react-router-example:consolidation:verify -- --expect=retired`, `pnpm nx show projects --json`, `pnpm why react-router --filter @effectify/react-router-example`, `pnpm nx affected --target=lint`, `pnpm nx affected --target=typecheck`, `pnpm nx affected --target=test`, `pnpm nx affected --target=build`, and `pnpm nx run @effectify/repo:format:check`; record no RR7/Remix dependency, project, publish, release, docs, workspace, or lockfile residue. <!-- sdd-owner: implementation -->
- [ ] Finalize release evidence in `docs/migrations/react-remix-to-react-router.md` (or the repository-approved retained historical evidence location) with consumer status, reviewed scenario dispositions, transitional-surface absence, protected RR8 results, authored/generated diff counts, and the exact final bridge rollback version; do not add or modify product code. <!-- sdd-owner: implementation -->
- [ ] After work unit 7 and before work unit 8, confirm every proposed `transfer to RR8` row in `docs/migrations/react-remix-to-react-router.md` is genuinely unique, every `existing RR8` row cites concrete equivalent files/tests, and every `remove` row has an accepted justification; record accepted reviewers and release only the accepted transfer rows to implementation. <!-- sdd-owner: parent -->
- [ ] After work unit 9 and before work unit 10, confirm the validator reports OPEN, every documented consumer is migrated, every scenario disposition is reviewed and complete with passing evidence, and the final bridge rollback version is recorded; explicitly authorize or reject retirement deletion without bypassing any failed row. <!-- sdd-owner: parent -->
- [ ] After work unit 11, evaluate the final RR8-only evidence and close the OpenSpec change only if cleanup, release surfaces, scenario ledger, rollback record, and protected RR8 `8.3.0` matrix are all complete; otherwise reopen the applicable gate. <!-- sdd-owner: parent -->

Parent-owned rows above are deferred lifecycle actions and were preserved byte-for-byte. The next implementation PR boundary is Work unit 3 / PR 3; lifecycle routing remains parent-owned.

## Work Unit 2 / PR 2 — Bridge Contract Implementation GREEN/TRIANGULATE/REFACTOR

### Structured Status Consumed

- Native OpenSpec status was authoritative: change `consolidate-react-remix-into-router`, `applyState: ready`, planning dependencies complete, and `nextRecommended: apply`.
- Action context was `repo-local` with workspace root and allowed edit root `/Users/skynet/devx-op/effectify`; warnings: none.
- Parent delivery authority was `auto-chain`, `feature-branch-chain`, Work unit 2 only, maximum 1,000 changed lines. The live parent-owned attempt was authenticated using its token without creating another attempt.
- Skill resolution used the globally installed Gentle AI skill as a degraded fallback because no parent-injected skill path was supplied.

### Workload / PR Boundary

- Completed boundary: **PR 2 — bridge runtime GREEN**.
- Product/test changes are limited to `packages/react/remix/src/lib/runtime.ts` and behavior-preserving triangulation in `packages/react/remix/tests/runtime.test.ts`.
- No manifest, catalog, lockfile, RR8 package, RR8 adapter, RR8 app, dependency migration, or Work unit 3 change was made.
- Authored changed-line count: **334 additions + deletions** (245 product/test lines, 6 task-checkbox line changes, and 83 cumulative apply-progress lines). Generated mutations: **0 retained**. Nx typecheck touched the tracked RR8 tsbuildinfo; it was restored exactly to `HEAD` before the protected-diff check.

### Completed Tasks and Persisted Checkboxes

All three implementation-owned Work unit 2 rows are visibly marked `- [x]` in `tasks.md` and mirrored to Engram:

1. GREEN: ported local Cause traversal, whole-cause logging, redirect return behavior, and exact native throwable propagation; bridge suite passed 8/8 before triangulation.
2. TRIANGULATE: added independent loader/action redirect status/header cases and second exact-identity inputs; the exact focused filter passed 7 tests with 3 unrelated tests skipped.
3. REFACTOR: formatted the local runtime/tests, reran focused and full bridge checks, passed the two-project Nx matrix and format check, and proved the protected RR8 diff empty.

### Files Changed

- `packages/react/remix/src/lib/runtime.ts`
- `packages/react/remix/tests/runtime.test.ts`
- `openspec/changes/consolidate-react-remix-into-router/tasks.md` (Work unit 2 checkboxes only)
- `openspec/changes/consolidate-react-remix-into-router/apply-progress.md` (cumulative evidence)

### RED → GREEN → TRIANGULATE → REFACTOR Evidence

| Stage          | Exact command / action                                                                                                                                                                                          | Result                                                                                                                                                                    |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RED safety net | `pnpm nx run @effectify/react-remix:test -- tests/runtime.test.ts`                                                                                                                                              | Exit 1: 4 passed, 4 failed. Redirect returned a fallback object; action `Error` identity was lost; loader/action defect/interruption log counts were each 0 instead of 2. |
| GREEN          | Port smallest local runtime behavior, then rerun the same focused command                                                                                                                                       | Exit 0: 8/8 passed.                                                                                                                                                       |
| TRIANGULATE    | Add distinct loader 308/action 303 redirects with custom headers and additional loader/action `Response`/`Error` identities; run `pnpm nx run @effectify/react-remix:test -- tests/runtime.test.ts -t "redirect | identity                                                                                                                                                                  | defect | interrupt"` | Exit 0: 7 passed, 3 skipped. Existing defect/interruption assertions retained generic bodies and logger observations. |
| REFACTOR       | `pnpm nx run @effectify/repo:format`, focused bridge test, exact two-project matrix, then format check                                                                                                          | Exit 0: bridge 10/10; RR8 8/8; both package typecheck:no-build/lint/build targets passed; formatting passed.                                                              |

### Commands Run

| Command                                                                                                                                                     |     Exit | Observed result                                                                                             |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------- | -------: | ----------------------------------------------------------------------------------------------------------- |
| `pnpm nx run @effectify/react-remix:test -- tests/runtime.test.ts` (RED)                                                                                    |        1 | Expected documented RED: 4/8 failed.                                                                        |
| `pnpm nx run @effectify/react-remix:test -- tests/runtime.test.ts` (GREEN)                                                                                  |        0 | 8/8 passed.                                                                                                 |
| `pnpm nx run @effectify/react-remix:test -- tests/runtime.test.ts -t "redirect                                                                              | identity | defect                                                                                                      | interrupt"` | 0   | 7 passed, 3 skipped. |
| `pnpm nx run-many --targets=test,typecheck:no-build,lint,build --projects=@effectify/react-remix,@effectify/react-router`                                   |        0 | Bridge 10/10 and RR8 8/8; all typecheck:no-build, lint, and build targets passed.                           |
| `pnpm nx run @effectify/repo:format:check` (before formatting)                                                                                              |        1 | Detected format changes in the two assigned package files; remediated with the repository Nx format target. |
| `pnpm nx run @effectify/repo:format`                                                                                                                        |        0 | Formatted only changed files.                                                                               |
| `pnpm nx run @effectify/repo:format:check` (final)                                                                                                          |        0 | All matched files correctly formatted.                                                                      |
| `git diff --exit-code -- pnpm-workspace.yaml package.json pnpm-lock.yaml packages/react/router packages/react/router-better-auth apps/react-router-example` |        0 | Protected RR8/dependency diff empty after restoring command-generated tsbuildinfo mutation.                 |

### TDD Cycle Evidence

| Task                         | Test File                                    | Layer               | Safety Net                                     | RED                                                        | GREEN                                 | TRIANGULATE                                                        | REFACTOR                                              |
| ---------------------------- | -------------------------------------------- | ------------------- | ---------------------------------------------- | ---------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------- |
| Work unit 2 runtime behavior | `packages/react/remix/tests/runtime.test.ts` | Runtime integration | Expected 4/8 RED from committed contract suite | Four documented failures reproduced before production edit | 8/8 passed after minimal runtime port | Added two behavioral tests; focused filter passed 7 with 3 skipped | Formatted and reran focused/full matrix; bridge 10/10 |

Test summary: 2 triangulation tests added; 10 bridge tests and 8 protected RR8 tests passed. No pure functions were added beyond the local `failure` Cause traversal helper; no approval-only tests were needed because the committed RED suite was the behavioral specification.

### Deviations From Design

None. The bridge remains on pre-migration Remix dependencies, implementation code is local rather than imported from RR8, and protected RR8 surfaces remain unchanged.

### Remaining Tasks and Deferred Lifecycle Actions

- Exact unchecked implementation rows for Work unit 3 onward remain in the cumulative list above and in `tasks.md`; Work unit 3 is the next implementation boundary.
- All three parent-owned human evidence gates remain deferred and byte-for-byte unchanged in `tasks.md`.
- Apply is not globally complete; routing returns to the parent lifecycle/auto-chain orchestrator rather than starting Work unit 3 here.

## Bounded CI Correction — `bridge-contract-integration-correction`

- Parent-authorized PR 2 correction only; authoritative status remained `applyState: ready`, repo-local root `/Users/skynet/devx-op/effectify`, with no edit-root warnings.
- RED: focused app typecheck and the exact affected typecheck against `origin/docs/react-remix-consolidation-plan` each failed only on three impossible `loaderData.errors` reads in `demo.tsx`, `test.tsx`, and `todos.tsx`.
- GREEN: removed only those unreachable loader-failure render branches; loader success types remain narrow and runtime/framework/dependency contracts are unchanged.
- Verification passed: `pnpm nx run @effectify/react-remix-example:typecheck`; `pnpm nx affected --target=typecheck --base=origin/docs/react-remix-consolidation-plan --head=HEAD --parallel=1 --verbose`; and `pnpm nx run @effectify/react-remix:test -- tests/runtime.test.ts` (10/10).
- Formatting: repository format check initially identified pre-existing whole-file drift in the three touched routes; broad formatter output was reverted to preserve the bounded correction. No generated mutation is retained.
- Authored correction size before this evidence entry: 15 additions + 49 deletions across the three route files. Work Unit 3+ and parent-owned task checkboxes remain unchanged.
- Deviation: this source-compatible integration correction touches the pre-migration app earlier than its planned work unit solely to reconcile PR 2's narrowed loader success contract with affected CI.

## Bounded Format Correction — `bridge-contract-format-correction`

- Ran `pnpm nx run @effectify/repo:format`; Nx naturally formatted the three corrected route files and this already-touched progress file, with no semantic or task-checkbox changes.
- Verification passed: repository format check; exact affected typecheck against `origin/docs/react-remix-consolidation-plan`; bridge runtime tests (10/10); and `git diff --check`.
- Final correction objective: **390 changed lines** (170 additions, 220 deletions). Entire child versus the planning base: **952 changed lines** (595 additions, 357 deletions), below the 1,000-line boundary.
- Boundaries preserved: no manifest, dependency, lockfile, protected RR8 surface, task checkbox, or Work Unit 3 change; parent retains attempt settlement and delivery ownership.
