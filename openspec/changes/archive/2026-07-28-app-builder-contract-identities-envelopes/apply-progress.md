# Apply Progress: App Builder Contract Identities and Envelope Foundation

Mode: Strict TDD; maintainer approved 800 productive-code lines, excluding tests, docs, and SDD artifacts.
Metrics: productive code 251/800; native total 757/1000 (contract source/config/tests 558, lock 22, tasks 56, receipts 28, apply-progress 79, local instructions 14).

## TDD Cycle Evidence

| Task      | RED                                                                                                        | GREEN                                                                                                     | REFACTOR                                                                                       |
| --------- | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 1.1       | target absent exit=1                                                                                       | target present exit=0                                                                                     | structural                                                                                     |
| 1.2       | target absent exit=1                                                                                       | four targets present                                                                                      | structural                                                                                     |
| 2.1       | missing module exit=1                                                                                      | 3 tests pass                                                                                              | 5 hostile cases                                                                                |
| 2.2       | version RED                                                                                                | 3 tests pass                                                                                              | compare loop pass                                                                              |
| 2.3       | safety 3/3                                                                                                 | 3 tests pass                                                                                              | guarded constraints                                                                            |
| 3.1       | missing modules exit=1                                                                                     | 6 tests pass                                                                                              | 9 brands/types                                                                                 |
| 3.2       | reference RED                                                                                              | tests/typecheck pass                                                                                      | typed schemas                                                                                  |
| 3.3       | safety 6/6                                                                                                 | tests/typecheck pass                                                                                      | no widening                                                                                    |
| 4.1       | missing Envelope exit=1                                                                                    | 8 tests pass                                                                                              | optional cases                                                                                 |
| 4.2       | envelope RED                                                                                               | 8 tests pass                                                                                              | leaf-only shell                                                                                |
| 4.3       | safety 8/8                                                                                                 | tests/typecheck pass                                                                                      | acyclic audit                                                                                  |
| 5.1       | N/A verification                                                                                           | four checks pass                                                                                          | N/A                                                                                            |
| 5.2       | N/A trace                                                                                                  | receipts/trace recorded                                                                                   | N/A                                                                                            |
| C1        | `internal-imports` correction proof: 1 failed, 1 passed                                                    | focused proof: 2 tests passed                                                                             | renamed leaves, direct schema types, declarative decoders, Effect-aware tests                  |
| C2        | Approval coverage was written first and passed before behavior-preserving refactor: 5 files, 10 tests      | `pnpm nx test @effectify/app-builder-contracts` exit=0; 5 files, 10 tests                                 | eager `Result.try`/`gen`/`all`/`filterOrFail`, compositional `Order`, ordinary sync `it` tests |
| Finding 3 | hostile version-getter regression added before production change; focused test exit=1 (1 failed, 1 passed) | `pnpm nx test @effectify/app-builder-contracts --run tests/hostile-input.test.ts` exit=0; 1 file, 2 tests | stage `id` access before `version` access so each field maps to its typed failure              |

## Work Unit Evidence

| Evidence        | Result                                                                                                                                                                                             |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focused test    | Finding 3 RED `pnpm nx test @effectify/app-builder-contracts --run tests/hostile-input.test.ts` exit=1 (1 failed, 1 passed); GREEN exit=0 (1 file, 2 tests); full suite exit=0 (5 files, 11 tests) |
| Runtime harness | N/A: pure browser-neutral schemas, no runtime boundary                                                                                                                                             |
| Rollback        | Revert these findings in `src/reference.ts`, `tests/hostile-input.test.ts`, `design.md`, `apply-progress.md`, and the appended verification receipts only                                          |

## Commands

`pnpm nx test @effectify/app-builder-contracts` exit=0; 5 files, 10 tests. `pnpm nx typecheck @effectify/app-builder-contracts` exit=0; `pnpm nx lint @effectify/app-builder-contracts` exit=0 (11 files, 0 errors).
`pnpm nx build @effectify/app-builder-contracts` exit=0; `pnpm install --frozen-lockfile --ignore-scripts` exit=0; candidate `pnpm exec oxfmt --check` exit=0 (20 files).
Finding 3 RED `pnpm nx test @effectify/app-builder-contracts --run tests/hostile-input.test.ts` exit=1 (1 failed, 1 passed); GREEN exit=0 (1 file, 2 tests). Candidate Oxfmt checks exit=0 (4 corrected paths before verification; 5 final corrected paths); full test exit=0 (5 files, 11 tests); typecheck, lint, build, frozen install, and `git diff --check` exit=0.
Repository format check is exit=1 only for 11 remaining frozen-manifest, candidate-created untracked planning artifacts listed below. The original 12th artifact—this change's `design.md`—was formatted for Finding 1; the remaining 11 are residual candidate format debt outside this remediation scope, not pre-existing or unmodified artifacts.

## Tuicr Correction Map

