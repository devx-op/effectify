# Exploration: App Builder Contract JSON Canonicalization

> Grandchild `1.2` of the non-applicable `app-builder-protocol-contracts` roadmap. Exploration only; hashing, proposal/spec/design/tasks/code, parent apply, and parent apply-progress remain prohibited.

## Current State

`@effectify/app-builder-contracts` now contains the archived identity dependency: private, browser-neutral Effect v4 schemas and pure `Result` decoders in `packages/app-builder/contracts`. Its five leaf modules are acyclic, use `Schema.Struct`, `Schema.optionalKey`, branded constrained scalars, and non-echoing `Schema.TaggedErrorClass` failures. Hostile proxy/getter tests already establish that public unknown-input helpers must catch inspection defects and return fresh failures without retaining input or causes.

Effect v4 at the pinned canonical commit `96ced895a07f89b2dd03c3e470884f7e25063696` provides `Schema.Json` and the readonly `Schema.Json` type, but that is only a validation primitive. Its implementation traverses objects, rejects cycles, non-finite numbers, sparse arrays, and ordinary non-JSON leaves, and permits plain/null-prototype records. It does not clone, freeze, sort keys, produce canonical text, reject accessors before invocation, or contain hostile proxy traps: `Schema.decodeUnknownResult(Schema.Json)` can throw when proxy inspection throws. `Schema.fromJsonString` delegates to ordinary `JSON.parse`/`JSON.stringify` and is therefore not the canonicalization boundary.

The roadmap fixes the algorithm identity and semantics: `effectify-cjson/1` deep-copies and freezes accepted JSON, sorts object keys by raw UTF-16 code units, preserves dense-array order, uses ECMAScript scalar serialization, normalizes `-0` to `0`, and rejects ambiguous/runtime values. Canonical text is encoded directly as RFC 3629 UTF-8 with no leading BOM and no wrapper serialization. Hashing and digest construction remain downstream.

## Requirements and Invariants

- Accept exactly `null`, booleans, finite numbers, strings, dense arrays, and plain string-keyed data records. Treat null-prototype and cross-realm plain records consistently; reject class instances and other prototypes.
- Inspect own keys and property descriptors before reading values. Reject accessors, symbol keys, non-enumerable/extra array properties, holes, cycles, unsupported leaves, and any failed proxy/descriptor/prototype inspection through typed, non-echoing `Result` failures.
- Deep-copy before freezing so later source mutation cannot alter accepted material. Freeze every copied array/object; return no retained mutable aliases.
- Sort object keys with ECMAScript default string ordering (UTF-16 code units), not locale ordering and not UTF-8 byte ordering. Preserve array order exactly.
- Serialize scalars with ECMAScript JSON semantics. `-0` becomes `0`; finite exponent formatting follows the pinned ES runtime. Lone UTF-16 surrogates must be emitted as JSON escapes, yielding valid RFC 3629 bytes rather than replacement characters.
- Name the immutable algorithm exactly `effectify-cjson/1`. A future algorithm change requires a new identity; `/1` behavior and fixtures never drift.
- UTF-8 encoding consumes the canonical string directly, emits no BOM, and returns fresh bytes. U+FEFF inside a JSON string is content, not a document BOM. No crypto, digest algorithm, digest bytes, or digest reference construction belongs here.
- Failure payloads may expose stable reason categories but must not include hostile values, property names, thrown causes/messages, or partially copied material.

## Affected Areas

- `packages/app-builder/contracts/src/json.ts` — JSON type/schema reuse and guarded unknown-input normalization into deeply copied, frozen JSON.
- `packages/app-builder/contracts/src/json-failure.ts` — finite stable reason domain and schema-backed, non-echoing typed failure.
- `packages/app-builder/contracts/src/canonical-json.ts` — `effectify-cjson/1` identity, deterministic serializer, canonical material result, and direct UTF-8/no-BOM helper; no hashing.
- `packages/app-builder/contracts/tests/json.test.ts` — accepted JSON domain, deep freezing, alias isolation, and typed unsupported-value cases.
- `packages/app-builder/contracts/tests/canonical-json.test.ts` — key-order equivalence, array-order significance, scalar/surrogate fixtures, idempotence, and canonical version fixtures.
- `packages/app-builder/contracts/tests/json-hostile-input.test.ts` — throwing proxy traps/getters/descriptors/prototypes, cycles, symbols, sparse arrays, and non-echoing failures.
- `packages/app-builder/contracts/tests/canonical-utf8.test.ts` — exact RFC 3629 bytes, no leading BOM, direct encoding, fresh-byte isolation, and U+FEFF-content distinction.
- `packages/app-builder/contracts/tests/internal-imports.test.ts` — extend the exact kebab-case leaf inventory and neutrality assertions without creating a root/barrel export.
- `packages/app-builder/contracts/project.json` — likely no change: the resolved Nx project already exposes test/typecheck/lint/build, and final package exports remain the certification grandchild's scope.

## Approaches

