import { expect, it } from "@effect/vitest"
import { createHash } from "node:crypto"
import { Buffer } from "node:buffer"
import * as Crypto from "effect/Crypto"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Ref from "effect/Ref"
import * as Result from "effect/Result"
import * as Schema from "effect/Schema"
import * as DurableFileSystem from "../src/durable-file-system.js"
import * as ManagedPath from "../src/managed-path.js"
import * as PersistenceFormat from "../src/persistence-format.js"
import * as Recovery from "../src/recovery.js"
import * as RunStore from "../src/run-store.js"
import { RunLifecycle } from "../src/index.js"
import { makeFakeDurableFileSystem } from "./durable-file-system-fake.js"

const version = { major: 1, minor: 0, patch: 0 }
const runRef = { id: "run:read-only-recovery", version }
const contracts = {
  planRef: { id: "plan:read-only-recovery", version },
  protocolRef: { id: "protocol:read-only-recovery", version },
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

const journalFileName = (revision: number): string => `${String(revision).padStart(20, "0")}.json`

const initialSnapshot = () =>
  Schema.decodeUnknownSync(RunLifecycle.LifecycleSnapshot)({
    _tag: "Draft",
    runRef,
    contracts,
    revision: 0,
    lastSequence: 0,
    history: [],
  })

const transition = () => {
  const snapshot = initialSnapshot()
  const request = Schema.decodeUnknownSync(RunLifecycle.TransitionRequest)({
    _tag: "Validate",
    requestId: "request:read-only-recovery",
    expectedRevision: 0,
    cause: "recover a complete immutable journal",
    facts: [],
    secrets: [],
    contracts,
  })
  const result = success(RunLifecycle.reduce({ snapshot, request, priorResults: [] }))
  return { snapshot: result.snapshot, request, result, evidence: result.evidence }
}

const commitInput = () =>
  Effect.gen(function* () {
    const transitionResult = transition()
    const journal = yield* PersistenceFormat.encodeJournal({
      formatVersion: "effectify-run-store/1",
      canonicalJson: "effectify-cjson/1",
      runRef,
      revision: 1,
      sequence: 1,
      snapshot: transitionResult.snapshot,
      request: transitionResult.request,
      result: transitionResult.result,
      priorResults: [],
      evidence: transitionResult.evidence,
    })
    const snapshot = yield* PersistenceFormat.encodeSnapshot({
      formatVersion: "effectify-run-store/1",
      canonicalJson: "effectify-cjson/1",
      runRef,
      tailDigest: journal.value.payloadDigest,
      lifecycleSnapshot: journal.value.snapshot,
    })
    return { workspace: "/workspace", expectedTail: { revision: 0 }, journal, snapshot }
  })

const withStore =
  (fileSystem: DurableFileSystem.DurableFileSystemService) =>
  <Value, Error, Requirements>(effect: Effect.Effect<Value, Error, Requirements>) =>
    effect.pipe(
      Effect.provideService(DurableFileSystem.Service, fileSystem),
      Effect.provide(RunStore.layer),
      Effect.provide(cryptoLayer),
    )

const recover = (fileSystem: DurableFileSystem.DurableFileSystemService) =>
  Recovery.recover({ workspace: "/workspace", runRef: transition().snapshot.runRef }).pipe(
    Effect.provideService(DurableFileSystem.Service, fileSystem),
    Effect.provide(cryptoLayer),
  )

const journalDirectory = () =>
  success(ManagedPath.runLayout("/workspace", "run:read-only-recovery@1.0.0")).journalDirectory.absolute

const runLayout = () => success(ManagedPath.runLayout("/workspace", "run:read-only-recovery@1.0.0"))

it.effect("replays a complete immutable journal as InputRequired without writing managed state", () =>
  Effect.gen(function* () {
    const fake = yield* makeFakeDurableFileSystem()
    yield* RunStore.commit(yield* commitInput()).pipe(withStore(fake.fileSystem))
    const before = yield* Ref.get(fake.operations)
    const outcome = yield* recover(fake.fileSystem)
    const after = yield* Ref.get(fake.operations)
    const recoveryOperations = after.slice(before.length)

    expect(outcome).toMatchObject({
      _tag: "InputRequired",
      tail: { revision: 1 },
      snapshot: { _tag: "Validated", revision: 1 },
      orphanTemporaries: [],
    })
    expect(recoveryOperations).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^inspect:/),
        expect.stringMatching(/^readDirectory:/),
        expect.stringMatching(/^readFile:/),
      ]),
    )
    expect(
      recoveryOperations.some((operation) => /^(mkdir|create|write|publish|fileSync|directorySync):/.test(operation)),
    ).toBe(false)
  }).pipe(Effect.provide(cryptoLayer)),
)

