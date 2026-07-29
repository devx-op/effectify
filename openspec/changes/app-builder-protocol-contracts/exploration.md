# Exploration: App Builder Protocol Contracts

> Child of `effectify-app-builder-platform`. Exploration only: this artifact does not authorize proposal, specification, design, tasks, implementation, CLI behavior, execution, IPC, or filesystem mutation.

## Executive Summary

Create one browser-neutral Nx library at `packages/app-builder/contracts` that owns the versioned, serializable vocabulary future planner, CLI, tool, execution, plugin, and replay children exchange. The package should define data contracts and pure encode/decode/canonicalization helpers only. Runtime orchestration, transport, storage, locking, and mutation remain downstream responsibilities.

The key boundary is that Effect `Schema` values and generic `Effect<Success, Failure, Requirements>` parameters are runtime/type-level metadata, not JSON payloads by themselves. Tool declarations should therefore retain typed input/output/error schemas in-process while exposing stable schema identities and derived JSON Schema descriptions at serialized discovery boundaries. Requirements must be represented by explicit serializable capability descriptors; they must not be inferred from or flatten the `R` type.

## Problem Slice

The parent requires one model across multiple future runtimes, but the repository currently has no shared protocol package. Without a foundational contract, each child could invent incompatible result envelopes, status strings, failure shapes, permission vocabularies, plan identities, or digest rules. That would make callback resumption and deterministic replay impossible to verify without coupling contracts to the eventual execution engine.

This child should establish:

- branded/versioned identities for protocol, run, tool, plan, callback, continuation, trace, and digest references;
- JSON-safe success, failure, requirements, diagnostics, status, and digest envelopes;
- typed tool metadata with input/output/error schemas, read/write class, declared capabilities and permissions, resumability, idempotency, and version;
- immutable plan, callback, continuation, and replay records only as passive data;
- explicit canonicalization and compatibility boundaries used to compute or compare identities later;
- preservation of typed success, typed failure, and declared requirements metadata without running effects or choosing a transport.

## Current State and Existing Patterns

| Evidence | Relevant pattern | Constraint for this child |
|---|---|---|
| `packages/hatchet/src/Task.ts` | Generic declarations retain `Input`, `Output`, `Error`, and `Requirements`; optional `Schema.Codec` values accompany executable handlers. | Preserve all four channels explicitly; do not collapse errors to strings or requirements to `unknown` at the public declaration boundary. Separate declaration metadata from handlers because this child owns no execution. |
| `packages/hatchet/src/Hatchet.ts` | Public methods preserve `Effect<Output, Error, Requirements>` through the service boundary. | Future adapters must be able to recover typed output/error/requirements from the contract rather than reconstructing them. |
| `packages/hatchet/src/internal/declaration-validation.ts` | Metadata is validated before runtime use and duplicate identities fail early. | Contract constructors/decoders should reject malformed identities, versions, and duplicate metadata deterministically. |
| `packages/loom/router/src/action-input.ts` and `decode.ts` | Boundaries normalize unknown input and return explicit `Result` success/failure. | Decode unknown JSON through Effect Schema and expose structured parse/protocol failures; avoid exception-first public APIs. |
| `packages/loom/router/src/match.ts` and `router-runtime.ts` | Tagged result/state unions provide exhaustive public states. | Use schema-backed tagged unions for wire-visible statuses and outcomes, not open string unions or boolean `ok` flags. |
| `packages/hatchet` Nx project | Publishable ESM package with explicit exports, inferred typecheck/lint, Nx build/test targets, Vitest, and Effect as peer dependency. | Follow the same package shape, but tag the new library runtime-neutral/browser-safe and avoid Node types or Node-only dependencies. |
| Local Effect v4 `Schema` source and project Effect guidance | `Schema.Struct`, branded scalars, `Schema.TaggedUnion`, codecs, annotations, and JSON Schema derivation are current primitives. | Schemas are the source of validation and description; annotate stable public identities where discovery/JSON Schema tooling needs them. |

No existing package provides versioned protocol envelopes, stable canonical JSON, digest contracts, or serializable requirement descriptors. Loom's hand-written results are useful type precedents but are not sufficient wire contracts. Hatchet is the strongest precedent for retaining all Effect channels, although its task declaration combines metadata and execution and therefore must not be copied wholesale.

## Affected Areas and Likely Artifacts

