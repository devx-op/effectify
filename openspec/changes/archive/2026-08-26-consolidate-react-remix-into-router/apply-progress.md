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

The following Work unit 2 and Work unit 3 rows are now complete in the persisted tasks artifact; every exact unchecked Work unit 4+ row below remains outstanding:

- [x] GREEN: port the smallest RR8 cause traversal and response mapping behavior into `packages/react/remix/src/lib/runtime.ts` without importing RR8 implementation code or context classes; make `pnpm nx run @effectify/react-remix:test -- tests/runtime.test.ts` pass. <!-- sdd-owner: implementation -->
- [x] TRIANGULATE: add focused edge cases in `packages/react/remix/tests/runtime.test.ts` for both loader and action paths, non-default redirect status/custom headers, exact throwable identity, defect/interruption generic bodies, and logger observation; run `pnpm nx run @effectify/react-remix:test -- tests/runtime.test.ts -t "redirect|identity|defect|interrupt"`. Runtime harness: the focused tests execute real `ManagedRuntime` exits and inspect returned/thrown native `Response` values. <!-- sdd-owner: implementation -->
- [x] REFACTOR only after green, then run `pnpm nx run-many --targets=test,typecheck:no-build,lint,build --projects=@effectify/react-remix,@effectify/react-router` and `pnpm nx run @effectify/repo:format:check`; separately record bridge and RR8 results and confirm the protected RR8 diff remains empty with `git diff --exit-code -- pnpm-workspace.yaml package.json pnpm-lock.yaml packages/react/router packages/react-router-better-auth apps/react-router-example`. <!-- sdd-owner: implementation -->
- [x] RED: add `packages/react/remix/tests/json.test.ts` and a concrete dependency-isolation check under `scripts/verify-react-router-manifests.mjs` (or its exact consolidation-specific successor) that fails until bridge peer/dev `react-router` pins are exactly `7.18.2`, catalog/root RR8 remains `8.3.0`, and no bridge import uses `@remix-run/*`; run `pnpm nx run @effectify/react-remix:test -- tests/json.test.ts` and `pnpm nx run @effectify/react-router-example:migration:manifest` and record the expected failures. <!-- sdd-owner: implementation -->
- [x] GREEN: change `packages/react/remix/package.json` and `src/lib/{context,runtime}.ts` to exact direct RR7 `7.18.2`; implement `src/lib/json.ts` with `Response.json`, numeric/object init handling, native serialization, caller headers, and `@deprecated` export from `src/index.ts`; regenerate `pnpm-lock.yaml` with `pnpm install --lockfile-only`. <!-- sdd-owner: implementation -->
- [x] TRIANGULATE dependency isolation using `pnpm nx run @effectify/react-remix:test -- tests/json.test.ts`, `pnpm nx run @effectify/react-remix:test -- tests/runtime.test.ts`, `pnpm nx run @effectify/react-router-example:migration:manifest`, `pnpm why react-router --filter @effectify/react-remix`, and `pnpm why react-router --filter @effectify/react-router-example`; evidence must show RR7 `7.18.2` for the bridge and RR8 `8.3.0` for the protected app in distinct importer snapshots. Runtime harness: `json.test.ts` reads native response bodies/status/headers; dependency commands are non-runtime evidence. <!-- sdd-owner: implementation -->
- [x] REFACTOR and verify `pnpm nx run-many --targets=test,typecheck:no-build,lint,build --projects=@effectify/react-remix,@effectify/react-router`, `pnpm nx run @effectify/repo:format:check`, and scans proving no `json` export was added under `packages/react/router/**` and no RR7 entry was added to root `package.json` or the `pnpm-workspace.yaml` React Router catalog. <!-- sdd-owner: implementation -->
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

## Work Unit 3 / PR 3 — RR7 Dependency Isolation and Bridge-Local `json`

### Structured Status Consumed

- Authoritative native OpenSpec status: change `consolidate-react-remix-into-router`, `applyState: ready`, `nextRecommended: apply`, 6/47 implementation tasks complete before this slice, and no blockers.
- Action context: `repo-local`; workspace root and sole allowed edit root `/Users/skynet/devx-op/effectify`; warnings: none.
- Parent delivery authority: `auto-chain`, `feature-branch-chain`, work unit `rr7-dependency-isolation-json`, maximum 1,000 changed lines; parent owns settlement and delivery.
- Strict TDD was active. Injected skills were loaded from the two parent-provided paths.

### Workload / PR Boundary

- Completed boundary: **PR 3 — RR7 dependency isolation and bridge-local `json`**.
- Protected `packages/react/router/**`, `packages/react/router-better-auth/**`, `apps/react-router-example/**`, root `package.json`, and `pnpm-workspace.yaml` remained byte-for-byte unchanged.
- Work unit 4 and later behavior was not started. The Better Auth adapter/example state inherited from the parent was not edited.
- Rollback boundary: restore the bridge manifest/imports, `json.ts` and export, JSON tests, verifier/Nx target, and matching lockfile importer together; protected RR8 values are outside the rollback.
- Authored/generated counts against `test/react-remix-contract-green`: **310** authored additions + deletions, plus **95** generated `pnpm-lock.yaml` additions + deletions; total **405**, below 1,000.

### Completed Tasks and Persisted Checkboxes

All four implementation-owned Work unit 3 rows are visibly marked `- [x]` in `tasks.md`:

1. RED added the native-delegation JSON contract plus a fail-closed local dependency-isolation verifier and Nx target.
2. GREEN pinned bridge peer/dev `react-router` exactly `7.18.2`, replaced active bridge Remix imports, added local deprecated `json`, and regenerated the lockfile with `pnpm install --lockfile-only`.
3. TRIANGULATE proved native response behavior, RR7 runtime behavior, exact bridge RR7 resolution, and distinct protected RR8 resolution.
4. REFACTOR passed the two-package matrix, formatting, isolation target, protected manifest, residue scans, and protected diff.

### Files Changed

- `packages/react/remix/package.json`
- `packages/react/remix/project.json`
- `packages/react/remix/src/index.ts`
- `packages/react/remix/src/lib/context.ts`
- `packages/react/remix/src/lib/runtime.ts`
- `packages/react/remix/src/lib/json.ts` (new)
- `packages/react/remix/tests/runtime.test.ts`
- `packages/react/remix/tests/json.test.ts` (new)
- `scripts/verify-react-router-manifests.mjs`
- `pnpm-lock.yaml` (generated)
- `openspec/changes/consolidate-react-remix-into-router/tasks.md` (Work unit 3 checkboxes only)
- `openspec/changes/consolidate-react-remix-into-router/apply-progress.md` (cumulative evidence)

### RED → GREEN → TRIANGULATE → REFACTOR Evidence

| Stage         | Exact command/action                                                                                                                 | Result                                                                                                                           |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| Safety net    | `pnpm nx run @effectify/react-remix:test -- tests/runtime.test.ts`; `pnpm nx run @effectify/react-router-example:migration:manifest` | Exit 0: bridge 10/10; pre-change protected manifest command passed its prior 8.2 registry check.                                 |
| RED           | `pnpm nx run @effectify/react-remix:test -- tests/json.test.ts` after adding the native delegation assertion                         | Exit 1: 1 failed, 4 passed; existing Remix helper made zero calls to `Response.json`.                                            |
| RED isolation | `pnpm nx run @effectify/react-router-example:migration:manifest`; `pnpm nx run @effectify/react-remix:dependency:isolation`          | Exit 1: missing exact bridge RR7 peer/dev pins, retained Remix dependencies/imports, while protected 8.3 checks remained intact. |
| GREEN         | Local helper/import/manifest implementation, `pnpm install --lockfile-only`, then focused JSON test                                  | Exit 0: 5/5 JSON tests passed.                                                                                                   |
| TRIANGULATE   | Exact focused JSON/runtime/manifest and two `pnpm why` commands                                                                      | JSON 5/5 and runtime 10/10 passed; bridge showed `react-router 7.18.2`; protected app showed only `8.3.0`.                       |
| REFACTOR      | Exact two-project Nx matrix, format check, isolation target, scans, and protected diff                                               | Exit 0: bridge 15/15, RR8 8/8, both typecheck:no-build/lint/build sets passed, formatting and all isolation guards passed.       |

### TDD Cycle Evidence

| Task                 | Test File / Harness                                            | Layer                | Safety Net                             | RED                                               | GREEN                   | TRIANGULATE                                            | REFACTOR                                    |
| -------------------- | -------------------------------------------------------------- | -------------------- | -------------------------------------- | ------------------------------------------------- | ----------------------- | ------------------------------------------------------ | ------------------------------------------- |
| Bridge-local `json`  | `packages/react/remix/tests/json.test.ts`                      | Runtime unit         | Existing runtime 10/10                 | 1 failed, 4 passed on native delegation           | 5/5 passed              | Defaults, numeric/object init, headers, native failure | Matrix and format green                     |
| Dependency isolation | `scripts/verify-react-router-manifests.mjs` via two Nx targets | Manifest integration | Protected command passed before change | Both targets rejected missing pins/import residue | Isolation target passed | Distinct `pnpm why` snapshots: 7.18.2 / 8.3.0          | Fail-closed scans and protected diff passed |

Test summary: 5 JSON tests authored and passing; bridge package total 15/15; protected RR8 package 8/8. The local `json` function is a pure input-to-native-response adapter. No approval-only tests were needed.

### Commands and Deviations

- Final evidence ran under Node `v24.19.0` and pnpm `10.14.0`.
- `pnpm install --lockfile-only` was the only command that changed `pnpm-lock.yaml`. A later `pnpm install --frozen-lockfile` synchronized `node_modules` without changing the lockfile so the exact `pnpm why` and runtime commands executed RR7; a preceding offline frozen attempt failed because the RR7 tarball was not cached.
- The first JSON test run was 4/4 green because the old Remix helper already matched response shapes. Before production edits, the test was strengthened with the specified native `Response.json` delegation contract, producing the required RED failure.
- RR7 `LoaderFunctionArgs`/`ActionFunctionArgs` in 7.18.2 require `url` and `pattern`; test fixtures were completed after the first matrix exposed those type errors, then the full matrix passed.
- The verifier's stale `final-v8` registry expectation was corrected from 8.2.0 to the protected 8.3.0 fixed by this change's contract.

### Remaining Tasks and Deferred Lifecycle Actions

- Every exact unchecked implementation row from Work unit 4 onward remains listed above and visibly unchecked in `tasks.md`; Work unit 4 is the next implementation boundary.
- All three parent-owned human evidence gates remain deferred and byte-for-byte unchanged.
- Apply is not globally complete; return to `parent-lifecycle` without starting Work unit 4.

## Bounded Fixture Correction — `rr7-fixture-integration-correction`

- Parent-authorized PR #175 correction only; authoritative status remained `applyState: ready`, repo-local root `/Users/skynet/devx-op/effectify`, with no edit-root warnings. The feature-branch-chain boundary and 150-line cap were preserved.
- RED: the exact affected typecheck against `origin/test/react-remix-contract-green` reproduced five TS2345 errors because two route-test helpers returned Remix-v2 argument types without RR7 `url` and `pattern`.
- GREEN: both test files now derive helper outputs from `Parameters<typeof loader/action>[0]`, use stable `URL` values, and identify the matched patterns as `/api/auth/*` and `/test`; no runtime or product code changed.
- Verification passed: focused route tests (2 files, 5/5 tests), bridge runtime/JSON suites (2 files, 15/15 tests), exact affected typecheck (19 projects and 16 dependency tasks), repository format check, and `git diff --check`.
- Correction source count before this evidence entry: 24 additions + deletions across two test files. Generated cleanup restored both tracked React tsbuildinfo files and removed the untracked Prisma tsbuildinfo; final status retained only the two fixture files and this cumulative evidence file.
- Task state is unchanged: Work Unit 3 remains complete, Work Unit 4+ remains unchecked, and parent-owned rows remain deferred byte-for-byte. Parent owns attempt settlement and delivery; no commit, push, CI retry, receipt, or lifecycle actor was started.

## Work Unit 4 / PR 4 — App-Local RR7 Better Auth Adapter

### Structured Status Consumed

- Authoritative native OpenSpec status selected `consolidate-react-remix-into-router` with `applyState: ready`, `nextRecommended: apply`, 10/47 implementation tasks complete before this slice, and no blockers.
- Action context was `repo-local`; workspace root and sole allowed edit root were `/Users/skynet/devx-op/effectify`; warnings: none.
- Parent runtime authority was `proceed` for `rr7-better-auth-adapter`, maximum 1,000 changed lines, with parent-owned settlement and delivery.
- Delivery path remained `auto-chain`, `feature-branch-chain`; this executor implemented only Work unit 4 / PR 4.
- Strict TDD was active. Both parent-injected skill paths were loaded before implementation.

### Workload / PR Boundary

- Completed boundary: **PR 4 — workspace-only RR7 Better Auth adapter**.
- Product/test changes are limited to the former Remix application plus the two bridge context-key strings required for nominal runtime separation.
- No manifest, lockfile, framework migration, Work unit 5 behavior, RR8 package, RR8 adapter, RR8 application, release metadata, commit, push, PR, or lifecycle settlement was performed.
- Rollback boundary: revert the local adapter, its focused test/config alias, the two active app import replacements and route-test mock path, and the two bridge context-key strings together; protected RR8 files remain outside rollback.
- The local adapter is an application file, not an Nx library or release project. The exact project listing identifies `@effectify/react-remix-example` as an application.

### Completed Tasks and Persisted Checkboxes

All four implementation-owned Work unit 4 rows are visibly marked `- [x]` in `tasks.md`:

1. RED added the package-owned app test and recorded module-resolution failure before the adapter existed.
2. GREEN added the app-local adapter, exact bridge context imports, native auth-response pass-through, bridge-owned redirect model, typed `Unauthorized` policy, and active app import replacements.
3. TRIANGULATE proved request identity, RR8/lookalike rejection, body/status/Location/multiple-cookie fidelity, typed transport/parse errors, redirects, and route integration.
4. REFACTOR passed app typecheck, the exact protected package matrix, formatting, publication/import/version scans, and the protected-diff check.

### Files Changed

- `apps/react-remix-example/app/lib/react-router7-better-auth.server.ts` (new)
- `apps/react-remix-example/tests/unit/react-router7-better-auth.test.ts` (new)
- `apps/react-remix-example/app/routes/api.auth.$.ts`
- `apps/react-remix-example/app/routes/todos.tsx`
- `apps/react-remix-example/tests/unit/routes/api-auth.test.ts`
- `apps/react-remix-example/vitest.config.ts`
- `packages/react/remix/src/lib/context.ts`
- `openspec/changes/consolidate-react-remix-into-router/tasks.md` (Work unit 4 checkboxes only)
- `openspec/changes/consolidate-react-remix-into-router/apply-progress.md` (this cumulative evidence)

### RED → GREEN → TRIANGULATE → REFACTOR Evidence

| Stage         | Exact command/action                                                                                                                                                                  | Result                                                                                                                                                                                                                                                                                                                              |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RED           | `pnpm nx run @effectify/react-remix-example:test -- tests/unit/react-router7-better-auth.test.ts` after adding the test first                                                         | Exit 1 before production code: Vitest could not resolve `../../app/lib/react-router7-better-auth.server.js`; 0 tests executed, proving the app-local adapter was absent. An initial harness import of the non-app dependency `@effectify/react-router` was corrected to the protected source context before this authoritative RED. |
| GREEN         | Add the local adapter and active app imports; run the same focused test                                                                                                               | Exit 0 after minimal implementation and context-key separation: 11/11 passed.                                                                                                                                                                                                                                                       |
| TRIANGULATE   | Add typed transport/parse `Unauthorized` inputs; run `pnpm nx run @effectify/react-remix-example:test -- tests/unit/react-router7-better-auth.test.ts -t "context                     | cookie                                                                                                                                                                                                                                                                                                                              | redirect | Unauthorized"` | Exit 0: 13/13 passed. Exact bridge request identity, four RR8/lookalike rejection cases, both guard modes, two-cookie arrays, and typed failure cases passed. |
| Route harness | `pnpm nx run @effectify/react-remix-example:test -- tests/unit/routes/api-auth.test.ts`                                                                                               | Exit 0: 2/2 loader/action route integration tests passed.                                                                                                                                                                                                                                                                           |
| REFACTOR      | Split loader/action session acquisition to retain exact context requirements, format, app typecheck, exact protected package matrix, project/release/import scans, and protected diff | Exit 0: app typecheck passed; RR8 package 8/8 and RR8 adapter 9/9 tests passed; all requested typecheck:no-build/lint/build targets passed; formatting and scans passed.                                                                                                                                                            |

### TDD Cycle Evidence

| Task                                         | Test File / Harness                                                     | Safety Net                                             | RED                                               | GREEN                                          | TRIANGULATE                                                            | REFACTOR                                                                       |
| -------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Exact-context handlers and response fidelity | `apps/react-remix-example/tests/unit/react-router7-better-auth.test.ts` | Existing route harness and protected RR8 adapter suite | Missing local module failed before implementation | 11/11 passed                                   | 13/13 passed with transport/parse inputs and both contexts             | Shared request-session logic retained separate exact loader/action acquisition |
| Active route integration                     | `apps/react-remix-example/tests/unit/routes/api-auth.test.ts`           | Existing 2-test route suite                            | Existing mock targeted the protected adapter      | Mock/import moved with production route import | Loader/action 2/2 passed                                               | No route behavior changes                                                      |
| Publication and protected boundary           | Nx project enumeration, scans, protected matrix/diff                    | RR8 exact 8.3.0 parent baseline                        | N/A structural gate                               | Local file remained app-owned                  | No adapter library/release node and no active protected-adapter import | Protected RR8 diff empty after generated cleanup                               |

### Commands Run

- Focused adapter RED: exit 1, missing local module, 0 tests.
- Focused adapter GREEN: exit 0, 11/11 tests.
- Focused adapter TRIANGULATE/final: exit 0, 13/13 tests.
- Focused route harness: exit 0, 2/2 tests.
- `pnpm nx run @effectify/react-remix-example:typecheck`: final exit 0 after the refactor; it also built the bridge and proved the new nominal keys compile.
- `pnpm nx show projects --type=lib`: passed; no app-local adapter or Remix example library was listed.
- `pnpm nx show project @effectify/react-remix-example --json`: passed; project type is `application`.
- `pnpm nx run-many --targets=test,typecheck:no-build,lint,build --projects=@effectify/react-router,@effectify/react-router-better-auth`: passed; RR8 package 8/8, adapter 9/9, and every requested target succeeded.
- `pnpm nx run @effectify/repo:format:check`: passed after repository formatting.
- Import/release scans: passed; no active TypeScript import of `@effectify/react-router-better-auth`, no local-adapter release entry, and no local-adapter library project.
- `pnpm why react-router --filter @effectify/react-router-example`: protected app resolved only React Router `8.3.0`.
- `git diff --exit-code ac19079 -- package.json pnpm-workspace.yaml pnpm-lock.yaml packages/react/router packages/react/router-better-auth apps/react-router-example`: passed after restoring command-generated `packages/react/router/tsconfig.lib.tsbuildinfo`.
- `git diff --check`: passed.

### Deviations and Cleanup

- Minimal design-enabling correction: Effect v4 keys services by the `Context.Service` string, and both bridge and protected classes previously used `LoaderArgsContext` / `ActionArgsContext`. The RED identity tests demonstrated RR8/lookalike contexts could satisfy the bridge slot. The bridge-only key strings were therefore namespaced to `@effectify/react-remix/...`; protected RR8 stayed unchanged. This is required by the exact-major context identity specification.
- The app Vitest configuration aliases `@effectify/react-remix` to package source because the app package link otherwise loaded stale pre-build `dist` during focused tests. Production imports remain the exact package import.
- The first app typecheck exposed union-context inference in shared verification and expected type errors in deliberate wrong-context tests. Separate loader/action context acquisition and explicit `@ts-expect-error` negative-contract lines resolved those harness issues without type assertions.
- Command-generated protected RR8 tsbuildinfo was restored. Generated bridge output and Prisma output are ignored and not retained as authored changes.
- No manifest or lockfile changed, even though the old app manifest dependency remains for a later bounded work unit; all active TypeScript imports now use the local adapter.

### Remaining Tasks and Deferred Lifecycle Actions

- Exactly 33 implementation-owned rows remain unchecked, beginning with Work unit 5. Their exact `- [ ]` lines are retained byte-for-byte in the cumulative task-state section above and in `tasks.md`.
- All three parent-owned human evidence gates remain unchecked, deferred, and byte-for-byte unchanged.
- Work unit 5 is the next implementation boundary. This executor returns to `parent-lifecycle` and does not start it.

## Work Unit 5 / PR 5 — Official RR7 Framework Configuration

### Structured Status Consumed

- Authoritative native OpenSpec status selected `consolidate-react-remix-into-router` with `applyState: ready`, `nextRecommended: apply`, 14/47 implementation tasks complete before this slice, and no blockers.
- Artifact store was `both` for phase persistence: OpenSpec remained authoritative and the required tasks/spec/design/apply-progress Engram observations were fetched directly.
- Action context was `repo-local`; workspace root and sole allowed edit root were `/Users/skynet/devx-op/effectify`; warnings: none.
- Parent runtime authority was authenticated as the existing `proceed` attempt for `rr7-framework-config`, maximum 1,000 changed lines; parent owns settlement and delivery.
- Delivery path remained `auto-chain`, `feature-branch-chain`; this executor implemented only Work unit 5 / PR 5 under strict TDD.

### Workload / PR Boundary

- Completed boundary: **PR 5 — RR7 framework configuration and explicit routes**.
- Authored files are limited to the former Remix application's manifest/project/Vite/TypeScript/framework/route-map configuration, its focused structural test, WU5 task checkboxes, and this cumulative evidence.
- Generated changes are limited to the app importer and required RR7 resolutions in `pnpm-lock.yaml`; it was regenerated only with `pnpm install --lockfile-only`.
- Final size: **250 authored additions + deletions**, plus **173 generated lockfile additions + deletions**; **423 total**, below the 1,000-line boundary.
- No executable entries, components, or route modules were migrated; Work unit 6 was not started. Protected RR8 package, adapter, application, catalog, and root versions remained unchanged.
- Runtime harness: **N/A** because this slice declares framework configuration and routes without migrating executable browser/server entries.
- Rollback boundary: restore `apps/react-remix-example/{package.json,project.json,vite.config.ts,tsconfig.json}`, remove `react-router.config.ts` and `app/routes.ts`, remove the focused config test, and restore the matching lockfile importer together.

### Completed Tasks and Persisted Checkboxes

All four implementation-owned Work unit 5 rows are visibly marked `- [x]` in `tasks.md`:

1. RED added 14 focused assertions for exact framework pins/scripts, native Vite/SSR config, generated-type inputs, Nx ordering, route modules, URL matching, and splat parameters; all 14 failed before production edits.
2. GREEN pinned the app-owned React Router family directly to `7.18.2`, switched official scripts and native `reactRouter()`, added SSR config and the explicit route map, included generated types, added Nx `typegen`, wired typecheck/build ordering, and regenerated the lockfile.
3. TRIANGULATE passed 12 route/splat/typegen-focused cases with two unrelated cases skipped, then cleanly generated RR7 framework types through Nx.
4. Version isolation passed the protected manifest, both importer-specific `pnpm why` commands, final formatting, and protected-diff checks.

### Files Changed

- `apps/react-remix-example/package.json`
- `apps/react-remix-example/project.json`
- `apps/react-remix-example/vite.config.ts`
- `apps/react-remix-example/tsconfig.json`
- `apps/react-remix-example/react-router.config.ts` (new)
- `apps/react-remix-example/app/routes.ts` (new)
- `apps/react-remix-example/tests/unit/config/react-router7-framework.test.ts` (new)
- `pnpm-lock.yaml` (generated)
- `openspec/changes/consolidate-react-remix-into-router/tasks.md` (WU5 checkboxes only)
- `openspec/changes/consolidate-react-remix-into-router/apply-progress.md` (this cumulative evidence)

### RED → GREEN → TRIANGULATE → REFACTOR Evidence

| Stage       | Exact command/action                                                                                                                                                      | Result                                                                                             |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Safety net  | `pnpm nx run @effectify/react-remix-example:test -- tests/unit/react-router7-better-auth.test.ts tests/unit/routes/api-auth.test.ts tests/unit/routes/test-route.test.ts` | Exit 0: 3 files and 18/18 existing app tests passed before production edits.                       |
| RED         | `pnpm nx run @effectify/react-remix-example:test -- tests/unit/config/react-router7-framework.test.ts`                                                                    | Exit 1: 14/14 failed on absent RR7 pins/scripts/config/types/Nx ordering/routes.                   |
| GREEN       | Implement the bounded configuration, then rerun the focused command                                                                                                       | Exit 0: 14/14 passed.                                                                              |
| TRIANGULATE | `pnpm nx run @effectify/react-remix-example:test -- tests/unit/config/react-router7-framework.test.ts -t "route                                                           | splat                                                                                              | typegen"` | Exit 0: 12 passed, 2 skipped; exact URLs, route precedence, and three splat values passed. |
| TYPEGEN     | `rm -rf apps/react-remix-example/.react-router && pnpm nx run @effectify/react-remix-example:typegen`                                                                     | Exit 0: RR7 type generation completed; deprecation warnings for upstream `envFile` were non-fatal. |
| REFACTOR    | `pnpm nx run @effectify/repo:format`, focused test, and `pnpm nx run @effectify/repo:format:check`                                                                        | Exit 0 final: 14/14 and formatting passed after generated output was cleaned.                      |

### Version and Manifest Evidence

- `pnpm nx run @effectify/react-router-example:migration:manifest`: exit 0; bridge isolation remained RR7 `7.18.2`, and the protected manifest family (`react-router`, `@react-router/dev`, `@react-router/node`, `@react-router/serve`) remained RR8 `8.3.0`.
- `pnpm why react-router --filter @effectify/react-remix-example`: exit 0; every app-owned RR7 framework edge resolved `7.18.2`. Legacy Remix dependencies still resolve their temporary RR6 internals because executable source migration is explicitly deferred to WU6.
- `pnpm why react-router --filter @effectify/react-router-example`: exit 0; every protected app/package/adapter edge resolved only RR8 `8.3.0`.
- Focused manifest assertions proved all four direct RR7 app entries equal `7.18.2`; root `package.json` and `pnpm-workspace.yaml` retained RR8 `8.3.0` and gained no RR7 entry.
- `pnpm nx show project @effectify/react-remix-example --json` exposed dedicated `typegen`; `typecheck` depends on `typegen` plus Prisma generation, and `build` depends on `typegen` plus upstream builds. No obsolete explicit Nx/Remix exclusion existed to remove.

### TDD Cycle Evidence

| Task                 | Test File                                           | Layer                      | Safety Net                      | RED                                                            | GREEN        | TRIANGULATE                                                              | REFACTOR                           |
| -------------------- | --------------------------------------------------- | -------------------------- | ------------------------------- | -------------------------------------------------------------- | ------------ | ------------------------------------------------------------------------ | ---------------------------------- |
| RR7 framework config | `tests/unit/config/react-router7-framework.test.ts` | Structural integration     | 18/18 existing app tests        | 3 configuration tests failed                                   | 3/3 passed   | Exact family, SSR/plugin, generated inputs, and two Nx dependency chains | Formatted; 3/3 remained green      |
| Explicit route map   | same file                                           | Route matching integration | Existing route tests passed 5/5 | 11 route/splat cases failed because `app/routes.ts` was absent | 11/11 passed | Eight URLs and three distinct splat values passed                        | Focused suite remained 14/14 green |

Test summary: 14 assertions/tests authored and passing; layers used were structural and route-matching integration; no approval tests or pure functions were needed for declarative configuration.

### Deviations and Cleanup

- Scope-preserving deferment: legacy `@remix-run/*` dependencies remain while executable app source is intentionally Remix-shaped; WU6 owns source/import/residue removal. All official scripts, Vite/framework config, route declarations, generated types, and direct React Router family entries are RR7 `7.18.2` now.
- The first lockfile-only regeneration after experimentally removing the legacy dependencies produced 2,824 lockfile additions/deletions and was immediately reverted before further work to honor the 1,000-line boundary. The bounded final manifest retained source-required legacy dependencies and a second `pnpm install --lockfile-only` produced 173 generated lockfile additions/deletions.
- `pnpm install --frozen-lockfile` synchronized `node_modules` after lockfile-only generation without changing the lockfile, ensuring typegen and `pnpm why` ran against RR7 `7.18.2`.
- Initial format check saw generated `.react-router` files plus the new test; generated output was removed, authored files were formatted through Nx, and final format check passed.
- `apps/react-remix-example/.react-router` is absent; no RR7 app tsbuildinfo was generated or retained. Existing protected tracked tsbuildinfo files were not modified.
- `git diff --exit-code -- package.json pnpm-workspace.yaml packages/react/router packages/react/router-better-auth apps/react-router-example` and `git diff --check` passed.

