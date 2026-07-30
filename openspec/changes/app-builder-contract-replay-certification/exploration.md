# Exploration: App Builder Contract Replay Certification

> Final applicable child of the non-applicable `app-builder-protocol-contracts` roadmap. Exploration only: this artifact authorizes no proposal, specification, design, tasks, implementation, issue, branch, commit, or PR. The parent MUST never be applied.

## Current State

`@effectify/app-builder-contracts` is a private, browser-neutral Nx library with 16 direct-import source leaves and 19 test/type-proof files. Its package has no `exports`, remains `private: true`, treats `effect` as a regular dependency, and builds from `src/envelope.ts`; `src/index.ts` does not exist. The declaration firewall currently asserts that this private state remains true, so final certification must intentionally replace that assertion rather than bypass it.

Published dependency slices provide:

- PR #94: branded/versioned protocol, run, tool, plan, callback, continuation, trace, schema, and digest references; pure version acceptance; envelope identity.
- PR #96: hostile-input-safe immutable JSON plus `effectify-cjson/1` canonical text and UTF-8 bytes; hashing and replay deliberately excluded.
- PR #98: exact success/failure/input-required outcomes, ordered diagnostics, and strict complete-envelope decoding.
- PR #100: ordered JSON-only requirements, explicit schema identity documents, passive `Declaration<I,O,E,R>`, and deterministic projection. Its archive reports PASS WITH WARNINGS and 1,637/3,000 lines; GitHub status could not be independently refreshed because the available GitHub credential was rejected, so the archive is the current delivery authority.

The code already establishes the correct Effect v4 vocabulary: constrained branded `Schema` identities, `Schema.Struct`, `Schema.TaggedUnion`, `Schema.TaggedErrorClass`, pure `Result`, readonly schema views, and explicit `Type`/`Encoded` aliases. Upstream Effect v4 confirms that `Schema.Struct` derives readonly `Type` and `Encoded` views and unions service requirements through `DecodingServices` and `EncodingServices`; certification should prove all four channels explicitly instead of inferring them from runtime fixtures.

No passive plan/replay module, digest binding record, compatibility declaration/table, package-root barrel, or final certification evidence exists today.

## Affected Areas

- `packages/app-builder/contracts/src/passive-record.ts` — immutable ordered plans, pinned inputs, callbacks, continuations, provenance, baselines, and validations.
- `packages/app-builder/contracts/src/replay.ts` — replay expectations and one canonical replay-material projection; data comparison only.
- `packages/app-builder/contracts/src/digest.ts` — digest-reference-bearing records and ownership boundary; no hashing or crypto.
- `packages/app-builder/contracts/src/compatibility.ts` — explicit accepted protocol/schema declarations and typed table validation; no solver or fallback.
- `packages/app-builder/contracts/src/index.ts` — intentional package-root public surface for every completed contract leaf.
- `packages/app-builder/contracts/package.json` — public ESM/type export map, Effect peer dependency, and removal of `private`.
- `packages/app-builder/contracts/project.json`, `tsconfig.lib.json` — root entry point and public Nx tags/build output.
- `packages/app-builder/contracts/tests/` — strict-TDD runtime seams, deterministic fixtures, package export assertions, four-channel proofs, and final PE1–2 certification.
- `packages/app-builder/contracts/tests/internal-imports.test.ts` — evolve the private-state firewall into a leaf-direction/public-root firewall while keeping Node use test-only.
- `openspec/changes/app-builder-protocol-contracts/` and canonical child specs — traceability only; never apply or rewrite the parent roadmap.

## Semantics and Constraints

### Passive replay model

Records should be closed, discriminated data schemas with copied/frozen JSON and arrays. Plan operation order, validation order, and callback/continuation collections are identity-significant and MUST NOT be sorted or deduplicated. Object-key order is not identity-significant because `effectify-cjson/1` canonicalization owns that normalization.

Pinned inputs should bind explicit references and accepted JSON values. Baselines and provenance should be references/claims only, not filesystem inspection or ownership assertions. Validations should describe expected checks and observed passive results without running commands. Callback and continuation records should connect existing `CallbackRef`, `ContinuationRef`, and `SchemaRef`; they must not prescribe state transitions, token signing, persistence, approval, or resumption execution.

### Replay identity and digest ownership

Replay identity should mean equality of versioned canonical replay material, not a hash computed by this package. A pure projector should assemble one closed JSON record with an explicit replay-material version and identity-bearing fields, then delegate normalization/canonical text/bytes to the existing canonicalization boundary. Equal object content must produce equal material/text; reordered plan arrays must differ.

`DigestRef` is an externally assigned, versioned reference. This package may define where a claimed plan/input/output digest reference is carried and which canonical material it refers to, but MUST NOT choose a cryptographic algorithm, compute a digest, import crypto, verify bytes, or imply content authenticity. If algorithm identity is required, it belongs in explicit passive metadata supplied by the hashing authority, not hidden in `DigestId`.

### Compatibility and versioning

Final compatibility should be an explicit finite declaration, not a range solver: protocol major plus enumerated supported minors, and corresponding schema/module declarations where cross-module fixtures require them. Unknown major, undeclared minor, unknown tag, duplicate declaration, and schema-document mismatch remain typed rejection with no migration or permissive fallback. Patch remains identity/order information unless product policy explicitly makes it a compatibility discriminator.

### Browser-neutral public boundary

Production source must continue to compile with `lib: ["ES2022"]`, `types: []`, no Node condition, globals, built-ins, crypto, filesystem, or process APIs. Package tests should inspect the built metadata and public root without adding a dedicated application. Test harnesses may use Node to inspect artifacts, but the production graph must remain neutral. Publish ESM plus declarations with `effect` as a peer and an intentional root export map; leaves continue importing siblings directly, never `index.ts`.

