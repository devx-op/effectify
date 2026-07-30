# Exploration: App Builder Contract Identities and Envelope Foundation

> Grandchild `1.1` of the non-applicable `app-builder-protocol-contracts` roadmap, under the non-applicable `effectify-app-builder-platform` umbrella. Exploration only; it authorizes no proposal, specification, design, tasks, implementation, or parent apply.

## Current State

The approved roadmaps make this the first dependency-free implementation slice of `@effectify/app-builder-contracts` at `packages/app-builder/contracts`. The repository has no app-builder contract project yet. Existing code supplies useful but incomplete precedents: Hatchet declarations preserve typed channels and freeze shared arrays; Loom router boundaries return `effect/Result`; publishable packages use ESM, `@nx/js:tsc`, Vitest, inferred TSGo typecheck, oxlint, explicit package exports, and Effect as a peer.

Effect v4 guidance supports constrained scalar schemas followed by `Schema.brand(...)`, `Schema.Struct(...)` plus same-name interfaces for records, and pure `Schema.decodeUnknownResult(...)` where callers need explicit non-Effect success/failure. This slice should use those primitives without browser globals, Node types, services, Layers, transport, or execution.

The immediate parent's approved design currently groups identities, compatibility, failures, diagnostics, and envelopes broadly. Its approved sub-roadmap narrows ownership: this grandchild owns only version/identity primitives, branded references, typed identity/version failures, and the identity-bearing envelope shell. Later grandchildren fill payload-bearing contracts.

## Affected Areas

- `packages/app-builder/contracts/src/Version.ts` — safe `{major, minor, patch}` components and comparison/major-compatibility identity primitives.
- `packages/app-builder/contracts/src/Identity.ts` — constrained branded IDs for protocol, run, tool, plan, callback, continuation, trace, schema, and digest.
- `packages/app-builder/contracts/src/Reference.ts` — nominal `{id, version}` reference schemas for those domains; no domain payloads.
- `packages/app-builder/contracts/src/IdentityFailure.ts` — schema-backed malformed-identity, malformed-version, and incompatible-major failures only.
- `packages/app-builder/contracts/src/Envelope.ts` — common identity shell required by downstream outcomes: protocol version, run reference/identity, and optional trace/plan-digest/output-digest references; no diagnostics or outcome payload.
- `packages/app-builder/contracts/tests/` — brand/reference round trips, cross-brand type rejection, safe-integer/version boundaries, unknown-major Result failures, and envelope-shell field tests.
- `packages/app-builder/contracts/{project.json,package.json,tsconfig*.json,vitest.config.ts}` — only the minimal neutral Nx/package scaffold needed to compile and test this first slice; final public subpaths, browser fixture, documentation, and certification remain downstream.

## Approaches

1. **Nominal scalar IDs plus domain-specific versioned references** — define one constrained encoded-string helper, distinct exported brands, one safe semantic-version value, and explicit reference schemas per domain.
   - Pros: prevents accidental Run/Tool/Plan interchange at compile time; keeps wire values boring and browser-neutral; gives later schemas acyclic leaf dependencies.
   - Cons: repetitive exports and tests; generic helper typing must not erase domain brands.
   - Effort: Medium.

2. **Single generic `Reference<Kind>` with a runtime `kind` discriminator** — encode every reference as `{kind,id,version}` and specialize only through generics.
   - Pros: fewer declarations and easy generic collections.
   - Cons: adds wire bytes, makes all downstream records depend on a discriminant policy, and permits widening to a generic reference too easily.
   - Effort: Low–Medium.

3. **Plain strings and structural reference aliases** — postpone branding and compatibility until final certification.
   - Pros: smallest initial code.
   - Cons: violates the approved versioned-identity requirement and lets incompatible identities become indistinguishable throughout every sibling.
   - Effort: Low; reject.

## Recommendation

Choose domain-specific branded IDs and references over a runtime `kind` field. Keep dependency direction strictly one-way:

```text
Version ─┐
         ├─> Reference ─> Envelope
Identity ┘
Version + Identity ─> IdentityFailure
```

Leaf modules must never import `Envelope` or the package barrel. `Envelope` must import only leaf schemas. Later `Diagnostic` and outcome modules may import `Envelope`, but this slice must not import them. `Json`, `CanonicalJson`, requirement, tool, passive-record/replay, and certification modules remain outside this dependency cone. This avoids the likely circular path `Envelope -> Outcome -> Callback/Tool -> Reference -> Envelope`.

