# Design: App Builder Contract Identities and Envelope Foundation

## Technical Approach

Create the browser-neutral identity leaf under `packages/app-builder/contracts`. Use Effect v4 constraints before `Schema.brand`, `Schema.Struct` interfaces, `Schema.optionalKey`, `Schema.TaggedErrorClass`, and guarded `Schema.decodeUnknownResult` mapped to `effect/Result`. Dependencies are acyclic:

`IdentityFailure <- Version/Identity <- Reference <- Envelope`.

Modules import leaves directly, never a root/barrel. This grandchild creates no `src/index.ts`, export map, public subpath, publish metadata, or certified root API; `app-builder-contract-exports-compatibility` owns them.

## Architecture Decisions

| Option                                               | Tradeoff                             | Decision and rationale                                                                                      |
| ---------------------------------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| Nine brands/references vs generic `kind` or strings  | Repetition                           | Use domain schemas; nominal separation outweighs convenience.                                               |
| Guarded Result decoders vs throwing/Effectful decode | Wrappers                             | Untrusted APIs return typed `Result`; trusted construction may use schemas.                                 |
| Identity shell vs generic/full envelope              | One later composition module         | Outcomes later add canonical `outcome` with `Schema.fieldsAssign`; no duplicate `status` or reverse import. |
| Caller support data vs built-in table                | No default here                      | Own mechanics only; certification owns the final table and migration guarantees.                            |
| Private entry vs early public exports                | Internal imports until certification | Build from `envelope.ts`; defer public packaging.                                                           |

## Contracts and Data Flow

`VersionComponent` is `Schema.Number.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(0))` branded `AppBuilder.VersionComponent`. `Version` encodes safe `{major,minor,patch}`; `VersionSupport` encodes `{major,supportedMinors}`. APIs are `compareVersions(Version, Version): -1|0|1`, `decodeVersion(unknown)`, and `checkCompatibility(candidate: unknown, support: unknown): Result<Version, MalformedVersion | IncompatibleVersion>`. No default exists.

Identity text matches `^[a-z0-9][a-z0-9._:/-]{0,127}$`. `Protocol|Run|Tool|Plan|Callback|Continuation|Trace|Schema|Digest` each has distinct `DId` schema/type, `DRef` struct/interface, and `decodeDId`/`decodeDRef`. References encode exactly `{id:string,version:{major,minor,patch}}`; staged decoding distinguishes identity from version failures.

`MalformedIdentity { domain }`, `MalformedVersion { source: "candidate"|"support"|"reference" }`, and `IncompatibleVersion { reason: "unsupported-major"|"unsupported-minor" }` are `Schema.TaggedErrorClass` values. Guarded decoders catch both schema defects and hostile property-access defects (including proxy traps and throwing getters) before constructing fresh typed failures that retain neither input nor cause.

`EnvelopeIdentity` encodes `{protocolVersion,runRef,traceRef?,planDigestRef?,outputDigestRef?}`. Optionals use `Schema.optionalKey`, so omitted values encode as absent keys. Both digest fields use `DigestRef`; no algorithm, bytes, hashing, or canonicalization metadata is introduced.

`unknown -> guarded access/decode -> Schema.decodeUnknownResult -> Result`

`EnvelopeIdentity + future Outcome -> fieldsAssign({ outcome }) -> complete envelope`

Future `Outcome` may import references; composition imports both. `envelope.ts` never imports outcome/diagnostic modules, preventing cycles and parallel status.

## File and Dependency Plan

| Files                                                                                                           | Action | Responsibility                                                                         |
| --------------------------------------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------- |
| `src/{version,identity,reference,identity-failure,envelope}.ts`                                                 | Create | Contracts and pure APIs above; no barrel.                                              |
| `tests/{version,identity-reference,envelope,hostile-input,internal-imports}.test.ts`                            | Create | Runtime RED tests, hostile defects, direct internal imports, and neutral import graph. |
| `tests/identity-reference.types.ts`                                                                             | Create | Positive and `@ts-expect-error` nominal proofs.                                        |
| `package.json`, `project.json`, `tsconfig.json`, `tsconfig.lib.json`, `tsconfig.spec.json`, `vitest.config.mts` | Create | Private compile/test scaffold only.                                                    |

`package.json` stays `private:true`, `type:"module"`, without `exports`, entry/type fields, files, or publish configuration. Compile dependencies are `effect: catalog:` and `tslib: catalog:`; dev dependencies are `@effect/vitest`, `@types/node`, `typescript`, and `vitest`. `project.json` runs `@nx/js:tsc` from `src/envelope.ts`. Production TS uses ES2022, `lib:["ES2022"]`, `types:[]`; Node types are test/config-only. Internal-import tests directly import every leaf and reject root/barrel, Node, DOM, runtime, and sibling-payload dependencies.

## Strict TDD, Forecast, and Traceability

| Requirement; scenarios                                                                | RED proof                                             |
| ------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Safe version; **Valid version comparison**, **Invalid or unsupported version**        | ordering, numeric boundaries, major/minor rejection   |
| Nominal references; **Domain reference round trip**, **Cross-domain or malformed ID** | nine round trips and cross-assignments                |
| Deterministic failures; **Hostile invalid input**                                     | primitives, proxies, getters; stable non-echoing tags |
| Envelope seam; **Compose a downstream outcome**, **Optional references**              | composition, no `status`, absent-key encoding         |
| Neutral ownership; **Downstream composition**                                         | direct imports and forbidden-dependency proof         |

RED-GREEN-REFACTOR seams are version/failures, identities/references, then envelope. Per-file forecast: production `Version 30 + IdentityFailure 20 + Identity 34 + Reference 46 + Envelope 12 = 142`; tests `version 24 + identity-reference 40 + envelope 20 + hostile-input 28 + internal-imports 16 + type proofs 20 = 148`; config `package 18 + project 22 + tsconfig 8 + lib 10 + spec 10 + Vitest 12 = 80`. Total: **370 authored lines**, within the approved 300–380 range. At **>=400**, split delivery rather than weaken tests.

Verification commands:

- `pnpm nx test @effectify/app-builder-contracts`
- `pnpm nx typecheck @effectify/app-builder-contracts`
- `pnpm nx lint @effectify/app-builder-contracts`
- `pnpm nx build @effectify/app-builder-contracts`

No integration/E2E runtime applies.

## Threat Matrix, Scope, Risks, Rollback

Threat matrix: N/A—no routing, shell, subprocess, VCS/PR automation, executable classification, or process integration.

Excluded: outcome/diagnostic payloads, JSON/canonicalization, requirement/tool/passive records, digest algorithms, hashing, CLI, IPC, execution, services, persistence, and certification. Risks are Effect drift, brand widening, hostile inspection, and scope creep; focused tests contain them. Reject plain strings, runtime `kind`, full envelopes, default tables, digest metadata, public exports, and throwing/Effectful APIs.

No migration is required. Before sibling adoption, rollback deletes the modules, tests, and private scaffold; no public API needs reversal. After adoption, revert internal consumers first. No state changes. Open questions: none.
