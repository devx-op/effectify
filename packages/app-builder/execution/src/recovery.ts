import { Buffer } from "node:buffer"
import { join } from "node:path"
import { CanonicalJson } from "@effectify/app-builder-contracts"
import * as Effect from "effect/Effect"
import * as Result from "effect/Result"
import type * as Crypto from "effect/Crypto"
import * as DurableFileSystem from "./durable-file-system.js"
import * as ManagedPath from "./managed-path.js"
import * as PersistenceFormat from "./persistence-format.js"
import * as RunLifecycle from "./lifecycle.js"

export interface RecoveryInput {
  readonly workspace: string
  readonly runRef: PersistenceFormat.Journal["runRef"]
}

export interface RecoveryTail {
  readonly revision: number
  readonly payloadDigest: string
}

export type RecoveryBlockReason =
  | "DigestMismatch"
  | "DuplicateRevision"
  | "EvidenceMismatch"
  | "HostilePath"
  | "IdentityMismatch"
  | "MalformedJournal"
  | "MalformedSnapshot"
  | "MissingState"
  | "PriorResultMismatch"
  | "RevisionGap"
  | "UnsupportedDurability"
  | "UnprovenExecution"
  | "UnknownEntry"
  | "UnsupportedVersion"

export interface Recovered {
  readonly _tag: "Recovered"
  readonly snapshot: RunLifecycle.LifecycleSnapshot
  readonly tail: RecoveryTail
  readonly orphanTemporaries: ReadonlyArray<string>
}

export interface ResumeCandidate {
  readonly _tag: "ResumeCandidate"
  readonly snapshot: Extract<RunLifecycle.LifecycleSnapshot, { readonly _tag: "RecoverableInterruption" }>
  readonly tail: RecoveryTail
  readonly orphanTemporaries: ReadonlyArray<string>
  readonly unmetAuthorities: readonly ["exclusive-run-ownership", "executor-idempotency"]
}

export interface InputRequired {
  readonly _tag: "InputRequired"
  readonly snapshot: RunLifecycle.LifecycleSnapshot
  readonly tail: RecoveryTail
  readonly orphanTemporaries: ReadonlyArray<string>
}

export interface RecoveryBlocked {
  readonly _tag: "RecoveryBlocked"
  readonly reason: RecoveryBlockReason
  readonly orphanTemporaries: ReadonlyArray<string>
}

export type RecoveryOutcome = Recovered | ResumeCandidate | InputRequired | RecoveryBlocked

const journalFilePattern = /^(\d{20})\.json$/
const temporaryJournalFilePattern = /^\d{20}\.json\.tmp-[A-Za-z0-9_-]+$/

const sameReference = (
  left: PersistenceFormat.Journal["runRef"],
  right: PersistenceFormat.Journal["runRef"],
): boolean =>
  left.id === right.id &&
  left.version.major === right.version.major &&
  left.version.minor === right.version.minor &&
  left.version.patch === right.version.patch

const sameEvidence = (
  left: PersistenceFormat.Journal["evidence"],
  right: PersistenceFormat.Journal["evidence"],
): boolean =>
  left.sequence === right.sequence &&
  left.previousRevision === right.previousRevision &&
  left.nextRevision === right.nextRevision &&
  left.from === right.from &&
  left.to === right.to &&
  left.cause === right.cause &&
  left.requestId === right.requestId &&
  left.requestTag === right.requestTag &&
  left.outcomeTag === right.outcomeTag &&
  JSON.stringify(left.contracts) === JSON.stringify(right.contracts) &&
  JSON.stringify(left.facts) === JSON.stringify(right.facts) &&
  JSON.stringify(left.secrets) === JSON.stringify(right.secrets)

const sameCanonical = (left: unknown, right: unknown): boolean => {
  const leftCanonical = CanonicalJson.canonicalizeJson(left)
  const rightCanonical = CanonicalJson.canonicalizeJson(right)
  return (
    Result.isSuccess(leftCanonical) &&
    Result.isSuccess(rightCanonical) &&
    leftCanonical.success.text === rightCanonical.success.text
  )
}

