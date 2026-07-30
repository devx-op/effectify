# Proposal: App Builder Protocol Contracts

## Intent

Deliver browser-neutral `@effectify/app-builder-contracts` as the versioned vocabulary for downstream consumers. The parent `app-builder-protocol-contracts` remains a non-applicable roadmap and MUST never be applied.

## Scope

### In Scope

- Preserve versioned identities/envelopes, JSON canonicalization/digests, diagnostics/outcomes, requirement descriptors, typed tool declarations and serialized projection, passive plan/callback/continuation/replay records, exports, and compatibility certification.
- Complete the four unpublished slices through exactly two applicable implementation changes.
- Preserve published history unchanged: identities/envelopes PR #94, JSON canonicalization PR #96, and diagnostics/outcomes PR #98.

### Out of Scope

- CLI, execution, IPC, persistence, filesystem/Nx mutation, approval, recovery, workers, brokers, registries, planners, builders, previews, generators, compatibility solving, or source-ownership enforcement.
- Rewriting, merging, or renaming the three published grandchildren.

## Capabilities

### New Capabilities

- `app-builder-protocol-contracts`: Schema-defined protocol data and pure validation, encoding, compatibility, and canonicalization boundaries.

### Modified Capabilities

None.

## Approach

Retain the schema-first, JSON-safe dual declaration/description model and all existing requirements. Replace only the remaining delivery shape:

| Superseded grandchild                          | Remaining change                            | Internal order                              |
| ---------------------------------------------- | ------------------------------------------- | ------------------------------------------- |
| `app-builder-contract-requirement-descriptors` | `app-builder-contract-declarations`         | 1                                           |
| `app-builder-contract-tool-declarations`       | `app-builder-contract-declarations`         | 2: declarations then projection             |
| `app-builder-contract-passive-records-replay`  | `app-builder-contract-replay-certification` | 1                                           |
| `app-builder-contract-exports-compatibility`   | `app-builder-contract-replay-certification` | 2: exports then compatibility certification |

Dependency sequence is PR #94 → #96 → #98 → declarations → replay certification. No scope is dropped.

## Affected Areas

| Area                                              | Impact   | Description                                              |
| ------------------------------------------------- | -------- | -------------------------------------------------------- |
| `packages/app-builder/contracts`                  | New      | Delivered only by the two remaining applicable changes.  |
| `openspec/changes/app-builder-protocol-contracts` | Modified | Roadmap delivery mapping only; apply remains prohibited. |

## Risks

| Risk                             | Likelihood | Mitigation                                                                                                   |
| -------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------ |
| Larger review units hide defects | Medium     | Maintainer-approved 2,000–3,000 changed-line exception per consolidated PR; `ask-on-risk` again above 3,000. |
| Rollback loses phase granularity | Medium     | Preserve internal dependency order and verification receipts.                                                |

## Rollback Plan

Revert each consolidated PR as one unit. This couples descriptors with declarations/projection and replay records with export/certification rollback; the maintainer explicitly accepts that tradeoff. Published PRs #94, #96, and #98 remain untouched.

## Dependencies

- Approved PE1–2 vocabulary, Effect v4 peer, Nx/package conventions, and the published PR chain.

## Success Criteria

- [ ] Exactly two remaining applicable changes preserve every existing requirement and dependency.
- [ ] Each consolidated PR stays at or below 3,000 changed lines or triggers a new maintainer decision.
- [ ] The package remains browser-neutral, passive, deterministic, and incapable of workspace mutation.
