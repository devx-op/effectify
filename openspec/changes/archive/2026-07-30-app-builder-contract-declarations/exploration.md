# Exploration: App Builder Contract Declarations

> Applicable consolidated child of the non-applicable `app-builder-protocol-contracts` roadmap. Exploration only; this artifact authorizes no proposal, specification, design, tasks, implementation, issue, branch, commit, or PR. Published PRs #94, #96, and #98 remain unchanged.

## Current State

`@effectify/app-builder-contracts` is a private, browser-neutral leaf package on the published chain `#94 → #96 → #98`. It currently owns validated/versioned identities and references, hostile-input JSON normalization and canonicalization, diagnostics, typed outcomes, and complete envelopes. The package has no barrel or public export map; its Nx build currently names `src/envelope.ts` as the entry point, and tests use concrete leaf imports.

The established boundary is schema-first but runtime-free:

- immutable wire structures use `Schema.Struct` and branded constrained identities;
- eager, synchronous, service-free validation returns `Result`;
- expected failures use `Schema.TaggedErrorClass` and direct construction;
- strict decoders reject excess properties rather than silently accepting them;
- hostile JSON crosses `makeJsonNormalizer`, which rejects runtime values and returns frozen JSON;
- type-channel proofs live beside behavior tests with `@ts-expect-error`.

No requirement or tool declaration modules exist yet. The package contains approximately 1,908 source-and-test lines before this child. The working tree also contains uncommitted roadmap-document changes; this exploration does not modify them.

Effect v4 supports the required split directly: codecs expose independent `Type`, `Encoded`, `DecodingServices`, and `EncodingServices` channels; `Schema.encodeUnknownResult` preserves encoded-side failures without introducing an Effect runtime; and `Schema.toJsonSchemaDocument` can produce Draft 2020-12 documents. However, codec annotations or generated JSON Schema are not a stable substitute for an explicit protocol schema identity. Identity/version metadata must remain deliberate contract data.

## Affected Areas

- `packages/app-builder/contracts/src/requirement.ts` — new JSON capability, constraint, and permission descriptor schemas plus a phantom, encoded-absent `R` type channel.
- `packages/app-builder/contracts/src/requirement-failure.ts` — explicit malformed, duplicate, and incompatible requirement failures if failures are kept cohesive per domain.
- `packages/app-builder/contracts/tests/requirement.test.ts` — JSON normalization, immutability, duplicate/incompatibility, and no-evaluation behavior.
- `packages/app-builder/contracts/tests/requirement.types.ts` — phantom `R` invariance/absence and invalid-channel compile proofs.
- `packages/app-builder/contracts/src/tool.ts` — typed `Declaration<I, O, E, R>`, passive declaration construction, JSON description schema, and pure encoded-side projection.
- `packages/app-builder/contracts/src/tool-failure.ts` — typed malformed metadata, schema mismatch, duplicate declaration, and projection failures.
- `packages/app-builder/contracts/tests/tool.test.ts` — projection fidelity, encoded metadata, duplicate/mismatch rejection, and absence of handlers/codecs/services from descriptions.
- `packages/app-builder/contracts/tests/tool.types.ts` — preservation of I/O/E/R channels and service-free codec constraints.
- `packages/app-builder/contracts/src/{json,identity,reference,version}.ts` — reused seams; behavior should remain unchanged unless a compile-only shared type extraction is unavoidable.
- `packages/app-builder/contracts/project.json` and `package.json` — observed constraints only. Final exports, compatibility certification, visibility, and publication remain owned by `app-builder-contract-replay-certification`.

## Approaches

1. **Two ordered leaf modules with explicit metadata** — complete requirement descriptors first, then declarations/projection; declarations hold live codecs and explicit JSON schema identity/document metadata, while descriptions contain only normalized frozen JSON.
   - Pros: follows the approved dependency order; preserves private leaf imports; makes `R` purely type-level; avoids schema-annotation reflection; gives duplicate and mismatch checks explicit inputs; supports small strict-TDD seams.
   - Cons: callers provide metadata that partially parallels codecs; mismatch semantics must be specified precisely because structural codec equivalence is not generally decidable.
   - Effort: Medium

2. **Derive description identity and documents from codec annotations** — inspect codecs and generate JSON Schema during projection, treating annotations as the authoritative metadata source.
   - Pros: less metadata at declaration construction; generated documents naturally describe the encoded side.
   - Cons: conflates documentation generation with protocol identity, relies on reflective annotation conventions, cannot robustly prove semantic identity, and risks serviceful/unsupported codecs. It also weakens explicit typed mismatch reporting.
   - Effort: High

## Recommendation

Use approach 1 and keep the child as two dependency-ordered, private work units.

### Contract shape