### Remaining Tasks and Deferred Lifecycle Actions

- Exactly 29 implementation-owned rows remain unchecked, beginning with Work unit 6. Their exact `- [ ]` lines are already preserved byte-for-byte in the earlier cumulative task-state section and the authoritative `tasks.md`; the four historical WU5 lines in that earlier snapshot are superseded by their visible `[x]` state.
- All three parent-owned human evidence gates remain unchecked, deferred, and byte-for-byte unchanged.
- Work unit 6 is the next implementation boundary, but this executor returns to `parent-lifecycle` and did not start it.

## Bounded WU5 Green-Split Correction — `rr7-framework-green-split-correction`

### Structured Status and Boundary

- Authoritative OpenSpec status selected `consolidate-react-remix-into-router` with `applyState: ready`, `nextRecommended: apply`, and no blockers. Action context was `repo-local` with `/Users/skynet/devx-op/effectify` as workspace and allowed edit root; warnings: none.
- Parent runtime authority was authenticated as the existing `proceed` attempt for `rr7-framework-green-split-correction`, maximum 500 correction lines; parent owns settlement and delivery.
- Delivery remains `auto-chain`, `feature-branch-chain`. This correction changes only WU5 staging and planning evidence; WU6 activation was not started.
- Accepted boundary: WU5 keeps declarative RR7 `7.18.2` config/routes/typegen green under executable Remix scripts/plugin/source. WU6 atomically switches scripts/plugin, removes Remix dependencies, and migrates entries/source.

### Completed Tasks and Files

All four implementation-owned correction rows are visibly `[x]` in `tasks.md`: RED staging assertions, GREEN config correction, TRIANGULATE app/typegen/build evidence, and REFACTOR planning/verification/cleanup evidence.

Files changed by the correction:

- `apps/react-remix-example/package.json`
- `apps/react-remix-example/vite.config.ts`
- `apps/react-remix-example/tsconfig.json`
- `apps/react-remix-example/app/routes/api.$.ts`
- `apps/react-remix-example/tests/unit/config/react-router7-framework.test.ts`
- `openspec/changes/consolidate-react-remix-into-router/design.md`
- `openspec/changes/consolidate-react-remix-into-router/tasks.md`
- `openspec/changes/consolidate-react-remix-into-router/apply-progress.md`

Rollback boundary: revert these correction edits to recover committed WU5; no lockfile, RR7 declarations/routes, protected RR8 source, or WU6 source was changed.

### TDD Cycle Evidence

| Task                             | Test File / Harness                                 | Layer                      | Safety Net                                  | RED                                                                                           | GREEN                                                           | TRIANGULATE                                                                               | REFACTOR                                      |
| -------------------------------- | --------------------------------------------------- | -------------------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------- |
| Green staging gate               | `tests/unit/config/react-router7-framework.test.ts` | Structural integration     | Existing focused suite 14/14                | Revised suite failed 3/14 on RR7 scripts, RR7 Vite plugin, and missing rootDirs               | WU4 Remix scripts/plugin plus rootDirs made 14/14 pass          | Exact pins, legacy pins, routes, splats, SSR declaration, typegen inputs/order all passed | Formatted; final focused suite remained green |
| Clean generated-type consumption | RR7 typegen followed by app typecheck/build         | Compiler/build integration | Parent verifier identified missing rootDirs | First clean typecheck exposed the explicit commented `/api/*` placeholder was not a TS module | Framework-neutral `export {}` made clean typegen→typecheck pass | Remix production build and full 32-test app suite passed                                  | Generated type/build outputs removed          |

Test summary: no new test count beyond the revised 14-test focused suite; all 32 app tests passed. No approval tests or pure functions were added. The route-module marker is framework-neutral and has no runtime branch to triangulate.

### Verification Evidence

- Focused staging baseline: 14/14 passed before test revision.
- RED: focused revised suite failed exactly 3/14; scripts were RR7-active, Vite used `reactRouter()`, and `rootDirs` was absent.
- GREEN/final focused: 14/14 passed; route/staging filter also passed 14/14.
- Clean `typegen` succeeded; first typecheck failed only because `app/routes/api.$.ts` was not a module. After `export {}`, clean typegen→typecheck passed.
- Remix production build passed and produced client/server bundles; full app suite passed 4 files, 32/32 tests.
- Dependency isolation and protected manifest passed: bridge/app-owned RR7 is `7.18.2`, protected family is `8.3.0`; importer-specific `pnpm why` showed the expected isolated graphs and retained Remix 6 internals only under legacy Remix dependencies.
- Protected package/adapter matrix passed: RR8 package 8/8 tests, adapter 9/9 tests, plus typecheck:no-build, lint, and build.
- Protected app `migration:test` passed 9/9, full tests passed 71/71, and clean typegen, typecheck, and production build passed.
- Protected app `migration:verify` remained red on its repository CI-workflow assertion (`lint must map pull_request ... and push to HEAD~1`). The workflow/verifier are unchanged from WU4 and outside this correction; all executable RR8 app/package checks passed.
- Repository format and `git diff --check` passed after cleanup. Protected RR8 source/config diff from WU4 remained empty.

### Deviations, Cleanup, and Remaining Work

- Necessary framework-neutral deviation: added `export {}` to the fully commented `/api/*` placeholder so RR7-generated declarations can import every explicit route during WU5 without migrating route behavior.
- No SSR/entry characterization was added: current app tests plus successful Remix production build adequately characterize the WU5 execution boundary, and adding WU6 entry assertions here was unnecessary.
- Removed both apps' `.react-router` directories and build outputs; restored command-touched protected `packages/react/router/tsconfig.lib.tsbuildinfo`; no generated output remains.
- Historical WU5 RED/GREEN evidence is retained as history. Its claims that RR7 scripts/plugin were active are superseded by this accepted correction; declarative RR7 pins/config/routes/typegen evidence remains valid.
- WU5 forecast is 550–720 lines; WU6 forecast is 580–900 lines. The final revised WU5 count is recorded after this evidence block and must remain below 1,000.
- Exact next WU6 rows remain unchecked in `tasks.md`, beginning with:
  - [ ] RED: add/extend `apps/react-remix-example/tests/unit/config/react-router7-framework.test.ts`, `tests/unit/entry-server.test.ts`, and focused route tests to assert RR7 imports, `HydratedRouter`, `ServerRouter`, `@react-router/node` streaming, route statuses/headers/content, bot/browser readiness, stream-error status, URLs, and `/api/auth/session` splat params; run the focused files through `pnpm nx run @effectify/react-remix-example:test -- tests/unit/config/react-router7-framework.test.ts tests/unit/entry-server.test.ts tests/unit/routes/api-auth.test.ts tests/unit/routes/test-route.test.ts` and record expected failures. <!-- sdd-owner: implementation -->
  - [ ] GREEN: atomically switch `build`/`dev`/`start` and Vite plugin execution to RR7, remove exact legacy Remix dependencies with lockfile regeneration, and migrate `apps/react-remix-example/app/{entry.client.tsx,entry.server.tsx,root.tsx,components/**,routes/**,lib/**}` from active `@remix-run/*` APIs to `react-router`, `react-router/dom`, and `@react-router/node`, preserving every explicit route behavior and using only the local RR7 adapter. <!-- sdd-owner: implementation -->
- The remaining unchanged WU6 verification rows, WU7+ implementation rows, and all three parent-owned lifecycle rows remain unchecked and deferred exactly as persisted in `tasks.md`. Lifecycle routing returns to the parent; no commit, push, PR, review, receipt, or settlement was performed.
- Final revised WU5 count versus WU4 `5af4464`: **408 authored + 173 generated lockfile = 581 total changed lines**; correction-only delta versus committed WU5: **204 authored lines**, below the 500-line correction cap.

## Blocked Work Unit 6 Attempt — `rr7-atomic-runtime-activation`

### Structured Status and Boundary

- Authoritative native OpenSpec status selected `consolidate-react-remix-into-router` with `applyState: ready`, `nextRecommended: apply`, 22/51 implementation rows complete, and no blockers.
- Action context was `repo-local`; workspace and allowed edit root were `/Users/skynet/devx-op/effectify`; warnings: none.
- Parent runtime authority was authenticated as the existing `proceed` attempt for `rr7-atomic-runtime-activation`, maximum 1,000 changed lines. Parent owns settlement and delivery.
- Delivery remained `auto-chain`, `feature-branch-chain`, Work unit 6 only, under strict TDD.

### RED → GREEN Evidence Before the Size Gate

- Safety net: the three existing focused files passed 19/19 before edits.
- RED: config, a new entry-server harness, and focused route characterization executed 25 tests; 22 passed and 3 failed exactly on retained Remix dependencies/scripts, the Remix Vite plugin, and Remix browser/server/source imports.
- Provisional GREEN: the same four focused files passed 25/25 after atomically switching scripts/plugin, removing manifest dependencies, migrating all active source imports, adding `HydratedRouter`, `ServerRouter`, and `@react-router/node` streaming, and preserving route/SSR behavior.
- Route/SSR coverage observed browser `onShellReady`, bot and SPA `onAllReady`, stream-error status 500, shell-error rejection, status 202, existing headers, HTML content, all declared URLs, and `/api/auth/session` splat propagation.

### Hard Blocker: Generated Lockfile Exceeds the Native Bound

- The mandatory `pnpm install --lockfile-only` succeeded, but pruning the now-unused Remix graph produced **2,727 generated lockfile lines** (36 additions, 2,691 deletions).
- The measured provisional candidate versus WU5 base `f1dc553` was **393 authored lines** (220 additions, 173 deletions) plus **2,727 generated lines**, totaling **3,120 changed lines**.
- This exceeds the explicit 1,000-line native limit by 2,120 lines. Removing all 119 lines of the new entry-server test would still leave 3,001 changed lines, so removing duplicated nonessential test prose cannot remediate the bound.
- Retaining stale orphan Remix lockfile snapshots after lockfile-only regeneration or retaining legacy manifest dependencies would violate the exact WU6 requirements. Splitting activation is explicitly forbidden because it would create a mixed, non-publishable framework boundary.
- Implementation stopped before TRIANGULATE/full app/protected RR8/format verification. No WU6 checkbox is complete or checked.

### Cleanup and Remaining Tasks

- Restored all provisional application and lockfile edits to exact WU5 `f1dc553`, removed the untracked entry-server test, and reran the original focused WU5 suite: 19/19 passed.
- No protected RR8 source, package, adapter, application, catalog, root dependency, task checkbox, generated output, commit, push, PR, review, receipt, or settlement was changed.
- Deviation: WU6's forecast expected no generated lockfile churn, but the required lockfile-only install deterministically pruned 2,727 lines of app-exclusive Remix resolutions.
- Exact unchecked WU6 rows remain unchanged in `tasks.md`: RED; atomic GREEN; executable TRIANGULATE; clean typegen/typecheck/build/lint/format/residue REFACTOR; and the independent protected RR8 matrix.
- Decision needed: parent/maintainer must revise the 1,000-line accounting for generated lockfile pruning or explicitly authorize another compliant boundary. The executor cannot cross the limit or split atomic activation.

## Work Unit 6 / PR6a — Green RR7 Runtime and Source Activation (Attempt 2/2)

### Structured Status and Delivery Boundary

- Authoritative native OpenSpec status selected `consolidate-react-remix-into-router`; pre-run `applyState: ready`, `nextRecommended: apply`, 22/51 rows complete, and no blockers.
- Action context was `repo-local`; workspace and sole allowed edit root were `/Users/skynet/devx-op/effectify`; warnings: none.
- The delegated executor authenticated the parent-owned `proceed` attempt for `rr7-atomic-runtime-activation`, maximum 1,000 lines. Parent owns settlement, commit, push, and PR creation.
- Human delivery decision: **Split + generated-lockfile exception**. This attempt implemented only PR6a; PR6b and WU7 were not started.
- The failed attempt-1 evidence above is retained unchanged. Passing candidate evidence revision: `sha256:bccedd6b0c475b65d82be7b6568bf912ad2639cb27e080f812bf49fbc6422c85`, distinct from and remediating failed revision `sha256:7df36292a60aa903b25dda82bb3e5f66d51d2d2dd1626f87a8a1ada7c37be212`.

### Completed Tasks and Persisted Checkboxes

All five implementation-owned PR6a rows are visibly `- [x]` in `tasks.md`: RED, runtime/source GREEN, executable TRIANGULATE, clean/refactor/residue evidence, and the independent protected RR8 `8.3.0` matrix. Design and tasks now model PR6a separately from honest unchecked PR6b dependency/lockfile work.

### Implemented Behavior and Files Changed

- Activated `react-router build`, `react-router dev`, and `react-router-serve`; activated `reactRouter()` from `@react-router/dev/vite`.
- Replaced active application framework imports with `react-router`, hydration with `HydratedRouter` from `react-router/dom`, SSR with `ServerRouter`, and streaming conversion with `@react-router/node`.
- Preserved explicit URLs, `/api/auth/session` splat behavior, local RR7 Better Auth adapter responses, route status/payload behavior, browser/bot/SPA readiness, stream-error status, shell-error rejection, headers, and streamed HTML.
- Retained exact manifest declarations for `@remix-run/node`, `@remix-run/react`, `@remix-run/serve`, and `@remix-run/dev` at `2.17.5`; they are unused by active code and intentionally pending PR6b. `pnpm-lock.yaml` was not modified.
- Product/test files changed: app package/Vite config; `entry.client.tsx`, `entry.server.tsx`, `root.tsx`, `components/Nav.tsx`, route imports and unreachable generated-type branches; focused framework and new SSR tests.
- Evidence support changed: `scripts/verify-react-router-readiness.mjs` now checks protected RR8 `8.3.0` and the current GitHub event-derived CI base contract; OpenSpec `design.md`, `tasks.md`, and this cumulative progress artifact were updated.

### TDD Cycle Evidence

| Task                                  | Test File / Harness                                 | Layer                    | Safety Net                                                 | RED                                                                              | GREEN                                                                                       | TRIANGULATE                                                             | REFACTOR                                                          |
| ------------------------------------- | --------------------------------------------------- | ------------------------ | ---------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------- |
| PR6a scripts/plugin/source activation | `tests/unit/config/react-router7-framework.test.ts` | Structural integration   | Existing focused suite 19/19                               | 25 executed: 22 passed, 3 failed on scripts, Vite plugin, and source contracts   | Focused four-file suite 25/25                                                               | Route map/splats plus entry and route harnesses; full app 38/38         | Format, lint, scans, and focused/full reruns passed               |
| RR7 SSR streaming                     | `tests/unit/entry-server.test.ts`                   | Runtime integration      | Historical entry behavior characterized before source edit | RR7 source contract remained RED while five SSR cases already preserved behavior | Browser `onShellReady`, bot/SPA `onAllReady`, status/headers/HTML, 500 and rejection passed | Five cases cover distinct readiness and error paths                     | Final focused suite remained 25/25                                |
| Generated RR7 route typing            | Clean `typegen` → `typecheck`                       | Type integration         | Focused runtime suite green                                | Typecheck exposed four impossible `actionData.errors` reads                      | Removed only unreachable response branches; clean sequence passed                           | Route blank-validation/status tests remained green                      | Removed resulting unused action-data/context imports; lint passed |
| Protected RR8 readiness harness       | `migration:verify`                                  | Verification integration | Package matrix and manifest passed at 8.3.0                | Existing verifier rejected current CI base derivation and still expected 8.2.0   | Minimal harness alignment reported RR8 8.3.0 and passed                                     | Migration test 9/9, protected app 71/71, typegen/typecheck/build passed | Final format and migration verify rerun passed                    |

### Commands and Results

| Command                                                                               | Result                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Pre-edit focused three-file app suite                                                 | 19/19 passed.                                                                                                                                                                              |
| Focused RED four-file suite                                                           | Expected RED: 22/25 passed; exact three failures were scripts, Vite plugin, and RR7 source contracts.                                                                                      |
| Focused GREEN four-file suite                                                         | 25/25 passed.                                                                                                                                                                              |
| Entry/auth/test route triangulation                                                   | 10/10 passed.                                                                                                                                                                              |
| Complete RR7 app test target                                                          | 38/38 passed.                                                                                                                                                                              |
| Clean RR7 `typegen` → `typecheck` → `build`                                           | First typecheck RED on four unreachable action-failure reads; remediated rerun passed and production client/server builds completed.                                                       |
| RR7 app lint                                                                          | Passed with one pre-existing commented-file warning in `app/lib/http.server.ts`; no errors.                                                                                                |
| Dependency/source isolation                                                           | Active Remix source imports, `RemixBrowser`/`RemixServer`, Remix commands, and Remix Vite plugin matches all 0; exact four legacy declarations remain; lockfile delta 0; protected diff 0. |
| `pnpm why react-router` for RR7 / RR8 apps                                            | RR7 executable family resolves direct 7.18.2; intentionally declared Remix residue still carries legacy RR6 transitives pending PR6b; protected app resolves 8.3.0 only.                   |
| Protected RR8 package/adapter matrix                                                  | Router 8/8 and Better Auth adapter 9/9 tests passed; both typecheck:no-build, lint, and build sets passed.                                                                                 |
| Protected app manifest / verify / migration:test / test / typegen / typecheck / build | Manifest and remediated verify passed at 8.3.0; migration 9/9 and app 71/71 passed; generated types, typecheck, and production build passed.                                               |
| Repository format/check and `git diff --check`                                        | Passed.                                                                                                                                                                                    |

### Counts, Rollback, Cleanup, and Deviations

- Final WU5-base count: `711` authored additions + deletions, `0` generated lockfile lines, `711` total; below the 1,000-line limit. The count includes cumulative attempt-1 evidence, PR6a implementation/tests, planning split updates, and this evidence section.
- Rollback boundary: restore PR6a scripts/plugin/entries/source/tests and the protected readiness harness to WU5. Keep manifests and `pnpm-lock.yaml` unchanged. PR6b rollback independently restores its four declarations and exact PR6a lockfile.
- Cleanup: removed both apps’ generated `.react-router` directories and build output, restored command-touched tracked RR8 tsbuildinfo, retained no generated mutation, and confirmed protected source/catalog/root diff 0.
- Accepted deviation: original WU6 removed dependencies atomically; the human-approved split retains declared-but-unused residue in green PR6a and defers no-residue dependency/lockfile evidence to PR6b.
- Verification-harness deviation: the independent RR8 matrix required a small stale-harness correction from 8.2.0/simple `HEAD~1` assumptions to protected 8.3.0/current event-derived CI bases; no protected RR8 product, adapter, app, catalog, root manifest, or lockfile changed.
- Generated RR7 typing made response-bypass branches unreachable, so only those impossible action-data render branches and now-unused imports were removed; runtime route failures remain covered as native responses.

### Exact Remaining Implementation Tasks

- [ ] RED: update the manifest/isolation guard to reject the four now-unused `@remix-run/{node,react,serve,dev}` declarations and run it against green PR6a, recording the expected dependency-residue failure without changing runtime/source. <!-- sdd-owner: implementation -->
- [ ] GREEN: remove only the four legacy Remix manifest dependencies and run `pnpm install --lockfile-only`; retain the deterministic generated prune (~2,727 changed lockfile lines) under the explicitly authorized generated-line exception, with authored changes kept tiny. <!-- sdd-owner: implementation -->
- [ ] TRIANGULATE/REFACTOR: prove no Remix dependency resolution remains, rerun focused/full RR7 app and independent RR8 `8.3.0` checks, format, clean generated output, record authored/generated counts separately, and confirm PR6b contains no runtime/source behavior change. <!-- sdd-owner: implementation -->
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

### Deferred Parent-Owned Lifecycle Actions

- [ ] After work unit 7 and before work unit 8, confirm every proposed `transfer to RR8` row in `docs/migrations/react-remix-to-react-router.md` is genuinely unique, every `existing RR8` row cites concrete equivalent files/tests, and every `remove` row has an accepted justification; record accepted reviewers and release only the accepted transfer rows to implementation. <!-- sdd-owner: parent -->
- [ ] After work unit 9 and before work unit 10, confirm the validator reports OPEN, every documented consumer is migrated, every scenario disposition is reviewed and complete with passing evidence, and the final bridge rollback version is recorded; explicitly authorize or reject retirement deletion without bypassing any failed row. <!-- sdd-owner: parent -->
- [ ] After work unit 11, evaluate the final RR8-only evidence and close the OpenSpec change only if cleanup, release surfaces, scenario ledger, rollback record, and protected RR8 `8.3.0` matrix are all complete; otherwise reopen the applicable gate. <!-- sdd-owner: parent -->

PR6b is the next implementation work-unit boundary. No PR6b dependency removal, lockfile regeneration, WU7 work, commit, push, PR, review, receipt, or attempt settlement was performed.

## Work Unit 6 / PR6b — Legacy Dependency and Generated Lockfile Prune

### Structured Status and Delivery Boundary

- Authoritative native OpenSpec status selected `consolidate-react-remix-into-router`; pre-run `applyState: ready`, `nextRecommended: apply`, planning artifacts complete, and no blockers.
- Action context was `repo-local`; workspace and sole allowed edit root were `/Users/skynet/devx-op/effectify`; warnings: none.
- The delegated executor authenticated the parent-owned `proceed` attempt for `rr7-legacy-dependency-prune`, maximum 3,500 changed lines. Parent owns settlement, commit, push, and PR creation.
- Delivery remained `auto-chain`, `feature-branch-chain`; the human-approved generated-lockfile exception applied to PR6b only. This run completed only the three PR6b rows and did not start WU7.
- Strict TDD was active. Skill resolution was `paths-injected` from `/Users/skynet/.agents/skills/work-unit-commits/SKILL.md`.

### Completed Tasks and Persisted Checkboxes

All three implementation-owned PR6b rows are visibly `- [x]` in `tasks.md`:

1. RED strengthened the manifest/isolation guard and reproduced all four exact residue failures on green PR6a.
2. GREEN removed only the four app declarations and regenerated `pnpm-lock.yaml` with `pnpm install --lockfile-only`.
3. TRIANGULATE/REFACTOR passed RR7 and independent RR8 matrices, exact dependency scans, formatting, generated-output cleanup, and the no-runtime/source-diff boundary.

### Files Changed and Counts

- `apps/react-remix-example/package.json`: removed only `@remix-run/node`, `@remix-run/react`, `@remix-run/serve`, and `@remix-run/dev`.
- `apps/react-remix-example/tests/unit/config/react-router7-framework.test.ts`: replaced the temporary-residue expectation with exact absence assertions.
- `scripts/verify-react-router-manifests.mjs`: rejects those four declarations from either app dependency section.
- `pnpm-lock.yaml`: generated deterministic prune.
- `openspec/changes/consolidate-react-remix-into-router/tasks.md`: PR6b checkboxes only.
- `openspec/changes/consolidate-react-remix-into-router/apply-progress.md`: this cumulative evidence.
- Final PR6b count including evidence: **115 authored additions + deletions** (`100` additions, `15` deletions), plus **2,727 generated lockfile additions + deletions** (`36` additions, `2,691` deletions), for **2,842 total** within the approved 3,500-line bound. Non-lockfile implementation/test/guard work before this evidence was 48 authored lines.
- No file under `apps/react-remix-example/app/**`, no Vite/project/TypeScript config, and no protected RR8 product/app file changed in PR6b.

### RED → GREEN → TRIANGULATE → REFACTOR Evidence

| Stage       | Exact command/action                                                                                                              | Result                                                                                                                                     |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Safety net  | `pnpm nx run @effectify/react-router-example:migration:manifest`; focused RR7 framework test                                      | Exit 0; protected manifest/isolation passed and focused suite was 15/15 before edits.                                                      |
| RED guard   | Strengthen `scripts/verify-react-router-manifests.mjs`, then run `pnpm nx run @effectify/react-router-example:migration:manifest` | Expected exit 1 with four exact failures: dependencies retained node/react/serve and devDependencies retained dev.                         |
| RED focused | Replace the temporary-residue expectation, then run the focused framework test                                                    | Expected 14/15 passed and one failure showing all four received values were `2.17.5` instead of absent.                                    |
| GREEN       | Remove only four manifest lines; run `pnpm install --lockfile-only`; rerun guard and focused test                                 | Install exit 0; guard passed at RR7 `7.18.2` / RR8 `8.3.0`; focused suite 15/15.                                                           |
| TRIANGULATE | Focused four-file RR7 harness, full app, scans, importer-specific `pnpm why`, and protected matrices                              | RR7 focused 25/25 and full 38/38; exact four Remix packages had no app resolution; RR8 package 8/8, adapter 9/9, migration 9/9, app 71/71. |
| REFACTOR    | Clean RR7 and RR8 typegen/typecheck/build, RR7 lint, format check, generated cleanup, protected diff and `git diff --check`       | All passed; lint retained one pre-existing commented-file warning and no errors; no generated output or protected mutation remained.       |

### Verification and Dependency Evidence

- RR7 app: focused four-file runtime/route/SSR suite passed 25/25; full target passed 38/38.
- RR7 clean compiler/build sequence: removed `.react-router` and build output, then typegen, typecheck, production client/server build, and lint passed.
- Exact app scans found zero targeted Remix declarations, active imports, `RemixBrowser`/`RemixServer`, commands, serving script, or Vite plugin matches.
- `pnpm why react-router --filter @effectify/react-remix-example` showed only RR7 `7.18.2`; each of `@remix-run/node`, `react`, `serve`, and `dev` returned no resolution after `pnpm install --frozen-lockfile` synchronized `node_modules` without changing the lockfile.
- Exact lockfile resolution scans found zero package snapshots/importer entries for those four legacy framework packages.
- The broader `@remix-run` namespace is not globally empty: React Router 7/8 themselves resolve `@remix-run/node-fetch-server@0.13.3`, and pre-existing root workspace override/catalog references remain outside this exact four-package PR6b boundary. These are not the removed Remix framework runtime/dev/serve/UI packages.
- Protected RR8 `8.3.0`: package/adapter test, no-build typecheck, lint, and build matrix passed; manifest and readiness verification passed; migration suite 9/9 and full app 71/71 passed; clean typegen, typecheck, and production build passed.
- Repository format check and `git diff --check` passed after generated cleanup.

### Lockfile Provenance, Cleanup, and Deviations

- `pnpm-lock.yaml` was regenerated only by `pnpm install --lockfile-only`; the deterministic result exactly matched the forecast at 2,727 changed generated lines.
- `pnpm install --frozen-lockfile` later synchronized stale `node_modules` for truthful `pnpm why` evidence and did not mutate the lockfile.
- Cleanup removed both apps’ `.react-router` and `build` directories and restored command-touched `packages/react/router/tsconfig.lib.tsbuildinfo` from `HEAD`.
- One initial full RR7 test run raced a concurrently rebuilding `@effectify/node-better-auth` package and failed module resolution before tests executed; the independent package matrix completed, node_modules was synchronized, and the sequential full rerun passed 38/38. No implementation change was made for that harness-order issue.
- An initial namespace-wide lockfile scan correctly found React Router’s `@remix-run/node-fetch-server` transitive. The final gate was narrowed to the four task-owned legacy framework packages rather than falsely claiming the upstream namespace is absent.
- No design deviation. The approved generated exception was used exactly as authorized; authored behavior remained review-small and runtime/source behavior was unchanged.

### Remaining Work and Rollback Boundary

- Current implementation state is 30/51 complete with 21 implementation-owned rows remaining. The exact unchecked WU7+ rows are already reproduced byte-for-byte in the cumulative `Exact Remaining Implementation Tasks` section above and remain visibly `- [ ]` in `tasks.md`.
- All three parent-owned human evidence gates remain unchecked, deferred, and byte-for-byte unchanged.
- Rollback PR6b by restoring the four exact `2.17.5` declarations, the PR6a lockfile, the temporary-residue test expectation, and the prior guard behavior; do not revert green PR6a runtime/source activation.
- Lifecycle routing returns to the parent. No WU7 work, commit, push, PR, review, receipt, attempt settlement, or parent-owned gate action was started.

