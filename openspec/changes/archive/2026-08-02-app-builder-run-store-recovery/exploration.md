# Exploration: App Builder Run Store and Recovery

> Exploration only. This artifact does not authorize proposal, specification, design, tasks, implementation, or product-code changes.

## Current State

The dependency chain is `@effectify/app-builder-contracts` → archived `app-builder-run-lifecycle` → this child → lock/executor → CLI. The delivered lifecycle package is deliberately pure and in-memory: `RunLifecycle.reduce` alone decides legal transitions, appends immutable evidence, checks revisions, and replays exact caller-provided `PriorTransitionResult` values. It exposes `RecoverableInterruption` only as proven safe-point evidence and explicitly does not persist or resume it.

This child should add durable storage and recovery interpretation without becoming a second state machine or an executor. It owns bytes, schemas, integrity, commit ordering, and reconstruction. It does not own lifecycle legality; cross-process exclusion, stale-owner decisions, workspace/tool mutation, retries, subprocesses, or signals; nor CLI intent/defaulting, prompts, and presentation. Therefore “resume” at this boundary can only mean recovering a validated snapshot plus a typed `ResumeCandidate`/`RecoveryBlocked` decision for a later lock/executor. It cannot execute or mutate the workspace.

The repository has no existing authoritative run store. Current Effect v4 supplies schema decoding, `Context.Service`, named `Effect.fn`, `FileSystem.File.sync`, scoped resource primitives, and deterministic test services. Its generic persistence module is cache-oriented and does not provide the required journal-chain, directory-sync, or recovery semantics. A database is not required.

### Proposed Storage Model

Use immutable, per-revision journal segment files as authority and a replaceable snapshot/index only as a derived acceleration artifact. A conceptual layout is:

```text
<managed-state-root>/
  runs/<encoded-run-id>/
    journal/0000000000000001.json
    journal/0000000000000002.json
    snapshot.json
  drafts/<encoded-draft-id>/...
```

Each journal envelope should carry an exact storage format discriminator/version, run and contract references, revision/sequence, previous-entry digest, canonical payload digest, lifecycle request/result replay material, and the resulting lifecycle snapshot/evidence. Paths derive from validated encoded identifiers, never raw user path fragments.

The durable commit protocol should be explicit and capability-checked:

1. Schema-encode and canonicalize the complete next envelope in memory; compute its digest.
2. Re-read/validate the current authoritative tail and reject revision, predecessor-digest, or request-identity conflicts before writing.
3. Create an exclusive same-directory temporary file with restrictive permissions; write all bytes and sync the file.
4. Atomically rename to the immutable final segment name without replacing an existing segment.
5. Sync the containing directory. If file or directory sync/rename guarantees are unsupported, fail with a typed durability error rather than claim a commit.
6. Rebuild and publish the derived snapshot/index with the same temp → file sync → rename → directory sync protocol. Failure here leaves the journal committed and the snapshot stale, so recovery rebuilds it.

An interruption before the authoritative rename leaves at most an orphan temp. An interruption after rename is resolved by scanning and validating the final segment; callers must not infer commit success from the interrupted fiber alone. Recovery ignores derived snapshots unless they exactly match the journal tail. It reports orphan temps but does not delete or repair them without later exclusive authority.

### Recovery Semantics

Recovery scans immutable segments in revision order and validates filename identity, storage version, schema, canonical digest, predecessor digest, lifecycle identity/contracts, monotonic revision/sequence, one-evidence-append semantics, and persisted prior-result correspondence. The longest complete valid chain is not silently accepted when extra conflicting, malformed, duplicate, or gapped material exists: ambiguity blocks recovery and preserves all evidence.

Typed outcomes should distinguish at least `Recovered`, `ResumeCandidate`, `InputRequired`, and `RecoveryBlocked`. Automatic eligibility requires all facts available at this layer: a valid chain, exact supported format and contract/policy references, a `RecoverableInterruption` safe point, stable operation/request identity, persisted exact replay result, and lifecycle idempotency evidence. Tool-operation idempotency and exclusive ownership are not available until the lock/executor child, so this child MUST NOT claim executable auto-resume; it emits a candidate with unmet authorities for that child to discharge.