| Comment                    | Decision and evidence                                                                                                                                                                        | Corrected files                                       |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| 1. Schema type exports     | Use `typeof Value.Type`, the pattern shown in Effect v4 `SCHEMA.md` and Struct examples.                                                                                                     | `src/{envelope,identity,reference,version}.ts`        |
| 2. File casing             | Rename all private contract leaves to lowercase kebab-case and update every internal import/build entry.                                                                                     | `src/*.ts`, tests, `project.json`                     |
| 3. Branded IDs             | Preserve one constrained `Schema.brand` schema per domain and prove Protocol/Run non-interchangeability.                                                                                     | `src/identity.ts`, `tests/identity-reference.test.ts` |
| 4. Literal sets            | Centralize finite failure domains/reasons with pinned-v4 `Schema.Literals`.                                                                                                                  | `src/identity-failure.ts`                             |
| 5. Schema classes          | Reject `Schema.Class`: these are immutable wire values with no methods/inheritance; upstream reserves classes for validated construction with methods/inheritance.                           | `packages/app-builder/AGENTS.md`                      |
| 6. Declarative composition | C2 replaces remaining imperative Result extraction with `Result.try`, `Result.gen`, `Result.all`, and `Result.filterOrFail`; semantic version ordering uses compositional `Order`.           | `src/{identity,reference,version}.ts`                 |
| 7. Effect Vitest           | C2 corrects the prior mechanical wrapper: canonical Effect guidance says regular `it` for pure synchronous tests; `it.effect` is retained only for Effect-returning subjects.                | `tests/*.test.ts`, `packages/app-builder/AGENTS.md`   |
| 8. Nominal proof file      | Remove `identity-reference.types.ts`; retain the `@ts-expect-error` assertion beside its reference behavior test, verified by package typecheck.                                             | `tests/identity-reference.test.ts`                    |
| C2. Result boundary        | Keep `Result`: these decoders are eager, synchronous, environment-free, non-interruptible value validation with immediate caller inspection. `Effect` would add no semantic capability here. | `src/*.ts`, `packages/app-builder/AGENTS.md`          |
| Finding 1                  | Replace implementation-plan PascalCase source paths with actual lowercase kebab-case module names; preserve design intent.                                                                   | `design.md`                                           |
| Finding 2                  | Classify frozen-manifest planning files as candidate-created untracked residual format debt; leave unrelated planning artifacts unformatted.                                                 | `apply-progress.md`                                   |
| Finding 3                  | Stage hostile `id` then `version` extraction, mapping each to its required typed, non-echoing failure.                                                                                       | `src/reference.ts`, `tests/hostile-input.test.ts`     |

## Reference-Backed Conventions

- `Schema.Literals` is implemented at `packages/effect/src/Schema.ts:4927`; brands are applied after scalar constraints.
- `Schema.Class` is documented at `packages/effect/src/Schema.ts:14238` for validated class construction with methods or inheritance; it is not a default record model.
- `Result.mapError` supports pipeable error normalization at `packages/effect/src/Result.ts:817`.
- Effect v4 commit `96ced89`: `Result.try` documents synchronous exception capture at `Result.ts:496`; `filterOrFail` at `:1021`; `flatMap` at `:1338`; `all` at `:1455`; `gen` is eager and synchronous at `:1535-1538`.
- `Schema.decodeUnknownResult` returns schema mismatches as `Result.fail` at `Schema.ts:1708-1720`; guarded `Result.try` remains necessary for hostile property-access defects.
- `Effect.ts:103-110` defines resourceful interactions (including async/concurrent/interruption semantics); `Effect.sync` is for synchronous side effects at `:1159-1173`, neither of which applies to this value validation.
- `@effect/vitest` re-exports ordinary Vitest at `packages/vitest/src/index.ts:1-12`; `it.effect` is an Effect tester with `TestContext` at `:100-101` and runs scoped/provided effects at `src/internal/internal.ts:353-356`. Canonical `.agents/AGENTS.md` says regular `it` for pure synchronous tests.

## Residual Repository Format Findings

`pnpm nx run @effectify/repo:format:check` exited 1 only for 11 remaining frozen-manifest, candidate-created untracked planning artifacts outside this correction work unit. They remain residual candidate format debt and were intentionally not formatted to avoid unrelated planning-artifact cleanup:

- `openspec/changes/app-builder-contract-identities-envelopes/proposal.md`
- `openspec/changes/app-builder-contract-identities-envelopes/specs/app-builder-contract-identities-envelopes/spec.md`
- `openspec/changes/app-builder-protocol-contracts/{design,exploration,proposal,tasks}.md`
- `openspec/changes/app-builder-protocol-contracts/specs/app-builder-protocol-contracts/spec.md`
- `openspec/changes/effectify-app-builder-platform/{design,exploration,proposal,tasks}.md`

Completed: 14/14 approved tasks plus corrective refactors C1 and C2, and remediation of Findings 1–3. Finding 3 fixes staged hostile reference-field classification without changing the non-throwing or secret-safe boundary. The standalone types-only file remains merged into its behavior test to keep nominal proof executable by the package typecheck.
