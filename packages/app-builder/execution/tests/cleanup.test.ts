import { expect, it } from "@effect/vitest"
import { createHash } from "node:crypto"
import * as Crypto from "effect/Crypto"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Ref from "effect/Ref"
import * as Result from "effect/Result"
import * as Schema from "effect/Schema"
import * as Cleanup from "../src/cleanup.js"
import * as CleanupFinalization from "../src/cleanup-finalization.js"
import * as DurableFileSystem from "../src/durable-file-system.js"
import * as ManagedPath from "../src/managed-path.js"
import * as Ownership from "../src/ownership.js"
import * as PersistenceFormat from "../src/persistence-format.js"
import * as RunStore from "../src/run-store.js"
import * as WorkspaceLock from "../src/workspace-lock.js"
import { RunLifecycle } from "../src/index.js"
import { makeFakeDurableFileSystem } from "./durable-file-system-fake.js"

const version = { major: 1, minor: 0, patch: 0 }
const runRef = { id: "run:explicit-cleanup", version }
const contracts = {
  planRef: { id: "plan:explicit-cleanup", version },
  protocolRef: { id: "protocol:explicit-cleanup", version },
}

const cryptoLayer = Layer.succeed(
  Crypto.Crypto,
  Crypto.make({
    randomBytes: (size) => new Uint8Array(size),
    digest: (_algorithm, bytes) => Effect.sync(() => new Uint8Array(createHash("sha256").update(bytes).digest())),
  }),
)

const success = <Value>(result: Result.Result<Value, unknown>): Value =>
  Result.match(result, {
    onFailure: (failure) => {
      throw failure
    },
    onSuccess: (value) => value,
  })

const initialSnapshot = () =>
  Schema.decodeUnknownSync(RunLifecycle.LifecycleSnapshot)({
    _tag: "Draft",
    runRef,
    contracts,
    revision: 0,
    lastSequence: 0,
    history: [],
  })

const cancelRequest = (snapshot: RunLifecycle.LifecycleSnapshot) =>
  Schema.decodeUnknownSync(RunLifecycle.TransitionRequest)({
    _tag: "RequestCancellation",
    requestId: `request:cancel:${snapshot.revision}`,
    expectedRevision: snapshot.revision,
    cause: "close this run without workspace execution",
    facts: [],
    secrets: [],
    contracts,
  })

const confirmRequest = (snapshot: RunLifecycle.LifecycleSnapshot) =>
  Schema.decodeUnknownSync(RunLifecycle.TransitionRequest)({
    _tag: "ConfirmCancellation",
    requestId: `request:confirm:${snapshot.revision}`,
    expectedRevision: snapshot.revision,
    cause: "record explicit cancellation confirmation",
    facts: [],
    secrets: [],
    contracts,
    confirmationRef: "confirmation:explicit-cleanup",
  })

const journal = (input: {
  readonly revision: number
  readonly predecessorDigest?: PersistenceFormat.PayloadDigest
  readonly snapshot: RunLifecycle.LifecycleSnapshot
  readonly request: RunLifecycle.TransitionRequest
  readonly result: RunLifecycle.TransitionResult
}) =>
  PersistenceFormat.encodeJournal({
    formatVersion: "effectify-run-store/1",
    canonicalJson: "effectify-cjson/1",
    runRef,
    revision: input.revision,
    sequence: input.revision,
    ...(input.predecessorDigest === undefined ? {} : { predecessorDigest: input.predecessorDigest }),
    snapshot: input.snapshot,
    request: input.request,
    result: input.result,
    priorResults: [],
    evidence: input.result.evidence,
  })

const snapshot = (journalValue: PersistenceFormat.Journal) =>
  PersistenceFormat.encodeSnapshot({
    formatVersion: "effectify-run-store/1",
    canonicalJson: "effectify-cjson/1",
    runRef,
    tailDigest: journalValue.payloadDigest,
    lifecycleSnapshot: journalValue.snapshot,
  })

const withStore =
  (fileSystem: DurableFileSystem.DurableFileSystemService) =>
  <Value, Error, Requirements>(effect: Effect.Effect<Value, Error, Requirements>) =>
    effect.pipe(
      Effect.provideService(DurableFileSystem.Service, fileSystem),
      Effect.provide(RunStore.layer),
      Effect.provide(cryptoLayer),
    )

