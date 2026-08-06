import { Buffer } from "node:buffer"
import { randomUUID } from "node:crypto"
import { join, resolve } from "node:path"
import { CanonicalJson } from "@effectify/app-builder-contracts"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Result from "effect/Result"
import * as Schema from "effect/Schema"
import type * as Crypto from "effect/Crypto"
import * as DurableFileSystem from "./durable-file-system.js"
import * as RunLifecycle from "./lifecycle.js"
import * as PersistenceFormat from "./persistence-format.js"
import * as Ownership from "./ownership.js"
import * as WorkspaceLock from "./workspace-lock.js"

export interface ExpectedTail {
  readonly revision: number
  readonly payloadDigest?: PersistenceFormat.PayloadDigest
}

export interface CommitInput {
  readonly workspace: string
  readonly ownership: Ownership.WorkspaceOwnership
  readonly expectedTail: ExpectedTail
  readonly journal: PersistenceFormat.Encoded<PersistenceFormat.Journal>
  readonly snapshot: PersistenceFormat.Encoded<PersistenceFormat.Snapshot>
}

export interface CommitReceipt {
  readonly _tag: "Committed"
  readonly revision: number
  readonly payloadDigest: PersistenceFormat.PayloadDigest
  readonly snapshot: "current" | "stale"
}

export class TailConflict extends Schema.TaggedErrorClass<TailConflict>()("TailConflict", {
  expectedRevision: Schema.Number,
  actualRevision: Schema.Number,
}) {}

export class CommitValidationFailure extends Schema.TaggedErrorClass<CommitValidationFailure>()(
  "CommitValidationFailure",
  { reason: Schema.Literals(["lifecycle", "revision", "predecessor", "snapshot", "journalDirectory"]) },
) {}

export class CommitIndeterminate extends Schema.TaggedErrorClass<CommitIndeterminate>()("CommitIndeterminate", {
  stage: Schema.Literals(["journalPublication", "journalDirectorySync"]),
}) {}

export type StoreFailure =
  | CommitIndeterminate
  | CommitValidationFailure
  | DurableFileSystem.DurableFailure
  | PersistenceFormat.PersistenceFormatFailure
  | TailConflict
  | WorkspaceLock.OwnershipRejected

export interface RunStoreService {
  readonly commit: (
    input: CommitInput,
  ) => Effect.Effect<CommitReceipt, StoreFailure, DurableFileSystem.Service | Crypto.Crypto>
}

export class Service extends Context.Service<Service, RunStoreService>()("@effectify/app-builder-execution/RunStore") {}

const fromResult = <Value, Failure>(result: Result.Result<Value, Failure>): Effect.Effect<Value, Failure> =>
  Result.match(result, { onFailure: Effect.fail, onSuccess: Effect.succeed })

const journalFileName = (revision: number): string => `${String(revision).padStart(20, "0")}.json`

const isTemporaryJournalFileName = (name: string): boolean =>
  /^\d{20}\.json\.tmp-[0-9a-f]{12}(?:-[0-9a-f-]+)?$/.test(name)

const temporaryPath = (path: string, payloadDigest: PersistenceFormat.PayloadDigest): string =>
  `${path}.tmp-${payloadDigest.slice(0, 12)}-${randomUUID()}`

const revisionFromFileName = (name: string): number | undefined => {
  const match = /^(\d{20})\.json$/.exec(name)
  if (!match) return undefined
  const revision = Number(match[1])
  return Number.isSafeInteger(revision) && revision > 0 ? revision : undefined
}

const runIdentifier = (journal: PersistenceFormat.Journal): string =>
  `${journal.runRef.id}@${journal.runRef.version.major}.${journal.runRef.version.minor}.${journal.runRef.version.patch}`

const directorySync = (
  fileSystem: DurableFileSystem.DurableFileSystemService,
  path: string,
): Effect.Effect<void, DurableFileSystem.DurableFileSystemFailure | DurableFileSystem.UnsupportedDurability> =>
  Effect.acquireUseRelease(
    fileSystem.openDirectory(path),
    (directory) => directory.sync,
    (directory) => directory.close,
  )

const writeTemporary = (
  fileSystem: DurableFileSystem.DurableFileSystemService,
  path: string,
  bytes: Uint8Array,
): Effect.Effect<void, DurableFileSystem.DurableFileSystemFailure | DurableFileSystem.UnsupportedDurability> =>
  Effect.acquireUseRelease(
    fileSystem.createExclusive(path, DurableFileSystem.PrivateFileMode),
    (file) => file.writeAll(bytes).pipe(Effect.andThen(file.sync)),
    (file) => file.close,
  )

const readTail = (
  fileSystem: DurableFileSystem.DurableFileSystemService,
  journalDirectory: string,
): Effect.Effect<
  readonly [number, PersistenceFormat.Journal] | undefined,
  StoreFailure,
  import("effect/Crypto").Crypto