1. **One guarded traversal producing frozen material and canonical text** — inspect, validate, clone/freeze, and serialize through one explicit iterative/recursive implementation returning `Result`.
   - Pros: one authoritative acceptance policy; accessors are rejected before invocation; canonical output and frozen material cannot disagree; easiest hostile-input reasoning.
   - Cons: custom traversal requires careful path/cycle bookkeeping and fixed rejection precedence.
   - Effort: Medium.

2. **Guarded normalization followed by `Schema.Json` and a separate serializer** — first sanitize/copy input, then validate the safe copy with Effect Schema and canonicalize it independently.
   - Pros: reuses the canonical Effect JSON schema as a defense-in-depth boundary and keeps Schema interoperability explicit.
   - Cons: two traversals; duplicated invariants can drift unless normalization is the sole policy authority; `Schema.Json` alone is unsafe for hostile unknown input.
   - Effort: Medium.

3. **Recursive key sorting plus `JSON.stringify` on caller input** — sort objects and delegate everything else to built-ins.
   - Pros: small implementation.
   - Cons: invokes getters, can throw on proxies/cycles/bigint, silently omits/coerces unsupported values, retains alias ambiguity, and cannot provide deterministic typed failures.
   - Effort: Low; reject.

## Recommendation

Use a guarded normalizer as the single policy authority, then optionally pass only its safe copied output through `Schema.Json` as defense in depth. Canonical serialization must consume that frozen copy, never the hostile original. Expose a small pure surface: the `Json` schema/type, a `decodeJson`-style `Result` normalizer, the literal `effectify-cjson/1` identity, a canonicalization result containing frozen material plus branded/versioned canonical text, and a direct canonical-text-to-UTF-8 helper returning fresh bytes. Keep modules leaf-imported and private until exports/certification.

Define deterministic rejection precedence during design (inspection defect before shape-specific reasons at the current node; cycle before descending; descriptor checks before property reads). Prefer an explicit traversal that can bound stack risk for deeply nested hostile input. Do not put untrusted paths or keys in failures. `Object.freeze` is appropriate for copied JSON arrays/records; do not claim returned `Uint8Array` is frozen because non-empty typed arrays cannot be reliably frozen—fresh allocation is the correct alias guarantee.

### Test Strategy

Under strict TDD, begin with ordinary synchronous `it` tests because the APIs are eager, environment-free `Result` operations. RED seams should be: (1) guarded frozen JSON normalization, (2) canonical `/1` fixtures, then (3) UTF-8 contract. Include:

- positive scalar/nested/empty/null-prototype/cross-realm-like plain-record cases;
- negative `undefined`, bigint, symbol keys/values, functions, `NaN`, infinities, class/date/map/set, cycles, holes, accessors, extra array keys, and hostile proxy traps;
- source mutation after success, recursive `Object.isFrozen`, and no retained aliases;
- reordered object keys equal, reordered arrays unequal, repeated canonicalization equal, UTF-16 key-order fixtures, `-0`, exponent thresholds, escaping/control characters, astral characters, lone surrogates, and U+FEFF content;
- exact UTF-8 bytes with no prefix BOM and no `JSON.stringify(canonical)` wrapper;
- failures remain `Result` values and `JSON.stringify(failure)` contains neither trap messages nor hostile keys/values.

Verify only through the existing package-manager/Nx surface: `pnpm nx test @effectify/app-builder-contracts`, then typecheck, lint, and build for the same project. No integration/E2E runtime applies. The parent forecast is approximately 350 productive lines; the 800-line session budget is low risk, but tasks should reforecast and preserve reviewable TDD seams.

## Risks

- **Hostile inspection:** `Schema.Json` and ordinary JSON APIs can throw or execute getters. Mitigation: guard prototype/key/descriptor inspection and never decode the original through Schema first.
- **Canonical drift:** key comparison, number formatting, or escaping changes would alter downstream identities. Mitigation: immutable `/1` identity plus byte-level golden fixtures, including UTF-16 and numeric edge cases.
- **False BOM checks:** U+FEFF content legitimately encodes `EF BB BF` after the opening quote. Mitigation: assert only that no BOM is prepended to the document and test content separately.
- **Deep-input exhaustion:** naïve recursion can overflow before returning a typed failure. Mitigation: prefer an explicit stack or define and test a bounded-depth policy in design/spec.
- **Over-strict object policy:** null-prototype/cross-realm plain records need an explicit decision consistent with Effect's `Schema.Json`; otherwise consumers may see accidental incompatibility. Recommendation: accept them after guarded descriptor checks.
- **Scope leakage:** adding replay records, digest algorithms, crypto, public exports, or compatibility tables would steal downstream ownership. Mitigation: keep this slice generic JSON/canonical/UTF-8 only.

## Ready for Proposal

Yes. The dependency is archived PASS, the acceptance and canonicalization boundaries are concrete, Effect v4's useful and unsafe edges are identified, hashing is explicitly downstream, and strict-TDD seams are testable through the existing Nx project. The proposal should preserve the recommended null-/cross-realm plain-object acceptance and require design to fix rejection precedence and deep-input behavior.
