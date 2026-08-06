# Design: App Builder Run Store and Recovery

## Technical Approach

Add contracts-owned draft validation and execution-owned durable storage. Lifecycle remains the sole transition authority; storage persists and revalidates exact `LifecycleSnapshot`, `TransitionRequest`, `TransitionResult`, `PriorTransitionResult`, and evidence. Dependency direction stays:

```text
contracts <- execution store/recovery <- future lock/executor <- future CLI
```

No reverse imports or execution authority are introduced.

## Architecture Decisions

| Concern         | Choice                                                                                                                                                                                  | Rejected / rationale                                                                         |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Draft ownership | `contracts/src/wizard-draft.ts` owns `DraftId` and `ValidatedWizardDraft` (draft/run/protocol references plus validated passive-plan material); execution accepts only its decoded type | CLI intent/default schemas would violate ownership; opaque JSON would not satisfy validation |
| Authority       | Immutable canonical segment per revision; snapshot is disposable acceleration                                                                                                           | Replaced snapshot loses audit history; SQLite adds migration/concurrency scope               |
| Encoding        | `effectify-run-store/1`, exact version dispatch, existing `effectify-cjson/1`, fixed SHA-256 over the payload excluding digest fields; predecessor equals prior payload digest          | Field inference and host JSON ordering are ambiguous                                         |
| Services        | `Context.Service` + `Layer`; pure format/path/recovery decision functions under `RunStore`, backed by `DurableFileSystem`                                                               | Generic `FileSystem` lacks no-replace publication and directory-sync guarantees              |
| Concurrency     | Tail compare-and-set detects observed conflicts only                                                                                                                                    | Tokens or retries would falsely imply locking                                                |

## Layout and Write Sequence

```text
<workspace>/.effectify/app-builder/v1/
  runs/r1-<base64url(canonical RunRef)>/journal/00000000000000000001.json
  runs/.../snapshot.json
  drafts/d1-<base64url(DraftId)>/draft.json
```

Identifiers are UTF-8/base64url encoded, decoded, schema-validated, and re-encoded before use. Operations walk from the configured root without following links; reject traversal, symlink/non-directory ancestors, device changes, and pre-existing group/world permissions. Create POSIX directories/files as `0700`/`0600`; adapters without equivalent private ACLs, file sync, atomic no-replace publication, or directory sync return `UnsupportedDurability`.

| Crash point                       | Truthful result / recovery fact                           |
| --------------------------------- | --------------------------------------------------------- |
| Before publication                | Failure/interruption; no final segment; temp may remain   |
| Publication before directory sync | `CommitIndeterminate`; recovery scans final names         |
| Journal directory synced          | `Committed`; snapshot may be stale                        |
| Snapshot publication fails        | `Committed(snapshot: "stale")`; journal remains authority |

Commit validates input and authoritative tail, canonicalizes, creates a same-directory exclusive temp, writes completely, syncs file, publishes without replacement, then syncs directory. Snapshot follows the same protocol. Platform errors become closed safe metadata; fiber interruption remains interruption and requires recovery, never assumed success.

## Interfaces / Contracts

```ts
RunStore.commit(input: CommitInput): Effect<CommitReceipt, StoreFailure, DurableFileSystem>
RunStore.read(runRef): Effect<RecoveryOutcome, StoreFailure, DurableFileSystem>
RunStore.cleanupClosed(runRef, expectedTailDigest): Effect<CleanupReceipt, CleanupFailure, DurableFileSystem>

RecoveryOutcome = Recovered | ResumeCandidate | InputRequired | RecoveryBlocked
```

Failures are `Schema.TaggedErrorClass` variants: validation, path policy, conflict, unsupported durability, indeterminate commit, and corrupt/unsupported material. `ResumeCandidate` carries the validated snapshot and unmet `exclusive-run-ownership` and `executor-idempotency` authorities; it has no execute method.

Recovery performs a read-only sorted scan, reports untouched temps, rejects unknown entries/versions, filename mismatch, gaps/duplicates, bad canonical bytes/digests/references, non-monotonic evidence, non-single append, or prior-result mismatch, then ignores snapshots unless tail-identical. Terminal states map to `Recovered`; `RecoverableInterruption` to `ResumeCandidate`; safe nonterminal states to `InputRequired`; unproven `Executing` or any ambiguity to `RecoveryBlocked`.

Explicit cleanup revalidates the complete chain, terminal state, path, and expected tail digest before removal. Nonterminal/invalid/ambiguous state and drafts are retained. Recovery never repairs, salvages, migrates, quarantines, or cleans.

## File Changes

| Files                                                                                                     | Action                                       |
| --------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `contracts/src/{wizard-draft,index}.ts`, contract tests                                                   | Create/modify schema and exports             |
| `execution/src/{managed-path,durable-file-system,persistence-format,run-store,recovery,cleanup,index}.ts` | Create/modify services, formats, and exports |
| `execution/tests/{format,path,run-store,recovery,cleanup,live-capability}*.test.ts`, public tests         | Create/modify strict-TDD suites              |
| `.gitignore`                                                                                              | Ignore `/.effectify/`                        |

## Testing and Traceability

| Requirement      | Components / RED evidence                                                                    |
| ---------------- | -------------------------------------------------------------------------------------------- |
| Draft boundary   | `WizardDraft`; valid/invalid and zero-write tests                                            |
| Isolation        | `ManagedPath`/live adapter; traversal, symlink, device, mode matrix                          |
| Journal/snapshot | `PersistenceFormat`; canonical/digest/version property laws                                  |
| Commit           | `RunStore`; `Ref` operation log plus numbered crash injection at every row above             |
| Recovery/handoff | `Recovery`; corruption mutations, exact lifecycle replay, closed outcome table, no-write law |
| Retention        | `Cleanup`; terminal/tail CAS and preservation guards                                         |

Fakes use Effect `Ref`/`Deferred`, never sleeps. A small live suite proves only advertised capabilities. Run `pnpm nx test @effectify/app-builder-contracts`, `pnpm nx test @effectify/app-builder-execution`, and matching Nx typechecks before affected tests. Structured spans/logs expose operation, safe relative path, revision, digest prefix, stage, and outcome—never payloads, secrets, hashes of secrets, or unchecked causes.

## Threat Matrix

N/A — no route, shell, subprocess, VCS/PR, executable-classification, or process-integration boundary.

## Migration / Rollout

No migration. Version 1 rejects unknown authority; rollback removes exports/ignore rule while preserving bytes. No locking, execution, CLI behavior, repair, salvage, database, or implicit cleanup enters this change.

## Open Questions

None. Requirement-to-component traceability is complete.