const priorResultsCorrespond = (
  journal: PersistenceFormat.Journal,
  preceding: ReadonlyArray<PersistenceFormat.Journal>,
): boolean =>
  journal.priorResults.every(
    (prior) =>
      preceding.filter(
        (segment) =>
          segment.request.requestId === prior.requestId &&
          sameCanonical(segment.request, prior.normalizedRequest) &&
          sameCanonical(segment.result, prior.result),
      ).length === 1,
  )

const extendsPrecedingResult = (journal: PersistenceFormat.Journal, preceding: PersistenceFormat.Journal): boolean => {
  const replay = RunLifecycle.reduce({
    snapshot: preceding.result.snapshot,
    request: journal.request,
    priorResults: journal.priorResults,
  })
  if (Result.isFailure(replay) || !sameCanonical(replay.success, journal.result)) return false
  const previousHistory = preceding.result.snapshot.history
  const nextHistory = journal.result.snapshot.history
  return (
    sameCanonical(journal.snapshot, journal.result.snapshot) &&
    nextHistory.length === previousHistory.length + 1 &&
    sameCanonical(nextHistory.slice(0, -1), previousHistory) &&
    sameCanonical(nextHistory.at(-1), journal.result.evidence)
  )
}

const blocked = (reason: RecoveryBlockReason, orphanTemporaries: ReadonlyArray<string> = []): RecoveryBlocked =>
  Object.freeze({ _tag: "RecoveryBlocked", reason, orphanTemporaries: Object.freeze([...orphanTemporaries]) })

const isBlockedLayout = (value: ManagedPath.RunLayout | RecoveryBlocked): value is RecoveryBlocked => "_tag" in value

const tailOf = (journal: PersistenceFormat.Journal): RecoveryTail =>
  Object.freeze({ revision: journal.revision, payloadDigest: journal.payloadDigest })

/** Classify verified lifecycle facts only; candidates carry no execution capability. */
export const classifySnapshot = (
  snapshot: RunLifecycle.LifecycleSnapshot,
  tail: RecoveryTail,
  orphanTemporaries: ReadonlyArray<string>,
): RecoveryOutcome => {
  const immutableOrphans = Object.freeze([...orphanTemporaries])
  switch (snapshot._tag) {
    case "Succeeded":
    case "Failed":
    case "Cancelled":
      return Object.freeze({ _tag: "Recovered", snapshot, tail, orphanTemporaries: immutableOrphans })
    case "RecoverableInterruption":
      return Object.freeze({
        _tag: "ResumeCandidate",
        snapshot,
        tail,
        orphanTemporaries: immutableOrphans,
        unmetAuthorities: Object.freeze(["exclusive-run-ownership", "executor-idempotency"] as const),
      })
    case "Executing":
      return blocked("UnprovenExecution", immutableOrphans)
    default:
      return Object.freeze({ _tag: "InputRequired", snapshot, tail, orphanTemporaries: immutableOrphans })
  }
}

const privateDirectory = (
  fileSystem: DurableFileSystem.DurableFileSystemService,
  path: string,
  device: number,
): Effect.Effect<boolean, never> =>
  fileSystem.inspect(path).pipe(
    Effect.result,
    Effect.map((inspection) => {
      if (Result.isFailure(inspection) || inspection.success === undefined) return false
      return Result.isSuccess(ManagedPath.assertPrivateDirectory(inspection.success, device))
    }),
  )

const privateFile = (
  fileSystem: DurableFileSystem.DurableFileSystemService,
  path: string,
  device: number,
): Effect.Effect<boolean, never> =>
  fileSystem.inspect(path).pipe(
    Effect.result,
    Effect.map((inspection) => {
      if (Result.isFailure(inspection) || inspection.success === undefined) return false
      return Result.isSuccess(ManagedPath.assertPrivateFile(inspection.success, device))
    }),
  )

const blockForFormatFailure = (failure: PersistenceFormat.PersistenceFormatFailure): RecoveryBlocked =>
  blocked(failure._tag === "UnsupportedFormatVersion" ? "UnsupportedVersion" : "MalformedJournal")