- Model each capability, constraint, and permission as an explicitly tagged JSON descriptor with a non-empty stable key/name and JSON details. Permissions are declarative data only: the package MUST NOT inspect grants, resolve services, build Layers, or answer authorization questions.
- Carry `R` through an omitted `unique symbol` variance member on a requirement-set/declaration interface. Do not add `R`, service tags, Layers, constructors, or evaluators to any encoded schema.
- Restrict declaration codecs to service-free codec channels. `Declaration<I, O, E, R>` retains input/output/error codecs and the phantom requirements channel, but no handler or executable function.
- Require explicit schema metadata for I/O/E: at minimum a versioned `SchemaRef`, document kind/dialect, and JSON document or JSON reference metadata. The serializable `ToolDescription` projects only the encoded-side metadata and normalized descriptor data.
- Make construction/projection eager pure functions returning `Result`. Reuse the JSON normalizer before freezing output; use `Schema.encodeUnknownResult` only where an actual typed-to-encoded codec boundary is crossed.
- Define duplicate keys over stable identities, never object equality. Reject same-key/different-payload entries as incompatible and same-key/equivalent entries as duplicate unless the later specification deliberately chooses one typed error for both. Never deduplicate silently.
- Keep all modules leaf-imported. Do not add `src/index.ts`, package exports, public tags, compatibility support, or replay records in this child.

### Strict-TDD slices

1. **RED — descriptor data and type channel:** failing behavior tests for JSON-only tagged descriptors, frozen normalized data, excess-property/runtime-value rejection, and duplicate/incompatible keys; failing type proofs that `R` is preserved and absent from encoded values.
2. **GREEN/REFACTOR — requirements:** implement the smallest `requirement.ts` and typed failures; rerun focused tests and package typecheck.
3. **RED — declaration channels:** failing type proofs for exact I/O/E/R inference, serviceful codec rejection, and absence of handlers.
4. **RED — projection:** failing behavior tests for complete encoded-side metadata, JSON-only output, deterministic ordering, schema mismatch, duplicate tool identity, and codec/schema projection failures.
5. **GREEN/REFACTOR — declarations/projection:** implement `tool.ts` and failures without widening exports; rerun focused tests, then package `test`, `typecheck`, `lint`, and `build` through Nx.

Every slice should record its failing RED command/output and passing GREEN/REFACTOR reruns. Ordinary synchronous tests are preferred because the intended APIs return `Result`; `it.effect` is not justified unless the design introduces meaningful Effect semantics, which this scope forbids.

### Line forecast

| Area                                   | Productive lines | Test/type-proof lines | Total changed lines |
| -------------------------------------- | ---------------: | --------------------: | ------------------: |
| Requirement descriptors and failures   |          180–280 |               300–450 |             480–730 |
| Declarations, projection, and failures |          300–480 |               550–850 |           850–1,330 |
| Shared/config/import adjustments       |            20–70 |                40–100 |              60–170 |
| **Forecast**                           |      **500–830** |         **890–1,400** |     **1,390–2,230** |

The likely total fits the maintainer-approved 3,000-line ceiling but remains a high review-load change relative to the normal 400-line budget. Recount after the requirement work unit and again before publication. At more than 3,000 changed lines, `ask-on-risk` requires a new maintainer decision; exploration does not pre-authorize another exception.

## Risks

- **False schema-mismatch confidence:** codec structure cannot be compared semantically in general. Mitigation: define mismatch only over explicit schema identity/version/document metadata and actual encoding failures, not inferred TypeScript equivalence.
- **Accidental permission engine:** convenience helpers could drift into grant/service evaluation. Mitigation: expose schemas, constructors/decoders, and projection only; prohibit predicates requiring grants, Context, Layer, or Effect services.
- **Phantom-channel variance leak:** a covariant or optional marker may permit unsafe assignment. Mitigation: use an invariant symbol marker and compile-time negative proofs while keeping it absent at runtime.
- **Silent declaration collapse:** generic map-building can accidentally become last-wins. Mitigation: validate arrays before indexing and return a typed duplicate/incompatible failure with the conflicting identity.
- **Non-JSON schema documents:** generated or caller-provided documents may contain unsupported values or mutable aliases. Mitigation: normalize every projected metadata payload through the existing hostile JSON boundary.
- **Premature publication:** adding a barrel/export map here would expose an uncertified partial contract. Mitigation: leaf imports only; replay certification owns final export and compatibility checks.
- **Review ceiling:** tests for hostile inputs and type channels can expand quickly. Mitigation: reuse canonical fixtures and table-driven cases, and stop above 3,000 lines.

## Open Product Questions

1. What exact schema-document forms are admitted: embedded Draft 2020-12 JSON, a versioned external document reference, or an explicit tagged union of both? The parent allows either, but this child needs one normative shape.
2. What constitutes an incompatible declaration beyond duplicate `ToolRef`: conflicting schema refs, conflicting document metadata, conflicting class/behavior flags, or any same identity with non-canonically-equal projected JSON?
3. Must declaration and requirement ordering be preserved exactly in `ToolDescription`, or should projection impose a canonical key order? Existing JSON canonicalization sorts object keys but intentionally preserves array order.
4. Should exact duplicates and same-key/different-value conflicts have separate tagged errors (`DuplicateDeclaration` versus `IncompatibleDeclaration`), or one conflict error with an explicit reason? Silent resolution is prohibited either way.

## Ready for Proposal

Yes, after the proposal phase resolves the four normative shape questions above. The orchestrator should preserve the strict order requirements → declarations/projection, the private-until-certification boundary, strict TDD evidence, feature-branch-chain delivery, and the hard stop above 3,000 changed lines. The parent roadmap must never be applied.
