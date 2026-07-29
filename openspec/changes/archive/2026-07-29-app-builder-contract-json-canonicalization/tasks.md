# Tasks: App Builder Contract JSON Canonicalization

## Review Workload Forecast

| Field                          | Value                                 |
| ------------------------------ | ------------------------------------- |
| Productive code                | 480–560 lines (≤800)                  |
| Tests                          | 520–640 lines                         |
| Docs/config/SDD artifacts      | 350–430 lines; no runtime config/docs |
| Authored additions + deletions | 1,350–1,630; **exceeds 400**          |
| 400-line budget risk           | High                                  |
| Chained PRs recommended        | Yes                                   |
| Delivery / chain               | ask-on-risk / feature-branch-chain    |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

No prior `size:exception` applies. One grandchild PR #2 requires ≤400 measured lines or a new exception. Splitting does **not** harm atomic review: Unit 1 is a complete private normalizer; Unit 2 composes it.

### Suggested Work Units

| Unit | PR/base and commit                                                                                                | Focused test / final checks                                                                                                                                   | Runtime, rollback, evidence                                                                                                           |
| ---- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | `feat(app-builder-contract-json-normalizer)` → PR #94; `feat(app-builder): normalize guarded JSON`                | `pnpm nx run @effectify/app-builder-contracts:test -- tests/json.test.ts tests/json-hostile-input.test.ts`; finals below                                      | N/A: pure browser-neutral Result boundary. Revert `json(-failure).ts` + tests. Evidence: sync Success/safe reason; no execution/echo. |
| 2    | `feat/app-builder-contract-json-canonicalization` → Unit 1; `feat(app-builder): canonicalize JSON text and bytes` | `pnpm nx run @effectify/app-builder-contracts:test -- tests/canonical-json.test.ts tests/canonical-utf8.test.ts tests/internal-imports.test.ts`; finals below | N/A: no integration. Revert `canonical-json.ts` + tests/inventory. Evidence: exact `/1` text, fresh bytes.                            |

Bases: Unit 1 = PR #94 branch; Unit 2 = Unit 1 branch. Retarget/rebase polluted diffs. Each unit records passes: `pnpm nx run @effectify/app-builder-contracts:test`; `pnpm nx run @effectify/app-builder-contracts:typecheck`; `pnpm nx run @effectify/app-builder-contracts:lint`; `pnpm nx run @effectify/app-builder-contracts:build`.

## Phase 1: Guarded Normalization — RED → GREEN → REFACTOR

- [x] 1.1 **RED** Create `tests/json.test.ts`: synchronous Vitest `it` Result fixtures for R1/Safe records, R2/256–257, cycle-before-depth, copy/freeze isolation.
- [x] 1.2 **RED** Create `tests/json-hostile-input.test.ts`: descriptor/key/prototype traps, accessors, symbols, holes, extras, classes; deterministic non-echoing R1/Forbidden failures.
- [x] 1.3 **RED** Add factory fixtures: configured foreign `Object.prototype` succeeds; forged null-root constructor prototype is `invalid-record`, constructor unobserved; options snapshot/boundary freeze hold.
- [x] 1.4 **GREEN** Create `src/json-failure.ts`: six `Schema.Literals` reasons and `Schema.TaggedErrorClass`; retain no input, key, path, cause, message.
- [x] 1.5 **GREEN** Create `src/json.ts` `makeJsonNormalizer`: closure-frozen prototype identities; guarded iterative descriptor-before-read traversal, key/index order, cycle-before-depth, null-prototype copies, bottom-up freeze. Eager `Result`; no `Effect`, casts, Schema/JSON inspection, Node/DOM.
- [x] 1.6 **REFACTOR** Reduce traversal helpers without changing R1/R2 Results; run Unit 1 focused command and retain no-throw proof.

## Phase 2: Canonical Contract — RED → GREEN → REFACTOR

- [x] 2.1 **RED** Create `tests/canonical-json.test.ts`: R3 equivalence/isolation; UTF-16 keys, array order, `-0`, exponent, controls, astral/lone-surrogate escaping.
- [x] 2.2 **RED** Create `tests/canonical-utf8.test.ts`: R4 direct RFC 3629 bytes, U+FEFF content/no BOM, unequal fresh allocations.
- [x] 2.3 **GREEN** Create `src/canonical-json.ts`: frozen boundary, `CanonicalJson` `effectify-cjson/1`, iterative serializer/direct UTF-8; compose Result, no hashing/replay/public exports.
- [x] 2.4 **REFACTOR** Share private serializer helpers only; preserve UTF-16 ordering/R3–R4 fixtures; run Unit 2 focused command.

## Phase 3: Scope and Final Verification

- [x] 3.1 **RED** Extend `tests/internal-imports.test.ts` to eight leaves with R5 guards: no hash/digest/replay/diagnostic/tool/runtime/Node/DOM imports.
- [x] 3.2 **GREEN/REFACTOR** Update only private inventory; no docs/config/export change for this browser-neutral boundary. Run and record final checks.