it("maps lifecycle facts into each closed and non-executable recovery decision", () =>
  Effect.sync(() => {
    const base = transition().snapshot
    const cases = [
      {
        snapshot: { ...base, _tag: "Succeeded" as const },
        expected: { _tag: "Recovered", snapshot: { _tag: "Succeeded" } },
      },
      {
        snapshot: {
          ...base,
          _tag: "RecoverableInterruption" as const,
          safePointEvidence: { safePointId: "safe-point:write", detail: "bytes were persisted" },
        },
        expected: {
          _tag: "ResumeCandidate",
          snapshot: { _tag: "RecoverableInterruption" },
          unmetAuthorities: ["exclusive-run-ownership", "executor-idempotency"],
        },
      },
      { snapshot: base, expected: { _tag: "InputRequired", snapshot: { _tag: "Validated" } } },
      {
        snapshot: { ...base, _tag: "Executing" as const },
        expected: { _tag: "RecoveryBlocked", reason: "UnprovenExecution" },
      },
    ]

    expect(cases).toHaveLength(4)
    for (const testCase of cases) {
      expect(
        Recovery.classifySnapshot(testCase.snapshot, { revision: 1, payloadDigest: "a".repeat(64) }, []),
      ).toMatchObject(testCase.expected)
    }
  }))

it.effect("reports orphan temporary evidence untouched while keeping a valid journal authoritative", () =>
  Effect.gen(function* () {
    const fake = yield* makeFakeDurableFileSystem()
    yield* RunStore.commit(yield* commitInput()).pipe(withStore(fake.fileSystem))
    const directory = journalDirectory()
    const temporary = `${journalFileName(1)}.tmp-orphaned-evidence`
    const fileSystem: DurableFileSystem.DurableFileSystemService = {
      ...fake.fileSystem,
      readDirectory: (path) =>
        path === directory ? Effect.succeed([journalFileName(1), temporary]) : fake.fileSystem.readDirectory(path),
    }
    const seededEntries = yield* fileSystem.readDirectory(directory)
    const before = yield* Ref.get(fake.operations)
    const outcome = yield* recover(fileSystem)
    const operations = (yield* Ref.get(fake.operations)).slice(before.length)

    expect(seededEntries).toEqual([journalFileName(1), temporary])
    expect(outcome).toMatchObject({ _tag: "InputRequired", orphanTemporaries: [temporary] })
    expect(
      operations.some((operation) => /^(mkdir|create|write|publish|fileSync|directorySync):/.test(operation)),
    ).toBe(false)
  }).pipe(Effect.provide(cryptoLayer)),
)

it.effect("ignores a stale snapshot and never lets it override the verified journal tail", () =>
  Effect.gen(function* () {
    const fake = yield* makeFakeDurableFileSystem()
    const input = yield* commitInput()
    yield* RunStore.commit(input).pipe(withStore(fake.fileSystem))
    const staleSnapshot = yield* PersistenceFormat.encodeSnapshot({
      formatVersion: "effectify-run-store/1",
      canonicalJson: "effectify-cjson/1",
      runRef,
      tailDigest: "0".repeat(64),
      lifecycleSnapshot: input.journal.value.snapshot,
    })
    const layout = runLayout()
    const fileSystem: DurableFileSystem.DurableFileSystemService = {
      ...fake.fileSystem,
      readFile: (path) =>
        path === layout.snapshot.absolute ? Effect.succeed(staleSnapshot.bytes) : fake.fileSystem.readFile(path),
    }

    const outcome = yield* recover(fileSystem)

    expect(outcome).toMatchObject({
      _tag: "InputRequired",
      tail: { revision: 1, payloadDigest: input.journal.value.payloadDigest },
      snapshot: { _tag: "Validated", revision: 1 },
    })
  }).pipe(Effect.provide(cryptoLayer)),
)