const verifySnapshot = (snapshot: PersistenceFormat.Snapshot): Effect.Effect<boolean, never, Crypto.Crypto> =>
  Effect.gen(function* () {
    const { payloadDigest, ...payload } = snapshot
    const digest = yield* Effect.result(PersistenceFormat.canonicalPayloadDigest(payload))
    return Result.isSuccess(digest) && digest.success === payloadDigest
  })

const readExistingRunLayout = (
  fileSystem: DurableFileSystem.DurableFileSystemService,
  input: RecoveryInput,
): Effect.Effect<ManagedPath.RunLayout | RecoveryBlocked, never> =>
  Effect.gen(function* () {
    const runIdentifier = `${input.runRef.id}@${input.runRef.version.major}.${input.runRef.version.minor}.${input.runRef.version.patch}`
    const layoutResult = ManagedPath.runLayout(input.workspace, runIdentifier)
    if (Result.isFailure(layoutResult)) return blocked("HostilePath")
    const layout = layoutResult.success
    const workspace = yield* fileSystem.inspect(layout.workspace).pipe(Effect.result)
    if (Result.isFailure(workspace) || workspace.success === undefined || workspace.success.type !== "directory") {
      return blocked("MissingState")
    }
    const directories = [
      join(layout.workspace, ".effectify"),
      join(layout.workspace, ".effectify", "app-builder"),
      layout.root,
      join(layout.root, "runs"),
      layout.runDirectory.absolute,
      layout.journalDirectory.absolute,
    ]
    for (const directory of directories) {
      if (!(yield* privateDirectory(fileSystem, directory, workspace.success.device))) return blocked("HostilePath")
    }
    return layout
  })

const replayMatches = (journal: PersistenceFormat.Journal): boolean => {
  const historyEvidence = journal.snapshot.history.at(-1)
  if (
    historyEvidence === undefined ||
    !sameEvidence(journal.evidence, historyEvidence) ||
    !sameEvidence(journal.evidence, journal.result.evidence)
  ) {
    return false
  }
  const self = {
    requestId: journal.request.requestId,
    normalizedRequest: journal.request,
    result: journal.result,
  }
  return Result.isSuccess(
    RunLifecycle.reduce({
      snapshot: journal.snapshot,
      request: journal.request,
      priorResults: [...journal.priorResults, self],
    }),
  )
}

type SnapshotValidation = "current" | "ignored"

/** Validate a derived snapshot but never derive recovery authority from it. */
const validateSnapshotAcceleration = (
  fileSystem: DurableFileSystem.DurableFileSystemService,
  layout: ManagedPath.RunLayout,
  tail: PersistenceFormat.Journal,
  device: number,
): Effect.Effect<RecoveryBlocked | SnapshotValidation, never, Crypto.Crypto> =>
  Effect.gen(function* () {
    const inspection = yield* fileSystem.inspect(layout.snapshot.absolute).pipe(Effect.result)
    if (Result.isFailure(inspection) || inspection.success === undefined) return "ignored"
    if (!(yield* privateFile(fileSystem, layout.snapshot.absolute, device))) return blocked("HostilePath")
    const bytes = yield* fileSystem.readFile(layout.snapshot.absolute).pipe(Effect.result)
    if (Result.isFailure(bytes)) return blocked("MalformedSnapshot")
    const decoded = PersistenceFormat.decodeSnapshot(Buffer.from(bytes.success).toString("utf8"))
    if (Result.isFailure(decoded)) {
      return blocked(decoded.failure._tag === "UnsupportedFormatVersion" ? "UnsupportedVersion" : "MalformedSnapshot")
    }
    if (!(yield* verifySnapshot(decoded.success))) return blocked("DigestMismatch")
    return PersistenceFormat.snapshotMatchesJournal(decoded.success, tail) ? "current" : "ignored"
  })