const cleanup = (fileSystem: DurableFileSystem.DurableFileSystemService, expectedTailDigest: string) => {
  const ownership = Ownership.issueForScope({
    workspace: "/workspace",
    lockPath: WorkspaceLock.workspaceLockPath("/workspace"),
  })
  Ownership.invalidate(ownership)
  return Cleanup.cleanup({
    workspace: "/workspace",
    runRef: initialSnapshot().runRef,
    expectedTailDigest,
    ownership,
  }).pipe(Effect.provideService(DurableFileSystem.Service, fileSystem), Effect.provide(cryptoLayer))
}

const runDirectory = () =>
  success(ManagedPath.runLayout("/workspace", "run:explicit-cleanup@1.0.0")).runDirectory.absolute

const journalDirectory = () =>
  success(ManagedPath.runLayout("/workspace", "run:explicit-cleanup@1.0.0")).journalDirectory.absolute

const commitCancelledRun = () =>
  Effect.gen(function* () {
    const fake = yield* makeFakeDurableFileSystem()
    const ownership = Ownership.issueForScope({
      workspace: "/workspace",
      lockPath: WorkspaceLock.workspaceLockPath("/workspace"),
    })
    const cancellation = success(
      RunLifecycle.reduce({ snapshot: initialSnapshot(), request: cancelRequest(initialSnapshot()), priorResults: [] }),
    )
    const firstJournal = yield* journal({
      revision: 1,
      snapshot: cancellation.snapshot,
      request: cancelRequest(initialSnapshot()),
      result: cancellation,
    })
    const firstSnapshot = yield* snapshot(firstJournal.value)
    yield* RunStore.commit({
      workspace: "/workspace",
      ownership,
      expectedTail: { revision: 0 },
      journal: firstJournal,
      snapshot: firstSnapshot,
    }).pipe(withStore(fake.fileSystem))
    const confirmation = success(
      RunLifecycle.reduce({
        snapshot: cancellation.snapshot,
        request: confirmRequest(cancellation.snapshot),
        priorResults: [],
      }),
    )
    const secondJournal = yield* journal({
      revision: 2,
      predecessorDigest: firstJournal.value.payloadDigest,
      snapshot: confirmation.snapshot,
      request: confirmRequest(cancellation.snapshot),
      result: confirmation,
    })
    const secondSnapshot = yield* snapshot(secondJournal.value)
    yield* RunStore.commit({
      workspace: "/workspace",
      ownership,
      expectedTail: { revision: 1, payloadDigest: firstJournal.value.payloadDigest },
      journal: secondJournal,
      snapshot: secondSnapshot,
    }).pipe(withStore(fake.fileSystem))
    return { fake, tail: secondJournal.value.payloadDigest, cancellation }
  })

it.effect("preserves a terminal run until exclusive deletion authority is available", () =>
  Effect.gen(function* () {
    const { fake, tail } = yield* commitCancelledRun()
    const removals = yield* Ref.make<ReadonlyArray<string>>([])
    const fileSystem: DurableFileSystem.DurableFileSystemService = {
      ...fake.fileSystem,
      removeTree: (path) => Ref.update(removals, (paths) => Object.freeze([...paths, path])),
    }

    const outcome = yield* cleanup(fileSystem, tail)
    const removed = yield* Ref.get(removals)

    expect(outcome).toEqual({ _tag: "CleanupPreserved", reason: "ReleaseRequired" })
    expect(removed).toEqual([])
    expect(removed).not.toContain("/workspace/.effectify/app-builder/v1/drafts/d1-preserved-draft")
  }).pipe(Effect.provide(cryptoLayer)),
)

it.effect("keeps the public cleanup surface non-mutating even with active matching ownership", () =>
  Effect.gen(function* () {
    const { fake, tail } = yield* commitCancelledRun()
    const ownership = Ownership.issueForScope({
      workspace: "/workspace",
      lockPath: WorkspaceLock.workspaceLockPath("/workspace"),
    })
    const outcome = yield* Cleanup.cleanup({
      workspace: "/workspace",
      runRef: initialSnapshot().runRef,
      expectedTailDigest: tail,
      ownership,
    }).pipe(Effect.provideService(DurableFileSystem.Service, fake.fileSystem), Effect.provide(cryptoLayer))

    expect(outcome).toEqual({ _tag: "CleanupPreserved", reason: "ReleaseRequired" })
    expect(yield* fake.fileSystem.inspect(runDirectory())).toMatchObject({ type: "directory" })
  }).pipe(Effect.provide(cryptoLayer)),
)