Use the approved ID syntax `^[a-z0-9][a-z0-9._:/-]{0,127}$` and safe non-negative integer version components. Define compatibility here only as pure identity-level major comparison/checking (for example, exact major plus an explicitly supplied supported-minor predicate/table input). Do not freeze the package-wide `protocolCompatibilityV1` matrix or migration policy; the exports/compatibility grandchild owns declared cross-module compatibility and certification. Unknown majors should return a typed, non-echoing `IncompatibleVersion` through `Result`, while Schema decoding reports malformed shape/constraints.

The envelope foundation should be compositional fields or a small `EnvelopeIdentity` struct, not a generic outcome schema. It may own `{protocolVersion, runRef, traceRef?, planDigestRef?, outputDigestRef?}` because those fields are common identity context. The diagnostics/outcomes grandchild later composes this with `diagnostics` and exactly one `Success | Failure | InputRequired` outcome. It alone owns diagnostic/failure payloads and exhaustive outcome tags.

### Exact scope

**Included:** version components and ordering; identity syntax; nine nominal ID brands; versioned protocol/run/tool/plan/callback/continuation/trace/schema/digest references; identity/version incompatibility Result helpers; common envelope identity fields; minimal neutral project scaffold; focused runtime and type tests.

**Excluded:** generic JSON value/canonicalization; diagnostic details, severity, codes, and causes; success/failure/input-required payloads; requirement descriptors; schema documents and tool declarations; duplicate collection checks and schema mismatch; plans/callback records/continuations/replay; digest algorithms/bytes/canonicalization; final export matrix, browser fixture, compatibility table, docs, and certification. No CLI, Effect service, Layer, filesystem, Nx mutation, execution, persistence, or transport.

### Testing seams and review budget

- RED tests for invalid first characters, uppercase/whitespace/length overflow, negative/fractional/unsafe version components, cross-brand assignment, and unsupported protocol major.
- Round-trip each reference and the envelope identity shell with Effect Schema.
- Assert optional fields are absent keys rather than encoded `undefined`.
- Assert pure compatibility helpers return `Result` and do not throw or echo hostile input.
- Compile under ES2022 with no Node types; run `pnpm nx test|typecheck|lint|build @effectify/app-builder-contracts` once the project exists.

A focused implementation is plausibly under the 400-line review budget: approximately 110–140 production lines, 130–160 tests/type proofs, and 60–80 minimal config lines (300–380 authored lines). Keep aliases generated through typed helpers and avoid broad package-export/browser certification tests. Under `ask-on-risk`, tasks must request a chain decision if the measured forecast reaches or exceeds 400; exploration does not approve an exception or chain.

### Rollback and downstream consumers

Rollback is deletion/reversion of this grandchild's scaffold and identity/envelope files before any sibling adoption; there is no persisted or user-owned state. If siblings already consume it, revert consumers first in reverse dependency order.

Direct consumers are all six remaining protocol-contract grandchildren. Immediate consumers are JSON canonicalization, diagnostics/outcomes, and requirement descriptors; tool declarations and passive replay consume references transitively; exports/certification stabilizes the final public surface. Outside the immediate roadmap, execution CLI, plugin SDK/worker, planner, preview, blueprints, registry, analytics, and certification consume these identities only after their owning SDD changes.

## Risks

- **Envelope ownership ambiguity:** the parent design says “common envelope,” while the sub-roadmap gives diagnostics/outcomes that responsibility. Mitigation: this slice owns only reusable identity fields; the sibling owns the complete envelope and every payload/tag.
- **Compatibility overreach:** embedding the final v1 table here would reopen evolution policy and steal certification scope. Mitigation: expose only version comparison/check primitives with caller-supplied support data.
- **Structural brand erosion:** a generic helper can accidentally return plain `string` or a widened reference. Mitigation: compile-time positive/negative brand tests and domain-specific exported schemas.
- **Reference over-modeling:** adding `kind`, algorithm, canonicalization version, or payload metadata now would couple later siblings. Mitigation: references remain `{id,version}`; richer digest and replay records belong downstream.
- **Scaffold budget:** creating the first package consumes review lines that final certification cannot avoid revisiting. Mitigation: create only buildable/testable neutral scaffolding and defer broad exports/fixtures/docs.
- **Schema API drift:** Effect v4 brand/result APIs can change on main. Mitigation: follow the project-pinned Effect source at implementation time and lock behavior with focused type/runtime tests.

## Ready for Proposal

Yes. The slice is dependency-free, bounded to leaf identities plus an envelope identity shell, has an acyclic module direction, explicit sibling exclusions, deterministic tests, a plausible 300–380-line implementation, and isolated rollback. The proposal should preserve these boundaries and must not reopen parent product decisions or authorize either parent for apply.
