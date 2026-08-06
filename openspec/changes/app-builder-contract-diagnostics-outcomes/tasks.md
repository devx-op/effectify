# Tasks: App Builder Contract Diagnostics and Outcomes

## Review Workload Forecast

| Scope                                | Estimated additions + deletions |
| ------------------------------------ | ------------------------------: |
| Source (≤800 productive-line budget) |                         170–230 |
| Tests                                |                         250–340 |
| Docs/config/SDD                      |                           50–90 |
| Total                                |                         470–660 |

| Field                   | Value                                                                |
| ----------------------- | -------------------------------------------------------------------- |
| 400-line budget risk    | High (total)                                                         |
| Chained PRs recommended | Yes                                                                  |
| Delivery strategy       | ask-on-risk                                                          |
| Chain strategy          | feature-branch-chain                                                 |
| Atomicity               | One behavior and its tests/evidence per commit; independent rollback |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: feature-branch-chain
400-line budget risk: High

### Work Units

| Unit / planned atomic commit                | Base                                                           | Focused test command                                 | Runtime harness               | Evidence / rollback                                              |
| ------------------------------------------- | -------------------------------------------------------------- | ---------------------------------------------------- | ----------------------------- | ---------------------------------------------------------------- |
| 1 `feat(app-builder): diagnostics boundary` | PR 1 base = feature/tracker rooted at PR #96 (#92 → #93 → #96) | `pnpm nx test @effectify/app-builder-contracts`      | N/A: pure synchronous schemas | Record receipt; revert diagnostic/failure files and tests.       |
| 2 `feat(app-builder): typed outcomes`       | PR 2 base = PR 1 branch                                        | `pnpm nx typecheck @effectify/app-builder-contracts` | N/A: generic codec/type-only  | Record receipt; revert `outcome.ts` and outcome tests/types.     |
| 3 `feat(app-builder): complete envelope`    | PR 3 base = PR 2 branch                                        | `pnpm nx test @effectify/app-builder-contracts`      | N/A: pure composition         | Record receipt; revert envelope delta and envelope/import tests. |

## Phase 1: Diagnostic TDD

- [x] 1.1 **RED**: Add `tests/diagnostic.test.ts` and `tests/outcome-hostile-input.test.ts` for severity/code/message/path, caller order, extras, throwing access, and secret non-echoing.
- [x] 1.2 **GREEN**: Create `src/diagnostic.ts` and `src/outcome-failure.ts`: strict ordered `Diagnostic`, direct zero-field `MalformedDiagnostic|MalformedOutcome|MalformedCompleteEnvelope` tagged errors, and guarded `decodeStrict` with `onExcessProperty: "error"`.
- [x] 1.3 **REFACTOR**: Make `decodeStrict` the sole guarded helper; prove failures retain no rejected input, cause, issue, path, key, or value.

## Phase 2: Generic Outcome TDD

- [x] 2.1 **RED**: Add `tests/outcome.test.ts` and `tests/outcome.types.ts` for the three tags, mixed/unknown/extra rejection, reference-only input, `Type`/`Encoded` positives/negatives, and service-codec rejection.
- [x] 2.2 **GREEN**: Create `src/outcome.ts` with service-free `ConstraintCodec<unknown, unknown, never, never>`, generic `Schema.TaggedUnion`, aliases, and strict `decodeOutcome`; import only references and failure helper.
- [x] 2.3 **REFACTOR**: Preserve case names/fields and acyclic imports; forbid values, tools, permissions, services, persistence, transitions, JSON, and public exports.

## Phase 3: Envelope TDD

- [x] 3.1 **RED**: Add `tests/outcome-envelope.test.ts` proofs for `fieldsAssign` channels, one root-only ordered `diagnostics`, identity retention, and rejected root/nested extras.
- [x] 3.2 **GREEN**: Extend `src/envelope.ts` with generic `CompleteEnvelope`, aliases, and strict `decodeCompleteEnvelope`; extend `tests/internal-imports.test.ts` inventory/firewall for JSON/canonicalization and downstream/runtime exclusions.
- [x] 3.3 **REFACTOR**: Remove duplication; forbid public-barrel, JSON, runtime, permissions, tools, replay, hashing, and certification imports.

## Phase 4: Verification and Normalization

- [x] 4.1 Run independently: `pnpm nx test @effectify/app-builder-contracts`; `pnpm nx typecheck @effectify/app-builder-contracts`; `pnpm nx lint @effectify/app-builder-contracts`; `pnpm nx build @effectify/app-builder-contracts`; record each result.
- [x] 4.2 After verification: `pnpm nx run @effectify/repo:format`, then `pnpm nx run @effectify/repo:format:check`; re-run focused checks if bytes change.

## Delivery Gate (non-product; not an implementation task)

**Status:** Pending — excluded from the 11/11 implementation and normalization task count.

After independent `sdd-verify` and normalization, conduct the human Tuicr review in a **new Herdr tab**. Correct any feedback and run targeted reverification/normalization. Obtain explicit Tuicr acceptance before native review.