it.effect("preserves a changed post-release run tree when an opaque ticket is consumed", () =>
  Effect.gen(function* () {
    const { fake, tail } = yield* commitCancelledRun()
    const ownership = Ownership.issueForScope({
      workspace: "/workspace",
      lockPath: WorkspaceLock.workspaceLockPath("/workspace"),
    })
    const ticket = yield* CleanupFinalization.prepare({
      workspace: "/workspace",
      ownership,
      runRef: initialSnapshot().runRef,
      expectedTailDigest: tail,
    }).pipe(Effect.provideService(DurableFileSystem.Service, fake.fileSystem), Effect.provide(cryptoLayer))
    if (ticket._tag === "CleanupPreserved") throw new Error(`Expected ticket, received ${ticket.reason}`)
    const extra = yield* fake.fileSystem.createExclusive(
      `${runDirectory()}/post-release-evidence`,
      DurableFileSystem.PrivateFileMode,
    )
    yield* extra.writeAll(Uint8Array.of(1))
    yield* extra.close
    const outcome = yield* CleanupFinalization.deletePrepared(ticket).pipe(
      Effect.provideService(DurableFileSystem.Service, fake.fileSystem),
    )

    expect(outcome).toEqual({ _tag: "CleanupPreserved", reason: "EvidenceChanged" })
    expect(yield* fake.fileSystem.inspect(runDirectory())).toMatchObject({ type: "directory" })
  }).pipe(Effect.provide(cryptoLayer)),
)

it.effect("fails closed for invalid, failed, and successful ticket consumption", () =>
  Effect.gen(function* () {
    const invalid = yield* CleanupFinalization.deletePrepared({ _tag: "CleanupFinalizationTicket" }).pipe(
      Effect.provideService(DurableFileSystem.Service, (yield* makeFakeDurableFileSystem()).fileSystem),
    )
    const { fake, tail } = yield* commitCancelledRun()
    const ownership = Ownership.issueForScope({
      workspace: "/workspace",
      lockPath: WorkspaceLock.workspaceLockPath("/workspace"),
    })
    const captureFailure = yield* CleanupFinalization.prepare({
      workspace: "/workspace",
      ownership,
      runRef: initialSnapshot().runRef,
      expectedTailDigest: tail,
    }).pipe(
      Effect.provideService(DurableFileSystem.Service, {
        ...fake.fileSystem,
        captureTree: () =>
          Effect.fail(new DurableFileSystem.DurableFileSystemFailure({ operation: "capture", code: "InjectedCrash" })),
      }),
      Effect.provide(cryptoLayer),
    )
    const ticket = yield* CleanupFinalization.prepare({
      workspace: "/workspace",
      ownership,
      runRef: initialSnapshot().runRef,
      expectedTailDigest: tail,
    }).pipe(Effect.provideService(DurableFileSystem.Service, fake.fileSystem), Effect.provide(cryptoLayer))
    if (ticket._tag === "CleanupPreserved") throw new Error(`Expected ticket, received ${ticket.reason}`)
    const cleaned = yield* CleanupFinalization.deletePrepared(ticket).pipe(
      Effect.provideService(DurableFileSystem.Service, fake.fileSystem),
    )

    expect(invalid).toEqual({ _tag: "CleanupPreserved", reason: "InvalidTicket" })
    expect(captureFailure).toEqual({ _tag: "CleanupPreserved", reason: "RemovalFailed" })
    expect(cleaned).toMatchObject({ _tag: "Cleaned", tail: { payloadDigest: tail } })
    expect(yield* fake.fileSystem.inspect(runDirectory())).toBeUndefined()
  }).pipe(Effect.provide(cryptoLayer)),
)

