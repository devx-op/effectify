# Proposal: Hatchet Declarative Task API

## Intent

Recover the Effect-first declarative task API from auditable commits, then complete its package contract without dirty tracker work. Consumers should declare tasks, rate limits, and triggers through package-owned values with validated SDK translation and runtime behavior.

## Scope

### In Scope

- From `fix/67-react-router-hatchet-example`, replay committed refs `b35546626d3d16ce73ea15791e65595a75aafc43` then `0e6a830298d4782458d44fc9e6e324c554ff7a3a`, preserving their package-only provenance.
- Complete absent SDD intent: durable registry/live dispatch, declaration errors, root exports, package documentation, and type/unit/integration coverage.
- Run every required normalizer before exactly one **new** current-contract review; accept only native `next_action` and validate the review receipt at pre-commit, pre-push, and pre-PR gates.

### Out of Scope

- Every hunk from the uncommitted backup patch, including its `internal/live.ts` cron reconciliation and formatting churn.
- All React Router example changes or other tracker drift.
- Recovering or mutating `review-ecff39feff9d2cff` or `review-517abc7c361506f0`; they remain immutable historical evidence, never approval.

## Capabilities

### New Capabilities

- `hatchet-declarative-task-api`: Effect-friendly task declarations, validated metadata, ordinary and durable runtime registration, SDK mapping, exports, and failure semantics.

### Modified Capabilities

- None; no baseline OpenSpec capabilities currently exist.

## Approach

Reconstruct only from the two ordered commits on the tracker base, verify the recovered path set, then implement missing package behavior behind declaration-validation and SDK-mapping seams. Keep SDK contracts internal and expose package-owned immutable values and typed Effect errors.

## Affected Areas

| Area                                                                                      | Impact       | Description                                 |
| ----------------------------------------------------------------------------------------- | ------------ | ------------------------------------------- |
| `packages/hatchet/src/{Task,RateLimit,Trigger,Error,index}.ts`                            | Modified/New | Public declarations, errors, exports        |
| `packages/hatchet/src/internal/{declaration-validation,sdk-declaration,registry,live}.ts` | Modified/New | Validation, mapping, registration, dispatch |
| `packages/hatchet/tests/{types,unit}/` and package docs                                   | Modified/New | Contract and runtime evidence               |

## Risks

| Risk                                        | Likelihood | Mitigation                                               |
| ------------------------------------------- | ---------- | -------------------------------------------------------- |
| Dirty or unrelated recovery                 | High       | Replay exact refs; reject non-package and backup hunks   |
| Durable declaration without runtime support | Medium     | Specify and verify registry/live dispatch before release |
| Historical review mistaken for approval     | Medium     | Require one new receipt-bound review lineage             |

## Rollback Plan

Revert the new completion commits, then revert the two replayed commits in reverse order; do not alter tracker history or historical review records.

## Dependencies

- Existing Hatchet SDK contracts, Effect v4 conventions, and the repository review/receipt harness.
- Single-PR delivery with the explicit one-time large-delivery exception and 5,000-line review budget.

## Success Criteria

- [ ] Diff provenance contains only the two ordered refs plus scoped package completion; no backup or React Router hunks.
- [ ] Ordinary and durable declarations validate, register, dispatch, export, and fail through documented package contracts.
- [ ] All normalizers and verification pass before one new review; native `next_action` and receipt checks pass at all three gates.
