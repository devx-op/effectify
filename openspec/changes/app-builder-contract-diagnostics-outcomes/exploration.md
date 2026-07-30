# Exploration: App Builder Contract Diagnostics and Outcomes

> Grandchild `2.1` of the non-applicable `app-builder-protocol-contracts` roadmap. Exploration only; it authorizes no proposal, specification, design, tasks, implementation, commit, push, or PR. Delivery remains gated by issue #97 (`status:needs-review`).

## Current State

The branch is exactly `feat/app-builder-contract-diagnostics-outcomes` at PR #96 commit `b238dd00124ca32c615112a9522ebdc8123db13c`. The private `@effectify/app-builder-contracts` package already provides safe versions, nine branded identities/references, typed identity/version failures, and `EnvelopeIdentity { protocolVersion, runRef, traceRef?, planDigestRef?, outputDigestRef? }`. It has no barrel or public exports. PR #96 also contributes private JSON normalization/canonicalization because of chain ancestry, but issue #97 and the roadmap declare only identities/envelopes as this slice's semantic dependency.

The existing boundary convention is synchronous and pure: guarded inspection plus `Schema.decodeUnknownResult`, mapped to fresh `Schema.TaggedErrorClass` values through `effect/Result`. Hostile proxies and throwing getters are converted into deterministic failures that retain neither input nor cause. Effect v4's canonical wire-visible algebra is `Schema.TaggedUnion`, which creates `_tag`-discriminated `Schema.TaggedStruct` cases and preserves separate `Type` and `Encoded` channels. `Schema.fieldsAssign` is the canonical way to compose the existing struct without reversing its dependency direction.

The domain needs one terminal protocol authority, not a runtime state machine. `Success`, `Failure`, and `InputRequired` are mutually exclusive envelope outcomes. `InputRequired` is a terminal exchange response from the current invocation while declaring continuation context; it is not a fourth execution service, callback persistence policy, or approval state. Diagnostics are ordered observations; failures are typed outcome payloads and boundary failures, not unstructured exceptions.

### Contract invariants

- Exactly three case-sensitive wire tags exist: `Success`, `Failure`, and `InputRequired`; no `status`, `ok`, unknown/open case, or tag aliases.
- A complete envelope composes `EnvelopeIdentity` with one `outcome` and an ordered `diagnostics` collection. Identity fields remain owned by `envelope.ts`; no duplicate run/version/digest fields are introduced.
- Outcome factories preserve both schema channels: success payload `Type/Encoded`, failure payload `Type/Encoded`, and input-required payload references. They must not collapse typed failure data to `string`, `unknown`, `Error`, or Effect causes.
- `InputRequired` should carry only existing `CallbackRef`, `ContinuationRef`, and `SchemaRef` vocabulary needed to request a later response. Request/response values, tools, service requirements, permissions, persistence, and transition legality remain downstream.
- Diagnostics should use a closed severity vocabulary and stable machine code, human message, and optional structural path. The path is an ordered array of string/number segments. Arbitrary JSON `details`, raw causes, stack traces, offending values, and source keys should not be added here because they would import the ancestry-only JSON capability or risk echoing hostile input.
- Diagnostic arrays preserve caller order. Sorting would silently change semantic priority and duplicate handling; deterministic producers must emit deterministic order. No uniqueness or reordering policy is needed in this passive contract.
- Unknown tags, malformed cases, contradictory case fields, hostile property access, and malformed envelopes return fresh typed decode failures without throwing or retaining input, cause, message, path, or property names from rejected data.
- Struct decoding should use the package's current strict/default Effect semantics explicitly in tests. Forward-compatible minor evolution belongs to the later compatibility/certification slice, not permissive acceptance here.

## Affected Areas

- `packages/app-builder/contracts/src/diagnostic.ts` — schema-backed diagnostic severity, code, message, structural path, and ordered collection vocabulary; no JSON/canonical imports.
- `packages/app-builder/contracts/src/outcome-failure.ts` — non-echoing `Schema.TaggedErrorClass` values for malformed diagnostic, outcome, or complete-envelope boundaries; no raw parse issue or hostile input retention.
- `packages/app-builder/contracts/src/outcome.ts` — generic `Schema.TaggedUnion` factory with exactly `Success`, `Failure`, and `InputRequired`, preserving decoded and encoded payload channels.
- `packages/app-builder/contracts/src/envelope.ts` — retain `EnvelopeIdentity` and add forward composition (likely a generic complete-envelope factory via `Schema.fieldsAssign`); never import JSON/canonical modules.
- `packages/app-builder/contracts/tests/{diagnostic,outcome,outcome-envelope,outcome-hostile-input}.test.ts` — RED-first runtime proofs for shape, exhaustive tags, channel round trips, ordering, malformed/hostile inputs, and non-echoing failures.
- `packages/app-builder/contracts/tests/outcome.types.ts` — positive and negative compile-time proofs for success/failure encoded channels and the exact three-case union.
- `packages/app-builder/contracts/tests/internal-imports.test.ts` — extend neutrality/scope guards so outcome code imports identities/references/envelope only and does not expose JSON ancestry, requirements, tools, replay, runtime, or public barrels.
- `packages/app-builder/contracts/project.json` — the build entry currently points only at `src/envelope.ts`; if composition stays there, no project change is needed. A new entry or export map would leak certification scope and should be rejected.

## Approaches

1. **Generic schema-backed outcome algebra composed into the identity envelope** — parameterize success and failure payload schemas, define fixed `InputRequired` references, and compose a complete envelope with diagnostics.
   - Pros: preserves Effect `Type` and `Encoded` channels; gives exhaustive `.cases`, `.guards`, and `.match`; keeps one wire discriminator and an acyclic dependency graph; supports later tool-specific error schemas without importing tools.
   - Cons: generic factory typing and guarded decode helpers require careful tests; downstream callers must supply payload schemas.
   - Effort: Medium.