it.effect("requires every next journal to start from the exact preceding result snapshot and history", () =>
  Effect.gen(function* () {
    const fake = yield* makeFakeDurableFileSystem()
    const firstInput = yield* commitInput()
    yield* RunStore.commit(firstInput).pipe(withStore(fake.fileSystem))
    const preceding = firstInput.journal.value
    const request = Schema.decodeUnknownSync(RunLifecycle.TransitionRequest)({
      _tag: "RequestCancellation",
      requestId: "request:read-only-recovery:cancel",
      expectedRevision: preceding.result.snapshot.revision,
      cause: "prove an exact preceding lifecycle result",
      facts: [],
      secrets: [],
      contracts,
    })
    const result = success(RunLifecycle.reduce({ snapshot: preceding.result.snapshot, request, priorResults: [] }))
    const journal = yield* PersistenceFormat.encodeJournal({
      formatVersion: "effectify-run-store/1",
      canonicalJson: "effectify-cjson/1",
      runRef,
      revision: 2,
      sequence: 2,
      predecessorDigest: preceding.payloadDigest,
      snapshot: result.snapshot,
      request,
      result,
      priorResults: [],
      evidence: result.evidence,
    })
    const snapshot = yield* PersistenceFormat.encodeSnapshot({
      formatVersion: "effectify-run-store/1",
      canonicalJson: "effectify-cjson/1",
      runRef,
      tailDigest: journal.value.payloadDigest,
      lifecycleSnapshot: result.snapshot,
    })
    yield* RunStore.commit({
      workspace: "/workspace",
      expectedTail: { revision: 1, payloadDigest: preceding.payloadDigest },
      journal,
      snapshot,
    }).pipe(withStore(fake.fileSystem))

    const disconnectedRequest = Schema.decodeUnknownSync(RunLifecycle.TransitionRequest)({
      _tag: "Validate",
      requestId: "request:read-only-recovery:disconnected",
      expectedRevision: 0,
      cause: "make a valid but disconnected segment",
      facts: [],
      secrets: [],
      contracts,
    })
    const disconnectedResult = success(
      RunLifecycle.reduce({ snapshot: initialSnapshot(), request: disconnectedRequest, priorResults: [] }),
    )
    const disconnected = yield* PersistenceFormat.encodeJournal({
      formatVersion: "effectify-run-store/1",
      canonicalJson: "effectify-cjson/1",
      runRef,
      revision: 2,
      sequence: 2,
      predecessorDigest: preceding.payloadDigest,
      snapshot: disconnectedResult.snapshot,
      request: disconnectedRequest,
      result: disconnectedResult,
      priorResults: [],
      evidence: disconnectedResult.evidence,
    })
    const secondPath = `${journalDirectory()}/${journalFileName(2)}`
    const disconnectedFileSystem: DurableFileSystem.DurableFileSystemService = {
      ...fake.fileSystem,
      readFile: (path) => (path === secondPath ? Effect.succeed(disconnected.bytes) : fake.fileSystem.readFile(path)),
    }
    const correspondingPrior = yield* PersistenceFormat.encodeJournal({
      ...journal.value,
      priorResults: [
        {
          requestId: preceding.request.requestId,
          normalizedRequest: preceding.request,
          result: preceding.result,
        },
      ],
    })
    const mismatchedPrior = yield* PersistenceFormat.encodeJournal({
      ...journal.value,
      priorResults: [
        {
          requestId: preceding.request.requestId,
          normalizedRequest: { ...preceding.request, cause: "tampered prior request" },
          result: preceding.result,
        },
      ],
    })
    const correspondingFileSystem: DurableFileSystem.DurableFileSystemService = {
      ...fake.fileSystem,
      readFile: (path) =>
        path === secondPath ? Effect.succeed(correspondingPrior.bytes) : fake.fileSystem.readFile(path),
    }
    const mismatchedPriorFileSystem: DurableFileSystem.DurableFileSystemService = {
      ...fake.fileSystem,
      readFile: (path) =>
        path === secondPath ? Effect.succeed(mismatchedPrior.bytes) : fake.fileSystem.readFile(path),
    }

    expect(yield* recover(fake.fileSystem)).toMatchObject({
      _tag: "InputRequired",
      tail: { revision: 2, payloadDigest: journal.value.payloadDigest },
      snapshot: { _tag: "CancellationRequested", revision: 2 },
    })
    expect(yield* recover(disconnectedFileSystem)).toMatchObject({
      _tag: "RecoveryBlocked",
      reason: "PriorResultMismatch",
    })
    expect(yield* recover(correspondingFileSystem)).toMatchObject({ _tag: "InputRequired" })
    expect(yield* recover(mismatchedPriorFileSystem)).toMatchObject({
      _tag: "RecoveryBlocked",
      reason: "PriorResultMismatch",
    })
  }).pipe(Effect.provide(cryptoLayer)),
)