it.effect("retains evidence when preparation loses authority or its terminal tail changes", () =>
  Effect.gen(function* () {
    const { fake, tail } = yield* commitCancelledRun()
    const active = Ownership.issueForScope({
      workspace: "/workspace",
      lockPath: WorkspaceLock.workspaceLockPath("/workspace"),
    })
    const inactive = Ownership.issueForScope({
      workspace: "/workspace",
      lockPath: WorkspaceLock.workspaceLockPath("/workspace"),
    })
    Ownership.invalidate(inactive)
    const prepare = (ownership: Ownership.WorkspaceOwnership, expectedTailDigest: string) =>
      CleanupFinalization.prepare({
        workspace: "/workspace",
        ownership,
        runRef: initialSnapshot().runRef,
        expectedTailDigest,
      }).pipe(Effect.provideService(DurableFileSystem.Service, fake.fileSystem), Effect.provide(cryptoLayer))
    const noAuthority = yield* prepare(inactive, tail)
    const mismatchedTail = yield* prepare(active, "0".repeat(64))

    expect(noAuthority).toEqual({ _tag: "CleanupPreserved", reason: "ExclusiveAuthorityRequired" })
    expect(mismatchedTail).toEqual({ _tag: "CleanupPreserved", reason: "TailMismatch" })
    expect(yield* fake.fileSystem.inspect(runDirectory())).toMatchObject({ type: "directory" })
  }).pipe(Effect.provide(cryptoLayer)),
)

it.effect("preserves terminal evidence that could have been superseded concurrently", () =>
  Effect.gen(function* () {
    const { fake, tail } = yield* commitCancelledRun()
    const newerEvidence = `${runDirectory()}/concurrent-commit-evidence`
    const newerFile = yield* fake.fileSystem.createExclusive(newerEvidence, DurableFileSystem.PrivateFileMode)
    yield* newerFile.writeAll(Uint8Array.of(1))
    yield* newerFile.close

    const outcome = yield* cleanup(fake.fileSystem, tail)
    const operations = yield* Ref.get(fake.operations)

    expect(outcome).toEqual({ _tag: "CleanupPreserved", reason: "ReleaseRequired" })
    expect(fake.contents.has(newerEvidence)).toBe(true)
    expect(operations).not.toContain(`removeTree:${runDirectory()}`)
  }).pipe(Effect.provide(cryptoLayer)),
)

it.effect("preserves drafts and all nonterminal, invalid, ambiguous, or stale-tail evidence", () =>
  Effect.gen(function* () {
    const terminal = yield* commitCancelledRun()
    const nonterminal = yield* makeFakeDurableFileSystem()
    const ownership = Ownership.issueForScope({
      workspace: "/workspace",
      lockPath: WorkspaceLock.workspaceLockPath("/workspace"),
    })
    const initial = initialSnapshot()
    const cancellationRequest = cancelRequest(initial)
    const cancellation = success(
      RunLifecycle.reduce({ snapshot: initial, request: cancellationRequest, priorResults: [] }),
    )
    const pendingJournal = yield* journal({
      revision: 1,
      snapshot: cancellation.snapshot,
      request: cancellationRequest,
      result: cancellation,
    })
    const pendingSnapshot = yield* snapshot(pendingJournal.value)
    yield* RunStore.commit({
      workspace: "/workspace",
      ownership,
      expectedTail: { revision: 0 },
      journal: pendingJournal,
      snapshot: pendingSnapshot,
    }).pipe(withStore(nonterminal.fileSystem))
    const removals = yield* Ref.make<ReadonlyArray<string>>([])
    const removalFileSystem = (
      base: DurableFileSystem.DurableFileSystemService,
    ): DurableFileSystem.DurableFileSystemService => ({
      ...base,
      removeTree: (path) => Ref.update(removals, (paths) => Object.freeze([...paths, path])),
    })
    const ambiguous: DurableFileSystem.DurableFileSystemService = {
      ...terminal.fake.fileSystem,
      removeTree: (path) => Ref.update(removals, (paths) => Object.freeze([...paths, path])),
      readDirectory: (path) =>
        path === journalDirectory()
          ? Effect.succeed(["00000000000000000001.json", "00000000000000000001.json"])
          : terminal.fake.fileSystem.readDirectory(path),
    }
    const cases = [
      cleanup(removalFileSystem(nonterminal.fileSystem), pendingJournal.value.payloadDigest),
      cleanup(ambiguous, terminal.tail),
      cleanup(removalFileSystem(terminal.fake.fileSystem), "0".repeat(64)),
    ]

    expect(cases).toHaveLength(3)
    for (const effect of cases) {
      const outcome = yield* effect
      expect(outcome).toMatchObject({ _tag: "CleanupPreserved" })
    }
    expect(yield* Ref.get(removals)).toEqual([])
  }).pipe(Effect.provide(cryptoLayer)),
)