Corrupt, truncated, hostile, unsupported-version, digest-mismatched, identity-mismatched, or ambiguous material returns a closed typed failure with safe diagnostic metadata (run reference, relative managed path, revision/segment, operation, reason), never secret bytes or an unchecked cause. Recovery is read-only on failure: no truncation, overwrite, quarantine move, temp cleanup, snapshot replacement, or workspace mutation.

### Versioning and Migration Posture

Persist one explicit top-level format such as `effectify-run-store/1`; do not infer versions from optional fields. Dispatch decoding by exact version before decoding the versioned body. Version 1 should read only version 1 and fail closed on unknown versions. No automatic in-place migration should be assumed: migration changes authoritative evidence and requires a separately specified, crash-consistent operation under exclusive authority. Derived snapshots may be rebuilt without migrating journal authority.

Draft persistence must not invent the future CLI's `CreationIntent`. This child may own a versioned generic draft envelope and storage mechanics only after the proposal defines which validated payload schema owns the draft body and whether drafts share journal-grade durability.

## Affected Areas

- `packages/app-builder/execution/src/lifecycle.ts` — read-only transition authority and persisted snapshot/prior-result schemas to consume, not duplicate.
- `packages/app-builder/execution/src/transition-evidence.ts` — read-only evidence invariants used to validate journal chains.
- `packages/app-builder/execution/src/failure.ts` — lifecycle failures remain distinct; storage/recovery failures should live in their owning modules rather than widen lifecycle semantics.
- `packages/app-builder/execution/src/run-store.ts` — proposed service API for optimistic read/commit and replay lookup; no lock acquisition or execution.
- `packages/app-builder/execution/src/recovery.ts` — proposed read-only reconstruction and typed resume-candidate/block decision table.
- `packages/app-builder/execution/src/persistence-format.ts` — proposed versioned envelope schemas, canonical encoding, digest-chain validation, and migration dispatch.
- `packages/app-builder/execution/src/durable-file-system.ts` — proposed minimal capability seam for exclusive create, complete write, file sync, atomic no-replace rename, directory sync, metadata, and deterministic crash injection.
- `packages/app-builder/execution/src/index.ts` and package metadata — intentional additive namespaces/dependencies only if later phases authorize them.
- `packages/app-builder/execution/tests/` — strict-TDD crash matrix, corruption/version cases, replay laws, recovery decision table, permissions/path tests, and public-surface/type tests.
- `packages/app-builder/contracts/src/{reference,passive-record,replay}.ts` — read-only identities and passive records; storage envelopes reference them without redefining their contracts.

## Boundary and Ownership

| Concern                                                      | Owner                     | This child’s rule                                                                            |
| ------------------------------------------------------------ | ------------------------- | -------------------------------------------------------------------------------------------- |
| Legal transition, evidence append, duplicate semantics       | Delivered lifecycle       | Persist and revalidate exact outputs; never synthesize transitions.                          |
| Durable bytes, revision CAS, integrity chain, reconstruction | Store/recovery            | Owned here.                                                                                  |
| Cross-process writer lock and stale-owner recovery           | Lock/executor             | Excluded; store exposes preconditions/conflicts and later consumes real exclusive authority. |
| Tool/workspace mutation and operation idempotency proof      | Lock/executor             | Excluded; recovery returns a candidate, never runs it.                                       |
| Draft payload, defaults, prompts, flags, output              | CLI                       | Excluded unless a prior stable intent schema is explicitly authorized.                       |
| Schema migration of authoritative history                    | Separate future authority | No implicit migration or repair in v1.                                                       |

Filesystem ownership should be limited to one configured managed-state root. The live adapter should reject traversal, symlink escapes, non-directory ancestors, cross-device rename, permissive fallback, and unsupported durability. Newly created private directories/files should target owner-only permissions (`0700`/`0600`) where the platform supports POSIX modes; portable behavior and pre-existing-path policy need specification. No secret value or hash is persisted—only the lifecycle’s closed secret descriptors.