> =>
  Effect.gen(function* () {
    const entries = yield* fileSystem.readDirectory(journalDirectory)
    const revisions = entries.flatMap((entry) => {
      if (entry.startsWith(".") || isTemporaryJournalFileName(entry)) return []
      const revision = revisionFromFileName(entry)
      return revision === undefined ? [undefined] : [revision]
    })
    if (revisions.some((revision) => revision === undefined)) {
      return yield* Effect.fail(new CommitValidationFailure({ reason: "journalDirectory" }))
    }
    const validRevisions = revisions.filter((revision): revision is number => revision !== undefined)
    const [tailRevision] = validRevisions.sort((left, right) => right - left)
    if (tailRevision === undefined) return undefined
    const bytes = yield* fileSystem.readFile(join(journalDirectory, journalFileName(tailRevision)))
    const journal = yield* fromResult(PersistenceFormat.decodeJournal(Buffer.from(bytes).toString("utf8")))
    const verified = yield* PersistenceFormat.verifyJournal(journal)
    return [tailRevision, verified] as const
  })

const expectedMatches = (
  expected: ExpectedTail,
  actual: readonly [number, PersistenceFormat.Journal] | undefined,
): boolean =>
  actual === undefined
    ? expected.revision === 0 && expected.payloadDigest === undefined
    : expected.revision === actual[0] && expected.payloadDigest === actual[1].payloadDigest

const sameBytes = (left: Uint8Array, right: Uint8Array): boolean =>
  left.length === right.length && left.every((byte, index) => byte === right[index])

const encodedMatches = (
  encoded: PersistenceFormat.Encoded<unknown>,
  validatedValue: unknown,
  reason: "journal" | "snapshot",
): Result.Result<void, PersistenceFormat.MalformedPersistenceFormat> => {
  if (!(encoded.bytes instanceof Uint8Array) || typeof encoded.text !== "string") {
    return Result.fail(new PersistenceFormat.MalformedPersistenceFormat({ reason }))
  }
  const canonicalValue = CanonicalJson.canonicalizeJson(validatedValue)
  const claimedValue = CanonicalJson.canonicalizeJson(encoded.value)
  if (Result.isFailure(canonicalValue) || Result.isFailure(claimedValue)) {
    return Result.fail(new PersistenceFormat.MalformedPersistenceFormat({ reason }))
  }
  return sameBytes(encoded.bytes, CanonicalJson.canonicalJsonBytes(canonicalValue.success)) &&
    encoded.text === canonicalValue.success.text &&
    claimedValue.success.text === canonicalValue.success.text
    ? Result.succeed(undefined)
    : Result.fail(new PersistenceFormat.MalformedPersistenceFormat({ reason }))
}

const verifiedJournal = (
  encoded: PersistenceFormat.Encoded<PersistenceFormat.Journal>,
): Effect.Effect<PersistenceFormat.Journal, PersistenceFormat.PersistenceFormatFailure, Crypto.Crypto> =>
  Effect.gen(function* () {
    const decoded = yield* fromResult(PersistenceFormat.decodeJournal(encoded.text))
    yield* fromResult(encodedMatches(encoded, decoded, "journal"))
    return yield* PersistenceFormat.verifyJournal(decoded)
  })

const verifiedSnapshot = (
  encoded: PersistenceFormat.Encoded<PersistenceFormat.Snapshot>,
): Effect.Effect<PersistenceFormat.Snapshot, PersistenceFormat.PersistenceFormatFailure, Crypto.Crypto> =>
  Effect.gen(function* () {
    const decoded = yield* fromResult(PersistenceFormat.decodeSnapshot(encoded.text))
    yield* fromResult(encodedMatches(encoded, decoded, "snapshot"))
    return yield* PersistenceFormat.verifySnapshot(decoded)
  })

const sameCanonical = (left: unknown, right: unknown): boolean => {
  const leftCanonical = CanonicalJson.canonicalizeJson(left)
  const rightCanonical = CanonicalJson.canonicalizeJson(right)
  return (
    Result.isSuccess(leftCanonical) &&
    Result.isSuccess(rightCanonical) &&
    leftCanonical.success.text === rightCanonical.success.text
  )
}

const firstJournalCorresponds = (journal: PersistenceFormat.Journal): boolean => {
  if (journal.revision !== 1) return true
  if (journal.priorResults.length !== 0) return false

  const initial: RunLifecycle.LifecycleSnapshot = {
    _tag: "Draft",
    runRef: journal.runRef,
    contracts: journal.request.contracts,
    revision: 0,
    lastSequence: 0,
    history: [],
  }
  const replay = RunLifecycle.reduce({ snapshot: initial, request: journal.request, priorResults: [] })
  return (
    Result.isSuccess(replay) &&
    sameCanonical(replay.success, journal.result) &&
    sameCanonical(replay.success.snapshot, journal.snapshot) &&
    sameCanonical(replay.success.evidence, journal.evidence)
  )
}

const assertOwnership = (input: CommitInput): Effect.Effect<void, WorkspaceLock.OwnershipRejected> => {
  const workspace = resolve(input.workspace)
  return Ownership.isActiveFor(input.ownership, workspace, WorkspaceLock.workspaceLockPath(workspace))
    ? Effect.void
    : Effect.fail(new WorkspaceLock.OwnershipRejected({ reason: "Inactive" }))
}

