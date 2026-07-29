# Design: App Builder Contract Diagnostics and Outcomes

## Technical Approach

Add private diagnostic, outcome, and failure leaves, then compose them through the existing `EnvelopeIdentity` seam. Effect v4 main at `96ced895a` confirms `TaggedUnion` and `Struct` preserve `Type`/`Encoded`, `fieldsAssign` returns the assigned `Struct`, synchronous `decodeUnknownResult` requires `S extends ConstraintDecoder<unknown>`, synchronous `encodeUnknownResult` requires `S extends ConstraintEncoder<unknown>`, and omitted service parameters default to `never`. Therefore synchronous payload codecs are explicitly service-free; only distinct decoded and encoded channels are preserved.

## Architecture Decisions

| Option                                            | Tradeoff                                  | Decision and rationale                                                                                                          |
| ------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Service-free generic codecs                       | Excludes service-bearing payload schemas  | Choose `ConstraintCodec<unknown, unknown, never, never>` because synchronous `Result` decoding/encoding cannot supply services. |
| Generic `TaggedUnion`                             | More type machinery                       | Choose; it keeps exactly `Success`, `Failure`, and `InputRequired` without a shadow algebra.                                    |
| `EnvelopeIdentity.pipe(Schema.fieldsAssign(...))` | Envelope owns composition                 | Choose; it preserves canonical identity fields and both payload channels without duplication.                                   |
| Default excess-property parsing                   | Silently strips extras                    | Reject; every owned unknown boundary passes `{ onExcessProperty: "error" }`.                                                    |
| Parse details in failures                         | Better diagnostics but may retain secrets | Reject; all mismatch and inspection defects become fresh zero-field category failures.                                          |

## Result Contract and Composition

```ts
type ServiceFreeCodec = Schema.ConstraintCodec<unknown, unknown, never, never>

export const Outcome = <S extends ServiceFreeCodec, F extends ServiceFreeCodec>(success: S, failure: F) =>
  Schema.TaggedUnion({
    Success: { value: success },
    Failure: { failure },
    InputRequired: { callbackRef: CallbackRef, continuationRef: ContinuationRef, responseSchemaRef: SchemaRef }
  })
export type OutcomeType<S extends ServiceFreeCodec, F extends ServiceFreeCodec> =
  ReturnType<typeof Outcome<S, F>>["Type"]
export type OutcomeEncoded<S extends ServiceFreeCodec, F extends ServiceFreeCodec> =
  ReturnType<typeof Outcome<S, F>>["Encoded"]

export const CompleteEnvelope = <S extends ServiceFreeCodec, F extends ServiceFreeCodec>(success: S, failure: F) =>
  EnvelopeIdentity.pipe(Schema.fieldsAssign({ outcome: Outcome(success, failure), diagnostics: Schema.Array(Diagnostic) }))
export type CompleteEnvelopeType<S extends ServiceFreeCodec, F extends ServiceFreeCodec> =
  ReturnType<typeof CompleteEnvelope<S, F>>["Type"]
export type CompleteEnvelopeEncoded<S extends ServiceFreeCodec, F extends ServiceFreeCodec> =
  ReturnType<typeof CompleteEnvelope<S, F>>["Encoded"]
```

`decodeOutcome` and `decodeCompleteEnvelope` accept only `ServiceFreeCodec` payloads. `outcome-failure.ts` owns the internal cross-leaf `decodeStrict<S extends Schema.ConstraintDecoder<unknown>, E>(schema, input, freshFailure)` helper. It alone owns `Result.try`, strict parse options, nested-result flattening, and `Result.mapError(() => freshFailure())`; no rejected input or parse detail survives. Each decoder supplies `() => new Malformed...()`.

```text
unknown -> decodeStrict -> strict Schema Result -> decoded value
                    \-> mismatch or defect -> fresh category failure

outcome-failure -> diagnostic
outcome-failure + reference -> outcome
outcome-failure + diagnostic + outcome -> envelope
```

The helper is exported only from the private source module, never a package barrel. `outcome-failure.ts` imports no sibling contract, so the graph is acyclic.

`Diagnostic` retains exact severity, non-empty code/message, optional ordered string/number path, and caller order. Diagnostics occur once at the envelope root.

## File Changes

| File                                                                                                       | Action | Responsibility                            |
| ---------------------------------------------------------------------------------------------------------- | ------ | ----------------------------------------- |
| `packages/app-builder/contracts/src/diagnostic.ts`                                                         | Create | Diagnostic schema and decoder dependency  |
| `packages/app-builder/contracts/src/outcome-failure.ts`                                                    | Create | Three failures and shared guarded decoder |
| `packages/app-builder/contracts/src/outcome.ts`                                                            | Create | Generic algebra, aliases, and decoder     |
| `packages/app-builder/contracts/src/envelope.ts`                                                           | Modify | Complete factory, aliases, and decoder    |
| `packages/app-builder/contracts/tests/{diagnostic,outcome,outcome-envelope,outcome-hostile-input}.test.ts` | Create | Runtime RED proofs                        |
| `packages/app-builder/contracts/tests/outcome.types.ts`                                                    | Create | Compile RED proofs                        |
| `packages/app-builder/contracts/tests/internal-imports.test.ts`                                            | Modify | Exact file list and scope firewall        |

## Testing Strategy

Strict TDD starts with failing runtime and compile proofs. Runtime tests cover ordering, all three cases, root-only diagnostics, unknown/mixed tags, omitted/extra fields, strict envelopes, hostile proxies/getters, fresh failures, and non-echoing secrets. `NumberFromString` success and `DateFromString` failure fixtures require positive assignments for `OutcomeType`/`OutcomeEncoded` and `CompleteEnvelopeType`/`CompleteEnvelopeEncoded`, plus `@ts-expect-error` negatives that swap branches or decoded/encoded payloads after `fieldsAssign`. Another negative proof rejects a declared service-bearing codec. Import tests forbid JSON/canonicalization, runtime, permissions, tools, replay, hashing, certification, and public barrels. Verify focused Nx `test`, `typecheck`, `lint`, and `build`; no integration/E2E harness applies.

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable classification, or process-integration boundary changes. Tuicr remains a manual gate.

## Migration and Rollback

No migration or public rollout. Rollback deletes the three leaves and new tests, restores `envelope.ts` and import tests, and leaves identity/envelope ancestry and JSON files untouched. Keep the 800-line scope firewall and branch base PR #96 commit `b238dd00124ca32c615112a9522ebdc8123db13c`.

## Delivery Gate (non-product)

This gate is excluded from product requirements, scenarios, and the 11 implementation/normalization tasks. Required delivery order is independent verification -> normalization -> human Tuicr in a new Herdr tab -> feedback correction and targeted reverification -> explicit Tuicr acceptance -> native review.

## Open Questions

None.
