# Design: App Builder Contract Declarations

## Technical Approach

Add private, passive leaf modules to `@effectify/app-builder-contracts`. Unknown values are inspected defensively, normalized through the existing hostile-input JSON boundary, and composed with eager `effect/Result`. Explicit `SchemaRef` plus JSON documents are the only compatibility evidence; codecs, annotations, services, and permissions are never inspected or executed. Arrays are copied/frozen in declared order.

## Architecture Decisions

| Decision       | Choice                                                                                                    | Alternatives / rationale                                                                                                                                                                  |
| -------------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Channel typing | `Declaration<out I, out O, out E, in out R>` and matching `EncodedDeclaration`; no runtime variance field | Effect v4 uses variance annotations (`Schema`, `Cache`, `TxQueue`). `in out R` was compiler-proved invariant while remaining fully erased; symbol phantoms would violate runtime absence. |
| Metadata       | `SchemaDocument<A> = { ref: SchemaRef; document: Json }` supplied explicitly                              | Reject codec/AST/annotation reflection: it creates unstable structural compatibility.                                                                                                     |
| Compatibility  | Exact declared identity/version comparison, then canonical JSON text comparison                           | Reuses `SchemaRef`, `Version`, and `canonicalizeJson`; no solver or inferred codec equivalence.                                                                                           |
| Failures       | Separate `Schema.TaggedErrorClass` variants                                                               | Preserves exhaustive `Result` handling and the package’s direct-construction convention.                                                                                                  |

## Data Flow

```text
unknown descriptor/document/declaration
  -> guarded shape reads -> Schema.decodeUnknownResult
  -> normalizeJson -> freeze ordered values
  -> duplicate/version/document checks -> encoded ordered projection
```

## File Changes

| File                                                                                       | Action | Responsibility                                                                                                                                                                                 |
| ------------------------------------------------------------------------------------------ | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/declaration-failure.ts`                                                               | Create | `UnsupportedDeclarationJson`, `MalformedDeclarationMetadata`, `DuplicateDeclarationIdentity`, `IncompatibleDeclarationVersion`, `DeclarationMetadataMismatch`, `DeclarationProjectionFailure`. |
| `src/requirement.ts`                                                                       | Create | `CapabilityRequirement`, `ConstraintRequirement`, `PermissionRequirement`, `Requirement`, `decodeRequirement(s)`; JSON-only metadata and stable arrays, never permission evaluation.           |
| `src/schema-document.ts`                                                                   | Create | `SchemaDocument<A>`, `decodeSchemaDocument<A>`; require explicit `SchemaRef` and normalized document.                                                                                          |
| `src/tool-declaration.ts`                                                                  | Create | `Declaration<I,O,E,R>`, `DeclarationInput`, `makeDeclaration`; passive frozen tool ref, I/O/E documents, and requirements.                                                                     |
| `src/tool-declaration-projection.ts`                                                       | Create | `EncodedDeclaration<I,O,E,R>`, `projectDeclaration(s)`; preserve channels/order, detect exact duplicate tool refs and incompatible same-id versions, and enforce same-ref document equality.   |
| `tests/{requirement,schema-document,tool-declaration,tool-declaration-projection}.test.ts` | Create | Runtime behavior and hostile getters, proxies, cycles, symbols, functions, deep containers, conflicting refs, and every failure tag.                                                           |
| `tests/tool-declaration.types.ts`                                                          | Create | I/O/E projection equality, bidirectional R cross-assignment rejection, and encoded-key absence.                                                                                                |
| `tests/internal-imports.test.ts`                                                           | Modify | Add leaves/dependency allowlist; forbid `Effect`, `Layer`, handlers, execution, permission evaluation, replay/certification, and `src/index.ts`/package-root export creation.                  |

Dependency direction is `identity/reference/version/json/canonical-json -> failures/requirement/schema-document -> tool-declaration -> projection`; no reverse imports or root barrel.

## Interfaces / Contracts

```ts
interface SchemaDocument<out A> { readonly ref: SchemaRef; readonly document: Json }
interface Declaration<out I, out O, out E, in out R> {
  readonly ref: ToolRef
  readonly input: SchemaDocument<I>; readonly output: SchemaDocument<O>
  readonly error: SchemaDocument<E>; readonly requirements: ReadonlyArray<Requirement>
}
declare function projectDeclarations<I, O, E, R>(values: ReadonlyArray<Declaration<I, O, E, R>>):
  Result.Result<ReadonlyArray<EncodedDeclaration<I, O, E, R>>, DeclarationProjectionError>
```

## Testing Strategy

Strict seams: (1) RED requirements scenarios 1–2, GREEN descriptors, REFACTOR; (2) RED schema/declaration scenarios 3–6 plus compile-time proofs, GREEN, REFACTOR; (3) RED projection scenarios 7–8, GREEN pure validation, REFACTOR; (4) RED firewall/delivery scenarios 9–10, then package verification. Ordinary Vitest tests cover `Result`; `tsconfig.spec.json` owns type proofs. Commands: `pnpm nx run @effectify/app-builder-contracts:test`, then `:typecheck`, `:lint`, and `:build`.

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable classification, or process-integration boundary.

## Migration / Rollout

No migration or public API change. Forecast: source 750, tests/firewall 900, total ~1,650 changed lines. Use the approved feature-branch chain, recount each work unit, ask on risk, and stop/reforecast before exceeding 3,000. Roll back descriptors and declaration/projection together; revert dependent certification first.

## Open Questions

None.