## Work Unit 7 / PR 7 — Deprecation, Migration Guidance, and Fail-Closed Inventory

### Structured Status and Delivery Boundary

- Authoritative native OpenSpec status selected `consolidate-react-remix-into-router`; pre-run `applyState: ready`, `nextRecommended: apply`, planning artifacts complete, 30/54 total checkbox rows complete, and no blockers.
- Action context was `repo-local`; workspace and sole allowed edit root were `/Users/skynet/devx-op/effectify`; warnings: none.
- The delegated executor authenticated the parent-owned `proceed` attempt for `deprecation-migration-ledger`, maximum 1,000 changed lines. Parent owns settlement, commit, push, PR creation, and lifecycle decisions.
- Delivery remained `auto-chain`, `feature-branch-chain`; this run completed only Work unit 7 / PR 7. The mandatory parent-owned uniqueness gate remains unresolved, so Work unit 8 was not started.
- Strict TDD was active. Skill resolution was `paths-injected` from the two exact parent-provided skill paths.

### Completed Tasks and Persisted Checkboxes

All four implementation-owned WU7 rows are visibly `- [x]` in `tasks.md`:

1. RED added the concrete ledger validator and Nx target, then recorded the expected missing-ledger failure.
2. GREEN added migration/support guidance, complete current consumer and behavior inventories, deprecation wording, release history, public JSDoc, and rollback version `0.5.12-alpha.1`.
3. TRIANGULATE proved 24 consumer rows and 29 behavior rows are complete as an inventory while all 53 remain pending; default verification passed CLOSED and `--expect=open` failed.
4. Publication/version verification proved the bridge remains a public deprecated release project, the app-local RR7 adapter is not released, and protected RR8 remains exact 8.3.0.

### Files Changed

- `.github/SETUP.md`
- `CHANGELOG.md`
- `README.md`
- `apps/react-router-example/project.json`
- `docs/migrations/react-remix-to-react-router.md` (new)
- `packages/react/remix/CHANGELOG.md`
- `packages/react/remix/README.md`
- `packages/react/remix/package.json`
- `packages/react/remix/src/index.ts`
- `packages/react/remix/src/lib/context.ts`
- `packages/react/remix/src/lib/http-response.ts`
- `packages/react/remix/src/lib/runtime.ts`
- `scripts/verify-react-router-consolidation.mjs` (new)
- `openspec/changes/consolidate-react-remix-into-router/tasks.md` (WU7 checkboxes only)
- `openspec/changes/consolidate-react-remix-into-router/apply-progress.md` (this cumulative evidence)

Final authored change count: **706 authored additions + deletions**, generated changes: **0**, within the parent-authorized 1,000-line boundary. Protected RR8 product/package/adapter/source files and dependency manifests are unchanged. Rollback reverts this WU7 file set together and does not alter the bridge runtime behavior or RR8 8.3.0.

### RED → GREEN → TRIANGULATE → REFACTOR Evidence

| Stage       | Exact command/action                                                                                                                                                 | Result                                                                                                                                                                |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Safety net  | `pnpm nx run @effectify/react-router-example:migration:manifest`; `pnpm nx run @effectify/repo:format:check`                                                         | Exit 0 before edits; RR7 7.18.2 / protected RR8 8.3.0 isolation passed and the clean branch needed no formatting.                                                     |
| RED         | Add `scripts/verify-react-router-consolidation.mjs` plus `consolidation:verify`, then run `pnpm nx run @effectify/react-router-example:consolidation:verify`         | Expected exit 1: `missing docs/migrations/react-remix-to-react-router.md`.                                                                                            |
| GREEN       | Add the ledger and deprecation/migration/release/JSDoc surfaces, then rerun the same target                                                                          | Exit 0: CLOSED, final bridge 0.5.12-alpha.1, 24 consumer rows, 29 scenario rows, 53 pending rows, `inventory-complete-retirement-blocked`.                            |
| TRIANGULATE | Run default verifier, `--expect=open`, tracked repository scans, and `pnpm nx show projects --json`                                                                  | Default exit 0; expected OPEN exit 1 because ledger declares CLOSED; scans mapped current surfaces and found zero active Remix imports/commands in bridge/app source. |
| REFACTOR    | `pnpm nx run @effectify/repo:format`; rerun validator, bridge no-build typecheck, format check, protected manifest, project/release checks, diff checks, and cleanup | All required positive checks passed; generated build/type output was removed and protected product/dependency diffs remained empty.                                   |

### TDD Cycle Evidence

| Task                               | Test File / Harness                                    | Layer                     | Safety Net                                | RED                                               | GREEN                                         | TRIANGULATE                                                      | REFACTOR                                                 |
| ---------------------------------- | ------------------------------------------------------ | ------------------------- | ----------------------------------------- | ------------------------------------------------- | --------------------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------- |
| WU7 ledger validator               | `scripts/verify-react-router-consolidation.mjs` via Nx | Repository integration    | N/A: new target; protected manifest green | Missing ledger failed nonzero                     | CLOSED inventory passed                       | OPEN expectation failed while CLOSED passed                      | Formatter and repeated target green                      |
| WU7 migration/deprecation surfaces | Same fail-closed target                                | Documentation integration | Format and manifest green                 | Absent ledger was the behavioral RED              | 24 consumers and 29 scenarios accepted        | Dynamic tracked-file inventory plus required scenario IDs passed | Docs and source JSDoc formatted; bridge typecheck passed |
| WU7 CLOSED gate                    | Default target plus `--expect=open`                    | Gate integration          | GREEN inventory result                    | OPEN expectation rejected CLOSED state            | Default CLOSED expectation passed             | Two distinct expected gate paths exercised                       | No weakening after refactor                              |
| WU7 release/version boundary       | Nx project/manifest and release-list checks            | Structural integration    | Protected manifest passed                 | Missing deprecation inventory was rejected by RED | Bridge metadata reports deprecated RR7 7.18.2 | Local adapter release lookup false; protected family 8.3.0       | Format and protected diff checks passed                  |

Test summary: one concrete repository validator/target was added; the RED and OPEN-negative paths failed as expected, and the CLOSED positive path passed repeatedly. Runtime harness: **N/A**, because WU7 changes documentation, release metadata, public deprecation annotations, and ledger validation without runtime behavior. No approval tests or new runtime pure functions were needed.

### Verification Evidence

- `pnpm nx run @effectify/react-router-example:consolidation:verify`: exit 0; `CLOSED`, 24 consumers, 29 scenarios, 53 pending.
- `pnpm nx run @effectify/react-router-example:consolidation:verify -- --expect=open`: expected exit 1; the human reviewer/completion gate cannot be bypassed.
- Repository scans enumerated `@effectify/react-remix`, `react-remix-example`, `@remix-run/`, exact 7.18.2 pins, and root/docs/release mentions. A source-only scan found zero active `@remix-run/*`, `RemixBrowser`, `RemixServer`, Remix command, or Remix serve references.
- `pnpm nx show projects --json` retained both bridge/app projects. `pnpm nx show project @effectify/react-remix --json` reported the deprecated package description and version 0.5.12-alpha.1; the protected adapter project remained unchanged.
- The Nx release list retains the published bridge but contains no app-local `react-router7-better-auth` release project.
- `pnpm nx run @effectify/react-router-example:migration:manifest`: exit 0; bridge RR7 7.18.2 remained isolated and the protected React Router package family resolved exactly 8.3.0.
- `pnpm nx run @effectify/react-remix:typecheck:no-build`, `pnpm nx run @effectify/repo:format:check`, `git diff --check`, and protected diff checks passed.
- Cleanup removed ignored package `dist`, app `.react-router`, and app `build` output; no generated mutation remains.

### Deviations, Gate State, and Remaining Work

- No design deviation. The scenario ledger deliberately records `pending-review` rather than deciding unique, duplicate, transfer, or removal outcomes.
- The actual execution environment reported Node `v26.7.0`, not the parent context's `24.19.0`; it still satisfies the repository requirement `>=22.22`, and all commands above used the observed version.
- Retirement remains **CLOSED**. WU8 is blocked on the exact parent-owned human gate below; this executor did not assign reviewers, complete scenarios, start WU8, or satisfy any parent-owned row.
- Current implementation state is 34/51 complete with 17 implementation-owned rows remaining. Exact unchecked implementation rows:

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

Deferred parent-owned lifecycle actions, preserved byte-for-byte:

- [ ] After work unit 7 and before work unit 8, confirm every proposed `transfer to RR8` row in `docs/migrations/react-remix-to-react-router.md` is genuinely unique, every `existing RR8` row cites concrete equivalent files/tests, and every `remove` row has an accepted justification; record accepted reviewers and release only the accepted transfer rows to implementation. <!-- sdd-owner: parent -->
- [ ] After work unit 9 and before work unit 10, confirm the validator reports OPEN, every documented consumer is migrated, every scenario disposition is reviewed and complete with passing evidence, and the final bridge rollback version is recorded; explicitly authorize or reject retirement deletion without bypassing any failed row. <!-- sdd-owner: parent -->
- [ ] After work unit 11, evaluate the final RR8-only evidence and close the OpenSpec change only if cleanup, release surfaces, scenario ledger, rollback record, and protected RR8 `8.3.0` matrix are all complete; otherwise reopen the applicable gate. <!-- sdd-owner: parent -->

Mandatory next boundary: parent-owned human uniqueness/reviewer gate. Return to `parent-lifecycle`; do not recommend or start apply/WU8.

## Parent Gate Decision — Reviewed RR8 Scenario Matrix

- Decision date: 2026-08-25.
- Reviewer: `kattsushi`.
- Accepted complete `existing-rr8` rows: `shell`, `navigation`, `auth-loader-guard`, `auth-action-guard`, `test-loader-success`, `test-blank-validation`, `pico-styling`, `rr7-typegen`, `rr7-hydration`, and `rr7-build`.
- Accepted product transfer: exactly the six `/demo` loader/action success, failure, and redirect rows as one coherent RR8 slice.
- Accepted removals: `api-placeholder` because it has no executable behavior, and `mock-store` because copying example-local state would duplicate and weaken the protected Prisma-backed example.
- Accepted `existing-rr8` rows requiring focused evidence before completion: `login`, `signup`, `auth-api`, `todo-create`, `todo-update`, `todo-delete`, `todo-toggle`, `todo-validation`, `test-action-success`, `rr7-route-map`, and `rr7-ssr`.
- WU8 is released only for the bounded `/demo` product transfer and focused evidence-hardening tests for those 11 existing rows. No other product behavior is authorized.
- Retirement remains **CLOSED** until all scenario and consumer rows are complete and the later parent-owned deletion gate is explicitly accepted.

## Work Unit 8 / PR8a — Coherent RR8 `/demo` Transfer

### Structured Status and Delivery Boundary

- Authoritative native OpenSpec status selected `consolidate-react-remix-into-router`; pre-run `applyState: ready`, `nextRecommended: apply`, planning artifacts complete, 35/54 total checkbox rows complete, and no blockers.
- Action context was `repo-local`; workspace and sole allowed edit root were `/Users/skynet/devx-op/effectify`; warnings: none.
- The executor authenticated the parent-owned `proceed` attempt for `rr8-demo-transfer`, maximum 1,000 changed lines. Parent owns settlement, commit, push, PR creation, and later lifecycle decisions.
- Delivery remained `auto-chain`, `feature-branch-chain`; this run completed only PR8a. PR8b login/signup/auth evidence, PR8c todo evidence, PR8d route-map/SSR evidence, retirement, deletion, and RR7 work were not started.
- Strict TDD was active. Skill resolution was `paths-injected` from the two exact parent-provided skill paths. Every runtime-bearing command ran under Node `v24.19.0` through `fnm exec --using 24.19.0`.

### Completed Tasks and Persisted Checkboxes

All four implementation-owned PR8a rows are visibly `- [x]` in `tasks.md`:

1. RED added the focused RR8 demo route suite first and recorded missing-module failure before product code existed.
2. GREEN added only the coherent RR8 `/demo` screen, route map entry, navigation entry, and matching navigation expectation.
3. TRIANGULATE proved all six loader/action success, modeled-failure, and redirect outcomes plus alternate default-success inputs; the full app and migration harnesses passed, and exactly seven ledger rows were completed.
4. REFACTOR/VERIFY passed consolidation CLOSED, clean typegen/typecheck/build, protected package/adapter checks, exact 8.3.0 resolution, formatting, line budget, and generated cleanup.

WU8 is intentionally incomplete: PR8b–PR8d remain unchecked and no generic/global WU8 completion is claimed. Current persisted ownership state is 38/60 implementation rows complete with 22 remaining; parent state is 1/3 complete with two deferred rows; malformed ownership markers: 0.

### Files Changed and PR Boundary

- `apps/react-router-example/app/routes/demo.tsx` (new RR8 product route)
- `apps/react-router-example/tests/routes/demo.test.tsx` (new focused runtime/UI suite)
- `apps/react-router-example/app/routes.tsx` (`/demo` route only)
- `apps/react-router-example/app/app-nav.tsx` and `tests/routes/app-nav.test.tsx` (one navigation item and expectation)
- `docs/migrations/react-remix-to-react-router.md` (exact seven accepted evidence rows only)
- `openspec/changes/consolidate-react-remix-into-router/tasks.md` (explicit PR8a–PR8d split and PR8a checkboxes only)
- `openspec/changes/consolidate-react-remix-into-router/apply-progress.md` (this cumulative section)

Final PR8a authored additions + deletions: **455** (444 additions, 11 deletions); generated retained changes: **0**; limit: **1,000**. Rollback removes the demo route/test, route/nav wiring, restores the seven ledger rows to incomplete and the PR8a task rows to unchecked, and leaves every RR7 surface plus existing RR8 scenario intact.

### RED → GREEN → TRIANGULATE → REFACTOR Evidence

| Stage       | Exact command/action                                                                                   | Result                                                                                                                                                                                                                                                |
| ----------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Safety net  | Focused app-nav/app-shell tests, then complete app harness                                             | 4/4 focused passed. The initial full run could not resolve clean-branch package outputs; building the protected packages from cache supplied the normal workspace prerequisite, after which the unchanged baseline passed 71/71 without a source fix. |
| RED         | `pnpm nx run @effectify/react-router-example:test -- tests/routes/demo.test.tsx`                       | Expected exit 1 before product edits: Vitest could not import absent `app/routes/demo.js`; 0 tests executed.                                                                                                                                          |
| GREEN       | Add the bounded route/UI and wiring, then rerun the same focused command                               | Exit 0: 7/7 passed, covering the six deliberate outcomes and coherent screen/wiring.                                                                                                                                                                  |
| TRIANGULATE | Add unknown loader/action inputs and run the focused outcome filter                                    | Exit 0: 9/9 passed; distinct success/default, modeled-failure, and redirect branches executed through `Runtime.make(Layer.empty)` with protected RR8 contexts.                                                                                        |
| REFACTOR    | Extract typed success values, format, and rerun focused/full/migration/compiler/build/package matrices | Focused 9/9, app 80/80, migration 9/9, router 8/8, adapter 9/9, clean typegen/typecheck/build, format, version, and consolidation checks all passed.                                                                                                  |

### User-Visible Outcome Evidence

| Ledger row             | Runtime/UI evidence                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------------------- |
| `demo-loader-success`  | `{ ok: true, data: { message, outcome: "success" } }` and the rendered loader message/outcome.          |
| `demo-loader-failure`  | Modeled JSON body `{ ok: false, errors: ["Loader helper modeled failure."] }`, status 500.              |
| `demo-loader-redirect` | Native redirect status 307 with `Location: /demo?outcome=success`.                                      |
| `demo-action-success`  | `{ ok: true, response: { message, outcome: "success" } }` and the rendered action result.               |
| `demo-action-failure`  | Modeled JSON body `{ ok: false, errors: ["Action helper modeled failure."] }`, status 400.              |
| `demo-action-redirect` | Native redirect status 303 with `Location: /demo?outcome=success`.                                      |
| `test-action-success`  | Accepted existing-evidence row completed from the same focused action-success payload/render assertion. |

All seven rows retain reviewer `kattsushi` and are visibly `YES` in the ledger. Consolidation reports `CLOSED`, 24 consumer rows, 29 scenario rows, and 34 pending rows; retirement was not opened.

### Commands and Verification

- Focused demo after refactor: 9/9 passed; focused demo/nav/shell set: 13/13 passed.
- Complete protected app harness: 18 files, 80/80 tests passed.
- `migration:test`: 9/9 passed; `migration:manifest` and `migration:verify` passed and reported Node v24.19.0 / React Router 8.3.0.
- Clean `typegen` → `typecheck` → production `build` passed; the build emitted only existing dependency externalization/chunk warnings.
- Protected matrix passed: router 8/8 and Better Auth adapter 9/9, both no-build typechecks, lints, and builds. Existing suggestion-only diagnostics in node Better Auth remained non-failing and untouched.
- `consolidation:verify` passed with retirement CLOSED. Repository format/check, `pnpm why react-router --filter @effectify/react-router-example`, and `git diff --check` passed; every protected app edge resolved 8.3.0.
- Cleanup removed app `.react-router` and `build`, restored command-touched `packages/react/router/tsconfig.lib.tsbuildinfo`, and retained no generated mutation.

### TDD Cycle Evidence

| Task                       | Test File                                                  | Layer                         | Safety Net                                           | RED                                            | GREEN                                             | TRIANGULATE                                                     | REFACTOR                                                |
| -------------------------- | ---------------------------------------------------------- | ----------------------------- | ---------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------- |
| Six demo outcomes          | `apps/react-router-example/tests/routes/demo.test.tsx`     | Runtime/route integration     | App baseline 71/71 after package-output prerequisite | Missing route module, exit 1                   | 7/7 passed through protected runtime/context APIs | 9/9 with unknown loader/action inputs                           | Typed constants extracted; 9/9 remained green           |
| Route/navigation/UI wiring | Demo test plus `app-nav.test.tsx` and `app-shell.test.tsx` | Render/structural integration | Existing focused 4/4                                 | Demo import absent                             | Demo screen and all six controls rendered         | Route map, navigation item, loader and action messages asserted | Focused combined set 13/13 and full app 80/80           |
| Ledger and PR split        | Consolidation verifier and task ownership parser           | Repository integration        | WU7 CLOSED baseline                                  | Seven accepted rows incomplete and WU8 generic | Exactly seven rows marked YES; PR8a–PR8d explicit | CLOSED with 34 pending; 38/60 implementation rows               | Marker parser found 0 malformed rows; only PR8a checked |

Test summary: 9 focused demo tests were added and all pass; integration layers cover actual RR8 runtime/context execution and server-rendered UI. No approval tests were needed. Two typed immutable success values were extracted; no side-effecting helper or type assertion was introduced.

### Deviations and Cleanup

- No product-scope deviation: only the six authorized `/demo` outcomes were added. `test-action-success` used accepted existing evidence; PR8b–PR8d product code was untouched.
- Harness setup note: a clean checkout initially lacked built workspace package entrypoints, so the first full app baseline failed module resolution. Running the existing package build prerequisite produced ignored outputs and the unchanged 71/71 baseline passed; no source was changed to address it.
- The interactive screen uses a native POST form rather than React Router `Form`; this keeps server-rendered focused evidence independent of a data-router harness while still invoking the same RR8 framework action at `/demo`.
- Redirect destinations intentionally return to the coherent `/demo?outcome=success` screen because RR8 has no `/test` destination. Loader uses 307 and action uses 303 so method semantics are deliberate and directly evidenced.

### Exact Remaining Implementation Tasks

- [ ] RED: add focused evidence tests only for `login`, `signup`, and `auth-api`, recording behavior-specific missing evidence without changing product code. <!-- sdd-owner: implementation -->
- [ ] GREEN/TRIANGULATE: complete those three existing-RR8 rows through tests at their accepted destinations, including UI interaction/error and redirect/multiple-cookie fidelity; no product transfer is allowed. <!-- sdd-owner: implementation -->
- [ ] REFACTOR/VERIFY: run the focused tests, complete app harness, migration tests, protected package/adapter matrix, typegen/typecheck/build, consolidation CLOSED, version, format, and cleanup gates for PR8b. <!-- sdd-owner: implementation -->
- [ ] RED: add focused evidence tests only for `todo-create`, `todo-update`, `todo-delete`, `todo-toggle`, and `todo-validation`, recording behavior-specific missing evidence without changing product code. <!-- sdd-owner: implementation -->
- [ ] GREEN/TRIANGULATE: complete the five existing-RR8 todo rows through focused mutation, redirect, render, and title/identifier validation tests only; no product transfer is allowed. <!-- sdd-owner: implementation -->
- [ ] REFACTOR/VERIFY: run the focused tests, complete app harness, migration tests, protected package/adapter matrix, typegen/typecheck/build, consolidation CLOSED, version, format, and cleanup gates for PR8c. <!-- sdd-owner: implementation -->
- [ ] RED: add focused evidence tests only for `rr7-route-map` and `rr7-ssr`, recording missing matcher/splat and readiness/status/header/error evidence without changing product code. <!-- sdd-owner: implementation -->
- [ ] GREEN/TRIANGULATE: complete the two existing-RR8 rows through route matcher/splat and server-rendering tests only; no product transfer is allowed. <!-- sdd-owner: implementation -->
- [ ] REFACTOR/VERIFY: run the focused tests, complete app and migration harnesses, protected package/adapter matrix, typegen/typecheck/build, consolidation CLOSED, version, format, and cleanup gates for PR8d; WU8 remains incomplete until PR8a–PR8d are all complete. <!-- sdd-owner: implementation -->
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

### Deferred Parent-Owned Lifecycle Actions

- [ ] After work unit 9 and before work unit 10, confirm the validator reports OPEN, every documented consumer is migrated, every scenario disposition is reviewed and complete with passing evidence, and the final bridge rollback version is recorded; explicitly authorize or reject retirement deletion without bypassing any failed row. <!-- sdd-owner: parent -->
- [ ] After work unit 11, evaluate the final RR8-only evidence and close the OpenSpec change only if cleanup, release surfaces, scenario ledger, rollback record, and protected RR8 `8.3.0` matrix are all complete; otherwise reopen the applicable gate. <!-- sdd-owner: parent -->

PR8b is the next bounded implementation slice; lifecycle routing returns to the parent. No PR8b–PR8d work, retirement/deletion, commit, push, PR, review, receipt, or attempt settlement was performed.

## Work Unit 8 / PR8b — Login, Signup, and Authentication Evidence

### Structured Status and Delivery Boundary

- Authoritative native OpenSpec status selected `consolidate-react-remix-into-router`; pre-run `applyState: ready`, `nextRecommended: apply`, planning artifacts complete, 39/63 total checkbox rows complete, and no blockers.
- Action context was `repo-local`; workspace and sole allowed edit root were `/Users/skynet/devx-op/effectify`; warnings: none.
- The executor authenticated the parent-owned `proceed` attempt for `rr8-auth-evidence`, maximum 1,000 changed lines. Parent owns settlement, commit, push, PR creation, and later lifecycle decisions.
- Delivery remained `auto-chain`, `feature-branch-chain`; this run completed only PR8b. PR8c/d, bridge, RR7, retirement, deletion, and product code were not touched.
- Strict TDD was active. Skill resolution was `paths-injected`. Every runtime-bearing command ran under Node `v24.19.0` through `fnm exec --using 24.19.0`.

### Completed Tasks and Persisted Checkboxes

All three implementation-owned PR8b rows are visibly `- [x]` in `tasks.md`:

1. RED recorded the honest missing-evidence state: no focused login or signup route tests existed, no auth API route fidelity test existed, and all three accepted ledger rows were `NO`; no failing product behavior was manufactured.
2. GREEN/TRIANGULATE added tests only and passed six focused cases against unchanged RR8 product and package handlers. Exactly `login`, `signup`, and `auth-api` now cite their focused test paths, retain reviewer `kattsushi`, and are `YES`.
3. REFACTOR/VERIFY passed the focused/full app, migration, package/adapter, clean compiler/build, consolidation CLOSED, exact version, format, and cleanup gates.

Final ownership state is 41/60 implementation rows complete with 19 remaining; parent state remains 1/3 complete with two deferred rows; malformed ownership markers: 0.

### Files Changed and PR Boundary

- `apps/react-router-example/tests/routes/login.test.tsx` (new)
- `apps/react-router-example/tests/routes/signup.test.tsx` (new)
- `apps/react-router-example/tests/routes/api.auth.test.ts` (new)
- `docs/migrations/react-remix-to-react-router.md` (exact three accepted rows only)
- `openspec/changes/consolidate-react-remix-into-router/tasks.md` (PR8b checkboxes only)
- `openspec/changes/consolidate-react-remix-into-router/apply-progress.md` (this cumulative section)

Final PR8b size is **422 authored additions + 6 deletions = 428 changed lines**, with **0 generated retained lines**, below the 1,000-line boundary.

No product, package implementation, manifest, dependency, lockfile, bridge, RR7, PR8c/d, retirement, or deletion file changed. Rollback removes the three focused tests, restores only the three ledger rows to their prior concrete-source/required-evidence text and `NO`, and restores only the PR8b task rows to unchecked.

### RED → GREEN → TRIANGULATE → REFACTOR Evidence

| Stage       | Exact evidence / action                                                                                                                                                          | Result                                                                                                                                                                                                                                                                                                                                                                                 |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RED         | Repository test inventory plus ledger inspection before test creation                                                                                                            | No `login.test.tsx`, `signup.test.tsx`, or auth API route test existed; `login`, `signup`, and `auth-api` were reviewer `kattsushi` / `NO`. This was the task-defined missing-evidence RED; product edits were forbidden.                                                                                                                                                              |
| GREEN       | Add the three focused files and run `pnpm nx run @effectify/react-router-example:test -- tests/routes/login.test.tsx tests/routes/signup.test.tsx tests/routes/api.auth.test.ts` | Exit 0: 3 files, 6/6 tests passed against existing RR8 source. No absent product behavior was exposed.                                                                                                                                                                                                                                                                                 |
| TRIANGULATE | Exercise independent login success/error, signup success/error, auth loader, and auth action inputs                                                                              | Login/signup submitted exact values, navigated to `/` only on success, and rendered thrown messages while remaining on their forms. Loader/action preserved exact `Request` identity; action preserved URL, method, headers, and JSON request body; both preserved native `Response` identity, body, status 307, `Location`, `X-Auth-Trace`, and both `Headers.getSetCookie()` values. |
| REFACTOR    | Repository formatter, focused rerun, complete app/migration/package/compiler/build/version/consolidation matrix, generated cleanup                                               | All gates passed; focused remained 6/6 and only test/evidence artifacts remain.                                                                                                                                                                                                                                                                                                        |

### Commands and Verification

- Focused tests before and after formatting: 3 files, 6/6 passed both times.
- Complete RR8 app harness: 21 files, 86/86 passed.
- Migration gates: `migration:manifest` passed with bridge 7.18.2 and protected RR8 8.3.0; `migration:verify` reported Node v24.19.0 and router 8.3.0; `migration:test` passed 9/9.
- Protected package/adapter matrix: router 8/8 and Better Auth adapter 9/9; both no-build typechecks, lints, and builds passed. Existing suggestion-only diagnostics under node Better Auth remained non-failing and untouched.
- Clean app `typegen` → `typecheck` → production `build` passed. Existing externalization, deprecated-plugin, and chunk-size warnings remained non-failing.
- `consolidation:verify` passed with retirement `CLOSED`, 24 consumer rows, 29 scenario rows, and 31 pending rows.
- `pnpm why react-router --filter @effectify/react-router-example` showed every protected app/package/adapter edge at 8.3.0.
- Repository format/check and `git diff --check` passed.

### TDD Cycle Evidence

| Task              | Test File                       | Layer                                           | Safety Net / RED                                                                                       | GREEN                          | TRIANGULATE                                                                                                                       | REFACTOR                                                      |
| ----------------- | ------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Login evidence    | `tests/routes/login.test.tsx`   | Browser-component integration in jsdom          | Accepted source existed but focused submit/navigation/error evidence did not                           | Success and error cases passed | Exact credentials, `/` success navigation, visible alert, and failed-login route retention                                        | Formatted and reran focused/full app green                    |
| Signup evidence   | `tests/routes/signup.test.tsx`  | Browser-component integration in jsdom          | Accepted source existed but focused submit/navigation/error evidence did not                           | Success and error cases passed | Exact name/email/password, `/` success navigation, visible alert, and failed-signup route retention                               | Formatted and reran focused/full app green                    |
| Auth API fidelity | `tests/routes/api.auth.test.ts` | App route + package handler runtime integration | Accepted app/package handlers existed but no combined exact-request/response-fidelity evidence existed | Loader and action cases passed | Distinct GET/POST requests, exact JSON body and headers, native response identity, status/Location/custom header/body/two cookies | Protected adapter/package matrix and app build remained green |