## Approaches

1. **Immutable segment journal plus derived snapshot** — Commit one canonical, digest-linked file per revision; rebuild replaceable indexes from journal authority.
   - Pros: precise crash boundaries; no torn append parsing; strong audit/replay evidence; snapshot loss is recoverable; easy fault injection.
   - Cons: more files and directory operations; requires retention/compaction policy later; directory sync/no-replace rename need a truthful platform adapter.
   - Effort: Medium

2. **Single atomically replaced snapshot** — Store the complete current snapshot and prior-result index in one replaceable file.
   - Pros: simplest layout and bounded file count.
   - Cons: weak historical evidence; harder conflict/ambiguity diagnosis; recovery cannot prove append history independently; repeated full rewrites grow with lifecycle history.
   - Effort: Low initially, Medium for trustworthy recovery

3. **SQLite with WAL** — Put runs, evidence, and replay records in a transactional local database.
   - Pros: mature transactions, indexed queries, and concurrency primitives.
   - Cons: new native/runtime dependency and migration surface; obscures filesystem evidence; overlaps the later lock boundary; disproportionate for per-workspace sequential run history.
   - Effort: High

## Recommendation

Choose immutable journal segments plus a derived snapshot. It best matches the lifecycle’s append-only evidence and exact replay contract while keeping a database optional. Define `DurableFileSystem` from required guarantees rather than pretending generic `FileSystem` alone promises crash consistency. Keep recovery as validation and decision production; the successor lock/executor must add exclusive authority and prove tool-operation idempotency before executing a candidate.

Strict TDD should start with a table of injected interruption points before/after create, write, file sync, rename, directory sync, and snapshot publication. Each case must prove the exact recoverable state and that malformed/ambiguous material causes no mutation. Add property tests for revision/digest chains and exact persisted lifecycle replay, plus deterministic fakes using Effect services/`Ref`/`Deferred` rather than real sleeps. Live filesystem tests should be a small capability suite run through `pnpm nx test @effectify/app-builder-execution`; broad verification remains `pnpm nx affected --target=test`.

## Risks

- The tracker says this child requires scoped write authority, but the authority-producing cross-process lock is intentionally delivered next. Treating an unforgeable-looking token as a lock would be security theater; the proposal must define the interim API/precondition honestly.
- A successful rename without confirmed directory sync creates an uncertain commit acknowledgement. Recovery can inspect reality, but the write call must return a typed indeterminate/durability failure rather than success.
- “Longest valid prefix” recovery can hide an attacker/corrupt tail or concurrent writer; any extra invalid or conflicting authoritative-looking segment must block rather than truncate silently.
- Lifecycle idempotency proves only bookkeeping replay. Executable resume additionally needs tool-operation idempotency and exclusive ownership from the successor child.
- Draft requirements can pull CLI intent/defaulting into this child unless payload ownership is settled before proposal.
- POSIX permission and directory-sync guarantees differ on Windows and some filesystems; unsupported guarantees must be explicit product behavior, not best-effort claims.

## Open Product Questions for Proposal

1. Is the default managed-state root workspace-local (for example `.effectify/`) or user-state-local, and must users be able to configure it?
2. Must v1 support Windows/network filesystems, or may it fail closed when atomic no-replace rename, file sync, directory sync, or private permissions cannot be guaranteed?
3. What exact validated schema owns wizard draft payloads before the CLI child exists, and do drafts require the same audit-grade journal as lifecycle state?
4. Should corruption recovery be report-only in v1, or is an explicit operator-authorized quarantine/repair workflow required now?
5. What retention/privacy policy applies to terminal run journals and abandoned drafts: indefinite, bounded, or explicit user cleanup only?

## Ready for Proposal

No. The technical direction is viable, but the proposal round must answer the five product questions above—especially state-root ownership, platform durability guarantees, and draft payload ownership—without answering them implicitly in implementation design.
