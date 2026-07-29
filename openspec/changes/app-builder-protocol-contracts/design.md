# Design: App Builder Protocol Contracts

## Technical Approach

Create one passive, browser-neutral ESM library. Schemas validate; declarations retain codecs and `Input/Output/Error/Requirements`; descriptions and replay records are JSON. This refines PE1–2, never PE3–4 runtime behavior.

## Package and Module Map

Nx project `@effectify/app-builder-contracts` at `packages/app-builder/contracts` is tagged `npm:public`, `scope:app-builder`, `layer:contracts`, `runtime:neutral`, `visibility:public`. Build/test uses `@nx/js:tsc` ESM with declarations/maps, Vitest, oxlint, and TSGo. TS is ES2022 without Node types; the side-effect-free public package has Effect as peer and compiled `types/import/default` exports—no Node condition.

| Modules | Responsibility |
|---|---|
| `Identity`, `Json`, `Error`, `Diagnostic`, `Compatibility` | Brands, JSON, failures, diagnostics, declared compatibility. |
| `Envelope`, `Requirement`, `Tool` | Outcomes, capability descriptors, typed declaration/description projection. |
| `PassiveRecord`, `CanonicalJson`, `Replay`, `Digest` | Passive plans/callbacks/continuations, canonical replay boundary, digest references. |
| `index.ts` and matching package subpaths | Namespace exports; leaves never import the barrel; TSC additional entry points. |

References are frozen `{id,version}` structs; IDs match `^[a-z0-9][a-z0-9._:/-]{0,127}$`. `{major,minor,patch}` values are safe non-negative integers. `DigestRef` records algorithm, canonicalization version, and lowercase digest.

## Contracts and Projection

`Declaration<I,O,E,R>` holds three codecs and immutable metadata; `InputOf`, `OutputOf`, `ErrorOf`, `RequirementsOf` preserve channels. `RequirementDescriptor<R>` has JSON capability/constraints and a type-only unique-symbol `(R) => R` marker: `R` is phantom/invariant and absent from encoded data. It is author assertion, not runtime proof; downstream validates correspondence.

```ts
describe(d: Declaration<I, O, E, R>): Result<ToolDescription, DescriptionFailure>
validateDescription(d, x): Result<void, DescriptionFailure | SchemaDescriptionMismatch>
```

Projection derives JSON Schema from each codec's **encoded wire side** after proving `JsonValue`. `ToolDescription` embeds `{schemaId,schemaVersion,document}` per channel plus metadata—never codecs, handlers, or `R`. Failures are `NonJsonEncoding`, `JsonSchemaDerivationFailure`, or `MissingSchemaIdentity`. Validation re-derives and compares ID, safe version, and canonical document. Only `describeAll`/`ToolDescriptionCollection` rejects duplicate tool/schema IDs.

Envelope has no separate `status`: the schema-backed outcome `_tag` is canonical wire status (`Success|Failure|InputRequired`), preventing contradictory states. Common fields are `{protocolVersion,runId,outcome,diagnostics,traceRef?,planDigest?,outputDigest?}`. Success carries encoded output; Failure carries codec-encoded typed `E`; InputRequired carries callback/continuation and response-schema references. Diagnostics are `{code,severity,message,details?,path?,causeRef?}` with JSON-safe optionals.

## Passive Structures

Collections are frozen readonly arrays; order is identity-significant. References are versioned data.

| Record | Fields |
|---|---|
| `PlanRecord` | `planRef`, ordered `operations`, `pinnedInputs`, capability/registry/plugin/version refs, baseline hashes, permissions, provenance, validations, optional plan/output digest refs. |
| `CallbackRequest/Response` | callback/request/response refs, expected schema ref, JSON-safe context/request/response payload. |
| `ContinuationClaim` | continuation/callback/plan refs, expected schema/digest refs, replay identity; declarative claim only. |
| `ReplayExpectation` | record/baseline refs, expected plan/output digests, canonical replay material/identity. |

No structure defines transitions, execution, persistence, approval, locks, grants, or enforcement.

## Canonical Replay, Compatibility, and Failures

`effectify-cjson/1` deep-copies/freezes JSON, sorts keys by UTF-16 code unit, preserves dense-array order, uses ECMAScript scalar serialization, and normalizes `-0` to `0`. It rejects undefined/holes, bigint, symbols, functions, non-finite numbers, cycles, accessors, and non-plain objects.

`canonicalizeReplay(record)` returns `{material,canonical,identity}`. Material is frozen JSON `{canonicalizationVersion,recordKind,recordVersion,record}`; canonical is `effectify-cjson/1(material)`; identity brands that canonical string and is not a digest. Equal passive records yield equal results. Downstream hashes RFC-3629 UTF-8 bytes of `canonical`, without BOM or wrapper serialization, then constructs `DigestRef`; this package imports no crypto.

Exported immutable `ProtocolCompatibilityTable` value `protocolCompatibilityV1` lists accepted protocol/schema minors; `checkCompatibility(input, table = protocolCompatibilityV1)` accepts only listed v1 combinations. Unknown versions/tags fail; canonicalization `/1` is immutable.

Pure `Result` helpers map failures to `DecodeFailure`, `EncodeFailure`, `IncompatibleVersion`, `DescriptionFailure`, `SchemaDescriptionMismatch`, `DuplicateIdentity`, or `CanonicalizationFailure`; none runs Effects or throws. Property/prototype/descriptor inspection is guarded: hostile proxies/accessors become structured, non-echoing failures even when inspection itself defects.

## Strict TDD and Review Slices

Changed-line budgets (production/test/config) include RED tests; tasks choose the chain.

| Slice | P/T/C | Total |
|---|---:|---:|
| Package/export/browser guard | 35/80/120 | 235 |
| Identity/version/errors/compatibility | 145/165/0 | 310 |
| JSON/canonical replay | 165/185/0 | 350 |
| Diagnostics/envelopes | 145/175/0 | 320 |
| Requirement descriptors | 90/130/0 | 220 |
| Tool projection/collection | 175/190/0 | 365 |
| Passive records/digest references | 165/180/0 | 345 |

Nx verification: `pnpm nx test|typecheck|lint|build @effectify/app-builder-contracts`; no integration/E2E runtime applies.

## Traceability, Scope, and Rollback

| Requirement/scenario | Design proof |
|---|---|
| Neutral/browser | Exact exports, neutral TS libs, forbidden Node/global/import guard. |
| Identity/unknown major | Brands, safe versions, compatibility table, collection duplicates/mismatch tests. |
| JSON/canonical/unsupported | Canonical/replay fixtures, alias/idempotence, hostile/`NaN` failures. |
| Outcomes/three variants | Common-field and typed output/error/callback round-trips; unknown-tag rejection. |
| Dual tool/describe | Encoded-side snapshots, mismatch tests, four-channel type proofs. |
| Requirements/serialize | Phantom-invariance tests and JSON round-trip, with no `R` claim. |
| Passive replay/preserve | Ordered frozen records and equal canonical material/identity. |

Threat matrix: N/A—no routing, shell, subprocess, VCS/PR automation, executable classification, or process integration. No CLI, IPC, handlers, permission enforcement, filesystem/Nx mutation, planner, registry, builder, source enforcement, migration, or flag. Risks remain Schema drift, overreach, and canonical ambiguity; versioned snapshots, fixed policies, and surface tests contain them. Rollback deletes the isolated package before adoption; no persisted/user state changes. No blocking questions.