Test summary: three focused files and six tests were added; no approval-only test or product function was introduced.

### Deviations, Cleanup, and Remaining Work

- No design or product-scope deviation. The task-defined RED was absent focused evidence rather than an intentionally failing behavioral assertion because reviewer `kattsushi` classified all three destinations `existing-rr8` and explicitly prohibited product changes.
- Cleanup removed `apps/react-router-example/.react-router` and `build`, restored command-touched `packages/react/router/tsconfig.lib.tsbuildinfo`, and retained no generated mutation.
- PR8c and PR8d remain the next WU8 implementation slices. Retirement remains CLOSED; parent-owned settlement and lifecycle actions remain deferred.
- Exact remaining implementation tasks:

- [ ] RED: add focused evidence tests only for `todo-create`, `todo-update`, `todo-delete`, `todo-toggle`, and `todo-validation`, recording behavior-specific missing evidence without changing product code. <!-- sdd-owner: implementation -->
- [ ] GREEN/TRIANGULATE: complete the five existing-RR8 todo rows through focused mutation, redirect, render, and title/identifier validation tests only; no product transfer is allowed. <!-- sdd-owner: implementation -->
- [ ] REFACTOR/VERIFY: run the focused tests, complete app harness, migration tests, protected package/adapter matrix, typegen/typecheck/build, consolidation CLOSED, version, format, and cleanup gates for PR8c. <!-- sdd-owner: implementation -->
- [ ] RED: add focused evidence tests only for `rr7-route-map` and `rr7-ssr`, recording missing matcher/splat and readiness/status/header/error evidence without changing product code. <!-- sdd-owner: implementation -->
- [ ] GREEN/TRIANGULATE: complete the two existing-RR8 rows through route matcher/splat and server-rendering tests only; no product transfer is allowed. <!-- sdd-owner: implementation -->
- [ ] REFACTOR/VERIFY: run the focused tests, complete app and migration harnesses, protected package/adapter matrix, typegen/typecheck/build, consolidation CLOSED, version, format, and cleanup gates for PR8d; WU8 remains incomplete until PR8a–PR8d are all complete. <!-- sdd-owner: implementation -->
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

Deferred parent-owned lifecycle actions remain byte-for-byte unchanged:

- [ ] After work unit 9 and before work unit 10, confirm the validator reports OPEN, every documented consumer is migrated, every scenario disposition is reviewed and complete with passing evidence, and the final bridge rollback version is recorded; explicitly authorize or reject retirement deletion without bypassing any failed row. <!-- sdd-owner: parent -->
- [ ] After work unit 11, evaluate the final RR8-only evidence and close the OpenSpec change only if cleanup, release surfaces, scenario ledger, rollback record, and protected RR8 `8.3.0` matrix are all complete; otherwise reopen the applicable gate. <!-- sdd-owner: parent -->

Lifecycle routing returns to the parent. No PR8c/d, retirement/deletion, product edit, commit, push, PR, review, receipt, attempt settlement, or parent-owned gate action was performed.

## Work Unit 8 / PR8c — Todo Intent and Validation Evidence

### Structured Status and Delivery Boundary

- Authoritative native OpenSpec status selected `consolidate-react-remix-into-router`; pre-run `applyState: ready`, `nextRecommended: apply`, planning artifacts complete, 42/63 total checkbox rows complete, and no blockers.
- Action context was `repo-local`; workspace and sole allowed edit root were `/Users/skynet/devx-op/effectify`; warnings: none.
- The executor authenticated the parent-owned `proceed` attempt for `rr8-todo-evidence`, maximum 1,000 changed lines. Parent owns settlement, commit, push, PR creation, and later lifecycle decisions.
- Delivery remained `auto-chain`, `feature-branch-chain`; this run completed only PR8c. PR8d, bridge/RR7, retirement, deletion, and all product code were untouched.
- Strict TDD was active. Skill resolution was `paths-injected`. Every runtime-bearing command ran under Node `v24.19.0` through `fnm exec --using 24.19.0`.

### Completed Tasks and Persisted Checkboxes

All three implementation-owned PR8c rows are visibly `- [x]` in `tasks.md`:

1. RED recorded the honest missing-evidence state: no focused todo route test existed and all five reviewer-accepted rows were `NO`; no failing product behavior was manufactured.
2. GREEN/TRIANGULATE added tests only and passed 11 focused cases against unchanged RR8 product code. Exactly `todo-create`, `todo-update`, `todo-delete`, `todo-toggle`, and `todo-validation` now cite concrete app/test paths, retain reviewer `kattsushi`, and are `YES`.
3. REFACTOR/VERIFY passed the focused/full app, migration, package/adapter, clean compiler/build, consolidation CLOSED, exact version, format, and cleanup gates.

Final ownership state is 44/60 implementation rows complete with 16 remaining; parent state remains 1/3 complete with two deferred rows; malformed ownership markers: 0.

### Files Changed and PR Boundary

- `apps/react-router-example/tests/routes/todo-app.test.tsx` (new focused tests)
- `docs/migrations/react-remix-to-react-router.md` (exactly five accepted todo rows)
- `openspec/changes/consolidate-react-remix-into-router/tasks.md` (PR8c checkboxes only)
- `openspec/changes/consolidate-react-remix-into-router/apply-progress.md` (this cumulative section)

Final PR8c size is **383 authored additions + 8 deletions = 391 changed lines**, with **0 generated retained lines**, below the 1,000-line boundary. No product, package implementation, manifest, dependency, lockfile, bridge, RR7, PR8d, retirement, or deletion file changed. Rollback removes the focused todo test, restores only the five todo ledger rows to their required-evidence text and `NO`, and restores only the three PR8c task rows to unchecked.

### RED → GREEN → TRIANGULATE → REFACTOR Evidence

| Stage       | Exact evidence / action                                                                                 | Result                                                                                                                                                                                                                                                      |
| ----------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Safety net  | `pnpm nx run @effectify/react-router-example:test` before test creation                                 | Exit 0: 21 files, 86/86 passed.                                                                                                                                                                                                                             |
| RED         | Repository test inventory and five accepted ledger rows before test creation                            | No todo-focused route test existed; `todo-create`, `todo-update`, `todo-delete`, `todo-toggle`, and `todo-validation` were reviewer `kattsushi` / `NO`. This was the task-defined missing-evidence RED because product edits were forbidden.                |
| GREEN       | Add `tests/routes/todo-app.test.tsx` and run the focused app target                                     | First execution exposed only an invalid full generated-module mock, not product behavior. After correcting the test harness to mock its generated model/repository boundary, exit 0: 11/11 passed against unchanged product code.                           |
| TRIANGULATE | Exercise create/update/delete, pending/completed toggle, loader/render, title failures, and ID failures | Exact repository calls and `/todo-app` redirects passed; loader returned both todos; markup showed count/content and one completed checkbox; create/update blank titles and delete/update/toggle missing IDs returned exact 400 bodies with zero mutations. |
| REFACTOR    | Format the focused test/evidence, rerun it, execute the complete matrix, then remove generated output   | Focused remained 11/11; all required gates passed.                                                                                                                                                                                                          |

### Commands and Verification

- Focused tests before and after formatting: 1 file, 11/11 passed.
- Complete RR8 app harness: 22 files, 97/97 passed.
- Migration gates: `migration:manifest` passed with bridge 7.18.2 and protected RR8 8.3.0; `migration:verify` reported Node v24.19.0 and router 8.3.0; `migration:test` passed 9/9.
- Protected router/adapter matrix: router 8/8 and Better Auth adapter 9/9; both no-build typechecks, lints, and builds passed. Existing suggestion-only diagnostics under node Better Auth remained non-failing and untouched.
- Clean app `typegen` → `typecheck` → production `build` passed. Existing dependency externalization and chunk-size warnings remained non-failing.
- `consolidation:verify` passed with retirement `CLOSED`, 24 consumer rows, 29 scenario rows, and 26 pending rows.
- `pnpm why react-router --filter @effectify/react-router-example` showed every protected app/package/adapter edge at 8.3.0.
- Repository format/check and `git diff --check` passed.

### TDD Cycle Evidence

| Task                         | Test File                        | Layer                                       | Safety Net / RED                                                           | GREEN                                                    | TRIANGULATE                                                                                                         | REFACTOR                                              |
| ---------------------------- | -------------------------------- | ------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Create/update/delete intents | `tests/routes/todo-app.test.tsx` | App route + repository boundary integration | Full app 86/86; accepted intents lacked focused mutation/redirect evidence | Exact mutation payloads and redirects passed             | Independent create/update/delete inputs plus non-target mutation exclusions                                         | Shared request/response helpers; focused stayed 11/11 |
| Toggle and render contract   | `tests/routes/todo-app.test.tsx` | Route runtime plus server-rendered UI       | Accepted toggle lacked focused mutation/render evidence                    | COMPLETED mutation and rendered state passed             | PENDING mutation, two-item loader result, content, count, and exactly one checked item                              | Shared repository fixture reset; focused stayed green |
| Todo validation              | `tests/routes/todo-app.test.tsx` | Route runtime integration                   | Accepted validation lacked focused title/identifier evidence               | Create blank-title and delete missing-ID failures passed | Update blank title plus update/toggle missing IDs; every failure asserted status/body and zero repository mutations | Shared validation helper; focused stayed green        |

Test summary: one focused file and 11 tests were added; no approval-only test or product function was introduced.

### Deviations, Cleanup, and Remaining Work

- No design or product-scope deviation. The task-defined RED was absent focused evidence rather than an intentionally failing behavioral assertion because reviewer `kattsushi` classified all five destinations `existing-rr8` and explicitly prohibited product changes.
- The first focused execution failed before test collection because the initial generated repository mock omitted a model helper export. The correction stayed entirely in the new test harness; no absent product behavior was exposed.
- Cleanup removed `apps/react-router-example/.react-router` and `build`, restored command-touched `packages/react/router/tsconfig.lib.tsbuildinfo`, and retained no generated mutation.
- PR8d is the next WU8 implementation slice. Retirement remains CLOSED; parent-owned settlement and lifecycle actions remain deferred.
- Exact remaining implementation tasks:

- [ ] RED: add focused evidence tests only for `rr7-route-map` and `rr7-ssr`, recording missing matcher/splat and readiness/status/header/error evidence without changing product code. <!-- sdd-owner: implementation -->
- [ ] GREEN/TRIANGULATE: complete the two existing-RR8 rows through route matcher/splat and server-rendering tests only; no product transfer is allowed. <!-- sdd-owner: implementation -->
- [ ] REFACTOR/VERIFY: run the focused tests, complete app and migration harnesses, protected package/adapter matrix, typegen/typecheck/build, consolidation CLOSED, version, format, and cleanup gates for PR8d; WU8 remains incomplete until PR8a–PR8d are all complete. <!-- sdd-owner: implementation -->
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

Deferred parent-owned lifecycle actions remain byte-for-byte unchanged in `tasks.md`:

- [ ] After work unit 9 and before work unit 10, confirm the validator reports OPEN, every documented consumer is migrated, every scenario disposition is reviewed and complete with passing evidence, and the final bridge rollback version is recorded; explicitly authorize or reject retirement deletion without bypassing any failed row. <!-- sdd-owner: parent -->
- [ ] After work unit 11, evaluate the final RR8-only evidence and close the OpenSpec change only if cleanup, release surfaces, scenario ledger, rollback record, and protected RR8 `8.3.0` matrix are all complete; otherwise reopen the applicable gate. <!-- sdd-owner: parent -->

Lifecycle routing returns to the parent. No PR8d, retirement/deletion, product edit, commit, push, PR, review, receipt, attempt settlement, or parent-owned gate action was performed.

## Work Unit 8 / PR8d — Route-Map and SSR Evidence

### Structured Status and Delivery Boundary

- Authoritative native OpenSpec status selected `consolidate-react-remix-into-router`; pre-run `applyState: ready`, `nextRecommended: apply`, planning artifacts complete, 45/63 total checkbox rows complete, and no blockers.
- Action context was `repo-local`; workspace and sole allowed edit root were `/Users/skynet/devx-op/effectify`; warnings: none.
- The executor authenticated the parent-owned `proceed` attempt for `rr8-route-ssr-evidence`, maximum 1,000 changed lines. Parent owns settlement, commit, push, PR creation, and later lifecycle decisions.
- Delivery remained `auto-chain`, `feature-branch-chain`; this run completed only PR8d. WU9, bridge/RR7, retirement/deletion, and all product code were untouched.
- Strict TDD was active. Skill resolution was `paths-injected`. Every runtime-bearing command ran under Node `v24.19.0` through `fnm exec --using 24.19.0`.

### Completed Tasks, WU8 Summary, and Persisted Checkboxes

All three implementation-owned PR8d rows are visibly `- [x]` in `tasks.md`:

1. RED recorded the honest missing-evidence state: the RR8 app had no focused route-map matcher/splat test or server-entry readiness/status/header/error test, and both reviewer-accepted rows were `NO`; no product failure was manufactured.
2. GREEN/TRIANGULATE added tests only and passed 18 focused cases against the unchanged RR8 route map and server entry. Exactly `rr7-route-map` and `rr7-ssr` now cite concrete tests, retain reviewer `kattsushi`, and are `YES`.
3. REFACTOR/VERIFY passed the focused/full app, migration, package/adapter, clean compiler/build, consolidation CLOSED, exact version, format, and cleanup gates.

PR8a–PR8d are now all complete. Every one of the 29 accepted scenario rows is `YES`; therefore WU8's finish condition is met. The current tasks artifact has no separate generic WU8 checkbox rows to update beyond the explicit PR8a–PR8d rows. Final ownership state is 47/60 implementation rows complete with 13 remaining; parent state remains 1/3 complete with two deferred rows; malformed ownership markers: 0.

### Files Changed and PR Boundary

- `apps/react-router-example/tests/routes/route-map.test.ts` (new focused route-map evidence)
- `apps/react-router-example/tests/routes/entry-server.test.ts` (new focused server-entry evidence)
- `docs/migrations/react-remix-to-react-router.md` (exactly the two accepted evidence rows; table formatting normalized by the repository formatter)
- `openspec/changes/consolidate-react-remix-into-router/tasks.md` (PR8d checkboxes only)
- `openspec/changes/consolidate-react-remix-into-router/apply-progress.md` (this cumulative section)

No product, package implementation, manifest, dependency, lockfile, bridge, RR7, WU9, retirement, or deletion file changed. Rollback removes the two focused test files, restores only `rr7-route-map` and `rr7-ssr` to their required-evidence text and `NO`, and restores only the three PR8d task rows to unchecked.

### RED → GREEN → TRIANGULATE → REFACTOR Evidence

| Stage       | Exact evidence / action                                                                                                                                                                                          | Result                                                                                                                                                                                                      |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Safety net  | `pnpm nx run @effectify/react-router-example:test` before test creation                                                                                                                                          | Exit 0: 22 files, 97/97 passed.                                                                                                                                                                             |
| RED         | Repository test inventory and the two accepted ledger rows before test creation                                                                                                                                  | No focused matcher/splat or server-entry test existed; `rr7-route-map` and `rr7-ssr` were reviewer `kattsushi` / `NO`. This was the task-defined missing-evidence RED because product edits were forbidden. |
| GREEN       | Add `tests/routes/{route-map,entry-server}.test.ts` and run the focused app target                                                                                                                               | Exit 0 on the first execution: 2 files, 18/18 passed against unchanged product code; no absent product behavior was exposed.                                                                                |
| TRIANGULATE | Exercise every explicit route, index/unmatched behavior, nested API path, two exact splats, browser shell, bot and SPA all-content paths, response fidelity, pre-ready stream failure, and exact shell rejection | All 18 focused cases passed with concrete route files/params, callback selection, status, headers, HTML, and error identity.                                                                                |
| REFACTOR    | Repository format, focused rerun, complete required matrix, generated cleanup, and diff checks                                                                                                                   | Focused remained 18/18; all required gates passed and no generated mutation remained.                                                                                                                       |

### Commands and Verification

- Focused tests before and after formatting: 2 files, 18/18 passed.
- Complete RR8 app harness: 24 files, 115/115 passed.
- Migration gates: `migration:manifest` passed with bridge 7.18.2 and protected RR8 8.3.0; `migration:verify` reported Node v24.19.0 and router 8.3.0; `migration:test` passed 9/9.
- Protected router/adapter matrix: router 8/8 and Better Auth adapter 9/9; both no-build typechecks, lints, and builds passed. Existing suggestion-only diagnostics under node Better Auth remained non-failing and untouched.
- Clean app `typegen` → `typecheck` → production `build` passed. Existing dependency externalization and chunk-size warnings remained non-failing.
- `consolidation:verify` passed with retirement `CLOSED`, 24 consumer rows, 29 scenario rows, and 24 pending consumer rows.
- `pnpm why react-router --filter @effectify/react-router-example` showed every protected app/package/adapter edge at 8.3.0.
- Repository format/check and `git diff --check` passed.

### TDD Cycle Evidence

| Task                   | Test File                           | Layer                               | Safety Net / RED                                                                   | GREEN                         | TRIANGULATE                                                                                         | REFACTOR                                                                           |
| ---------------------- | ----------------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------- | ----------------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Explicit RR8 route map | `tests/routes/route-map.test.ts`    | Framework route matcher integration | Full app 97/97; accepted row lacked focused route matcher/splat evidence           | 13/13 route cases passed      | Every current destination, root index, unmatched paths, nested API path, and two exact splat values | Shared matcher helper; focused suite remained green after format                   |
| RR8 server entry       | `tests/routes/entry-server.test.ts` | Server-rendering entry integration  | Full app 97/97; accepted row lacked focused readiness/status/header/error evidence | 5/5 server-entry cases passed | Browser shell, bot/SPA all-content, response fidelity, stream-error 500, and exact shell rejection  | Shared request/context/renderer harness; focused suite remained green after format |

Test summary: two focused files and 18 tests were added; no approval-only test, pure function, or product function was introduced.

### Deviations, Cleanup, and Remaining Work

- No design or product-scope deviation. The task-defined RED was absent focused evidence rather than an intentionally failing behavioral assertion because reviewer `kattsushi` classified both destinations `existing-rr8` and explicitly prohibited product changes.
- Cleanup removed `apps/react-router-example/.react-router` and `build`, restored command-touched `packages/react/router/tsconfig.lib.tsbuildinfo`, and retained no generated mutation.
- WU8 is complete, but apply is not globally complete. WU9 is the next implementation boundary; retirement remains CLOSED with 24 pending consumer rows. Parent-owned settlement and lifecycle actions remain deferred.
- Exact remaining implementation tasks:

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

Deferred parent-owned lifecycle actions remain byte-for-byte unchanged in `tasks.md`:

- [ ] After work unit 9 and before work unit 10, confirm the validator reports OPEN, every documented consumer is migrated, every scenario disposition is reviewed and complete with passing evidence, and the final bridge rollback version is recorded; explicitly authorize or reject retirement deletion without bypassing any failed row. <!-- sdd-owner: parent -->
- [ ] After work unit 11, evaluate the final RR8-only evidence and close the OpenSpec change only if cleanup, release surfaces, scenario ledger, rollback record, and protected RR8 `8.3.0` matrix are all complete; otherwise reopen the applicable gate. <!-- sdd-owner: parent -->

Lifecycle routing returns to the parent. No WU9, retirement/deletion, product edit, commit, push, PR, review, receipt, attempt settlement, or parent-owned gate action was performed.

## Work Unit 9 / PR9 — Retirement-Gate Evidence

### Structured Status and Delivery Boundary

- Authoritative native OpenSpec status selected `consolidate-react-remix-into-router`; pre-run `applyState: ready`, `nextRecommended: apply`, planning artifacts complete, and no blockers.
- Action context was `repo-local`; workspace and sole allowed edit root were `/Users/skynet/devx-op/effectify`; warnings: none.
- Parent supplied native `proceed` for `retirement-gate-evidence`, maximum 1,000 changed lines. The executor authenticated the existing parent-owned attempt token without mutation; parent owns settlement and delivery.
- Delivery remained `auto-chain`, `feature-branch-chain`; only WU9 / PR9 was implemented. Strict TDD was active, skill resolution was `paths-injected`, and runtime commands used Node `v24.19.0` through `fnm`.

### Phase Contract and Counts

- Status: **completed** for WU9 only; the change remains in apply.
- Retirement gate: **OPEN**.
- Consumers: **24/24 reviewed and Complete YES**; scenarios: **29/29 reviewed and Complete YES**; pending: **0**.
- Final bridge rollback version: **0.5.12-alpha.1**, matching the bridge manifest.
- Persisted ownership: **51/60 implementation rows complete, 9 remaining; 1/3 parent rows complete, 2 deferred; 0 malformed markers**.
- Final PR9 size: **248 additions + 34 deletions = 282 authored changed lines**, with **0 generated retained lines**, below 1,000.

### Completed Tasks and Files

All four WU9 implementation rows are visibly `- [x]` in `tasks.md` and mirrored to Engram:

1. RED added process-level fixtures proving nonzero failure for a missing consumer, incomplete scenario, reviewer-empty row, missing evidence target, and absent rollback version; pre-completion OPEN verification failed as expected.
2. GREEN completed every reviewed consumer disposition, retained all 29 complete scenarios and rollback 0.5.12-alpha.1, and made the verifier report OPEN.
3. TRIANGULATE passed app migration/test, protected router/adapter, clean typegen/typecheck/build, and exact RR8 8.3.0 matrices.
4. REFACTOR/CLEANUP passed format/diff checks, cleaned generated output, restored tsbuildinfo, recorded rollback, and proved no transitional deletion or protected source change.

Files changed: `scripts/verify-react-router-consolidation.{mjs,test.mjs}`, `docs/migrations/react-remix-to-react-router.md`, and the cumulative OpenSpec tasks/progress artifacts. No bridge, RR7 app, local adapter, RR8 product source, manifest, dependency, lockfile, implementation, or release configuration changed.

### RED → GREEN → TRIANGULATE → REFACTOR Evidence

| Stage        | Evidence                                                                               | Result                                                                                                                                  |
| ------------ | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Safety net   | Closed consolidation verifier                                                          | Exit 0: rollback 0.5.12-alpha.1, 24 consumers, 29 scenarios, 24 pending.                                                                |
| RED          | New Node fixture suite                                                                 | Exit 1: 5/6 passed; missing evidence target incorrectly returned zero.                                                                  |
| Required RED | `consolidation:verify -- --expect=open` before completion                              | Exit 1: expected OPEN but ledger declared CLOSED.                                                                                       |
| GREEN        | Add evidence-target existence guard and complete reviewed consumer metadata            | Fixtures 6/6; OPEN passed with 24 consumers, 29 scenarios, 0 pending.                                                                   |
| TRIANGULATE  | App migration/test, package/adapter, manifest/readiness, and compiler/build matrices   | All required commands passed. This evidence-only slice has no direct runtime boundary; referenced RR8 suites supplied runtime evidence. |
| REFACTOR     | Format, rerun fixtures/OPEN, clean generated output, restore tsbuildinfo, inspect diff | Format and `git diff --check` passed; no transitional deletion or protected source diff.                                                |

### Commands and Verification

| Command                                                                             |     Exit | Result                                                                                 |
| ----------------------------------------------------------------------------------- | -------: | -------------------------------------------------------------------------------------- |
| `node --test scripts/verify-react-router-consolidation.test.mjs`                    | 1 then 0 | RED 5/6; final 6/6.                                                                    |
| `pnpm nx run @effectify/react-router-example:consolidation:verify -- --expect=open` | 1 then 0 | Initially rejected CLOSED; final OPEN with 24/29/0 counts and rollback 0.5.12-alpha.1. |
| `pnpm nx run @effectify/react-router-example:migration:manifest`                    |        0 | Bridge 7.18.2 and protected RR8 8.3.0; two prior runs had transient registry timeouts. |
| `migration:verify`; `migration:test`; full app `test`                               |        0 | Node 24.19.0 / RR8 8.3.0; migration 9/9; app 115/115.                                  |
| router/adapter `test,typecheck:no-build,lint,build` matrix                          |        0 | Router 8/8 and adapter 9/9; all static/build targets passed.                           |
| clean app `typegen` → `typecheck` → `build`                                         |        0 | All passed; existing non-failing build warnings only.                                  |
| format check; `git diff --check`; bounded diff/deletion scans                       |        0 | Clean evidence diff; no deleted transitional file or protected product/source diff.    |

### TDD Cycle Evidence

| Task                  | Harness                                              | Layer                   | Safety Net              | RED                    | GREEN                                    | TRIANGULATE                             | REFACTOR                                               |
| --------------------- | ---------------------------------------------------- | ----------------------- | ----------------------- | ---------------------- | ---------------------------------------- | --------------------------------------- | ------------------------------------------------------ |
| Fail-closed validator | `scripts/verify-react-router-consolidation.test.mjs` | CLI fixture integration | CLOSED inventory passed | 5/6 exposed target gap | 6/6 passed                               | Five malformed fixtures plus valid OPEN | Formatted; 6/6 and real OPEN rerun                     |
| Consumer completion   | Nx consolidation target and ledger                   | Evidence integration    | 24 pending consumers    | OPEN returned nonzero  | 24/24 consumers and 29/29 scenarios OPEN | Independent RR8 matrices passed         | Clarified OPEN eligibility does not authorize deletion |

Test summary: one Node test file with six process-level fixture cases was added; all six pass. No product or runtime behavior was introduced.

### Rollback, Cleanup, and Deviations

- Rollback boundary: restore the migration ledger's consumer completion fields and gate to CLOSED; revert the WU9 verifier/test evidence and four WU9 checkboxes. Retain `@effectify/react-remix@0.5.12-alpha.1`, bridge, RR7 app, local adapter, exact RR7 pins, workspace/release metadata, and lockfile unchanged.
- Cleanup removed ignored `apps/react-router-example/{.react-router,build}` and restored command-touched `packages/react/router/tsconfig.lib.tsbuildinfo`; no generated mutation remains.
- Deviation: the manifest matrix had two transient `registry.npmjs.org` connect timeouts before an unchanged retry passed. No design, scope, product, or dependency deviation occurred.
- Parent deletion authorization remains unchecked. OPEN establishes eligibility only and does not authorize WU10.

### Remaining Tasks and Deferred Parent Actions

Exact unchecked implementation rows:

- [ ] RED: add final-absence assertions to `scripts/verify-react-router-consolidation.mjs` for `@effectify/react-remix`, `react-remix-example`, local adapter, bridge `json`, `@remix-run/*`, RR7-only pins/resolutions, release projects, setup/docs/workspace references, and Nx graph nodes; run `pnpm nx run @effectify/react-router-example:consolidation:verify -- --expect=retired` and record expected failures before deletion. <!-- sdd-owner: implementation -->
- [ ] GREEN PR 10a: delete `packages/react/remix/**` and `apps/react-remix-example/**`, including the local adapter and bridge `json`, while preserving evidence needed in the migration ledger; keep this source-deletion slice below 1,000 changed lines or split by coherent package/app deletion without releasing an intermediate state. <!-- sdd-owner: implementation -->
- [ ] GREEN PR 10b: remove obsolete entries from `nx.json`, `pnpm-workspace.yaml`, root/package docs and setup/release surfaces, regenerate `pnpm-lock.yaml` with `pnpm install --lockfile-only`, and remove all now-unused Remix/RR7-only resolutions while preserving React Router catalog/root `8.3.0`. <!-- sdd-owner: implementation -->
- [ ] TRIANGULATE absence/version isolation with `pnpm nx run @effectify/react-router-example:consolidation:verify -- --expect=retired`, `pnpm nx show projects --json`, `pnpm why react-router --filter @effectify/react-router-example`, `pnpm nx run @effectify/react-router-example:migration:manifest`, and repository scans over source, docs, release config, workspace config, and `pnpm-lock.yaml`; runtime harness: N/A for deletion itself, with executable RR8 behavior verified in work unit 11. <!-- sdd-owner: implementation -->
- [ ] REFACTOR only cleanup-script/docs wording after absence checks pass, then run `pnpm nx affected --target=lint`, `pnpm nx affected --target=typecheck`, `pnpm nx affected --target=test`, `pnpm nx affected --target=build`, and `pnpm nx run @effectify/repo:format:check`; record authored and generated line counts separately for PR 10a/10b and verify neither child contains dangling references. <!-- sdd-owner: implementation -->
- [ ] Verify the maintained packages with `pnpm nx run-many --targets=test,typecheck:no-build,lint,build --projects=@effectify/react-router,@effectify/react-router-better-auth`; runtime harness: `packages/react/router/tests/runtime.test.ts` and the adapter suite must record payload, modeled failure, redirect/header, cookie, and throwable-identity results against RR8 `8.3.0`. <!-- sdd-owner: implementation -->
- [ ] Verify the maintained app with `pnpm nx run @effectify/react-router-example:migration:manifest`, `pnpm nx run @effectify/react-router-example:migration:verify`, `pnpm nx run @effectify/react-router-example:migration:test`, `pnpm nx run @effectify/react-router-example:test`, `rm -rf apps/react-router-example/.react-router && pnpm nx run @effectify/react-router-example:typegen`, `pnpm nx run @effectify/react-router-example:typecheck`, and `pnpm nx run @effectify/react-router-example:build`; runtime harness evidence must include routes, auth, SSR/readiness, status, headers, and each transferred unique scenario. <!-- sdd-owner: implementation -->
- [ ] Verify final graph/release absence with `pnpm nx run @effectify/react-router-example:consolidation:verify -- --expect=retired`, `pnpm nx show projects --json`, `pnpm why react-router --filter @effectify/react-router-example`, `pnpm nx affected --target=lint`, `pnpm nx affected --target=typecheck`, `pnpm nx affected --target=test`, `pnpm nx affected --target=build`, and `pnpm nx run @effectify/repo:format:check`; record no RR7/Remix dependency, project, publish, release, docs, workspace, or lockfile residue. <!-- sdd-owner: implementation -->
- [ ] Finalize release evidence in `docs/migrations/react-remix-to-react-router.md` (or the repository-approved retained historical evidence location) with consumer status, reviewed scenario dispositions, transitional-surface absence, protected RR8 results, authored/generated diff counts, and the exact final bridge rollback version; do not add or modify product code. <!-- sdd-owner: implementation -->

Deferred parent-owned actions, preserved byte-for-byte:

- [ ] After work unit 9 and before work unit 10, confirm the validator reports OPEN, every documented consumer is migrated, every scenario disposition is reviewed and complete with passing evidence, and the final bridge rollback version is recorded; explicitly authorize or reject retirement deletion without bypassing any failed row. <!-- sdd-owner: parent -->
- [ ] After work unit 11, evaluate the final RR8-only evidence and close the OpenSpec change only if cleanup, release surfaces, scenario ledger, rollback record, and protected RR8 `8.3.0` matrix are all complete; otherwise reopen the applicable gate. <!-- sdd-owner: parent -->

Lifecycle routing returns to the parent for the deletion decision. No WU10/WU11 work, source deletion, commit, push, PR, review, receipt, attempt settlement, or parent-owned gate action was performed.

## Parent Gate Decision — Retirement Deletion Authorized

- Decision date: 2026-08-25.
- Reviewer/maintainer: `kattsushi`.
- Preconditions accepted: verifier OPEN, 24/24 consumers complete, 29/29 scenarios complete, 0 pending rows, rollback `@effectify/react-remix@0.5.12-alpha.1`, protected React Router exact `8.3.0`, and green CI through PR9.
- Authorization: execute WU10a source deletion and WU10b graph/release/lockfile cleanup as one non-releasable feature-branch transaction. Do not release between them.
- Scope guard: delete only the transitional bridge package, RR7 example/local adapter, and their obsolete workspace/release/docs/lockfile references; do not simplify transferred RR8 scenarios or change RR8 `8.3.0`.
- Rollback remains the exact recorded bridge version and matching RR7 `7.18.2` importer state until final RR8-only verification closes the change.

## Work Unit 10 / PR10a — Retire RR7-Only Tests; Stage Retired Validator

### Status, Boundary, and Counts

- Authoritative OpenSpec status was ready/apply with complete planning artifacts, repo-local root `/Users/skynet/devx-op/effectify`, and no warnings. Parent `proceed` was authenticated for `retire-rr7-tests-stage-validator`, Node 24.19.0, maximum 1,000 lines; parent owns settlement and delivery.
- Status: **completed for PR10a only**. PR10b–PR10d remain non-releasable. Design/tasks now record the accepted tests → retired scenarios → remaining app/graph → package/release graph topology.
- Deleted exactly five RR7-only tests plus app `vitest.config.ts` (**756 lines**) and only the explicit app test target (**7 lines**). Final diff: **132 additions + 804 deletions = 936 authored lines**; generated retained: **0**.

### TDD Cycle Evidence

| Task                      | Safety net      | RED                                            | GREEN / TRIANGULATE / REFACTOR                                                                                   |
| ------------------------- | --------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Retired validator staging | Fixtures 6/6    | 6/8; retired mode rejected                     | 8/8; complete retired fixture passes, retained package/app/adapter fail; default real-repo verifier remains OPEN |
| RR7 test retirement       | App tests 38/38 | Existing test files/target proved the boundary | Test target absent; typegen/typecheck/build/lint pass; deletion needed no refactor                               |

### Verification, Cleanup, and Deviations

- OPEN consolidation passed by default: 24 consumers, 29 scenarios, 0 pending. Explicit RETIRED remains RED on retained surfaces before PR10b–PR10d.
- Protected RR8 passed migration manifest/readiness/test, app 115/115, clean typegen/typecheck/build, router 8/8, adapter 9/9, package no-build typecheck/lint/build, and exact 8.3.0 resolution.
- Format and diff checks passed. Generated app outputs were removed and router tsbuildinfo restored. No product source, package, lockfile, or release surface changed; no release occurred.
- Runtime harness: N/A for deletion; CLI fixtures and protected RR8 suites supply executable evidence. Deviation: stale default CLOSED became current OPEN; RETIRED remains optional.

### Remaining Implementation Tasks

- [ ] GREEN PR10b: delete the retired RR7 app scenario/source files, including the local adapter, without deleting remaining app/graph files or changing package/release/lockfile surfaces. <!-- sdd-owner: implementation -->
- [ ] GREEN PR10c: delete the remaining old app/importer and remove its Nx graph wiring while retaining the bridge package and release/workspace/lockfile cleanup for PR10d. <!-- sdd-owner: implementation -->
- [ ] GREEN PR10d: delete the bridge package and `json`, remove obsolete release/docs/workspace references, regenerate the lockfile, and preserve protected RR8 `8.3.0`. <!-- sdd-owner: implementation -->
- [ ] TRIANGULATE final absence/version isolation with `consolidation:verify -- --expect=retired`, Nx graph, protected manifest/`pnpm why`, and repository/lockfile scans; runtime harness: N/A for deletion, with RR8 behavior verified in work unit 11. <!-- sdd-owner: implementation -->
- [ ] REFACTOR cleanup wording only after absence passes; run affected lint/typecheck/test/build and format, and record authored/generated counts for every PR10 head. <!-- sdd-owner: implementation -->
- [ ] Verify the maintained packages with `pnpm nx run-many --targets=test,typecheck:no-build,lint,build --projects=@effectify/react-router,@effectify/react-router-better-auth`; runtime harness: `packages/react/router/tests/runtime.test.ts` and the adapter suite must record payload, modeled failure, redirect/header, cookie, and throwable-identity results against RR8 `8.3.0`. <!-- sdd-owner: implementation -->
- [ ] Verify the maintained app with `pnpm nx run @effectify/react-router-example:migration:manifest`, `pnpm nx run @effectify/react-router-example:migration:verify`, `pnpm nx run @effectify/react-router-example:migration:test`, `pnpm nx run @effectify/react-router-example:test`, `rm -rf apps/react-router-example/.react-router && pnpm nx run @effectify/react-router-example:typegen`, `pnpm nx run @effectify/react-router-example:typecheck`, and `pnpm nx run @effectify/react-router-example:build`; runtime harness evidence must include routes, auth, SSR/readiness, status, headers, and each transferred unique scenario. <!-- sdd-owner: implementation -->
- [ ] Verify final graph/release absence with `pnpm nx run @effectify/react-router-example:consolidation:verify -- --expect=retired`, `pnpm nx show projects --json`, `pnpm why react-router --filter @effectify/react-router-example`, `pnpm nx affected --target=lint`, `pnpm nx affected --target=typecheck`, `pnpm nx affected --target=test`, `pnpm nx affected --target=build`, and `pnpm nx run @effectify/repo:format:check`; record no RR7/Remix dependency, project, publish, release, docs, workspace, or lockfile residue. <!-- sdd-owner: implementation -->
- [ ] Finalize release evidence in `docs/migrations/react-remix-to-react-router.md` (or the repository-approved retained historical evidence location) with consumer status, reviewed scenario dispositions, transitional-surface absence, protected RR8 results, authored/generated diff counts, and the exact final bridge rollback version; do not add or modify product code. <!-- sdd-owner: implementation -->

The final parent-owned closure row remains deferred and unchanged. PR10a rollback restores only the six deleted test/config files, explicit test target, validator staging, topology docs, and PR10a checkboxes.

## Work Unit 10 / PR10b — Remove Retired RR7 Scenarios

### Status, Boundary, and Counts

- Authoritative OpenSpec status was `applyState: ready`, `nextRecommended: apply`; planning artifacts were complete, action context was repo-local at `/Users/skynet/devx-op/effectify`, allowed edit root matched the workspace, and warnings/blockers were empty.
- Parent supplied native `proceed` for `retire-rr7-scenarios`, maximum 1,000 lines; the executor authenticated the same attempt token, and the parent owns settlement.
- Delivery remained `auto-chain`, `feature-branch-chain`; status is **completed for PR10b only**, with PR10c–PR10d non-releasable and deferred.
- Product source: **3 additions + 855 deletions = 858 authored lines** across 10 files; generated retained: **0**. Final child diff including tasks/progress: **55 additions + 856 deletions = 911 authored lines**, below 1,000.

### Completed Task, Files, and Persisted Checkbox

- [x] GREEN PR10b: delete the retired RR7 app scenario/source files, including the local adapter, without deleting remaining app/graph files or changing package/release/lockfile surfaces. <!-- sdd-owner: implementation -->
- Deleted exactly seven files: `app/lib/mockStore.ts`, `app/routes/api.$.ts`, `demo.tsx`, `login.tsx`, `signup.tsx`, `test.tsx`, and `todos.tsx`.
- Modified only `app/routes.ts`, `app/components/Nav.tsx`, and `app/routes/_index.tsx`: routes now contain index plus `api/auth/*`; navigation is home-only; stale deleted-route links, sign-out redirect behavior, Remix wording, and mock-store claims are gone.
- Persisted ownership is **54/62 implementation rows complete, 8 remaining; 2/3 parent rows complete, 1 deferred; 0 malformed markers**. The PR10b row is visibly checked in OpenSpec and Engram.

### TDD Cycle Evidence

| Task                      | Layer / harness              | Safety net                                                   | RED                                                                        | GREEN                                                        | TRIANGULATE                                                                                                                                   | REFACTOR                                                                                  |
| ------------------------- | ---------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Retired scenario deletion | Structural build integration | Reduced app typegen/typecheck/build/lint passed before edits | Existing staged `--expect=retired` failed on retained app/package surfaces | Clean reduced-app typegen, typecheck, build, and lint passed | OPEN remained green; RETIRED remained explicitly red only because later-head app/package/graph surfaces remain; protected RR8 matrices passed | Format/diff/scope scans passed; generated outputs removed and router tsbuildinfo restored |

No new tests or pure functions were added; PR10a's staged fail-closed validator is the RED harness for this deletion sequence. Runtime harness is N/A for source deletion; the reduced production build and protected RR8 runtime suites provide executable safety evidence.

### Verification Evidence

- Node `v24.19.0`: reduced RR7 app clean `typegen` → `typecheck` → `build` and lint all passed; build emitted only established non-failing framework warnings, and lint retained one established warning in untouched `app/lib/http.server.ts`.
- Consolidation OPEN passed with rollback `0.5.12-alpha.1`, 24 consumers, 29 scenarios, and 0 pending. Explicit RETIRED returned nonzero as required on the remaining app/package, bridge, graph, docs, workspace, and lockfile surfaces reserved for PR10c/PR10d.
- Protected RR8 app passed migration manifest/readiness, migration tests 9/9, full tests 115/115, clean typegen/typecheck/build, and lint.
- Protected packages passed router 8/8 and adapter 9/9 tests plus both no-build typecheck/lint/build matrices. Manifest and `pnpm why` evidence resolved protected React Router only at exact `8.3.0`.
- Repository format check and `git diff --check` passed after generated cleanup. Scope scans proved exactly 7 deletions and 3 app-source modifications before artifact updates, no stale deleted-route references, and no protected/config/dependency/lockfile/release/workspace diff.

### Cleanup, Rollback, and Deviations

- Removed generated `apps/react-remix-example/{.react-router,build}` and `apps/react-router-example/{.react-router,build}` output; restored command-touched `packages/react/router/tsconfig.lib.tsbuildinfo`; retained no generated mutation.
- Rollback boundary: restore the exact seven deleted scenario files and the prior three reduced-app source files; do not change protected RR8 or later PR10 graph/package cleanup.
- Delegated scope intentionally refines the generic task phrase “including the local adapter”: the explicit PR10b file list and prohibition on changing the remaining runtime/auth adapter controlled, so `react-router7-better-auth.server.ts` remains for the later app-removal head. No other design deviation occurred.

### Remaining Implementation Tasks

- [ ] GREEN PR10c: delete the remaining old app/importer and remove its Nx graph wiring while retaining the bridge package and release/workspace/lockfile cleanup for PR10d. <!-- sdd-owner: implementation -->
- [ ] GREEN PR10d: delete the bridge package and `json`, remove obsolete release/docs/workspace references, regenerate the lockfile, and preserve protected RR8 `8.3.0`. <!-- sdd-owner: implementation -->
- [ ] TRIANGULATE final absence/version isolation with `consolidation:verify -- --expect=retired`, Nx graph, protected manifest/`pnpm why`, and repository/lockfile scans; runtime harness: N/A for deletion, with RR8 behavior verified in work unit 11. <!-- sdd-owner: implementation -->
- [ ] REFACTOR cleanup wording only after absence passes; run affected lint/typecheck/test/build and format, and record authored/generated counts for every PR10 head. <!-- sdd-owner: implementation -->
- [ ] Verify the maintained packages with `pnpm nx run-many --targets=test,typecheck:no-build,lint,build --projects=@effectify/react-router,@effectify/react-router-better-auth`; runtime harness: `packages/react/router/tests/runtime.test.ts` and the adapter suite must record payload, modeled failure, redirect/header, cookie, and throwable-identity results against RR8 `8.3.0`. <!-- sdd-owner: implementation -->
- [ ] Verify the maintained app with `pnpm nx run @effectify/react-router-example:migration:manifest`, `pnpm nx run @effectify/react-router-example:migration:verify`, `pnpm nx run @effectify/react-router-example:migration:test`, `pnpm nx run @effectify/react-router-example:test`, `rm -rf apps/react-router-example/.react-router && pnpm nx run @effectify/react-router-example:typegen`, `pnpm nx run @effectify/react-router-example:typecheck`, and `pnpm nx run @effectify/react-router-example:build`; runtime harness evidence must include routes, auth, SSR/readiness, status, headers, and each transferred unique scenario. <!-- sdd-owner: implementation -->
- [ ] Verify final graph/release absence with `pnpm nx run @effectify/react-router-example:consolidation:verify -- --expect=retired`, `pnpm nx show projects --json`, `pnpm why react-router --filter @effectify/react-router-example`, `pnpm nx affected --target=lint`, `pnpm nx affected --target=typecheck`, `pnpm nx affected --target=test`, `pnpm nx affected --target=build`, and `pnpm nx run @effectify/repo:format:check`; record no RR7/Remix dependency, project, publish, release, docs, workspace, or lockfile residue. <!-- sdd-owner: implementation -->
- [ ] Finalize release evidence in `docs/migrations/react-remix-to-react-router.md` (or the repository-approved retained historical evidence location) with consumer status, reviewed scenario dispositions, transitional-surface absence, protected RR8 results, authored/generated diff counts, and the exact final bridge rollback version; do not add or modify product code. <!-- sdd-owner: implementation -->

The final parent-owned closure row remains deferred byte-for-byte. No dependency, lockfile, project/package/Vite configuration, remaining runtime/auth adapter, bridge, release/workspace graph, protected RR8 source, commit, push, PR, release, review, receipt, or attempt settlement occurred.

## Work Unit 10 / PR10c — Hard-Budget Blocker

### Status and Boundary

- Authoritative OpenSpec status was `applyState: ready`, `nextRecommended: apply`; planning artifacts were complete and the repo-local allowed edit root was `/Users/skynet/devx-op/effectify` with no warnings or blockers.
- Parent `proceed` for `retire-rr7-app-graph` was authenticated with the live token under the supplied maximum of 2 attempts and 1,000 changed lines. Delivery remained PR10c only; parent owns settlement.
- Node `v24.19.0` and pnpm `10.14.0` were used for the provisional lockfile-only regeneration. Strict TDD used PR10a's staged RETIRED verifier as the RED harness.

### Exact Provisional Measurement

- Authored/config/app text: **10 additions + 753 deletions = 763 changed lines**.
- Generated `pnpm-lock.yaml`: **318 additions + 909 deletions = 1,227 changed lines**.
- Combined textual change: **1,990 lines**, exceeding the hard 1,000-line maximum by **990 lines**.
- Binary deletion measured separately: tracked `apps/react-remix-example/dev.db`, **57,344 bytes**.
- The generated lockfile diff removed the app importer and app-owned transitives while retaining the bridge importer and RR7 `7.18.2` snapshot, but its 1,227 lines alone exceeded the allowed total.

### Rollback and Evidence

- Per the hard-budget guard, every provisional PR10c product/config/app/lockfile change was restored to clean PR10b base `d36c0ff79bfbd90d6fbd12c10b51ee288459bb0f`; no partial app deletion or graph cleanup remains.
- Before provisioning, OPEN passed with 24 consumers, 29 scenarios, 0 pending, and rollback `0.5.12-alpha.1`; explicit RETIRED failed on the expected retained transitional residue. Protected manifest verification passed with bridge RR7 `7.18.2` and protected RR8 `8.3.0`.
- The PR10c task remains visibly unchecked. PR10d, commit, push, PR, release, receipt, and attempt settlement were not started.
- Required decision: explicit `size:exception` approval for at least **1,990 textual changed lines plus the 57,344-byte binary deletion**, or a maintainer-approved revised PR10c split/budget that preserves a green, non-releasable boundary.

### TDD Cycle Evidence

| Task                         | Layer / harness                       | Safety Net                         | RED                                           | GREEN                                                | TRIANGULATE                                                                  | REFACTOR                            |
| ---------------------------- | ------------------------------------- | ---------------------------------- | --------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------- | ----------------------------------- |
| Remaining app/graph deletion | Structural graph/manifest integration | OPEN and protected manifest passed | RETIRED failed on retained surfaces as staged | Blocked by hard size budget before retaining changes | Provisional lockfile/app/graph measurement completed, then fully rolled back | N/A; no provisional change retained |

## Work Unit 10 / PR10c Recovery — Reduce RR7 App to Static Shell

### Exact Phase Contract

- Status: **completed** for recovery head `reduce-rr7-app-to-static-shell` only.
- New evidence revision: `sha256:f9d93b9aaf8e8d7f1ddefa7646df2860071dec78db733e381bbd5d2d6264325e`, computed from the final binary-capable implementation patch under `apps/react-remix-example`.
- Remediates failed evidence: `sha256:d0f1c6565fd1e199b00d72f4b61d50b040644d9ba219ab17cfbc67745e2cf59f`.
- Native rescope revision: `sha256:997c1a9655ba69bc6e170b860ba2a29cc8f652ccec4c2ece22fb9a3518922b5b` by `kattsushi`.
- Parent owns the bound passing settlement, commit, push, PR, release, and lifecycle continuation; none was performed here.

### Structured Status and Recovery Boundary

- Authoritative native OpenSpec status was `applyState: ready`, `nextRecommended: apply`; proposal, spec, design, and tasks were complete.
- Action context was `repo-local` with workspace root and sole allowed edit root `/Users/skynet/devx-op/effectify`; warnings and blocked reasons were empty.
- The parent-provided `proceed` was authenticated as the same live attempt for `reduce-rr7-app-to-static-shell`, with 2 attempts and a maximum of 1,000 changed lines. The native response retained the mandatory binding to the failed evidence above.
- Delivery remained `auto-chain`, `feature-branch-chain`. This recovery head deletes only auth/API/Prisma/runtime surfaces and leaves an index-only, buildable transitional app.
- The app importer, Nx graph node, `package.json`, lockfile, workspace/root configuration, remaining entry/root/Nav/config files, bridge package, release graph, protected RR8, PR10d, and dependency-prune work remain untouched. The original final app-node PR10c row remains pending.

### Counts, Completed Task, and Files

- Product/config textual diff: **4 additions + 377 deletions = 381 changed lines** across **14 textual files**; generated retained: **0**.
- Recovery-head text including its tasks/progress updates, excluding the pre-existing 29-line blocker record: **78 additions + 377 deletions = 455 changed lines**. The complete worktree candidate against `d36c0ff` is **107 additions + 377 deletions = 484 textual lines**, below 1,000.
- Binary diff: **1 tracked deletion**, `apps/react-remix-example/dev.db`, exactly **57,344 bytes**.
- Deleted 11 textual files: six `app/lib` auth/API/Prisma/runtime files, `app/routes/api.auth.$.ts`, and all four tracked files under `prisma/**` (including the tracked empty migration SQL file).
- Modified only `app/routes.ts` (index-only), `app/routes/_index.tsx` (static-shell wording), and `project.json` (removed `prisma:generate` and its typecheck dependency).
- Persisted task completion: the new implementation-owned PR10c recovery row is visibly `- [x]`; the original PR10c final app-node cleanup row remains visibly `- [ ]`.
- Rollback boundary: restore the 11 deleted textual files and 57,344-byte database, then restore the three modified app/config files. Tasks/progress evidence can be reverted independently; protected RR8 and later graph/dependency cleanup are outside this rollback.

### Verification Evidence

All authoritative GREEN and verification commands ran with Node `v24.19.0`, pnpm `10.14.0`, and `NX_DAEMON=false`.

| Verification                  | Exact command(s)                                                                                                                                    | Result                                                                                                                                                                                                  |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Static transitional app       | clean generated output; `pnpm nx run @effectify/react-remix-example:typegen`; `typecheck`; `build`; `lint`                                          | Passed; typecheck no longer invoked Prisma generation, production client/server build completed, lint reported 0 warnings and 0 errors.                                                                 |
| Retirement gates              | `pnpm nx run @effectify/react-router-example:consolidation:verify`; same command with `-- --expect=retired`                                         | OPEN passed with 24 consumers, 29 scenarios, 0 pending, rollback `0.5.12-alpha.1`; RETIRED failed with exit 1 as expected only because later app/package/graph/docs/workspace/lockfile surfaces remain. |
| Static-shell absence          | exact path assertions plus scans over route map, index wording, and `project.json`                                                                  | Passed: all requested auth/API/Prisma/runtime paths and `dev.db` are absent, route map is index-only, auth-retention wording and `prisma:generate` are absent.                                          |
| Protected RR8 app             | `migration:manifest`; `migration:verify`; `migration:test`; `test`; clean `typegen`; `typecheck`; `build`; `lint`                                   | Passed: migration 9/9, app 115/115, type/build/lint green; established non-failing Vite externalization/chunk warnings only.                                                                            |
| Protected RR8 packages        | `pnpm nx run-many --targets=test,typecheck:no-build,lint,build --projects=@effectify/react-router,@effectify/react-router-better-auth --parallel=1` | Passed: router 8/8, adapter 9/9, both no-build typecheck/lint/build matrices green; existing Effect language-service suggestions were non-failing.                                                      |
| Graph/version                 | `pnpm nx show projects --json`; four protected-app `pnpm why` queries for the React Router family                                                   | Required app/package/bridge graph nodes remain present; protected `react-router`, `@react-router/dev`, `@react-router/node`, and `@react-router/serve` resolve exactly `8.3.0`.                         |
| Scope and dependency identity | `git diff --exit-code -- apps/react-remix-example/package.json pnpm-lock.yaml package.json pnpm-workspace.yaml nx.json`; targeted residue scan      | Passed with no manifest, lockfile, root/workspace, or graph delta. Package dependency residue is intentionally deferred and unchanged.                                                                  |
| Repository quality            | `pnpm nx run @effectify/repo:format`; `pnpm nx run @effectify/repo:format:check`; `git diff --check`                                                | Format/write completed for changed text, final format check and diff check passed after generated cleanup.                                                                                              |

### TDD Cycle Evidence

| Task                  | Layer / harness                                            | Safety Net                                                                                                                         | RED                                                                                                                                                                            | GREEN                                                                                              | TRIANGULATE                                                                                                                              | REFACTOR                                                                                                       |
| --------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Static-shell recovery | Structural build and fail-closed consolidation integration | Persisted OPEN gate and staged RETIRED verifier; pre-edit typecheck/build exposed only the targeted retained auth/runtime surfaces | Staged RETIRED remained nonzero while the old app/package existed; the retained auth/runtime files also prevented a clean reduced-app typecheck/build in the ambient preflight | Under Node 24.19.0, index-only typegen/typecheck/build/lint all passed after the bounded deletions | OPEN remained green; RETIRED remained expected-red for later heads; static absence scans and independent RR8 app/package matrices passed | No production refactor beyond the approved structural reduction; formatting and exact scope/diff checks passed |

No tests or pure functions were added. Runtime harness is N/A for deletion; the production static build and protected RR8 runtime/app suites supply executable safety evidence.

### Cleanup and Deviations

- Removed generated `apps/react-remix-example/{.react-router,build}` and `apps/react-router-example/{.react-router,build}` outputs and restored command-touched `packages/react/router/tsconfig.lib.tsbuildinfo`; no generated mutation remains.
- The first non-authoritative preflight inherited ambient Node `v26.7.0`; it exposed the targeted retained-source failures but is not used as passing evidence. The shell was pinned to the required Node `v24.19.0` before GREEN and every final verification command.
- Approved deviation from the original PR10c topology: native rescope keeps the app importer/graph node and manifest/lock identity while reducing it to a static shell. There is no deviation from the delegated recovery scope.

### Remaining Implementation and Parent Tasks

- [ ] GREEN PR10c: delete the remaining old app/importer and remove its Nx graph wiring while retaining the bridge package and release/workspace/lockfile cleanup for PR10d. <!-- sdd-owner: implementation -->
- [ ] GREEN PR10d: delete the bridge package and `json`, remove obsolete release/docs/workspace references, regenerate the lockfile, and preserve protected RR8 `8.3.0`. <!-- sdd-owner: implementation -->
- [ ] TRIANGULATE final absence/version isolation with `consolidation:verify -- --expect=retired`, Nx graph, protected manifest/`pnpm why`, and repository/lockfile scans; runtime harness: N/A for deletion, with RR8 behavior verified in work unit 11. <!-- sdd-owner: implementation -->
- [ ] REFACTOR cleanup wording only after absence passes; run affected lint/typecheck/test/build and format, and record authored/generated counts for every PR10 head. <!-- sdd-owner: implementation -->
- [ ] Verify the maintained packages with `pnpm nx run-many --targets=test,typecheck:no-build,lint,build --projects=@effectify/react-router,@effectify/react-router-better-auth`; runtime harness: `packages/react/router/tests/runtime.test.ts` and the adapter suite must record payload, modeled failure, redirect/header, cookie, and throwable-identity results against RR8 `8.3.0`. <!-- sdd-owner: implementation -->
- [ ] Verify the maintained app with `pnpm nx run @effectify/react-router-example:migration:manifest`, `pnpm nx run @effectify/react-router-example:migration:verify`, `pnpm nx run @effectify/react-router-example:migration:test`, `pnpm nx run @effectify/react-router-example:test`, `rm -rf apps/react-router-example/.react-router && pnpm nx run @effectify/react-router-example:typegen`, `pnpm nx run @effectify/react-router-example:typecheck`, and `pnpm nx run @effectify/react-router-example:build`; runtime harness evidence must include routes, auth, SSR/readiness, status, headers, and each transferred unique scenario. <!-- sdd-owner: implementation -->
- [ ] Verify final graph/release absence with `pnpm nx run @effectify/react-router-example:consolidation:verify -- --expect=retired`, `pnpm nx show projects --json`, `pnpm why react-router --filter @effectify/react-router-example`, `pnpm nx affected --target=lint`, `pnpm nx affected --target=typecheck`, `pnpm nx affected --target=test`, `pnpm nx affected --target=build`, and `pnpm nx run @effectify/repo:format:check`; record no RR7/Remix dependency, project, publish, release, docs, workspace, or lockfile residue. <!-- sdd-owner: implementation -->
- [ ] Finalize release evidence in `docs/migrations/react-remix-to-react-router.md` (or the repository-approved retained historical evidence location) with consumer status, reviewed scenario dispositions, transitional-surface absence, protected RR8 results, authored/generated diff counts, and the exact final bridge rollback version; do not add or modify product code. <!-- sdd-owner: implementation -->