const commitDurably = Effect.fn("AppBuilder.RunStore.commit")(function* (input: CommitInput) {
  const journal = yield* verifiedJournal(input.journal)
  const snapshot = yield* verifiedSnapshot(input.snapshot)
  if (!firstJournalCorresponds(journal)) {
    return yield* Effect.fail(new CommitValidationFailure({ reason: "lifecycle" }))
  }
  const fileSystem = yield* DurableFileSystem.Service
  const layout = yield* DurableFileSystem.prepareRunJournalDirectory(
    fileSystem,
    input.workspace,
    runIdentifier(journal),
  )
  const tail = yield* readTail(fileSystem, layout.journalDirectory.absolute)
  const actualRevision = tail?.[0] ?? 0
  if (!expectedMatches(input.expectedTail, tail)) {
    return yield* Effect.fail(new TailConflict({ expectedRevision: input.expectedTail.revision, actualRevision }))
  }
  if (journal.revision !== actualRevision + 1) {
    return yield* Effect.fail(new CommitValidationFailure({ reason: "revision" }))
  }
  if (journal.predecessorDigest !== tail?.[1].payloadDigest) {
    return yield* Effect.fail(new CommitValidationFailure({ reason: "predecessor" }))
  }
  if (!PersistenceFormat.snapshotMatchesJournal(snapshot, journal)) {
    return yield* Effect.fail(new CommitValidationFailure({ reason: "snapshot" }))
  }
  const finalJournalPath = join(layout.journalDirectory.absolute, journalFileName(journal.revision))
  const temporaryJournalPath = temporaryPath(finalJournalPath, journal.payloadDigest)
  yield* writeTemporary(fileSystem, temporaryJournalPath, input.journal.bytes)
  const publication = yield* Effect.result(fileSystem.publishNoReplace(temporaryJournalPath, finalJournalPath))
  if (Result.isFailure(publication)) {
    const finalEntry = yield* fileSystem.inspect(finalJournalPath)
    if (finalEntry !== undefined) return yield* Effect.fail(new CommitIndeterminate({ stage: "journalPublication" }))
    return yield* Effect.fail(publication.failure)
  }
  const journalSync = yield* Effect.result(directorySync(fileSystem, layout.journalDirectory.absolute))
  if (Result.isFailure(journalSync)) {
    return yield* Effect.fail(new CommitIndeterminate({ stage: "journalDirectorySync" }))
  }
  const temporarySnapshotPath = temporaryPath(layout.snapshot.absolute, journal.payloadDigest)
  const snapshotWrite = yield* Effect.result(writeTemporary(fileSystem, temporarySnapshotPath, input.snapshot.bytes))
  if (Result.isFailure(snapshotWrite)) {
    return {
      _tag: "Committed",
      revision: journal.revision,
      payloadDigest: journal.payloadDigest,
      snapshot: "stale",
    } as const
  }
  const snapshotPublication = yield* Effect.result(
    fileSystem.publishNoReplace(temporarySnapshotPath, layout.snapshot.absolute),
  )
  if (Result.isFailure(snapshotPublication)) {
    return {
      _tag: "Committed",
      revision: journal.revision,
      payloadDigest: journal.payloadDigest,
      snapshot: "stale",
    } as const
  }
  const snapshotSync = yield* Effect.result(directorySync(fileSystem, layout.runDirectory.absolute))
  return {
    _tag: "Committed",
    revision: journal.revision,
    payloadDigest: journal.payloadDigest,
    snapshot: Result.isSuccess(snapshotSync) ? "current" : "stale",
  } as const
})

const safeCommitAnnotations = (input: CommitInput) =>
  Object.freeze({
    operation: "run-store.commit",
    relativePath: `journal/${journalFileName(input.journal.value.revision)}`,
    revision: input.journal.value.revision,
    digestPrefix: input.journal.value.payloadDigest.slice(0, 12),
  })

const commitEffect = (input: CommitInput) =>
  assertOwnership(input).pipe(
    Effect.andThen(commitDurably(input)),
    Effect.tap((receipt) =>
      Effect.logDebug("run-store commit").pipe(Effect.annotateLogs({ outcome: receipt.snapshot })),
    ),
    Effect.tapError((failure) =>
      Effect.logWarning("run-store commit failed").pipe(
        Effect.annotateLogs({ failure: failure._tag, outcome: "failed" }),
      ),
    ),
    Effect.annotateLogs(safeCommitAnnotations(input)),
    Effect.withLogSpan("AppBuilder.RunStore.commit"),
  )

export const layer = Layer.succeed(Service, Service.of({ commit: commitEffect }))

export const commit = (
  input: CommitInput,
): Effect.Effect<CommitReceipt, StoreFailure, Service | DurableFileSystem.Service | Crypto.Crypto> =>
  Effect.flatMap(Service, (service) => service.commit(input))