2. **Closed protocol-failure DTO and JSON-valued success/failure payloads** — make one non-generic union whose payloads use the inherited JSON domain.
   - Pros: simplest immediate wire shape and easy snapshots.
   - Cons: collapses future typed output/error channels, falsely makes JSON canonicalization a semantic dependency, and steals projection policy from tool declarations.
   - Effort: Low–Medium; reject.

3. **Envelope per outcome case** — duplicate identity and diagnostic fields in three top-level tagged envelope schemas.
   - Pros: each encoded case is standalone and simple to inspect.
   - Cons: duplicates common fields, increases drift and compatibility surface, weakens the existing envelope seam, and encourages contradictory status-like fields.
   - Effort: Medium; reject.

## Recommendation

Choose the generic schema-backed algebra. Define `Outcome(successSchema, failureSchema)` with `Schema.TaggedUnion({ Success: { value: successSchema }, Failure: { failure: failureSchema }, InputRequired: { callbackRef: CallbackRef, continuationRef: ContinuationRef, responseSchemaRef: SchemaRef } })`. Exact payload field names remain a proposal/spec decision, but the channels and ownership boundary should not change.

Define a compact `Diagnostic` struct independently of outcome payloads: constrained machine `code`, severity literals such as `info | warning | error`, non-empty human `message`, and optional ordered `path` segments. Keep diagnostics outside individual outcomes so all three cases share the same observation channel and do not need duplicate arrays. Do not model causal graphs until the protocol has a stable diagnostic identity/reference; an unchecked `causeRef` string would create a false invariant.

Compose `CompleteEnvelope(successSchema, failureSchema)` from `EnvelopeIdentity.pipe(Schema.fieldsAssign({ outcome: Outcome(...), diagnostics: Schema.Array(Diagnostic) }))`. The dependency direction remains:

```text
IdentityFailure <- Version/Identity <- Reference <- EnvelopeIdentity
Reference -------------------------------> Outcome
Diagnostic + Outcome + EnvelopeIdentity -> CompleteEnvelope
```

Provide pure guarded decoders returning `Result` only where this slice owns a truthful stable failure category. Do not expose Effect `SchemaIssue` or formatter text: those structures contain actual values and can echo secrets. On malformed unknown input, map to coarse fresh failures with a closed stage/reason vocabulary. Valid diagnostic messages and typed failure payloads are intentional protocol data and must round-trip unchanged; non-echoing applies to rejected boundary input, not valid caller-authored content.

Compatibility remains additive-only and private at this phase. The three tags and their required fields establish the version-1 shape, while minor-version acceptance, migrations, public exports, browser fixtures, and certification remain with `app-builder-contract-exports-compatibility`. Unknown tags must fail now rather than become an `Unknown` case. Extra-property behavior must be locked by tests rather than assumed from Effect defaults.

Strict TDD should proceed in isolated seams: diagnostics first; exact outcome algebra and type proofs second; complete-envelope composition third; hostile-input/non-echoing regression fourth. Focused verification is `pnpm nx test|typecheck|lint|build @effectify/app-builder-contracts`. No integration, E2E, service Layer, clock, or runtime harness applies. Ordinary synchronous Vitest tests fit the pure `Result` boundary.

The likely productive implementation is roughly 120–180 source lines, below the supplied 800 productive-line review budget excluding tests/docs/SDD artifacts. Tests may add 180–260 lines. One PR is plausible, but tasks must measure the forecast; `ask-on-risk` applies if productive code approaches 800. The feature-branch chain must preserve #92 -> #93 -> #94 -> #96 -> this branch, with #96's exact head as base. The mandatory post-implementation checkpoint is review work, not exploration: after implementation, verification, and normalization, open Tuicr human review in a **new Herdr tab**, apply feedback, and run targeted re-verification before `gentle-ai review start`. Do not run Tuicr during planning.

## Risks

- **JSON ancestry leakage:** convenient `details: Json` would silently widen dependencies. Mitigation: keep the first diagnostic shape scalar/path-only and add structured details only through a future explicitly owned contract change.
- **Typed-channel collapse:** a fixed `unknown` or JSON payload loses future tool output/error typing. Mitigation: generic schema parameters plus `Type`/`Encoded` compile-time proofs.
- **Hostile input echo:** raw `SchemaIssue`, formatter output, causes, or paths may retain secrets. Mitigation: coarse fresh tagged failures and proxy/getter tests.
- **Outcome ambiguity:** treating `InputRequired` as an in-progress state may invite execution semantics. Mitigation: define only exchange references and defer lifecycle behavior.
- **Ordering ambiguity:** sorting diagnostics can change priority while preserving order can expose nondeterministic producers. Mitigation: contract preserves order; producer determinism is tested by owning downstream modules.
- **Effect main drift:** `Schema.TaggedUnion` and encoded-channel typing are main-branch APIs. Mitigation: pin implementation to the local canonical v4 source and lock runtime/type behavior.
- **Review gate:** issue #97 is not approved for implementation. Mitigation: planning may proceed, but apply, commits, pushes, PR creation, and Tuicr remain prohibited until the maintainer gate changes.

## Ready for Proposal

Yes for the proposal phase only. The proposal should carry forward the generic typed/encoded outcome algebra, scalar/path-only diagnostics, coarse non-echoing decode failures, exact three-tag authority, identity-envelope composition, JSON scope firewall, strict TDD seams, 800 productive-line review budget, hierarchical feature-branch chain, and deferred Tuicr-before-native-review checkpoint. Implementation remains blocked by issue #97 `status:needs-review`.