Deferred parent lifecycle action remains unchanged: after work unit 11, evaluate final RR8-only evidence before closing the OpenSpec change.

## Work Unit 10 / PR10c Recovery — Prune Static App Auth Dependencies

### Exact Phase Contract

- Status: **completed** for recovery head `prune-static-app-auth-deps` only.
- Evidence revision: `sha256:2f28e3fcb4a0283ab685a8a39ffb3f040983110a08262220db7cd0f5923b9b45`, computed from the final binary-capable manifest/lockfile implementation patch.
- Authored implementation lines: **0 additions + 5 deletions = 5** in `apps/react-remix-example/package.json`.
- Generated lockfile lines: **0 additions + 56 deletions = 56** in `pnpm-lock.yaml`.
- Implementation total: **61 changed lines**, below the native 1,000-line cap. Final worktree total including tasks/progress: **63 authored + 56 generated = 119 changed lines**.
- Parent owns settlement, commit, push, PR, release, and lifecycle continuation; none was performed here.

### Structured Status and Boundary

- Authoritative OpenSpec status was `applyState: ready`, `nextRecommended: apply`; proposal, spec, design, tasks, and cumulative progress were read from OpenSpec and their Engram mirrors were retrieved.
- Action context was `repo-local`, workspace/allowed edit root `/Users/skynet/devx-op/effectify`, with no warnings or blockers. Parent `proceed` was authenticated for this exact recovery head with a 1,000-line maximum.
- Delivery remains `auto-chain`, `feature-branch-chain`. This head changes only the static app manifest and generated lockfile plus its tasks/progress evidence.
- Product source, app/project/root/workspace configuration, database dependencies, RR7 framework dependencies, React dependencies, all dev dependencies, bridge package, release configuration, protected RR8, and later cleanup groups remain unchanged.

### Completed Task, Lockfile Provenance, and Files

- [x] GREEN PR10c recovery head: prune only the static app's unused `effect`, `@effect/platform-node`, `@effectify/react-remix`, `@effectify/node-better-auth`, and `better-auth` dependency edges, regenerate the lockfile only, and preserve all database, RR7, React, and dev dependencies. <!-- sdd-owner: implementation -->
- Files changed: `apps/react-remix-example/package.json`, generated `pnpm-lock.yaml`, and cumulative `tasks.md` / `apply-progress.md` evidence.
- `pnpm install --lockfile-only` under Node `v24.19.0` and pnpm `10.14.0` was the only command that modified `pnpm-lock.yaml`.
- Lockfile SHA-256 changed from `9e1596f291faacc7b1b786872d451445b689066695b21024c1bd9bcf256465f8` to `691c32f2f3fc79647b4e35c1179f951652c22dcaff1da99e770d299bdab171c1`; manifest SHA-256 changed from `31306fe8ca8ee7e92fecd882fad00e653768d1274254f09fee319d6066bf28f0` to `0783276125498f5b14f2d076e5811201333d218ba790331d02099c662d6fc070`.
- Exact manifest comparison proved only the five named keys disappeared. Database declarations, exact RR7 `7.18.2` family, React `18.2.0`, and every dev dependency are byte-for-byte value-equivalent to the parent.

### TDD Cycle and Verification Evidence

| Stage       | Evidence                                                                                                                                | Result                                                                                                                                                                                                           |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RED         | Five app-filtered `pnpm why` queries before edits; staged `consolidation:verify -- --expect=retired`                                    | All five direct dependency edges were present; RETIRED exited 1 on retained transitional surfaces.                                                                                                               |
| GREEN       | Remove only five manifest keys; `pnpm install --lockfile-only`; frozen install; clean static app typegen/typecheck/build/lint           | Lockfile prune was 56 generated deletions; frozen install and all four app targets passed, lint 0 warnings/errors.                                                                                               |
| TRIANGULATE | `pnpm why --depth 0` for all five removed edges; normal `pnpm why effect`; bridge/app RR7 checks; OPEN/RETIRED gates                    | No removed direct edge remained. Effect remains only transitively through unchanged Prisma dependencies; bridge and app still resolve RR7 `7.18.2`; OPEN passed and RETIRED stayed expected-red.                 |
| REFACTOR    | Protected package/app matrices, four protected `pnpm why` queries, exact catalog assertion, format/diff/scope checks, generated cleanup | Router 8/8 and adapter 9/9 passed; protected app migration 9/9 and full 115/115 passed with type/build/lint green; all protected framework packages resolve exact `8.3.0`; only assigned files/artifacts remain. |

Runtime harness is N/A for a dependency-edge prune. The static production build and independent protected RR8 runtime/app suites provide executable safety evidence.

### Cleanup and Deviations

- Removed generated `apps/react-remix-example/{.react-router,build}` and `apps/react-router-example/{.react-router,build}` and restored command-touched `packages/react/router/tsconfig.lib.tsbuildinfo`; no generated output or protected mutation remains.
- Repository format check, `git diff --check`, exact manifest comparison, and assigned-scope path check passed.
- Deviation: the first protected manifest verification hit a transient `registry.npmjs.org` connect timeout; an unchanged retry passed. There was no design, dependency, source, configuration, or scope deviation.
- Rollback boundary: restore `apps/react-remix-example/package.json` and `pnpm-lock.yaml` together to the recorded parent hashes; task/progress evidence can be reverted independently.

### Remaining Implementation and Parent Tasks

- [ ] GREEN PR10c: delete the remaining old app/importer and remove its Nx graph wiring while retaining the bridge package and release/workspace/lockfile cleanup for PR10d. <!-- sdd-owner: implementation -->
- [ ] GREEN PR10d: delete the bridge package and `json`, remove obsolete release/docs/workspace references, regenerate the lockfile, and preserve protected RR8 `8.3.0`. <!-- sdd-owner: implementation -->
- [ ] TRIANGULATE final absence/version isolation with `consolidation:verify -- --expect=retired`, Nx graph, protected manifest/`pnpm why`, and repository/lockfile scans; runtime harness: N/A for deletion, with RR8 behavior verified in work unit 11. <!-- sdd-owner: implementation -->
- [ ] REFACTOR cleanup wording only after absence passes; run affected lint/typecheck/test/build and format, and record authored/generated counts for every PR10 head. <!-- sdd-owner: implementation -->
- [ ] Verify the maintained packages with `pnpm nx run-many --targets=test,typecheck:no-build,lint,build --projects=@effectify/react-router,@effectify/react-router-better-auth`; runtime harness: `packages/react/router/tests/runtime.test.ts` and the adapter suite must record payload, modeled failure, redirect/header, cookie, and throwable-identity results against RR8 `8.3.0`. <!-- sdd-owner: implementation -->
- [ ] Verify the maintained app with `pnpm nx run @effectify/react-router-example:migration:manifest`, `pnpm nx run @effectify/react-router-example:migration:verify`, `pnpm nx run @effectify/react-router-example:migration:test`, `pnpm nx run @effectify/react-router-example:test`, `rm -rf apps/react-router-example/.react-router && pnpm nx run @effectify/react-router-example:typegen`, `pnpm nx run @effectify/react-router-example:typecheck`, and `pnpm nx run @effectify/react-router-example:build`; runtime harness evidence must include routes, auth, SSR/readiness, status, headers, and each transferred unique scenario. <!-- sdd-owner: implementation -->
- [ ] Verify final graph/release absence with `pnpm nx run @effectify/react-router-example:consolidation:verify -- --expect=retired`, `pnpm nx show projects --json`, `pnpm why react-router --filter @effectify/react-router-example`, `pnpm nx affected --target=lint`, `pnpm nx affected --target=typecheck`, `pnpm nx affected --target=test`, `pnpm nx affected --target=build`, and `pnpm nx run @effectify/repo:format:check`; record no RR7/Remix dependency, project, publish, release, docs, workspace, or lockfile residue. <!-- sdd-owner: implementation -->
- [ ] Finalize release evidence in `docs/migrations/react-remix-to-react-router.md` (or the repository-approved retained historical evidence location) with consumer status, reviewed scenario dispositions, transitional-surface absence, protected RR8 results, authored/generated diff counts, and the exact final bridge rollback version; do not add or modify product code. <!-- sdd-owner: implementation -->

Deferred parent lifecycle action remains byte-for-byte unchanged: after work unit 11, evaluate final RR8-only evidence before closing the OpenSpec change.

## Work Unit 10 / PR10c Recovery — Prune Static App Database Dependencies

### Exact Phase Contract

- Status: **completed** for recovery head `prune-static-app-database-deps` only.
- Evidence revision: `sha256:d20982abdafae8d3658d2ac8f30f7aaf69407e0c5ea8b2a080813996e1c37ab7`, computed from the final manifest/lockfile implementation patch.
- Authored implementation lines: **1 addition + 9 deletions = 10** in `apps/react-remix-example/package.json`; the addition is the retained `react-dom` line without its former trailing comma.
- Generated lockfile lines: **0 additions + 158 deletions = 158** in `pnpm-lock.yaml`.
- Implementation total: **168 changed lines**, below the native 1,000-line cap; no Prisma-versus-SQLite/Kysely split was needed. Final worktree total including tasks/progress is **70 authored + 158 generated = 228 changed lines**.
- Parent owns settlement, commit, push, PR, release, and lifecycle continuation; none was performed here.

### Structured Status and Boundary

- Authoritative OpenSpec status was `applyState: ready`, `nextRecommended: apply`; proposal, spec, design, tasks, cumulative progress, and their Engram mirrors were read before editing.
- Action context was `repo-local`, workspace/allowed edit root `/Users/skynet/devx-op/effectify`, with no warnings or blockers. The parent-owned active attempt was authenticated as `proceed` for this exact recovery head with a 1,000-line maximum.
- Delivery remains `auto-chain`, `feature-branch-chain`. This head changes only the static app manifest and generated lockfile plus this one tasks/progress recovery record.
- Product source, project/root/workspace/release/bridge/PR10d surfaces, protected RR8, RR7 framework dependencies, React dependencies, TypeScript/Vite dependencies, and all other remaining manifest/config values remain unchanged.

### Completed Task, Lockfile Provenance, and Files

- [x] GREEN PR10c recovery head: prune only the static app's unused `@prisma/client`, `@prisma/client-runtime-utils`, `better-sqlite3`, `dotenv`, `kysely`, `@prisma/generator`, `@types/better-sqlite3`, and `prisma` dependency edges, regenerate the lockfile only, and preserve RR7 framework, React, TypeScript/Vite, and remaining dependencies/config unchanged. <!-- sdd-owner: implementation -->
- Files changed: `apps/react-remix-example/package.json`, generated `pnpm-lock.yaml`, and cumulative `tasks.md` / `apply-progress.md` evidence.
- `pnpm install --lockfile-only` under Node `v24.19.0` and pnpm `10.14.0` was the only command that modified `pnpm-lock.yaml`.
- Lockfile SHA-256 changed from `691c32f2f3fc79647b4e35c1179f951652c22dcaff1da99e770d299bdab171c1` to `17c80b112a30b3a02c70ed3a358ff9b5a50926b978426a13f99257c5314a8954`; manifest SHA-256 changed from `0783276125498f5b14f2d076e5811201333d218ba790331d02099c662d6fc070` to `20a2d632c0db14abf57fd1aa13c3f495626c390d4dda46a7da7b5039dfee4f33`.
- Exact manifest comparison proved only the eight named keys disappeared. Exact RR7 `7.18.2`, React `18.2.0`, TypeScript/Vite, and every other manifest/config value are unchanged.
- Rollback boundary: restore `apps/react-remix-example/package.json` and `pnpm-lock.yaml` together to the recorded parent hashes; task/progress evidence can be reverted independently.

### TDD Cycle and Verification Evidence

| Stage       | Evidence                                                                                                                          | Result                                                                                                                                                                 |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Safety net  | Frozen install; clean static app typegen/typecheck/build/lint                                                                     | Passed under Node 24.19.0; static production client/server builds completed and lint reported 0 warnings/errors.                                                       |
| RED         | Eight app-filtered direct-depth `pnpm why` queries before edits; staged `consolidation:verify -- --expect=retired`                | All eight assigned direct edges were present at their resolved versions; RETIRED exited 1 on retained transitional surfaces.                                           |
| GREEN       | Remove exactly eight manifest keys; `pnpm install --lockfile-only`; frozen install; clean static app typegen/typecheck/build/lint | Manifest changed by 10 authored lines and lockfile by 158 generated deletions; frozen install and all four static app targets passed.                                  |
| TRIANGULATE | Exact manifest delta, eight absent direct-depth queries, lockfile importer assertion, RR7 isolation, OPEN/RETIRED gates           | No removed direct edge remained; Prisma assets/database stayed absent; bridge/app RR7 remained 7.18.2; OPEN passed and RETIRED stayed expected-red with exit 1.        |
| REFACTOR    | Protected RR8 matrices, exact 8.3.0 checks, format/diff/scope checks, generated cleanup                                           | Router 8/8 and adapter 9/9 passed; protected migration 9/9 and app 115/115 passed with typegen/typecheck/build/lint; format, scope, exact catalog, and cleanup passed. |

No tests or pure functions were added because this is a one-output structural manifest/lockfile prune. Triangulation used the generated importer, resolved dependency graph, clean production builds, and independent protected regression matrices. Runtime harness is N/A for a dependency-edge prune.

### Cleanup and Deviations

- Removed generated `apps/react-remix-example/{.react-router,build}` and `apps/react-router-example/{.react-router,build}` and restored command-touched `packages/react/router/tsconfig.lib.tsbuildinfo`; no generated output or protected mutation remains.
- Repository format check, `git diff --check`, exact manifest comparison, exact assigned-scope assertion, bridge isolation, and protected catalog checks passed.
- Two initial lockfile-importer helper attempts failed because Python `yaml` and root-level JavaScript `yaml` modules were unavailable; the same assertion was rerun successfully with a dependency-free importer-section parser. No product or lockfile remediation was required.
- No design, dependency, source, configuration, or scope deviation occurred.

### Remaining Implementation and Parent Tasks

- [ ] GREEN PR10c: delete the remaining old app/importer and remove its Nx graph wiring while retaining the bridge package and release/workspace/lockfile cleanup for PR10d. <!-- sdd-owner: implementation -->
- [ ] GREEN PR10d: delete the bridge package and `json`, remove obsolete release/docs/workspace references, regenerate the lockfile, and preserve protected RR8 `8.3.0`. <!-- sdd-owner: implementation -->
- [ ] TRIANGULATE final absence/version isolation with `consolidation:verify -- --expect=retired`, Nx graph, protected manifest/`pnpm why`, and repository/lockfile scans; runtime harness: N/A for deletion, with RR8 behavior verified in work unit 11. <!-- sdd-owner: implementation -->
- [ ] REFACTOR cleanup wording only after absence passes; run affected lint/typecheck/test/build and format, and record authored/generated counts for every PR10 head. <!-- sdd-owner: implementation -->
- [ ] Verify the maintained packages with `pnpm nx run-many --targets=test,typecheck:no-build,lint,build --projects=@effectify/react-router,@effectify/react-router-better-auth`; runtime harness: `packages/react/router/tests/runtime.test.ts` and the adapter suite must record payload, modeled failure, redirect/header, cookie, and throwable-identity results against RR8 `8.3.0`. <!-- sdd-owner: implementation -->
- [ ] Verify the maintained app with `pnpm nx run @effectify/react-router-example:migration:manifest`, `pnpm nx run @effectify/react-router-example:migration:verify`, `pnpm nx run @effectify/react-router-example:migration:test`, `pnpm nx run @effectify/react-router-example:test`, `rm -rf apps/react-router-example/.react-router && pnpm nx run @effectify/react-router-example:typegen`, `pnpm nx run @effectify/react-router-example:typecheck`, and `pnpm nx run @effectify/react-router-example:build`; runtime harness evidence must include routes, auth, SSR/readiness, status, headers, and each transferred unique scenario. <!-- sdd-owner: implementation -->
- [ ] Verify final graph/release absence with `pnpm nx run @effectify/react-router-example:consolidation:verify -- --expect=retired`, `pnpm nx show projects --json`, `pnpm why react-router --filter @effectify/react-router-example`, `pnpm nx affected --target=lint`, `pnpm nx affected --target=typecheck`, `pnpm nx affected --target=test`, `pnpm nx affected --target=build`, and `pnpm nx run @effectify/repo:format:check`; record no RR7/Remix dependency, project, publish, release, docs, workspace, or lockfile residue. <!-- sdd-owner: implementation -->
- [ ] Finalize release evidence in `docs/migrations/react-remix-to-react-router.md` (or the repository-approved retained historical evidence location) with consumer status, reviewed scenario dispositions, transitional-surface absence, protected RR8 results, authored/generated diff counts, and the exact final bridge rollback version; do not add or modify product code. <!-- sdd-owner: implementation -->

Deferred parent lifecycle action remains byte-for-byte unchanged: after work unit 11, evaluate final RR8-only evidence before closing the OpenSpec change.

## Work Unit 10 / PR10c Recovery — SPA-Only Shell Blocked

### Exact Phase Contract

- Status: **blocked** for recovery head `reduce-static-app-to-spa`; no implementation, task checkbox, or generated output is retained.
- Authoritative OpenSpec status was `applyState: ready`, `nextRecommended: apply`; action context was repo-local at `/Users/skynet/devx-op/effectify` with no warnings or blocked reasons. The parent-owned live attempt was authenticated as `proceed` with a 1,000-line cap; parent still owns settlement and delivery.
- Strict TDD used a structural SPA-only assertion as RED. The requested config/source/manifest/project changes made that assertion GREEN, but the mandatory executable GREEN gate failed during clean RR7 type generation.

### Proven Blocker and Rollback

- With `@react-router/dev` exactly `7.18.2`, `react-router typegen` calls its `resolveEntryFiles` path before generation. When no custom `app/entry.server.*` exists, RR7 reads the app manifest and requires a direct `dependencies["@react-router/node"]`; if `isbot` is absent it also writes `isbot@^5` back to the manifest and invokes install.
- The exact failure after deleting `app/entry.server.tsx` and removing direct `@react-router/node`, `@react-router/serve`, and `isbot` was: `Could not determine server runtime. Please install @react-router/node, or provide a custom entry.server.tsx/jsx file in your app directory.` The failing command was `pnpm nx run @effectify/react-remix-example:typegen` under Node `v24.19.0` and pnpm `10.14.0`.
- Provisional implementation size was **107 authored additions + deletions** across app source/config/manifest plus **20 generated lockfile additions + deletions**, total **127**, below the 1,000-line cap. Size was not the blocker.
- The six-file coherent implementation/lockfile candidate was fully rolled back, generated `.react-router` and `build` output was removed, and `pnpm install --frozen-lockfile` restored the parent dependency state. Post-rollback clean typegen, typecheck, build, and lint all passed under Node `v24.19.0`; lint reported 0 warnings and 0 errors.
- Required scope decision: either retain/replace a dependency-free custom `app/entry.server.*`, or authorize an RR7 development-tool patch/version change. RR7 `7.18.2` cannot satisfy the simultaneous requirements to remove every custom server entry and every direct Node/isbot edge while keeping framework typegen/build green.

### TDD Cycle Evidence

| Task                  | Test File / Harness                                   | Layer                  | Safety Net                                                                         | RED                                                                | GREEN                                                                                                    | TRIANGULATE                                                                                                                | REFACTOR                                                              |
| --------------------- | ----------------------------------------------------- | ---------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| SPA-only static shell | Structural Node assertion plus clean Nx typegen/build | Structural integration | Parent state typegen/typecheck/build/lint passed after rollback under Node 24.19.0 | Eight requested SPA/source/manifest conditions failed before edits | Structural assertions passed, but executable typegen failed on RR7's mandatory server-runtime resolution | Upstream source inspection proved the two accepted paths are a direct Node/isbot manifest runtime or a custom server entry | Candidate was coherently rolled back; no production refactor retained |

No tests or pure functions were added because the assigned changes are structural. Runtime harness is N/A for the unretained candidate; the mandatory RR7 framework generation/build boundary blocked before runtime evidence. The requested recovery task was not added to `tasks.md` or Engram because the head is not green. Protected RR8, bridge, root/workspace/release configuration, and all later scopes remained unchanged.

## Work Unit 10 / PR10c Recovery — Prune Static App Serve Edge

### Exact Phase Contract and Remediation

- Status: **completed** for recovery head `prune-static-app-serve-edge` only.
- Evidence revision: `sha256:255ffaf10c50fa95359807fe2fe33f9d65c5d86c90311a565bda00acddbe73dd`, computed from the final package/project/lockfile implementation patch.
- This correction candidate explicitly remediates failed evidence `sha256:63a9ffe2f124096154d3fbbee8b34a784e2f87006a6a4a518ed877b2b57b54e2`; it preserves the custom server runtime that the failed SPA candidate removed while pruning only the independent serving edge.
- Authoritative OpenSpec status was `applyState: ready`, `nextRecommended: apply`, with proposal/spec/design/tasks/progress present. Action context was `repo-local` at `/Users/skynet/devx-op/effectify`, the sole allowed edit root, with no warnings or blockers.
- Parent delivery authority was `auto-chain`, `feature-branch-chain`, this recovery work unit only, and a maximum 1,000 changed lines. The parent's active attempt authenticated as `proceed` with a passing settlement obligation bound to the failed evidence above; the parent still owns settlement, commit, push, PR, release, and lifecycle continuation.

### Completed Task, Boundary, and Counts

- [x] GREEN PR10c recovery head: remove only the static app `start` script, matching Nx `start` target, and direct `@react-router/serve` dependency edge; regenerate the lockfile only while preserving custom `entry.server.tsx`, SSR config, `@react-router/node`, `isbot`, React 18, RR7 framework/dev, source, bridge, root/workspace/release surfaces, and protected RR8 `8.3.0`. <!-- sdd-owner: implementation -->
- The matching row is visibly checked in `tasks.md`. Persisted implementation ownership is now 58/66 complete with eight rows remaining; parent ownership remains 2/3 complete with final closure deferred.
- Authored implementation lines: **10 deletions** across `apps/react-remix-example/package.json` and `project.json`. Generated lockfile lines: **4 additions + 4 deletions = 8**. Implementation total: **18 changed lines**; full retained worktree total including the prior blocker evidence and the new task/progress record is **89 additions + 14 deletions = 103**, below the 1,000-line cap.
- Files changed by the recovery: `apps/react-remix-example/package.json`, `apps/react-remix-example/project.json`, generated `pnpm-lock.yaml`, and this one `tasks.md` / cumulative `apply-progress.md` record.
- `pnpm install --lockfile-only` under Node `v24.19.0` and pnpm `10.14.0` was the only command that modified `pnpm-lock.yaml`.
- Manifest hash changed `20a2d632c0db14abf57fd1aa13c3f495626c390d4dda46a7da7b5039dfee4f33` → `ab7418674e480f9c9341f14415364428780238c47c6e51b036212119808f1085`; project hash changed `3015a51723592476c6ac9eaa9a05fd63937f6c6a13586da80dc469fba7911f2d` → `33537c07d4135cecdf7a318cfab2efb89ef4389c526f8c8931c8337df765d50a`; lockfile hash changed `17c80b112a30b3a02c70ed3a358ff9b5a50926b978426a13f99257c5314a8954` → `639c6411871a4d82156fe38e9efa7b8009adc397fdf8ae7909d39cee4cd32c37`.
- Rollback boundary: restore those three files together to the recorded parent hashes. The custom server entry, SSR config, source, bridge, and protected RR8 are outside the rollback because this recovery did not change them.

### TDD Cycle Evidence

| Task                        | Test File / Harness                                         | Layer                  | Safety Net                                                                                                                         | RED                                                                                                                                     | GREEN                                                                                          | TRIANGULATE                                                                                                                                                                                                       | REFACTOR                                                                                                 |
| --------------------------- | ----------------------------------------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Static app serve-edge prune | Inline structural assertion plus clean Nx framework targets | Structural integration | Frozen install and app typegen/typecheck/build/lint passed before the assigned edit; required final evidence reran on Node 24.19.0 | Structural harness failed exactly three assigned conditions: package `start`, Nx `start`, and direct `@react-router/serve` were present | The same nine-condition harness passed after the three removals and lockfile-only regeneration | Clean RR7 typegen/typecheck/build/lint, importer checks, `pnpm why`, and hashes proved the serve edge absent while custom SSR, Node/isbot, RR7 7.18.2, React 18, source/config, and protected RR8 remained intact | No product refactor was needed; format, protected matrices, final gates, diff checks, and cleanup passed |

No tests or pure functions were added because this is a one-output structural manifest/project/lockfile prune. Triangulation is supplied by the generated importer, resolved dependency graph, clean client/server production build, and independent RR8 matrices. Runtime harness is N/A for deleting an unused standalone serve command edge; executable SSR compilation remained covered by the production build.

### Verification Evidence