/** Read and validate the whole immutable journal set without creating, altering, or removing managed state. */
export const recover = Effect.fn("AppBuilder.Recovery.recover")(function* (input: RecoveryInput) {
  const fileSystem = yield* DurableFileSystem.Service
  const durability = yield* Effect.result(DurableFileSystem.requireCapabilities(fileSystem))
  if (Result.isFailure(durability)) return blocked("UnsupportedDurability")
  const layout = yield* readExistingRunLayout(fileSystem, input)
  if (isBlockedLayout(layout)) return layout

  const workspace = yield* fileSystem.inspect(layout.workspace).pipe(Effect.result)
  if (Result.isFailure(workspace) || workspace.success === undefined) return blocked("MissingState")
  const entriesResult = yield* fileSystem.readDirectory(layout.journalDirectory.absolute).pipe(Effect.result)
  if (Result.isFailure(entriesResult)) return blocked("HostilePath")
  const entries = entriesResult.success
  const orphanTemporaries = entries.filter((entry) => temporaryJournalFilePattern.test(entry))
  const journalNames = entries.filter((entry) => !temporaryJournalFilePattern.test(entry))
  if (journalNames.some((entry) => !journalFilePattern.test(entry))) return blocked("UnknownEntry", orphanTemporaries)
  if (new Set(journalNames).size !== journalNames.length) return blocked("DuplicateRevision", orphanTemporaries)

  const orderedNames = [...journalNames].sort()
  if (orderedNames.length === 0) return blocked("MissingState", orphanTemporaries)
  let predecessorDigest: PersistenceFormat.PayloadDigest | undefined
  let tail: PersistenceFormat.Journal | undefined
  const preceding: Array<PersistenceFormat.Journal> = []

  for (const [index, name] of orderedNames.entries()) {
    const revision = Number(journalFilePattern.exec(name)?.[1])
    if (revision !== index + 1) return blocked("RevisionGap", orphanTemporaries)
    const path = join(layout.journalDirectory.absolute, name)
    if (!(yield* privateFile(fileSystem, path, workspace.success.device)))
      return blocked("HostilePath", orphanTemporaries)
    const bytes = yield* fileSystem.readFile(path).pipe(Effect.result)
    if (Result.isFailure(bytes)) return blocked("MalformedJournal", orphanTemporaries)
    const decoded = PersistenceFormat.decodeJournal(Buffer.from(bytes.success).toString("utf8"))
    if (Result.isFailure(decoded)) return blockForFormatFailure(decoded.failure)
    const journal = decoded.success
    const verified = yield* Effect.result(PersistenceFormat.verifyJournal(journal))
    if (Result.isFailure(verified)) return blocked("DigestMismatch", orphanTemporaries)
    if (
      !sameReference(journal.runRef, input.runRef) ||
      journal.revision !== revision ||
      journal.sequence !== revision ||
      journal.predecessorDigest !== predecessorDigest
    ) {
      return blocked("IdentityMismatch", orphanTemporaries)
    }
    if (
      journal.priorResults.some(
        (prior) =>
          prior.requestId !== prior.normalizedRequest.requestId ||
          prior.requestId !== prior.result.evidence.requestId ||
          prior.requestId === journal.request.requestId,
      )
    ) {
      return blocked("PriorResultMismatch", orphanTemporaries)
    }
    const previous = preceding.at(-1)
    if (
      (previous !== undefined && !extendsPrecedingResult(journal, previous)) ||
      !priorResultsCorrespond(journal, preceding)
    ) {
      return blocked("PriorResultMismatch", orphanTemporaries)
    }
    if (!replayMatches(journal)) return blocked("EvidenceMismatch", orphanTemporaries)
    predecessorDigest = journal.payloadDigest
    tail = journal
    preceding.push(journal)
  }

  if (tail === undefined) return blocked("MissingState", orphanTemporaries)
  const snapshotValidation = yield* validateSnapshotAcceleration(fileSystem, layout, tail, workspace.success.device)
  if (typeof snapshotValidation !== "string") return snapshotValidation
  // A snapshot can accelerate a future read only; journal tail validation remains the complete authority here.
  return classifySnapshot(tail.snapshot, tailOf(tail), orphanTemporaries)
})
