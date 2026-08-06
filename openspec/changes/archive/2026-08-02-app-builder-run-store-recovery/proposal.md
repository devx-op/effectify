# Proposal: App Builder Run Store and Recovery

## Intent

Add workspace-local, crash-consistent persistence that reconstructs lifecycle state and produces recovery decisions without execution. It bridges lifecycle and later lock/executor and CLI children.

## Product Outcomes

- Interrupted runs retain evidence and yield typed recovery candidates or closed failures.
- Corruption remains inspectable without implicit mutation or repair.
- Contracts own validated wizard drafts; storage remains CLI-agnostic.

## Scope

### In Scope

- Versioned immutable journals, derived snapshots, revision checks, digest chains, and exact replay material.
- Durable commits with restrictive temp creation, complete write, file sync, atomic no-replace rename, and directory sync.
- Read-only validation and `Recovered`, `ResumeCandidate`, `InputRequired`, or `RecoveryBlocked` outcomes.
- Git-ignored workspace state retained until closure, then cleaned up explicitly.
- Strict-TDD crash, corruption, replay, path, permission, and cleanup matrices.

### Non-Goals

- Cross-process locking, stale-owner policy, execution, or workspace/tool mutation.
- CLI prompts, defaults, wizard interaction, or presentation.
- Automatic quarantine, salvage, repair, migration, or cleanup.
- Database adoption without evidence.

## Capabilities

### New Capabilities

- `app-builder-run-store-recovery`: Durable run/draft persistence, validation, recovery-candidate production, retention, and explicit cleanup semantics.

### Modified Capabilities

- None.

## Approach

Use canonical per-revision journals as authority and snapshots only as acceleration. Recovery validates the set and fails closed on malformed, conflicting, gapped, unsupported, or ambiguous material. `DurableFileSystem` must prove file and directory durability or return typed failures. Candidates carry unmet lock/executor authorities and are never executable here.

## Affected Areas

| Area                                    | Impact   | Description                                       |
| --------------------------------------- | -------- | ------------------------------------------------- |
| `packages/app-builder/execution/src/`   | New      | Store, format, filesystem, recovery, and cleanup. |
| `packages/app-builder/contracts/src/`   | Modified | Validated wizard-draft schema.                    |
| `packages/app-builder/execution/tests/` | New      | Deterministic durability and recovery suites.     |
| `.gitignore`                            | Modified | Ignore workspace-local managed state.             |

## Risks

| Risk                                                | Likelihood | Mitigation                                       |
| --------------------------------------------------- | ---------- | ------------------------------------------------ |
| Rename acknowledged without durable directory entry | Medium     | Require directory sync or fail closed.           |
| Recovery mistaken for execution authority           | Medium     | Emit candidates with explicit unmet authorities. |
| Corrupt tails hidden by prefix recovery             | Medium     | Any authoritative ambiguity blocks recovery.     |

## Rollback Plan

Remove additive store/recovery exports and the ignore rule. Preserve state bytes for diagnosis; never rewrite or delete them automatically.

## Dependencies

- Delivered lifecycle contracts and contracts-owned wizard-draft schema.
- Later lock/executor authority for executable resume.

## Success Criteria

- [ ] Every injected crash boundary recovers a specified state without silent data loss.
- [ ] Unsupported durability and corrupt/ambiguous evidence fail closed with safe typed diagnostics.
- [ ] Recovery performs no workspace operation, repair, or implicit cleanup.
- [ ] Explicit cleanup is available only after run closure.

## Unresolved Decisions

None.
