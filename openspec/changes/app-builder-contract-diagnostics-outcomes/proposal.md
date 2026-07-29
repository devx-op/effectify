# Proposal: App Builder Contract Diagnostics and Outcomes

## Intent

Add the private, browser-neutral terminal contract authority for app-builder invocations. Consumers need typed outcomes and ordered diagnostics without collapsing Effect schema channels, duplicating envelope identity, or importing execution semantics.

## Scope

### In Scope

- Define diagnostics with severity exactly `info | warning | error`, stable machine code, human message, and optional ordered string/number path.
- Define exactly `Success`, `Failure`, and `InputRequired`; reject unknown tags and extra wire fields strictly.
- Preserve separate Effect `Type`/`Encoded` channels for generic success and failure schemas.
- Limit `InputRequired` to `CallbackRef`, `ContinuationRef`, and response `SchemaRef`.
- Compose one common complete envelope containing identity, one outcome, and one ordered diagnostics collection.
- Add strict-TDD runtime, type-channel, hostile-input, ordering, and import-boundary proofs.

### Out of Scope

- Requirement descriptors, service/permission evaluation, tools, replay, hashing, public exports/certification, and parent/child apply.
- JSON canonicalization as a semantic dependency; it remains branch ancestry only.

## Capabilities

### New Capabilities

- `app-builder-contract-diagnostics-outcomes`: Exact diagnostic, outcome, complete-envelope, and safe decode contracts.

### Modified Capabilities

- None. `app-builder-contract-identities-envelopes` remains the canonical identity shell and composition seam.

## Approach

Use Effect v4 `Schema.Struct`, `Schema.TaggedUnion`, and `Schema.fieldsAssign`. Parameterize success/failure schemas, keep diagnostics once on the complete envelope, and map malformed or hostile unknown input to fresh non-echoing `Schema.TaggedErrorClass` failures returned through `Result`.

## Affected Areas

| Area                                                                                  | Impact       | Description                                                   |
| ------------------------------------------------------------------------------------- | ------------ | ------------------------------------------------------------- |
| `packages/app-builder/contracts/src/{diagnostic,outcome,outcome-failure,envelope}.ts` | New/Modified | Contract schemas, failures, and composition                   |
| `packages/app-builder/contracts/tests/`                                               | Modified     | RED-first runtime, type, hostile-input, and neutrality proofs |

## Risks

| Risk                     | Likelihood | Mitigation                                                         |
| ------------------------ | ---------- | ------------------------------------------------------------------ |
| Typed-channel collapse   | Medium     | Generic schemas plus compile-time encoded-channel proofs           |
| Hostile input leakage    | Medium     | Coarse fresh failures; retain no rejected values, causes, or paths |
| Scope/dependency leakage | Medium     | Import guards and explicit JSON/runtime firewall                   |

## Rollback Plan

Revert this isolated grandchild's source and tests while retaining the unchanged identity/envelope capability and ancestry commits.

## Dependencies

- Canonical `app-builder-contract-identities-envelopes`; branch base PR #96 commit `b238dd00124ca32c615112a9522ebdc8123db13c`.
- Issue #97 must leave `status:needs-review` before apply. Preserve branch chain #92 → #93 → #94 → #96 → this branch.
- After implementation, independent verification, and normalization: mandatory human Tuicr review in a new Herdr tab; feedback requires targeted re-verification before native `gentle-ai review start`.

## Success Criteria

- [ ] Exact strict wire shapes round-trip while preserving diagnostic order and success/failure `Type`/`Encoded` channels.
- [ ] Unknown tags, extra fields, malformed envelopes, and hostile access fail deterministically without throwing or echoing input.
- [ ] Productive implementation remains within 800 lines, or `ask-on-risk` resolves delivery before apply.