### Certification evidence

Certification should combine: deterministic cross-module fixtures spanning identity → declaration → passive plan → replay material → complete envelope; malformed and incompatible fixtures; package-root export exactness; typecheck-only four-channel proofs (`Type`, `Encoded`, `DecodingServices`, `EncodingServices`); Nx test/typecheck/lint/build receipts; coverage; diff hygiene; and a requirement/scenario matrix proving PE1 typed protocol plus PE2 immutable deterministic replay. Documentation must state ownership, compatibility policy, hashing exclusion, and consumer import path without claiming PE3–4 behavior.

## Approaches

1. **Closed schemas plus one canonical replay projector** — Model passive records with small `Schema.Struct`/`Schema.TaggedUnion` leaves and project exactly one versioned replay-material JSON object through `effectify-cjson/1`.
   - Pros: reuses proven hostile-input and canonical semantics; preserves order; keeps hashing external; gives fixtures one identity authority.
   - Cons: requires explicit decisions about identity-bearing versus observational fields and strict unknown-key behavior.
   - Effort: Medium

2. **Generic bags plus consumer-defined replay material** — Expose broad JSON records and let each consumer select canonical fields.
   - Pros: fewer source types and less initial code.
   - Cons: destroys cross-consumer replay identity, weakens compatibility certification, and invites hidden execution/state semantics.
   - Effort: Low initially, High downstream

3. **Digest-first replay records** — Make a digest the primary identity and add hashing/verification here.
   - Pros: compact comparisons.
   - Cons: violates #96 ownership, browser-neutral/data-only scope, and the explicit no-hashing requirement; conflates reference identity with integrity proof.
   - Effort: High and out of scope

## Recommendation

Use closed schemas plus one canonical replay projector. Keep records leaf-oriented and data-only; use existing refs and JSON/canonicalization rather than introducing duplicate identities. Treat canonical replay material as the package-owned equality boundary and digest references as externally produced claims. Add the public barrel only after passive/replay tests pass, then certify exports, compatibility, package neutrality, and all four schema channels as a second strict-TDD seam.

## Strict-TDD Seams

1. RED immutable/order/hostile-input tests for plan, pinned input, provenance, baseline, validation, callback, and continuation records; GREEN leaves; REFACTOR dependency firewall.
2. RED equal-object/reordered-array replay fixtures and digest-ownership exclusions; GREEN canonical material projection; REFACTOR shared fixtures.
3. RED compatibility table acceptance/rejection and four-channel compile proofs; GREEN explicit declarations; REFACTOR failure vocabulary.
4. RED package-root export map and private/deep import firewall; GREEN `index.ts`/package/Nx build changes; REFACTOR documentation and final PE1–2 evidence.

Each seam should record the failing command before implementation and rerun `pnpm nx run @effectify/app-builder-contracts:test`, `:typecheck`, `:lint`, and `:build` without cache for final evidence.

## Forecast

| Area                                                             | Productive lines | Total changed lines |
| ---------------------------------------------------------------- | ---------------: | ------------------: |
| Passive records, replay, digest references                       |          500–700 |         1,050–1,400 |
| Compatibility, exports, package metadata                         |          200–300 |             300–500 |
| Cross-module fixtures, four-channel proofs, docs/evidence/config |          100–180 |             350–500 |
| **Expected consolidated PR**                                     |    **850–1,230** |     **1,950–2,650** |

The 400-line review risk is High. The expected total fits the maintainer-approved 3,000-line ceiling but has only 350 lines of worst-case headroom. Recount after every seam; at more than 3,000 lines, stop under `ask-on-risk` before publication. The approved feature-branch-chain remains declarations → replay certification, and rollback remains one coupled replay/export/certification revert.

## Risks

- Replay identity can become ambiguous if observational fields, digest claims, or canonical material ownership are not enumerated.
- `DigestRef` currently identifies a digest but does not encode an algorithm; pretending otherwise would create false integrity semantics.
- A compatibility table can accidentally become a solver or silently accept patch/minor versions without explicit policy.
- Publishing every leaf may expose helper/failure internals unintentionally; the root surface needs an exact allowlist and type/runtime export checks.
- Existing tests intentionally assert no root export and an exact 16-file source list; these must be deliberately evolved under RED, not deleted.
- PR #100 publication is supported by the archive, but live GitHub verification was unavailable due rejected credentials.
- The current worktree contains uncommitted archive moves; exploration created only this file and must not normalize or commit unrelated state.

## Open Product Questions

1. Which fields are identity-bearing in canonical replay material: are validation observations and digest claims included, or only the plan, pins, baselines, provenance, and replay expectations?
2. Is `DigestRef` intentionally algorithm-agnostic, or must passive digest metadata name an external algorithm/version such as a separate `algorithm` field?
3. Does compatibility ignore patch for acceptance (major + enumerated minor), or must the final table enumerate exact patches as well?
4. Is compatibility one package-wide protocol table, or separate protocol/schema/module tables tied together by certification fixtures?
5. What are the exact passive operation variants and minimum fields for plans, validations, provenance, baselines, callbacks, continuations, and replay expectations?
6. Does “four-channel type proofs” apply to every public schema factory, or only generic outcome/envelope and declaration/replay composition points?
7. Should package-root exports expose all named leaf symbols directly, canonical module namespaces, or both? This determines collision and semver surface.
8. Which consumer-facing document is required for final certification: package README, API surface document, or OpenSpec-only certification report?

## Ready for Proposal

No. Architecture and seams are clear, but proposal scope cannot be precise until the replay identity-bearing field set, digest metadata ownership, compatibility granularity/patch policy, and public export shape are answered. The orchestrator should ask these product questions before proposal.