| Command / gate                                                                                                                                      | Result                                                                                                                                                                |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile`                                                                                                                    | Passed under Node 24.19.0; lockfile was current.                                                                                                                      |
| Clean `@effectify/react-remix-example` `typegen`, `typecheck`, `build`, and `lint`                                                                  | All passed; client and SSR server bundles built, lint reported 0 warnings/errors.                                                                                     |
| Structural serve/SSR/version assertion and app-filtered `pnpm why @react-router/serve`, `@react-router/node`, and `react-router`                    | No direct serve edge/output; direct Node and RR7 remained `7.18.2`; custom `entry.server.tsx`, `isbot`, SSR true, React 18, and TypeScript Node type remained intact. |
| `consolidation:verify -- --expect=open`                                                                                                             | Passed: OPEN, rollback `0.5.12-alpha.1`, 24 consumer rows, 29 scenario rows, 0 pending.                                                                               |
| `consolidation:verify -- --expect=retired`                                                                                                          | Expected failure with exit 1 on retained bridge/app/release/workspace surfaces; generated output had already been removed for the final run.                          |
| `pnpm nx run-many --targets=test,typecheck:no-build,lint,build --projects=@effectify/react-router,@effectify/react-router-better-auth --parallel=1` | Passed: protected router 8/8 and adapter 9/9 tests; both typecheck:no-build/lint/build matrices passed.                                                               |
| Protected app `migration:manifest`, `migration:verify`, `migration:test`, full `test`, clean `typegen`, `typecheck`, `build`, and `lint`            | Passed: migration 9/9 and app 115/115 tests; type generation, typecheck, production client/server build, and lint passed.                                             |
| Protected manifest/catalog assertions and `pnpm why react-router --filter @effectify/react-router-example --depth 0`                                | Root/catalog/app/package/adapter boundaries remained exact RR8 `8.3.0`; protected app resolved `react-router 8.3.0`.                                                  |
| `pnpm nx run @effectify/repo:format:check`, `git diff --check`, generated cleanup, and protected tsbuildinfo restoration                            | Passed; no `.react-router`, `build`, protected command mutation, or other generated output remains.                                                                   |

The shell initially exposed Node 26.7.0 for the pre-edit safety run; `fnm use 24.19.0` was then applied before lockfile regeneration and every retained final verification command. No failure or output from the wrong Node version is used as passing evidence.

### Deviations and Remaining Tasks

- The accepted rescope deliberately preserves custom `entry.server.tsx`, SSR mode, direct `@react-router/node`, and `isbot`; this is the remediation for the prior impossible SPA-only boundary, not a design regression.
- Source, bridge, root/workspace/release, PR10d, and protected RR8 files were not edited. No commit, push, PR, release, receipt, or parent settlement was performed.
- Remaining implementation rows are unchanged:
  - [ ] GREEN PR10c: delete the remaining old app/importer and remove its Nx graph wiring while retaining the bridge package and release/workspace/lockfile cleanup for PR10d. <!-- sdd-owner: implementation -->
  - [ ] GREEN PR10d: delete the bridge package and `json`, remove obsolete release/docs/workspace references, regenerate the lockfile, and preserve protected RR8 `8.3.0`. <!-- sdd-owner: implementation -->
  - [ ] TRIANGULATE final absence/version isolation with `consolidation:verify -- --expect=retired`, Nx graph, protected manifest/`pnpm why`, and repository/lockfile scans; runtime harness: N/A for deletion, with RR8 behavior verified in work unit 11. <!-- sdd-owner: implementation -->
  - [ ] REFACTOR cleanup wording only after absence passes; run affected lint/typecheck/test/build and format, and record authored/generated counts for every PR10 head. <!-- sdd-owner: implementation -->
  - [ ] Verify the maintained packages with `pnpm nx run-many --targets=test,typecheck:no-build,lint,build --projects=@effectify/react-router,@effectify/react-router-better-auth`; runtime harness: `packages/react/router/tests/runtime.test.ts` and the adapter suite must record payload, modeled failure, redirect/header, cookie, and throwable-identity results against RR8 `8.3.0`. <!-- sdd-owner: implementation -->
  - [ ] Verify the maintained app with `pnpm nx run @effectify/react-router-example:migration:manifest`, `pnpm nx run @effectify/react-router-example:migration:verify`, `pnpm nx run @effectify/react-router-example:migration:test`, `pnpm nx run @effectify/react-router-example:test`, `rm -rf apps/react-router-example/.react-router && pnpm nx run @effectify/react-router-example:typegen`, `pnpm nx run @effectify/react-router-example:typecheck`, and `pnpm nx run @effectify/react-router-example:build`; runtime harness evidence must include routes, auth, SSR/readiness, status, headers, and each transferred unique scenario. <!-- sdd-owner: implementation -->
  - [ ] Verify final graph/release absence with `pnpm nx run @effectify/react-router-example:consolidation:verify -- --expect=retired`, `pnpm nx show projects --json`, `pnpm why react-router --filter @effectify/react-router-example`, `pnpm nx affected --target=lint`, `pnpm nx affected --target=typecheck`, `pnpm nx affected --target=test`, `pnpm nx affected --target=build`, and `pnpm nx run @effectify/repo:format:check`; record no RR7/Remix dependency, project, publish, release, docs, workspace, or lockfile residue. <!-- sdd-owner: implementation -->
  - [ ] Finalize release evidence in `docs/migrations/react-remix-to-react-router.md` (or the repository-approved retained historical evidence location) with consumer status, reviewed scenario dispositions, transitional-surface absence, protected RR8 results, authored/generated diff counts, and the exact final bridge rollback version; do not add or modify product code. <!-- sdd-owner: implementation -->

Deferred parent lifecycle action remains byte-for-byte unchanged: after work unit 11, evaluate final RR8-only evidence and close the OpenSpec change only if all final evidence is complete.

## Work Unit 10 / PR10c Recovery — Normalize Static App to React 19 Catalog

### Exact Phase Contract and Status

- Status: **completed** for recovery head `normalize-static-app-react19` only.
- Evidence revision: `sha256:bebaa5d32aa27a9581e658ec802120647a9f7a102efdd35b29a7689c08935bba`, computed from the final binary-capable manifest/lockfile implementation patch.
- Authoritative OpenSpec status was `applyState: ready`, `nextRecommended: apply`; proposal, spec, design, tasks, cumulative progress, and their Engram mirrors were read before editing.
- Action context was `repo-local` with workspace root and sole allowed edit root `/Users/skynet/devx-op/effectify`; warnings and blocked reasons were empty.
- The parent-owned active attempt authenticated as `proceed` for exact work unit `normalize-static-app-react19`, evidence goal `react19-static-app-green`, and maximum 1,000 changed lines. Parent owns settlement and all delivery/lifecycle actions.
- Delivery remains `auto-chain`, `feature-branch-chain`. This recovery head changes only the static app manifest and generated lockfile plus this one tasks/progress row.

### Completed Task, Files, Counts, and Rollback

- [x] GREEN PR10c recovery head: normalize only the static app's `react`, `react-dom`, `@types/react`, and `@types/react-dom` declarations to `catalog:`, regenerate the lockfile only, and preserve exact RR7 `7.18.2` framework/dev, `@react-router/node`, `isbot`, custom SSR entry, source/config, bridge, root/workspace/release surfaces, and protected RR8 `8.3.0`. <!-- sdd-owner: implementation -->
- Files changed: `apps/react-remix-example/package.json`, generated `pnpm-lock.yaml`, and cumulative `tasks.md` / `apply-progress.md` evidence.
- Authored implementation lines: **4 additions + 4 deletions = 8** in the app manifest. Generated lockfile lines: **20 additions + 62 deletions = 82**. Implementation total: **90 changed lines**, below the 1,000-line cap.
- `pnpm install --lockfile-only` under Node `v24.19.0` and pnpm `10.14.0` was the only command that modified `pnpm-lock.yaml`.
- Manifest SHA-256 is `cac18de89fbe1f83a7ab71608ad4238b6679e58e1066b084b8abadfe636bab26`; lockfile SHA-256 changed from `639c6411871a4d82156fe38e9efa7b8009adc397fdf8ae7909d39cee4cd32c37` to `3406aefc6b0e9fe3a041a881ec4f5aeda0609fb9e93720a457a11cc6e4fff2e1`.
- Rollback boundary: restore `apps/react-remix-example/package.json` and `pnpm-lock.yaml` together to their parent versions. Task/progress evidence can be reverted independently; no protected RR8 file belongs to this rollback.

### TDD Cycle Evidence

| Stage       | Exact evidence                                                                                                                                                | Result                                                                                                                                                                                                               |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RED         | Structural manifest assertion before editing                                                                                                                  | Exit 1: all four assigned declarations were React 18 values/ranges rather than `catalog:`.                                                                                                                           |
| GREEN       | Change only four manifest values; run `pnpm install --lockfile-only`; `pnpm install --frozen-lockfile`; clean app `typegen`, `typecheck`, `build`, and `lint` | Frozen install passed; RR7 generated types, TypeScript, production client/SSR build, and lint all passed under React 19.2.7 and React types 19.2.17/19.2.3.                                                          |
| TRIANGULATE | Importer assertions; seven app-filtered `pnpm why` queries; global deterministic React 18 lockfile scan; OPEN and expected-failing RETIRED gates              | App resolved React/DOM 19.2.7, types 19.2.17/19.2.3, and RR7/node/dev 7.18.2; no React 18 runtime/type snapshot remained anywhere in the lockfile; OPEN passed and RETIRED exited 1 only on retained later surfaces. |
| REFACTOR    | Protected package/app matrices; four protected `pnpm why` queries; exact catalog checks; format, diff, scope, and generated-output cleanup                    | Router 8/8, adapter 9/9, migration 9/9, and protected app 115/115 passed; protected type/build/lint matrices passed; all four protected framework packages resolved exact 8.3.0; cleanup and formatting passed.      |

No pure function or production behavior was introduced. Runtime harness is N/A for a manifest/lockfile normalization; the clean static client/SSR production build and independent protected runtime/app suites provide executable safety evidence. The first post-install importer assertion had an invalid whitespace-sensitive harness matcher; it was corrected to a whitespace-tolerant matcher without changing product files, then passed.

### Verification Commands and Results

| Command / gate                                                                                                                                      | Result                                                                                                                                                                              |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile`                                                                                                                    | Passed under Node 24.19.0; lockfile was current and installed the React 19 graph.                                                                                                   |
| Clean `@effectify/react-remix-example` `typegen`, `typecheck`, `build`, and `lint`                                                                  | All passed; production client and SSR server bundles completed; lint reported 0 warnings/errors.                                                                                    |
| App-filtered `pnpm why` for React, React DOM, both type packages, React Router, node, and dev                                                       | React/DOM 19.2.7, types 19.2.17/19.2.3, and RR7 framework/node/dev exact 7.18.2.                                                                                                    |
| Lockfile importer and global React 18 scans                                                                                                         | App importer uses all four catalog specifiers and React 19 peer snapshots; no React 18 runtime/type snapshots remain anywhere in `pnpm-lock.yaml`.                                  |
| `consolidation:verify -- --expect=open`; same with `--expect=retired`                                                                               | OPEN passed with 24 consumers, 29 scenarios, 0 pending, rollback 0.5.12-alpha.1; RETIRED failed as expected with exit 1 on retained bridge/app/release/workspace/lockfile surfaces. |
| `pnpm nx run-many --targets=test,typecheck:no-build,lint,build --projects=@effectify/react-router,@effectify/react-router-better-auth --parallel=1` | Passed: protected router 8/8 and adapter 9/9 tests; both no-build typecheck/lint/build matrices passed.                                                                             |
| Protected app migration manifest/verify/test, full test, clean typegen, typecheck, build, and lint                                                  | Passed: migration 9/9 and app 115/115; type generation, typecheck, production build, and lint green.                                                                                |
| Protected app-filtered `pnpm why` for `react-router`, `@react-router/dev`, `@react-router/node`, and `@react-router/serve`                          | Every protected framework dependency resolved exact `8.3.0`; root/workspace catalog assertions remained exact.                                                                      |
| `pnpm nx run @effectify/repo:format:check`, `git diff --check`, generated cleanup, and protected tsbuildinfo restoration                            | Passed; final changed implementation paths are only the assigned manifest and lockfile, and no `.react-router`, `build`, protected mutation, or other generated output remains.     |

### Deviations and Remaining Tasks

- Authorized recovery deviation: the static RR7 app now shares the workspace React 19 catalog instead of preserving the React 18 values named by the preceding serve-edge recovery row. RR7 stays exact 7.18.2 and all executable compatibility checks pass.
- Source/config, custom SSR entry, `@react-router/node`, `isbot`, bridge, root/workspace/release surfaces, PR10d, and protected RR8 files were not edited. No commit, push, PR, release, receipt, parent review, or attempt settlement was performed.
- Persisted implementation ownership is **59/67 complete with eight rows remaining**; parent ownership is **2/3 complete with final closure deferred**. The exact remaining implementation rows are unchanged:
  - [ ] GREEN PR10c: delete the remaining old app/importer and remove its Nx graph wiring while retaining the bridge package and release/workspace/lockfile cleanup for PR10d. <!-- sdd-owner: implementation -->
  - [ ] GREEN PR10d: delete the bridge package and `json`, remove obsolete release/docs/workspace references, regenerate the lockfile, and preserve protected RR8 `8.3.0`. <!-- sdd-owner: implementation -->
  - [ ] TRIANGULATE final absence/version isolation with `consolidation:verify -- --expect=retired`, Nx graph, protected manifest/`pnpm why`, and repository/lockfile scans; runtime harness: N/A for deletion, with RR8 behavior verified in work unit 11. <!-- sdd-owner: implementation -->
  - [ ] REFACTOR cleanup wording only after absence passes; run affected lint/typecheck/test/build and format, and record authored/generated counts for every PR10 head. <!-- sdd-owner: implementation -->
  - [ ] Verify the maintained packages with `pnpm nx run-many --targets=test,typecheck:no-build,lint,build --projects=@effectify/react-router,@effectify/react-router-better-auth`; runtime harness: `packages/react/router/tests/runtime.test.ts` and the adapter suite must record payload, modeled failure, redirect/header, cookie, and throwable-identity results against RR8 `8.3.0`. <!-- sdd-owner: implementation -->
  - [ ] Verify the maintained app with `pnpm nx run @effectify/react-router-example:migration:manifest`, `pnpm nx run @effectify/react-router-example:migration:verify`, `pnpm nx run @effectify/react-router-example:migration:test`, `pnpm nx run @effectify/react-router-example:test`, `rm -rf apps/react-router-example/.react-router && pnpm nx run @effectify/react-router-example:typegen`, `pnpm nx run @effectify/react-router-example:typecheck`, and `pnpm nx run @effectify/react-router-example:build`; runtime harness evidence must include routes, auth, SSR/readiness, status, headers, and each transferred unique scenario. <!-- sdd-owner: implementation -->
  - [ ] Verify final graph/release absence with `pnpm nx run @effectify/react-router-example:consolidation:verify -- --expect=retired`, `pnpm nx show projects --json`, `pnpm why react-router --filter @effectify/react-router-example`, `pnpm nx affected --target=lint`, `pnpm nx affected --target=typecheck`, `pnpm nx affected --target=test`, `pnpm nx affected --target=build`, and `pnpm nx run @effectify/repo:format:check`; record no RR7/Remix dependency, project, publish, release, docs, workspace, or lockfile residue. <!-- sdd-owner: implementation -->
  - [ ] Finalize release evidence in `docs/migrations/react-remix-to-react-router.md` (or the repository-approved retained historical evidence location) with consumer status, reviewed scenario dispositions, transitional-surface absence, protected RR8 results, authored/generated diff counts, and the exact final bridge rollback version; do not add or modify product code. <!-- sdd-owner: implementation -->

Deferred parent lifecycle action remains byte-for-byte unchanged: after work unit 11, evaluate the final RR8-only evidence before closing the OpenSpec change.

## Work Unit 10 / PR10c Recovery — Final App-Node Retirement Blocked by Line Cap

### Exact Phase Contract and Structured Status

- Status: **blocked** for recovery head `retire-static-app-node`; no app, graph, config, verifier, or lockfile implementation change is retained.
- Authoritative OpenSpec status was `applyState: ready`, `nextRecommended: apply`; proposal, spec, design, tasks, cumulative progress, and their Engram mirrors were read before editing.
- Action context was `repo-local` with workspace root and sole allowed edit root `/Users/skynet/devx-op/effectify`; warnings and blocked reasons were empty.
- Parent delivery authority was `auto-chain`, `feature-branch-chain`, this recovery head only, and a hard maximum of 1,000 changed lines. Parent owns settlement and all delivery/lifecycle actions.
- Strict TDD guidance and the parent-injected work-unit skill were loaded. The original PR10c app-node task remains visibly unchecked.

### Exact Blocker Evidence and Atomic Rollback

- The provisional candidate deleted all 12 tracked files under `apps/react-remix-example`, removed its Vite/Vitest exclusions, removed the four stale Remix catalog entries and root Undici override, adapted the manifest verifier for app absence plus surviving RR7/RR8 isolation, and regenerated the lockfile only with `pnpm install --lockfile-only` under Node `v24.19.0` and pnpm `10.14.0`.
- Authored candidate size was **379 changed lines**: 319 app-file deletions plus 60 graph/config/verifier additions and deletions.
- Generated `pnpm-lock.yaml` size was **287 additions + 622 deletions = 909 changed lines**.
- Total candidate size was **1,288 changed lines**, exceeding the hard cap by **288**.
- Per the delegated contract, all candidate paths were restored atomically from `HEAD` before any task checkbox update. `git diff --exit-code -- apps/react-remix-example nx.json vitest.config.ts pnpm-workspace.yaml package.json scripts/verify-react-router-manifests.mjs pnpm-lock.yaml` passed.
- Post-rollback `pnpm install --frozen-lockfile` passed for all 21 workspace projects, and `git status --short` was empty before this progress-only evidence was appended.
- Rollback restored the original app/importer, Nx exclusions, root Vitest exclusion, Remix catalog entries, root override, verifier behavior, and exact lockfile. No bridge/package/release/docs PR10d surface changed.

### Commands Run

- Safety net: `pnpm install --frozen-lockfile`; bridge `dependency:isolation`; protected `migration:manifest`; `consolidation:verify -- --expect=open`; and `pnpm nx show projects --json` all passed.
- RED: the inline structural retirement assertion exited 1 with the ten exact retained conditions listed below.
- Candidate generation: `pnpm install --lockfile-only` was the only lockfile writer; the exact `git diff --numstat` budget parser measured 379 authored and 909 generated lines, then restored every candidate path because total size exceeded 1,000.
- Rollback/quality: post-rollback frozen install, exact scoped `git diff --exit-code`, repository format/write after the expected initial check failure, final `format:check`, and `git diff --check` passed.

### TDD Cycle Evidence

| Task                      | Test File / Harness                                                                                      | Layer                  | Safety Net                                                                                              | RED                                                                                                                                                                    | GREEN                                                                                                                             | TRIANGULATE                              | REFACTOR                                                 |
| ------------------------- | -------------------------------------------------------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | -------------------------------------------------------- |
| Final app-node retirement | Inline structural assertion, manifest isolation targets, consolidation gate, and line-budget transaction | Structural integration | Frozen install, bridge isolation, protected manifest, OPEN gate, and pre-retirement Nx graph all passed | Exit 1 with ten exact retained conditions: app path, two Nx exclusions, root Vitest exclusion, four catalog entries, root override, and missing verifier absence guard | Provisional edits were produced, but the mandatory 1,000-line budget gate failed before GREEN verification; candidate rolled back | Not reached because total size was 1,288 | Atomic rollback and frozen-install reconciliation passed |

No tests or pure functions were added because this is structural deletion/configuration work. Runtime harness is N/A for the unretained deletion candidate.

### Remaining Task and Required Decision

- [ ] GREEN PR10c: delete the remaining old app/importer and remove its Nx graph wiring while retaining the bridge package and release/workspace/lockfile cleanup for PR10d. <!-- sdd-owner: implementation -->

The parent must rescope/split this atomic app-node candidate or explicitly authorize a size exception; the current hard-cap contract requires stopping with the row unchecked. All later implementation rows and the final parent-owned closure action remain unchanged.

## Work Unit 10 / PR10c Recovery — Retire Static App Node, Keep Stale Importer

### Exact Phase Contract and Remediation

- Status: **completed** for recovery head `retire-static-app-node-keep-stale-importer` only.
- Evidence revision: `sha256:9b40e1a3aabb104490875bceb0f5ff5a8ab761bd3c8272a32e776c1570883d51`, computed from the final binary implementation patch over the deleted app, `nx.json`, root `vitest.config.ts`, and the manifest verifier.
- This passing correction candidate remediates failed evidence `sha256:7d2e4f5ac44dbdf4bfe6868d0d30c35116484f92a71601a29390116390fbb456`; parent owns the bound settlement and all delivery/lifecycle actions.
- Implementation size is **20 additions + 338 deletions = 358 changed lines**, below the native 1,000-line cap. The prior blocker evidence remains merged rather than overwritten.

### Structured Status and Boundary

- Authoritative OpenSpec status was `applyState: ready`, `nextRecommended: apply`; proposal, specification, design, tasks, and cumulative progress were read before editing.
- Action context was `repo-local` with workspace root and sole allowed edit root `/Users/skynet/devx-op/effectify`; warnings and blocked reasons were empty.
- Parent delivery authority was `auto-chain`, `feature-branch-chain`, this exact recovery head only, with a maximum 1,000 changed lines. The live parent attempt authenticated as `proceed` and retained its remediation settlement obligation.
- Allowed implementation paths were only `apps/react-remix-example/**`, the app exclusions in `nx.json` and root `vitest.config.ts`, and `scripts/verify-react-router-manifests.mjs`.
- `pnpm-lock.yaml`, `pnpm-workspace.yaml`, root `package.json`, the bridge package/release/docs, and every PR10d surface remained unchanged. No commit, push, PR, release, review, receipt, or settlement was performed.

### Completed Task and Files

- [x] GREEN PR10c recovery head: delete every remaining file under `apps/react-remix-example`, remove only its Nx Vite/Vitest and root Vitest exclusions, and adapt the manifest verifier for app absence while retaining the stale lockfile importer, workspace catalog, root override, bridge, release, and documentation cleanup for a separate head. <!-- sdd-owner: implementation -->
- The matching implementation-owned row is visibly checked in `tasks.md`; the original broad PR10c importer/graph cleanup and final lock cleanup rows remain unchecked.
- Deleted all 12 tracked files under `apps/react-remix-example/**`.
- Updated `nx.json`, `vitest.config.ts`, and `scripts/verify-react-router-manifests.mjs`; updated only the cumulative OpenSpec task/progress artifacts beyond implementation scope.
- Rollback boundary: restore the deleted app plus those three graph/verifier files from `HEAD`; no lockfile, workspace, root manifest, bridge, release, or docs file belongs to this rollback.

### TDD Cycle Evidence

| Task                       | Test File / Harness                                                 | Layer                  | Safety Net                                                                                         | RED                                                                                                 | GREEN                                                                                                 | TRIANGULATE                                                                                                                                                                                      | REFACTOR                                                                                              |
| -------------------------- | ------------------------------------------------------------------- | ---------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| Static app-node retirement | Inline structural assertion plus manifest/consolidation/Nx commands | Structural integration | Frozen install, bridge isolation, protected manifest, OPEN gate, and pre-change Nx presence passed | Exit 1: app directory, two Nx exclusions, root Vitest exclusion, and absence guard were not retired | App directory absent; exclusions removed; dependency-isolation and protected manifest commands passed | Recreating the app directory made the verifier exit 1 with `apps/react-remix-example must be retired`; removing it restored pass while bridge RR7 7.18.2 and protected RR8 8.3.0 stayed verified | No product refactor was needed; format, affected matrices, scope, checksum, and cleanup checks passed |

No test file or pure function was added because this is structural deletion/configuration work. Runtime harness is N/A for deleting a static retired app node; independent protected runtime and app suites supplied executable safety evidence.

### Verification Evidence

