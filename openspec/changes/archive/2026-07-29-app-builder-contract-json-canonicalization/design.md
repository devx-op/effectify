# Design: App Builder Contract JSON Canonicalization

## Technical Approach

Keep the three private, acyclic leaves and eager, environment-free `Result` operations, but replace structural realm-root inference with boundary-owned authority. `json.ts` snapshots trusted record-prototype identities at construction; normalization performs guarded reflection and iterative copy/freeze. `canonical-json.ts` composes that normalizer with the iterative `effectify-cjson/1` serializer and direct RFC 3629 encoder. No hostile candidate can add authority.

## Architecture Decisions

| Decision         | Choice and rationale                                                                                                                                                                                                                              | Rejected alternative                                                                                                                                |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Record authority | Each boundary owns a closure-private, frozen identity list seeded with `null` and this module realm's `Object.prototype`, plus caller-supplied cross-realm roots copied during construction. Membership is `===`; no root is inferred from input. | Constructor/prototype certificates are forgeable by a custom null-root prototype. Current-realm-only identity rejects required cross-realm records. |
| Configuration    | `makeJsonBoundary` is a pure synchronous factory. It snapshots the readonly options array, exposes no registration method/list, and freezes the returned boundary. Runtime code imports no `window`, DOM, `vm`, Node, or environment service.     | Mutable global registry permits order-dependent authority and hostile registration.                                                                 |
| Traversal        | Preserve iterative 256-container traversal, cycle-before-depth, guarded own-key/prototype/descriptor inspection, descriptor-before-value reads, sorted record descent, copied null-prototype records, and bottom-up freezing.                     | Recursion risks host-stack failure; Schema/JSON APIs may throw or execute accessors.                                                                |
| Canonical output | Preserve raw UTF-16 key ordering, ECMAScript finite-number/string rules, paired frozen material plus `/1` text, and fresh UTF-8/no-BOM bytes.                                                                                                     | Locale/UTF-8 ordering, wrapper serialization, or source aliases drift identity.                                                                     |
| Failure          | Preserve non-echoing `JsonFailure` reasons only.                                                                                                                                                                                                  | Causes, paths, keys, values, or messages retain hostile data.                                                                                       |

## Data Flow and State Machine

```text
trusted caller -> makeJsonBoundary(options) -> frozen prototype identities
                                                |
unknown -> normalizeJson -> owned frozen Json -> serialize -> CanonicalJson
              |                                      |
              +-> Result.Failure(reason)              +-> fresh UTF-8 bytes
```

For each `Visit`, test active-ancestor cycle, then prospective depth (`>256`). Guard `Array.isArray`, `Reflect.ownKeys`, non-array `Reflect.getPrototypeOf`, and every own descriptor; any thrown inspection becomes `inspection-failed`. Only after all inspections succeed, validate shape. Arrays require dense enumerable data indexes plus `length`. Records require enumerable string data descriptors and prototype identity in the captured authority. Thus an unregistered custom prototype returns `invalid-record`; a registered cross-realm `Object.prototype` proceeds through the same own-key/descriptor checks. No constructor, inherited property, or prototype descriptor is read. `Container` processes one sorted/indexed child at a time, removes the active source, freezes the copy, and assigns it; partial copies never escape.

## File Changes

| File                                                                           | Action | Description                                                                                          |
| ------------------------------------------------------------------------------ | ------ | ---------------------------------------------------------------------------------------------------- |
| `packages/app-builder/contracts/src/json-failure.ts`                           | Create | Stable reason schema and tagged failure.                                                             |
| `packages/app-builder/contracts/src/json.ts`                                   | Create | `Json`, depth/state machine, immutable prototype snapshot, `makeJsonNormalizer`, default normalizer. |
| `packages/app-builder/contracts/src/canonical-json.ts`                         | Create | Boundary factory/types, default boundary, `/1` serializer and UTF-8 encoder.                         |
| `packages/app-builder/contracts/tests/json.test.ts`                            | Create | Acceptance, freeze/alias, authority snapshot, 256/257, cycle precedence.                             |
| `packages/app-builder/contracts/tests/json-hostile-input.test.ts`              | Create | Proxy/descriptors plus forged-certificate rejection without user-code execution.                     |
| `packages/app-builder/contracts/tests/{canonical-json,canonical-utf8}.test.ts` | Create | Canonical text/material and exact fresh no-BOM bytes.                                                |
| `packages/app-builder/contracts/tests/internal-imports.test.ts`                | Modify | Eight private leaves and neutrality/no-hash guards.                                                  |

Direction remains `json-failure <- json <- canonical-json`; no barrel, export, app, envelope/reference, hashing, replay, or downstream changes.

## Interfaces / Result Contract

```ts
interface JsonBoundaryOptions {
  readonly trustedObjectPrototypes?: ReadonlyArray<object>
}
interface JsonBoundary {
  readonly normalizeJson: (input: unknown) => Result.Result<Json, JsonFailure>
  readonly canonicalizeJson: (input: unknown) => Result.Result<CanonicalJson, JsonFailure>
  readonly canonicalJsonBytes: (value: CanonicalJson) => Uint8Array
}
declare const makeJsonBoundary: (options?: JsonBoundaryOptions) => JsonBoundary
```

The default boundary trusts only `null` and current-realm `Object.prototype`. Success returns copied/deep-frozen material paired with `algorithm: "effectify-cjson/1"` and branded text. Failure is exactly one of `inspection-failed`, `unsupported-value`, `invalid-record`, `invalid-array`, `cycle`, or `depth-exceeded`, with no echoed input. `canonicalJsonBytes` returns a fresh allocation.

## Testing Strategy

Strict-TDD RED fixtures first: explicitly configured foreign-realm `Object.prototype` succeeds; an unregistered custom null-root prototype with the old self-referential constructor certificate fails `invalid-record` while a throwing/counting constructor remains unexecuted; mutating the source options array after construction neither adds nor removes authority, and the boundary is frozen. Retain deterministic hostile inspection, 256/257, cycle-before-depth, canonical scalar/order, freeze/alias, UTF-8/U+FEFF/no-BOM, fresh bytes, and private-scope fixtures. Use synchronous Vitest `it`; package Nx test/typecheck/lint/build verify later. No integration/E2E runtime applies.

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary.

## Migration / Rollout

No migration required. Additive private scope and rollback boundary remain unchanged.

## Open Questions

None.
