# Proposal: App Builder Protocol Contracts

## Intent

Create browser-neutral `@effectify/app-builder-contracts` as the versioned vocabulary for downstream consumers. This package enables downstream source-ownership guarantees by defining plans, provenance references, baselines, and digests. It does not generate, inspect, or mutate source code.

## Scope

### In Scope
- Versioned JSON envelopes, branded identities, structured diagnostics, and compatibility failures.
- A dual boundary: typed in-process declarations preserve input, output, error, and requirements channels; serializable descriptions expose stable schema identities and JSON-safe schema descriptions.
- Serializable requirements descriptors and tool metadata for class, capabilities, permissions, resumability, idempotency, and version.
- Immutable passive plan, callback, continuation, and replay records, plus versioned canonicalization and digest identities for deterministic comparison.

### Out of Scope
- CLI, execution, IPC, locks, persistence, filesystem access, Nx mutation, approval, and recovery.
- Plugin workers, brokers, registries, planners, builders, previews, generators, compatibility solving, or source ownership enforcement.

## Capabilities

### New Capabilities
- `app-builder-protocol-contracts`: Browser-neutral, schema-defined protocol data and pure validation, encoding, compatibility, and canonicalization boundaries.

### Modified Capabilities
None; no canonical OpenSpec capabilities currently exist.

## Approach

Use schema-first, JSON-safe contracts with separate typed declarations and serialized descriptions. Reject malformed or unsupported versions deterministically; preserve array order while canonicalizing object keys. Design will decide whether descriptions embed or reference derived JSON Schema and whether portable hashing belongs here, while preserving browser neutrality and versioned canonicalization.

## Parent and Downstream Relationship

This dependency-free unit implements only parent `platform-planning-execution` PE1–2 contract foundations. PE3–4 runtime behavior remains downstream. It precedes `app-builder-run-execution-cli` and `app-builder-plugin-sdk-worker`; later children consume it without widening scope. The umbrella remains non-applicable.

## Affected Areas

| Area | Impact | Description |
|---|---|---|
| `packages/app-builder/contracts` | New | Browser-neutral package, schemas, pure helpers, exports, and contract tests. |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Runtime schemas leak into wire data or typed channels flatten | High | Enforce declaration/description separation and channel-preservation checks. |
| Canonicalization or version drift breaks replay identity | High | Version algorithms and compatibility; reject ambiguous JSON values. |
| Review workload exceeds 400 lines | High | Tasks must forecast reviewable work units under `ask-on-risk`; chain strategy remains pending until tasks. |

## Rollback Plan

Remove the isolated package and exports before downstream adoption. No CLI, runtime, persistence, workspace, or user-source state requires migration or recovery.

## Dependencies

- Approved parent PE1–2 vocabulary; Effect v4 as peer; existing Nx/package conventions.

## Success Criteria

- [ ] Consumers exchange versioned JSON contracts while preserving typed success, failure, and requirements channels.
- [ ] Identical supported records canonicalize deterministically; incompatible versions and unsupported values fail explicitly.
- [ ] The package remains browser-neutral, passive, and incapable of source or workspace mutation.