| Command / gate                                                                   | Result                                                                                                                                                                           |
| -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile --ignore-scripts`                                | Passed under Node 24.19.0 with 20 discovered workspace projects despite the intentionally stale lockfile importer.                                                               |
| Lockfile SHA-256 before/after                                                    | Unchanged at `3406aefc6b0e9fe3a041a881ec4f5aeda0609fb9e93720a457a11cc6e4fff2e1`.                                                                                                 |
| Manifest verifier presence guard                                                 | With a temporary empty app directory, direct `dependency-isolation` exited 1 on `apps/react-remix-example must be retired`; with the directory absent it passed.                 |
| `@effectify/react-remix:dependency:isolation` and protected `migration:manifest` | Passed; surviving bridge resolved RR7 `7.18.2`, and the published protected family remained aligned at RR8 `8.3.0`.                                                              |
| `consolidation:verify -- --expect=open`                                          | Passed: OPEN, rollback `0.5.12-alpha.1`, 24 consumer rows, 29 scenario rows, 0 pending.                                                                                          |
| `consolidation:verify -- --expect=retired`                                       | Expected exit 1 on retained bridge, release/docs, workspace/root Remix residue, stale lockfile importer/resolutions, and RR7 `7.18.2`; app-path absence itself no longer failed. |
| Nx project graph                                                                 | `@effectify/react-remix-example` was present before deletion and absent afterward.                                                                                               |
| Protected package matrix                                                         | Router 8/8 and adapter 9/9 tests passed; both `typecheck:no-build`, lint, and build targets passed.                                                                              |
| Protected RR8 app matrix                                                         | Migration 9/9 and full app 115/115 tests passed; clean typegen, typecheck, client/server build, and lint passed.                                                                 |
| `pnpm nx affected --target={lint,typecheck,test,build} --parallel=1`             | Passed for 20 lint, 18 typecheck, 7 test, and 16 build projects respectively.                                                                                                    |
| Exact version checks                                                             | Bridge `react-router` resolved `7.18.2`; protected app `react-router`, dev, node, and serve each resolved `8.3.0`; root/catalog/app declarations resolved exactly to `8.3.0`.    |
| Format and cleanup                                                               | Repository format check and `git diff --check` passed; generated app/docs/package outputs were removed and command-touched database/tsbuildinfo files were restored.             |

### Deviations and Remaining Tasks

- Authorized rescope deviation: this head removes the physical app and inferred graph node while intentionally retaining the stale `pnpm-lock.yaml` importer and workspace/root/bridge residue for a separate lockfile head. Frozen pnpm accepted that bounded intermediate state.
- No design deviation or forbidden-surface mutation occurred.
- Exact remaining implementation rows are:
  - [ ] GREEN PR10c: delete the remaining old app/importer and remove its Nx graph wiring while retaining the bridge package and release/workspace/lockfile cleanup for PR10d. <!-- sdd-owner: implementation -->
  - [ ] GREEN PR10d: delete the bridge package and `json`, remove obsolete release/docs/workspace references, regenerate the lockfile, and preserve protected RR8 `8.3.0`. <!-- sdd-owner: implementation -->
  - [ ] TRIANGULATE final absence/version isolation with `consolidation:verify -- --expect=retired`, Nx graph, protected manifest/`pnpm why`, and repository/lockfile scans; runtime harness: N/A for deletion, with RR8 behavior verified in work unit 11. <!-- sdd-owner: implementation -->
  - [ ] REFACTOR cleanup wording only after absence passes; run affected lint/typecheck/test/build and format, and record authored/generated counts for every PR10 head. <!-- sdd-owner: implementation -->
  - [ ] Verify the maintained packages with `pnpm nx run-many --targets=test,typecheck:no-build,lint,build --projects=@effectify/react-router,@effectify/react-router-better-auth`; runtime harness: `packages/react/router/tests/runtime.test.ts` and the adapter suite must record payload, modeled failure, redirect/header, cookie, and throwable-identity results against RR8 `8.3.0`. <!-- sdd-owner: implementation -->
  - [ ] Verify the maintained app with `pnpm nx run @effectify/react-router-example:migration:manifest`, `pnpm nx run @effectify/react-router-example:migration:verify`, `pnpm nx run @effectify/react-router-example:migration:test`, `pnpm nx run @effectify/react-router-example:test`, `rm -rf apps/react-router-example/.react-router && pnpm nx run @effectify/react-router-example:typegen`, `pnpm nx run @effectify/react-router-example:typecheck`, and `pnpm nx run @effectify/react-router-example:build`; runtime harness evidence must include routes, auth, SSR/readiness, status, headers, and each transferred unique scenario. <!-- sdd-owner: implementation -->
  - [ ] Verify final graph/release absence with `pnpm nx run @effectify/react-router-example:consolidation:verify -- --expect=retired`, `pnpm nx show projects --json`, `pnpm why react-router --filter @effectify/react-router-example`, `pnpm nx affected --target=lint`, `pnpm nx affected --target=typecheck`, `pnpm nx affected --target=test`, `pnpm nx affected --target=build`, and `pnpm nx run @effectify/repo:format:check`; record no RR7/Remix dependency, project, publish, release, docs, workspace, or lockfile residue. <!-- sdd-owner: implementation -->
  - [ ] Finalize release evidence in `docs/migrations/react-remix-to-react-router.md` (or the repository-approved retained historical evidence location) with consumer status, reviewed scenario dispositions, transitional-surface absence, protected RR8 results, authored/generated diff counts, and the exact final bridge rollback version; do not add or modify product code. <!-- sdd-owner: implementation -->

Deferred parent lifecycle action remains byte-for-byte unchanged: after work unit 11, evaluate the final RR8-only evidence before closing the OpenSpec change.

## Work Unit 10 / PR10c Recovery — Prune Retired App Importer

- **Status:** completed for `prune-retired-app-importer`; authoritative OpenSpec status was `applyState: ready`, `nextRecommended: apply`, with repo-local edits allowed only under `/Users/skynet/devx-op/effectify` and no warnings/blockers.
- **Boundary:** removed only four stale Remix catalog entries, the root `@remix-run/node>undici` override, and the generated retired app importer/app-only snapshots. Bridge/package/release/docs, validators, generic globs, and protected RR8 surfaces were unchanged.
- **Persisted task:** the original implementation-owned PR10c app/importer/graph cleanup row is visibly `- [x]` in `tasks.md`; PR10d and later implementation rows remain unchecked, and the final parent-owned closure action is deferred byte-for-byte.
- **Files:** `pnpm-workspace.yaml`, `package.json`, generated `pnpm-lock.yaml`, `tasks.md`, and this cumulative progress artifact.
- **Counts:** 5 authored implementation deletions; generated lockfile 287 additions + 622 deletions = 909; implementation total 914. Including the checkbox and this concise artifact, the final worktree remains below the hard 1,000-line cap.
- **Lock provenance:** only `pnpm install --lockfile-only` under Node 24.19.0 / pnpm 10.14.0 changed `pnpm-lock.yaml`; SHA-256 changed `3406aefc6b0e9fe3a041a881ec4f5aeda0609fb9e93720a457a11cc6e4fff2e1` → `d83c3f56f1ff7398fe91b4b38907ce04769d0b5c5e74067c517c0a6cdf418cc8`.
- **Rollback:** restore `pnpm-workspace.yaml`, `package.json`, and `pnpm-lock.yaml` together; task/progress evidence may be reverted separately.

### TDD Cycle Evidence

| Stage       | Evidence                                                                                | Result                                                                                                                                                                                   |
| ----------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RED         | Structural catalog/override/importer/snapshot harness                                   | Exit 1 on four catalog entries, one override, and the stale app importer.                                                                                                                |
| GREEN       | Exact removals plus lockfile-only regeneration, structural rerun, frozen install        | Assigned residue and RR7 app-only dev/node/serve snapshots absent; all 20 workspace projects installed frozen.                                                                           |
| TRIANGULATE | Bridge/protected manifest targets, OPEN/RETIRED gates, `pnpm why`, package/app matrices | Bridge importer and RR7 7.18.2 survived; protected family resolved exact 8.3.0; OPEN passed; RETIRED failed only on retained bridge/release/docs and existing generic validator residue. |
| REFACTOR    | Affected lint/typecheck/test/build, format, diff, generated cleanup                     | 20 lint, 18 typecheck, 7 test, and 16 build projects passed; format/diff checks passed; generated outputs and touched tracked artifacts were removed/restored.                           |

Runtime harness is N/A for generated dependency-graph pruning; protected runtime evidence passed 8 router tests, 9 adapter tests, 9 migration tests, and 115 protected app tests. The first protected app run failed only because the clean workspace lacked built `@effectify/hatchet` output; building that declared workspace prerequisite and rerunning produced 115/115 without product changes.

### Remaining Implementation Tasks

- [ ] GREEN PR10d: delete the bridge package and `json`, remove obsolete release/docs/workspace references, regenerate the lockfile, and preserve protected RR8 `8.3.0`. <!-- sdd-owner: implementation -->
- [ ] TRIANGULATE final absence/version isolation with `consolidation:verify -- --expect=retired`, Nx graph, protected manifest/`pnpm why`, and repository/lockfile scans; runtime harness: N/A for deletion, with RR8 behavior verified in work unit 11. <!-- sdd-owner: implementation -->
- [ ] REFACTOR cleanup wording only after absence passes; run affected lint/typecheck/test/build and format, and record authored/generated counts for every PR10 head. <!-- sdd-owner: implementation -->
- [ ] Work unit 11 retains its four exact verification/evidence rows in `tasks.md`. <!-- sdd-owner: implementation -->

No commit, push, PR, release, review, receipt, or parent settlement was performed. Next routing is `parent-lifecycle` for the bounded PR boundary.

## Work Unit 10 / PR10d Recovery — Retire Bridge Tests and Package Docs

### Exact Phase Contract and Structured Status

- **Status:** completed for recovery head `retire-bridge-tests-docs` only.
- **Evidence revision:** `sha256:6a766609efc852900e30bef3be66dd56d95d4973537232b3f29c7308e7349cbd`, computed from the final binary-capable implementation patch under `packages/react/remix/**`.
- Authoritative native OpenSpec status was `applyState: ready`, `nextRecommended: apply`; proposal, specification, design, tasks, cumulative progress, and their Engram mirrors were read before editing.
- Action context was `repo-local` with workspace root and sole allowed edit root `/Users/skynet/devx-op/effectify`; warnings and blocked reasons were empty.
- The parent-owned active attempt authenticated as `proceed` for exact work unit `retire-bridge-tests-docs`, evidence goal `bridge-tests-docs-retired-survivor-green`, and maximum 1,000 changed lines. Parent owns settlement and all delivery/lifecycle actions.
- Delivery remains `auto-chain`, `feature-branch-chain`. This recovery head deletes only six named test/documentation/config files and removes only their test-specific project/TypeScript references.

### Completed Task, Files, Counts, and Rollback

- [x] GREEN PR10d recovery head: delete only the bridge README, changelog, package-owned tests and Vitest/spec configuration, remove only test-specific project/TypeScript references, and preserve the buildable/typecheckable/lintable published bridge package and all final graph surfaces. <!-- sdd-owner: implementation -->
- Deleted exactly `packages/react/remix/{README.md,CHANGELOG.md,tests/json.test.ts,tests/runtime.test.ts,tsconfig.spec.json,vitest.config.ts}`: **535 deleted lines**.
- Modified only `packages/react/remix/project.json` and `packages/react/remix/tsconfig.json`: removed the explicit test target and spec reference, while retargeting `typecheck:no-build` to `tsconfig.lib.json` so the surviving package retains library-only type checking.
- Package implementation size: **1 addition + 546 deletions = 547 changed lines**. Generated lines: **0**. Including one task row and 62 cumulative progress lines, the final worktree is **64 additions + 546 deletions = 610 changed lines**, below 1,000.
- `pnpm-lock.yaml` was not modified and remains SHA-256 `d83c3f56f1ff7398fe91b4b38907ce04769d0b5c5e74067c517c0a6cdf418cc8`, identical to `HEAD`.
- Rollback boundary: restore the exact six deleted files, restore the former explicit `test` target and spec-based `typecheck:no-build` command in `project.json`, and restore the `tsconfig.spec.json` reference in `tsconfig.json`. Package manifest/source APIs, lockfile, and final graph surfaces are outside this rollback.

### TDD Cycle Evidence

| Task                                                        | Layer / harness                   | Safety Net                                                                        | RED                                                                                                                                      | GREEN                                                                                                                     | TRIANGULATE                                                                                                                                                                                                                             | REFACTOR                                                                                                                                    |
| ----------------------------------------------------------- | --------------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Retire bridge tests/docs while preserving package viability | Structural package/Nx integration | Pre-edit bridge test/typecheck/build/lint matrix passed; package tests were 15/15 | Staged `--expect=retired` exited 1 on retained transition surfaces, including the package and its docs; no production behavior was added | After exact deletions/config pruning, surviving bridge `typecheck:no-build`, inferred `typecheck`, build, and lint passed | Nx graph retained the bridge and omitted the retired app; project assertion found no test target; RR7 isolation remained 7.18.2; OPEN passed and RETIRED still failed only as expected on intentionally retained final cleanup surfaces | No product refactor was needed; protected matrices, affected checks, exact version checks, format/diff checks, and generated cleanup passed |

No test or pure function was added because this task removes package-owned tests/documentation/configuration without changing production behavior. Runtime harness is N/A for deletion; the pre-edit 15/15 bridge runtime/json suite and independent protected RR8 runtime/app suites provide executable safety evidence.

### Verification Evidence

| Command / gate                                                                                               | Result                                                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Pre-edit `@effectify/react-remix` test/typecheck:no-build/build/lint matrix                                  | Passed; 15/15 package tests established the deletion safety net.                                                                                                                                                                                             |
| Post-edit bridge `typecheck:no-build`, inferred `typecheck`, build, and lint                                 | All passed under Node 24.19.0; lint scanned six surviving source files with zero warnings/errors.                                                                                                                                                            |
| Exact structural/config assertion and `pnpm nx show project @effectify/react-remix --json`                   | Exactly six assigned paths are absent; package manifest and runtime/json/context/http APIs remain; test target/spec references are absent; typecheck/build/lint/dependency-isolation/publish targets remain.                                                 |
| `pnpm nx show projects --json`                                                                               | Published bridge project remains present; retired `@effectify/react-remix-example` remains absent.                                                                                                                                                           |
| Bridge dependency isolation, protected manifest, and `pnpm why react-router --filter @effectify/react-remix` | Passed; bridge resolves exact RR7 `7.18.2`; protected React Router/dev/node/serve remain exact `8.3.0`.                                                                                                                                                      |
| `consolidation:verify -- --expect=open`; same with `--expect=retired`                                        | OPEN passed with rollback `0.5.12-alpha.1`, 24 consumers, 29 scenarios, and 0 pending; RETIRED exited 1 as required on the still-published bridge and deferred root/docs/setup/lock/verifier/release residue.                                                |
| Protected package matrix                                                                                     | Passed: router 8/8 and adapter 9/9 tests plus both no-build typecheck/lint/build matrices.                                                                                                                                                                   |
| Protected app migration manifest/readiness/test, full test, clean typegen/typecheck/build, and lint          | Passed: migration 9/9 and full app 115/115 after building its declared `@effectify/hatchet` workspace prerequisite; type generation, typecheck, production build, and lint were green.                                                                       |
| `pnpm nx affected --target={lint,typecheck,test,build} --parallel=1`                                         | Passed for 20 lint, 18 typecheck, 6 test, and 16 build projects respectively; bridge no longer contributes a test target.                                                                                                                                    |
| Protected app-filtered `pnpm why` for React Router/dev/node/serve                                            | Every protected framework edge resolved exact `8.3.0`.                                                                                                                                                                                                       |
| Format, diff, scope, and cleanup                                                                             | Repository format check and `git diff --check` passed; command-touched database/tsbuildinfo artifacts and generated bridge/app/Hatchet outputs were removed or restored. No protected, lockfile, root/docs/setup/release/workspace/verifier surface changed. |

The first full protected app test attempt failed only because the clean worktree lacked built `@effectify/hatchet` package output; building that declared workspace prerequisite and rerunning produced 24/24 files and 115/115 tests without product changes.

### Deviations and Remaining Tasks

- Authorized recovery deviation: the package remains published/releasable with its manifest and full runtime/json/context/http source API until the final PR10d head; only package-owned tests and package docs are retired here.
- No design or delegated-scope deviation occurred. No lockfile, PR10d final graph surface, protected RR8 file, commit, push, PR, release, review, receipt, or parent settlement was performed.
- Persisted implementation ownership is **62/69 complete with seven rows remaining**; parent ownership is **2/3 complete with final closure deferred**; zero ownership markers are malformed.
- Exact remaining implementation rows:
  - [ ] GREEN PR10d: delete the bridge package and `json`, remove obsolete release/docs/workspace references, regenerate the lockfile, and preserve protected RR8 `8.3.0`. <!-- sdd-owner: implementation -->
  - [ ] TRIANGULATE final absence/version isolation with `consolidation:verify -- --expect=retired`, Nx graph, protected manifest/`pnpm why`, and repository/lockfile scans; runtime harness: N/A for deletion, with RR8 behavior verified in work unit 11. <!-- sdd-owner: implementation -->
  - [ ] REFACTOR cleanup wording only after absence passes; run affected lint/typecheck/test/build and format, and record authored/generated counts for every PR10 head. <!-- sdd-owner: implementation -->
  - [ ] Verify the maintained packages with `pnpm nx run-many --targets=test,typecheck:no-build,lint,build --projects=@effectify/react-router,@effectify/react-router-better-auth`; runtime harness: `packages/react/router/tests/runtime.test.ts` and the adapter suite must record payload, modeled failure, redirect/header, cookie, and throwable-identity results against RR8 `8.3.0`. <!-- sdd-owner: implementation -->
  - [ ] Verify the maintained app with `pnpm nx run @effectify/react-router-example:migration:manifest`, `pnpm nx run @effectify/react-router-example:migration:verify`, `pnpm nx run @effectify/react-router-example:migration:test`, `pnpm nx run @effectify/react-router-example:test`, `rm -rf apps/react-router-example/.react-router && pnpm nx run @effectify/react-router-example:typegen`, `pnpm nx run @effectify/react-router-example:typecheck`, and `pnpm nx run @effectify/react-router-example:build`; runtime harness evidence must include routes, auth, SSR/readiness, status, headers, and each transferred unique scenario. <!-- sdd-owner: implementation -->
  - [ ] Verify final graph/release absence with `pnpm nx run @effectify/react-router-example:consolidation:verify -- --expect=retired`, `pnpm nx show projects --json`, `pnpm why react-router --filter @effectify/react-router-example`, `pnpm nx affected --target=lint`, `pnpm nx affected --target=typecheck`, `pnpm nx affected --target=test`, `pnpm nx affected --target=build`, and `pnpm nx run @effectify/repo:format:check`; record no RR7/Remix dependency, project, publish, release, docs, workspace, or lockfile residue. <!-- sdd-owner: implementation -->
  - [ ] Finalize release evidence in `docs/migrations/react-remix-to-react-router.md` (or the repository-approved retained historical evidence location) with consumer status, reviewed scenario dispositions, transitional-surface absence, protected RR8 results, authored/generated diff counts, and the exact final bridge rollback version; do not add or modify product code. <!-- sdd-owner: implementation -->

Deferred parent lifecycle action remains byte-for-byte unchanged: after work unit 11, evaluate final RR8-only evidence before closing the OpenSpec change.

## Work Unit 10 / PR10d — Retire Bridge Release Graph

### Exact Phase Contract

- **Status:** completed for final WU10 head `retire-bridge-release-graph`; WU11 and parent closure were not started.
- Authoritative OpenSpec status was `applyState: ready`, `nextRecommended: apply`, with 64/72 total checkbox rows complete; ownership-aware count was 62/69 implementation rows. Repo-local edits were allowed only under `/Users/skynet/devx-op/effectify`, with no warnings or blockers.
- Parent native `proceed` was authenticated for this exact work unit, evidence goal `bridge-release-graph-retired-green`, and maximum 1,000 changed lines. Parent owns settlement and delivery.
- Delivery remained `auto-chain`, `feature-branch-chain`; maintainer-authorized deletion used clean parent `7c2dd21`, and no release occurred between serial cleanup heads.

### Completed Tasks, Boundary, and Counts

- The PR10d GREEN, final absence/TRIANGULATE, and cleanup/REFACTOR implementation rows are visibly `- [x]` in `tasks.md`; WU11's four implementation rows and final parent closure remain unchecked.
- Deleted all 10 remaining tracked files under `packages/react/remix/**` (322 lines), including the manifest, project, source, `json`, and build TypeScript configurations.
- Removed the bridge from `nx.json` release projects and active setup/package/install/status/release references from `.github/SETUP.md`, `README.md`, and `CHANGELOG.md`.
- Replaced bridge/RR7 manifest stages with local protected-RR8-only verification and exact 8.3.0 checks; hardened RETIRED fixtures/scans and made the app consolidation target require retirement.
- Final counts including tasks/progress artifacts: **812 authored additions + deletions** (247 additions, 565 deletions), **38 generated lockfile deletions**, **850 total**, below 1,000.
- Rollback boundary: restore bridge `0.5.12-alpha.1`, release/docs references, previous validators/project targets, and the exact prior lockfile together; protected RR8 remains unchanged.

### Lock Provenance and Historical Evidence

- Only `pnpm install --lockfile-only` under Node 24.19.0 / pnpm 10.14.0 changed `pnpm-lock.yaml`; SHA-256 changed `d83c3f56f1ff7398fe91b4b38907ce04769d0b5c5e74067c517c0a6cdf418cc8` → `3a50b512a4ce21f35ab6a6e1d6758fd1ed74324af8ffdd271eeb32d83ba32e80`.
- The generated prune removed the bridge importer and final `react-router@7.18.2` snapshot. Maintained RR8 transitive `@remix-run/node-fetch-server` metadata remains valid and is not transitional residue.
- `docs/migrations/react-remix-to-react-router.md` remains the approved historical ledger and now records retirement complete, reviewer `kattsushi`, no inter-head release, rollback `0.5.12-alpha.1`, maintained RR8 8.3.0, and historical-path semantics.

### TDD Cycle Evidence

| Task                | Layer                | Safety Net / RED                                      | GREEN                             | TRIANGULATE / REFACTOR                                                                                      |
| ------------------- | -------------------- | ----------------------------------------------------- | --------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Protected manifest  | Manifest integration | New no-stage test failed on retained RR7 stages       | Local RR8-only output passed      | Catalog/root/app exact 8.3.0 and package peer `^8.3.0` passed                                               |
| RETIRED verifier    | CLI fixtures         | 5/20 tests failed on target/docs/history/Nx gaps      | 20/20 passed                      | App/package/Nx/release/workspace/docs/lock residue cases and allowed history/RR8 transitive metadata passed |
| Readiness coupling  | Nx integration       | Readiness failed on stale `--stage=final-v8` contract | Protected-RR8 readiness passed    | Full manifest/readiness/migration/app/package and affected matrices passed                                  |
| Structural deletion | Repository graph     | RETIRED failed on the retained bridge graph           | RETIRED reports `status: retired` | Nx, release, docs, workspace, lockfile, exact-version, format, and cleanup scans passed                     |

No pure function or product behavior was added. Runtime harness is N/A for deletion; protected RR8 executable evidence passed router 8/8, adapter 9/9, migration 9/9, and app 115/115 tests.

### Verification, Cleanup, and Deviations

- Frozen install passed for 19 workspace projects. Protected manifest, readiness, migration tests, clean typegen/typecheck/build/lint, package matrices, four protected `pnpm why` queries, RETIRED, and exact 8.3.0 checks passed.
- Affected checks passed for 19 lint, 17 typecheck, 6 test, and 15 build projects. Established non-failing warnings remained unchanged.
- The first full protected app test run failed only because clean `node_modules` lacked built `@effectify/hatchet`; building that declared workspace prerequisite and rerunning passed 24 files / 115 tests without product changes.
- Repository formatting and `git diff --check` passed. Generated app/package/docs output, Prisma database/generation, and command-touched tsbuildinfo were removed or restored.
- Deviation: the readiness validator required a bounded wording/command-contract update after removal of the obsolete `final-v8` stage. No design, product, RR8 version, release, commit, push, PR, review, receipt, or settlement deviation occurred.

### Remaining Tasks

- WU11 retains its four exact unchecked implementation rows in `tasks.md`; do not infer their completion from PR10d verification.
- The final parent-owned closure row remains unchecked and byte-for-byte unchanged. Next routing is `parent-lifecycle`.

## Work Unit 11 / PR11 — Final RR8-Only Release Verification

### Exact Phase Contract and Structured Status

- **Status:** completed for implementation-owned Work unit 11 only. Evidence revision: `sha256:92d65c6fb44465fc7bc31981805d759930476392080f18dfcc4dc93a75168d63`, the binary patch hash of the final historical ledger plus persisted WU11 task state.
- Authoritative native OpenSpec status selected `consolidate-react-remix-into-router` at clean head `4535fc42f2eec9ec18e74c92e21b8d8f0784303d`; pre-run `applyState: ready`, `nextRecommended: apply`, planning artifacts complete, and blocked reasons empty.
- Action context was `repo-local`; workspace root and sole allowed edit root were `/Users/skynet/devx-op/effectify`; warnings were empty. Parent `proceed` was authenticated for `rr8-only-release-verification`, maximum 1,000 changed lines; parent owns settlement and closure.
- Delivery remained `auto-chain`, `feature-branch-chain`. Only the retained historical ledger and OpenSpec tasks/progress were edited. Product code, dependencies, graph, release membership, lockfile, maintained RR8 source/tests, and historical validator behavior were unchanged.
- Runtime commands used exact Node `v24.19.0` and pnpm `10.14.0`. Four WU11 implementation rows are visibly `- [x]`; implementation ownership is 69/69 complete. The final parent-owned closure row remains visibly `- [ ]` and byte-for-byte unchanged.

### Completed Tasks, Files, Count, and Rollback

- Completed and persisted: maintained package matrix; maintained app matrix; final graph/release/lock absence matrix; and final historical release evidence.
- Files changed: `docs/migrations/react-remix-to-react-router.md`, `openspec/changes/consolidate-react-remix-into-router/tasks.md`, and this cumulative progress artifact.
- Final WU11 authored count: **137 additions + deletions**; generated lines: **0**; binary changes: **0**; total remains below 1,000.
- Rollback boundary: revert only the WU11 ledger section, four WU11 checkbox changes, and this progress section. If evidence later fails, parent reopens the applicable gate and restores the coherent PR10 graph with bridge rollback `0.5.12-alpha.1`; maintained RR8 8.3.0 is not changed.

### Maintained Package Matrix — RR8 8.3.0

| Surface                               | Result                                                                                                                                                                                                               |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@effectify/react-router`             | 8/8 tests passed; `typecheck:no-build`, lint, and build passed. Payloads preserved loader `{ ok: true, data }` and action `{ ok: true, response }`; modeled loader/action failures retained 500/400 and JSON bodies. |
| Redirect/header behavior              | Loader/action redirect responses retained status 307, `Location: /login`, and `Set-Cookie: session=expired`; defects/interruption retained generic 500/400 bodies and logging.                                       |
| Throwable identity                    | Successful raw response handling and failed native `Response` / `Error` propagation retained exact object identity for loader/action boundaries and preserved response cookies.                                      |
| `@effectify/react-router-better-auth` | 9/9 tests passed; `typecheck:no-build`, lint, and build passed. Exact request identity, 404 handler forwarding, successful 201/202 body/status, and unauthorized 302 `Location`/cookie behavior passed.              |

### Maintained App Matrix — RR8 8.3.0

| Gate                         | Result                                                                                                                                                                                                                                                                                                                                                       |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Manifest/readiness           | Protected family reported exact 8.3.0 with package peer `^8.3.0`; readiness reported Node 24.19.0, React 19.2.7, future flags absent, and correct manifest/readiness targets.                                                                                                                                                                                |
| Migration/full tests         | Migration suite passed 9/9. Initial full test run found only missing built output for declared workspace prerequisite `@effectify/hatchet`; after `pnpm nx run @effectify/hatchet:build`, the unchanged app passed 24 files / 115 tests.                                                                                                                     |
| Routes/auth/transfers        | Explicit route/splat, shell/navigation, login/signup, exact auth request/response identity, two cookies, Todo create/update/delete/toggle/validation, test-equivalent behavior, and all six transferred `/demo` success/failure/redirect scenarios passed. Demo failures retained 500/400; redirects retained 307/303 and `Location: /demo?outcome=success`. |
| SSR/readiness/status/headers | Browser shell used shell readiness with status 207, route header, HTML content type/body; bot and SPA mode used all-content readiness; stream error returned 500; initial shell error preserved exact identity.                                                                                                                                              |
| Clean quality                | Clean typegen, typecheck, client/SSR build, and lint passed. Established non-failing externalization/chunk/dynamic-import warnings remained; lint reported 0 warnings/errors.                                                                                                                                                                                |

### Final Graph, Release, and Absence Proof

- `consolidation:verify -- --expect=retired` passed with status `retired`, gate OPEN, rollback `0.5.12-alpha.1`, 24 consumers, 29 scenarios, and 0 pending rows.
- `pnpm nx show projects --json` listed 19 maintained projects; the bridge and retired app were absent. Exact release-project scans were also empty for both retired names.
- `pnpm why` for the app resolved React Router/dev/node/serve only at 8.3.0. Catalog and app effective versions are exactly 8.3.0; package peer remains `^8.3.0`.
- Exact allowlist-aware scans found no physical retired roots, active RR7/bridge/app terms, active docs residue, workspace/root/Nx residue, or lockfile importer/bridge/RR7/Remix-framework residue. The only lockfile `@remix-run/*` token is allowed maintained-RR8 transitive metadata `@remix-run/node-fetch-server`.
- Frozen install passed for 19 workspace projects. Affected lint/typecheck/test/build passed for 19/17/6/15 projects, and repository format passed.
- Before/after protected tracked-tree inventory SHA-256 remained `dd4822e732fde743033e57aee008e79a545516e6d6043fec4e005f03ebd5a0ae`; lockfile SHA-256 remained `3a50b512a4ce21f35ab6a6e1d6758fd1ed74324af8ffdd271eeb32d83ba32e80`.

### Serial Cleanup Accounting

The historical ledger now records every green PR10 serial head's authored/generated/binary counts, no release between heads, rollback `0.5.12-alpha.1`, and maintained RR8 8.3.0. The sequence includes PR10a, PR10b, seven PR10c recovery heads plus importer retirement, and the two PR10d heads; its sole binary deletion was the 57,344-byte retired database.

### Commands Run

| Command group                                                   | Result                                                                                                                                                                                                                                                             |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm install --frozen-lockfile`                                | Passed; all 19 workspace projects current.                                                                                                                                                                                                                         |
| Exact two-package `test,typecheck:no-build,lint,build` matrix   | Passed: router 8/8, adapter 9/9, all static/build targets green.                                                                                                                                                                                                   |
| App manifest/readiness/migration/full test                      | Passed after building the declared Hatchet workspace prerequisite; migration 9/9 and app 115/115.                                                                                                                                                                  |
| Clean app typegen/typecheck/build/lint                          | Passed; client and SSR bundles completed.                                                                                                                                                                                                                          |
| RETIRED, Nx projects, four app `pnpm why` queries               | Passed with final graph absent and RR8 exact 8.3.0.                                                                                                                                                                                                                |
| Exact affected lint/typecheck/test/build                        | Passed for 19/17/6/15 projects.                                                                                                                                                                                                                                    |
| Allowlist-aware active-tree/workspace/release/docs/lock scans   | Passed with zero forbidden matches. Three preliminary scan-harness attempts failed only on unavailable Python YAML, quoted YAML keys, and the valid app `catalog:` declaration; the dependency-free effective-version scan then passed without repository changes. |
| Format, `git diff --check`, protected hashes, generated cleanup | Passed; generated outputs removed, tracked database/tsbuildinfo restored, and no forbidden surface changed.                                                                                                                                                        |

### TDD Cycle Evidence

| Task                     | Test File / Harness                        | Layer                   | Safety Net                     | RED                                                     | GREEN                                                | TRIANGULATE                                                                           | REFACTOR                                             |
| ------------------------ | ------------------------------------------ | ----------------------- | ------------------------------ | ------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Package verification     | Existing router/adapter suites             | Runtime integration     | Existing WU10 matrix           | N/A: verification-only, no behavior or production edit  | 8/8 + 9/9 and full target matrix passed              | Payload/failure, redirect/header, cookie, request/throwable identity paths all passed | No code refactor; generated outputs cleaned          |
| App verification         | Existing migration and 24-file app suites  | Runtime/SSR integration | Manifest/readiness passed      | N/A: verification-only                                  | Migration 9/9 and app 115/115 passed                 | Routes, auth, Todo, transferred demo, SSR readiness/status/header/error paths passed  | Clean typegen/typecheck/build/lint rerun             |
| Absence/release evidence | RETIRED validator, Nx/lock/workspace scans | Structural integration  | WU10 RETIRED already green     | N/A: final confirmation of implemented state            | RETIRED and exact absence scan passed                | Nx, `pnpm why`, frozen install, affected matrices, and hashes agreed                  | No graph/code refactor; only evidence docs updated   |
| Historical ledger        | RETIRED validator plus format              | Documentation evidence  | Existing 24/29/0 ledger passed | N/A: historical evidence update with no behavior branch | Final evidence recorded and validator remained green | Counts, rollback, no-release, runtime matrices, and absence proof cross-recorded      | Cognitive-doc structure and repository format passed |

No tests, production functions, product behavior, or dependency changes were added. Strict TDD did not require a new RED because every assigned row was final verification or historical evidence for already-implemented behavior; existing fail-closed RETIRED and runtime suites were reused.

### Cleanup, Deviations, and Parent Boundary

- Removed all command-generated `.react-router`, `build`, `dist`, Prisma generated output, untracked tsbuildinfo, and restored the tracked Prisma database plus tracked tsbuildinfo files. Final retained changes are evidence artifacts only.
- Deviation: the first full app run failed solely because `@effectify/hatchet` build output was absent after the frozen clean setup; building that declared workspace prerequisite and rerunning passed 115/115 without source changes. Three provisional absence-parser failures were harness-only and corrected without changing repository behavior.
- Established package language-service suggestions and app bundler warnings were non-failing and unchanged. There was no design, scope, product, version, dependency, graph, lockfile, release, commit, push, PR, archive, review, receipt, settlement, or historical-validator-behavior deviation.
- All implementation work is complete. The exact remaining row is parent-owned and remains unchecked: `- [ ] After work unit 11, evaluate the final RR8-only evidence and close the OpenSpec change only if cleanup, release surfaces, scenario ledger, rollback record, and protected RR8 8.3.0 matrix are all complete; otherwise reopen the applicable gate.`
- Next routing is `parent-lifecycle`; this executor does not close or archive the change.

## Parent Gate Decision — Final RR8-Only Closure Accepted

- Decision date: 2026-08-26.
- Reviewer/maintainer: `kattsushi`.
- Accepted evidence: RETIRED status, 24 complete consumers, 29 complete scenarios, 0 pending rows, absent retired graph/release/workspace/lock surfaces, exact RR8 `8.3.0`, green package/app/affected matrices, serial cleanup accounting, no-release transaction record, and rollback `0.5.12-alpha.1`.
- Authorization: close the implementation change and proceed through native SDD verify → sync → archive.
- Release boundary: this closure authorization does not publish or release any package.