it.effect("blocks every malformed or ambiguous journal set without accepting a valid prefix", () =>
  Effect.gen(function* () {
    const fake = yield* makeFakeDurableFileSystem()
    const input = yield* commitInput()
    yield* RunStore.commit(input).pipe(withStore(fake.fileSystem))
    const directory = journalDirectory()
    const journalPath = `${directory}/${journalFileName(1)}`
    const journalText = Buffer.from(fake.contents.get(journalPath) ?? []).toString("utf8")
    const evidenceMismatch = yield* PersistenceFormat.encodeJournal({
      ...input.journal.value,
      evidence: { ...input.journal.value.evidence, cause: "tampered evidence" },
    })
    const identityMismatch = yield* PersistenceFormat.encodeJournal({
      ...input.journal.value,
      runRef: { ...runRef, id: "run:unexpected-identity" },
    })
    const priorResultMismatch = yield* PersistenceFormat.encodeJournal({
      ...input.journal.value,
      priorResults: [
        {
          requestId: input.journal.value.request.requestId,
          normalizedRequest: input.journal.value.request,
          result: input.journal.value.result,
        },
      ],
    })
    const tamperedDigest = journalText.replace(input.journal.value.payloadDigest, "0".repeat(64))
    const cases: ReadonlyArray<{
      readonly name: string
      readonly entries?: ReadonlyArray<string>
      readonly text?: string
      readonly reason: string
    }> = [
      {
        name: "unknown version",
        text: journalText.replace("effectify-run-store/1", "effectify-run-store/999"),
        reason: "UnsupportedVersion",
      },
      { name: "hostile bytes", text: "{not-json", reason: "MalformedJournal" },
      { name: "gapped revision", entries: [journalFileName(2)], reason: "RevisionGap" },
      { name: "duplicate revision", entries: [journalFileName(1), journalFileName(1)], reason: "DuplicateRevision" },
      { name: "digest mismatch", text: tamperedDigest, reason: "DigestMismatch" },
      { name: "identity mismatch", text: identityMismatch.text, reason: "IdentityMismatch" },
      { name: "evidence mismatch", text: evidenceMismatch.text, reason: "EvidenceMismatch" },
      { name: "prior-result mismatch", text: priorResultMismatch.text, reason: "PriorResultMismatch" },
    ]

    expect(cases).toHaveLength(8)
    for (const testCase of cases) {
      const entries = testCase.entries ?? [journalFileName(1)]
      const fileSystem: DurableFileSystem.DurableFileSystemService = {
        ...fake.fileSystem,
        readDirectory: (path) => (path === directory ? Effect.succeed(entries) : fake.fileSystem.readDirectory(path)),
        readFile: (path) =>
          path === journalPath && testCase.text !== undefined
            ? Effect.succeed(new TextEncoder().encode(testCase.text))
            : fake.fileSystem.readFile(path),
      }
      const outcome = yield* recover(fileSystem)

      expect(outcome).toMatchObject({ _tag: "RecoveryBlocked", reason: testCase.reason })
    }
  }).pipe(Effect.provide(cryptoLayer)),
)