- `packages/app-builder/contracts/package.json` — public `@effectify/app-builder-contracts` ESM package, Effect peer dependency, browser-neutral exports.
- `packages/app-builder/contracts/project.json` — Nx library with build, test, typecheck, and lint targets consistent with current packages.
- `packages/app-builder/contracts/src/` — small public modules for identities/versions, diagnostics/outcomes, tool declarations, plans, continuations/replay, and canonical JSON/digests.
- `packages/app-builder/contracts/tests/` — runtime codec, compatibility, canonicalization, replay-identity, and malformed-input tests plus compile-time channel-preservation tests.

These are likely implementation artifacts, not files authorized by this exploration. No existing source should be modified by this child except workspace/package integration that a later proposal explicitly approves.

## Contract Boundaries

### Included

1. **Version and identity vocabulary** — constrained branded strings and explicit protocol/tool schema versions. Compatibility is an explicit function/result, not accidental structural acceptance.
2. **JSON envelopes** — tagged success, failure, and input-required outcomes with common protocol version, run ID, status, diagnostics, optional trace reference, and applicable plan/output digests.
3. **Diagnostics and failures** — stable machine code, severity, message, optional JSON-safe details/path/cause references; typed tool failures remain payloads under the tool's declared error schema.
4. **Tool declarations** — a generic in-process declaration retaining input/output/error codecs and phantom/extractable channel types, paired with a serializable description containing schema identities or derived JSON Schema documents, classification, capabilities, permissions, resumability, idempotency, and version.
5. **Requirement descriptors** — serializable capability identities and constraints that correspond to `Requirements`; no Layer construction, service lookup, grant evaluation, or broker behavior.
6. **Immutable passive records** — ordered plan operations, pinned inputs, baseline references, validations, provenance references, callback requests/responses, continuation claims, and replay expectations. These records describe work but cannot perform it.
7. **Canonicalization boundary** — JSON-only canonical form with deterministic object-key ordering, preserved array order, rejection of unsupported/non-finite values, and a versioned algorithm identity. Digest records name algorithm and canonicalization version; hashing itself may be a pure portable helper only if it remains browser-safe and repository-supported.

### Excluded

- command parsing/rendering, stdout/stderr policy, run state machines, execution, approval semantics, locks, checkpoints, journals, recovery, filesystem or Nx `Tree` writes;
- callback persistence, token signing, IPC framing, worker/broker behavior, permission enforcement, or service `Layer` construction;
- generators, workspace adoption, provenance ledgers, migrations, compatibility solving, marketplace, builder, preview, blueprints, plugins, or golden applications;
- transport-specific schema negotiation and cryptographic key ownership.

## Approaches

1. **Single schema-first contracts package with dual declaration/description forms** — Effect Schemas define wire data; generic tool declarations retain codecs and channel types in-process, while serializable descriptions expose stable schema identities/JSON Schema.
   - Pros: preserves Effect typing, supports browser and Node consumers, keeps wire data serializable, and avoids coupling to execution or IPC.
   - Cons: requires disciplined mapping between runtime declaration and serialized description; JSON Schema output stability must be versioned rather than assumed.
   - Effort: Medium–High.

2. **JSON-only DTO package** — publish plain TypeScript/Schema records and represent tool schemas only as opaque IDs or JSON Schema.
   - Pros: smallest wire surface and easiest cross-process serialization.
   - Cons: loses direct typed input/output/error codec ownership and weakens the required preservation of Effect channels; downstream registries would need unsafe reconstruction.
   - Effort: Medium.

3. **Executable registry foundation** — combine contracts, handlers, Effect requirements, registration, invocation, and serialization now.
   - Pros: immediately demonstrates end-to-end type inference.
   - Cons: violates child scope, introduces runtime/IPC decisions prematurely, and makes the dependency-free foundation Node/runtime-coupled.
   - Effort: High; reject.

## Recommendation

Choose the schema-first dual-form approach. Keep encoded wire shapes deliberately boring and JSON-safe, while typed declarations hold actual codecs and type relationships in memory. Make every externally persisted identity explicitly versioned: protocol envelope version, tool contract version, schema identity/version, canonicalization version, and digest algorithm. Unknown major protocol versions should fail as typed incompatibility; compatible minor evolution should be opt-in through an explicit compatibility table/policy rather than permissive decoding.

Avoid a single mega-schema. Organize the implementation into dependency-ordered seams that can each remain reviewable:

1. identities, versions, JSON value, diagnostics, and common envelope fields;
2. success/failure/input-required unions and round-trip/version rejection tests;
3. typed tool declaration plus serializable description and channel-preservation type tests;
4. immutable plan, callback, continuation, and replay records;
5. canonicalization/digest identity and deterministic fixtures;
6. package exports and cross-module compatibility tests.

The full child is likely above the 400 changed-line budget once tests and package configuration are included. Under `ask-on-risk`, the later tasks phase should forecast exact slices and recommend a short feature-branch chain unless it can prove an under-budget implementation. The smallest plausible PR seams are the numbered units above; each should include its RED/GREEN tests and avoid broad capability PRs.

## Testing Strategy

Strict TDD is feasible without any runtime engine:

- **RED first — boundary rejection:** malformed JSON, unsupported major versions, invalid branded IDs, unknown tags, non-JSON values, duplicate tool identities, and schema-description mismatch.
- **Round-trip contracts:** encode then decode every envelope variant and metadata record; assert typed failures and requirements descriptors survive unchanged.
- **Compile-time contracts:** prove `Input`, `Output`, `Error`, and `Requirements` extraction for tool declarations, following Hatchet's `tests/types` precedent; include negative `@ts-expect-error` cases.
- **Canonicalization properties:** reordered object keys yield identical canonical bytes/digest input; array reordering does not; unsupported numbers/values fail; repeated canonicalization is idempotent.
- **Compatibility matrix:** current version accepted, unsupported major rejected, intentionally supported older minor decoded/migrated only through declared compatibility behavior.
- **Immutability/determinism:** constructors do not retain mutable aliases; identical pinned records produce identical canonical forms and replay identity.
- **Public API checks:** only intentional modules/types are exported; no Node globals or runtime execution dependencies leak into the browser-neutral package.

Verification should run through Nx (`pnpm nx test`, `typecheck`, `lint`, and `build` for the resolved project). Coverage should emphasize branch-heavy tagged unions, compatibility, and canonicalization; no integration or E2E layer is warranted for this data-only child.

## Dependencies and Parent Relationship

- This is roadmap unit `1.1`, has no child dependencies, and is the prerequisite for `app-builder-run-execution-cli` and `app-builder-plugin-sdk-worker`; later planner, preview, blueprint, registry, and certification children also consume it indirectly.
- It implements only the contract/data portion of parent capability `platform-planning-execution`, chiefly PE1–2. Parent PE3–4 execution, approval, locking, recovery, analytics, and diagnostic operations remain downstream.
- Parent artifacts remain authoritative for vocabulary and scope. This child may refine wire representation but must not change product policy, add runtime behavior, or make the umbrella directly applicable.
- Runtime dependencies should be limited to Effect as a peer. Test/build tooling follows the workspace catalog and Nx conventions.

## Risks

- **Schema values are not wire data:** serializing runtime `Schema` objects would create an unstable, non-portable contract. Mitigation: separate typed declarations from serialized descriptions.
- **`Requirements` cannot be reflected automatically:** TypeScript's `R` channel has no runtime representation. Mitigation: require explicit serializable requirement descriptors and type them alongside `R`; validate consistency where possible.
- **JSON Schema drift:** generated JSON Schema can change with Effect versions or annotations. Mitigation: version schema identities and canonical snapshots; do not use incidental generated bytes as the sole protocol version.
- **Premature state-machine design:** passive run/callback records can accidentally prescribe execution transitions. Mitigation: include only identity, expected schema, claims, and replay guards needed for exchange; defer transition legality and persistence.
- **Canonicalization ambiguity:** ordinary `JSON.stringify` does not provide the required identity boundary. Mitigation: specify supported JSON domain and canonicalization version before choosing digest implementation.
- **Contract explosion and review load:** modeling every future domain now would exceed scope and freeze guesses. Mitigation: define extensible primitives needed by the two immediate dependants and add domain-specific contracts in their owning children.

## Open Product Questions

No product question blocks proposal. The proposal/design phases must make two technical choices explicitly: whether serialized tool descriptions embed derived JSON Schema or reference versioned schema documents, and whether portable hashing belongs in this package or a downstream adapter. Either choice must preserve the canonicalization boundary and browser neutrality.

## Ready for Proposal

**Yes.** The child has a bounded, dependency-free problem slice, concrete repository precedents, a recommended package boundary, strict TDD seams, and explicit exclusions. A proposal should preserve the dual declaration/description model, avoid runtime execution/IPC, and treat a likely over-400 implementation as an `ask-on-risk` chain-planning concern.
