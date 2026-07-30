# Design: App Builder Contract Replay Certification

## Technical Approach

Publish a root-only, browser-neutral ESM package after adding pure `Schema`/`Result` decoders, replay projection, and finite compatibility certification. Preserve the archived dependency direction and direct leaf imports; no workflow execution, hashing, solver, service, persistence, or environment inspection enters production.

```text
identity/version/digest -> reference -> outcome/envelope
json/canonical-json -> declarations -> passive-record -> replay
reference/version/schema-document -> compatibility -> index
```

## Architecture Decisions

| Choice                                                                                               | Rejected alternative                                        | Rationale                                                                       |
| ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Normalize hostile `unknown` through `normalizeJson`, then strict-decode and copy/freeze known fields | Reflect arbitrary objects or trust Schema output mutability | Reuses the proven non-echoing boundary and guarantees immutable ordered arrays. |
| Canonical equality is `effectify-replay/1` material passed to `canonicalizeJson`                     | Hash-derived identity                                       | `effectify-cjson/1` owns key order; external authorities own hashing.           |
| Fixed module declarations using `VersionSupport` and fixed-order aggregation                         | Semver/range solver or same-major inference                 | Acceptance remains explicit and deterministic.                                  |
| Root export allowlist plus namespaces; no subpaths                                                   | `export *` or deep imports                                  | Prevents accidental helper/failure leakage.                                     |

## Module and Contract Ownership

| File                                                   | Symbols / exact encoded keys                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/digest.ts`; `src/reference.ts`                    | `DigestAlgorithm`, `DigestValue`, `MalformedDigestMetadata`; adapt `DigestRef`/`decodeDigestRef` to exactly `{id,version,algorithm,value}`. Values are supplied, never computed or verified.                                                                                                                                                                                                                                                                                                          |
| `src/passive-record.ts`                                | `PinnedInput {inputKey,schemaRef,value,digestRef?}`, `CallbackRecord {callbackRef,responseSchemaRef}`, `ContinuationRecord {continuationRef,responseSchemaRef}`, `PassiveStep` tags `ToolStep \| CallbackStep \| ContinuationStep` with `{_tag,stepKey,...}`, `PassivePlan {planRef,steps}`, `Provenance {runRef,traceRef?}`, `Baseline {planRef,materialDigestRef?}`, `Validation` tags `Accepted \| Rejected`, and `ReplayExpectation` tags `Equivalent \| Different`; decoders reject excess keys. |
| `src/replay-failure.ts`; `src/replay.ts`               | Non-echoing `UnsupportedReplayJson`/`MalformedReplayContract`; `ReplayContract` exactly `{protocolRef,declarations,plan,pinnedInputs,callbacks,continuations,provenance,baselines,validations,expectations,digestClaims}`. `projectReplayMaterial` prepends `format:"effectify-replay/1"`, retains every field and array order, then calls `canonicalizeJson`.                                                                                                                                        |
| `src/compatibility-failure.ts`; `src/compatibility.ts` | `CertifiedModuleName`, `ProtocolCompatibilityDeclaration {protocolId,range}`, `ModuleCompatibilityDeclaration {module,range,protocols,schemas}`, fixed `PackageCompatibilityDeclarations`, and `certifyPackageCompatibility`. Failures are `MalformedCertification`, `UnknownModule`, `DuplicateModule`, `UndeclaredModuleVersion`, `UndeclaredProtocolVersion`, `SchemaMismatch`; output follows declaration order.                                                                                  |
| `src/index.ts`                                         | Namespaces: `CanonicalJson, Compatibility, Declaration, Diagnostic, Digest, Envelope, Identity, Json, Outcome, PassiveRecord, Reference, Replay, Requirement, SchemaDocument, Version`. Named values only: `canonicalizeJson`, `canonicalJsonBytes`, `makeDeclaration`, `projectDeclarations`, `decodeCompleteEnvelope`, `decodeDigestRef`, `decodePassivePlan`, `decodeReplayContract`, `projectReplayMaterial`, `certifyPackageCompatibility`, `PackageCompatibilityDeclarations`.                  |

## Public Packaging

`package.json` becomes public with Effect as peer and only `exports["."] = {@effectify/source,types,import,default}`; no Node condition/subpath. `project.json` builds `src/index.ts` into package-local `dist`, adds `test-coverage`, public tags, and `nx.json` release registration. Package tests assert the exact root export map and reject private/deep imports.

## Strict TDD and Evidence

| Seam | RED ownership                                      | Requirements/scenarios |
| ---- | -------------------------------------------------- | ---------------------- |
| 1    | `digest`, passive, hostile/freeze/order tests      | R1 S1; R6 S10–11       |
| 2    | canonical cross-module fixtures and mismatch tests | R2 S2–3                |
| 3    | compatibility declarations/taxonomy/aggregation    | R3 S4–5                |
| 4    | type/export/firewall/docs/publication gates        | R4 S6–7; R5 S8–9       |

Each seam records RED, GREEN, REFACTOR and line count. Type proofs in `tests/public-contracts.types.ts` assert Type/Encoded/Error/Requirements for generic declarations, outcomes/envelopes, and replay composition without runtime phantom fields. Runtime tests cover all 11 scenarios and hostile proxies/getters/excess keys. `test-coverage` enforces 95% lines/statements/functions and 90% branches on new modules. Evidence targets are `pnpm nx run @effectify/app-builder-contracts:{test,test-coverage,typecheck,lint,build}`.

## Threat Matrix

| Boundary                 | Applicability                            |
| ------------------------ | ---------------------------------------- |
| Documentation-like paths | N/A — no classification/execution logic. |
| Git repository selection | N/A — no Git command integration.        |
| Commit state             | N/A — no commit automation.              |
| Push state               | N/A — no push automation.                |
| PR commands              | N/A — no PR command composition.         |

## Forecast, Migration, and Rollback

Forecast: source 800–900, unit/type/fixture tests 950–1,100, package/config 100–200, docs 180–220; **2,030–2,420**, contingency ceiling **2,900**. Review risk is High; retain the approved feature-branch chain and recount after every seam. At a credible `>3,000`, stop and reforecast through `ask-on-risk`. No migration. Roll back replay, exports, package certification, and release registration together before declarations. Certification evidence is the 11-scenario matrix, coverage, exact exports, Nx package receipts, and line count.

## Open Questions

None.
