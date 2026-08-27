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
