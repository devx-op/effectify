import { expect, it } from "@effect/vitest"
import { createHash } from "node:crypto"
import * as Crypto from "effect/Crypto"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Ref from "effect/Ref"
import * as Result from "effect/Result"
import * as Schema from "effect/Schema"
import * as DurableFileSystem from "../src/durable-file-system.js"
import * as PersistenceFormat from "../src/persistence-format.js"
import * as RunStore from "../src/run-store.js"
import { RunLifecycle } from "../src/index.js"
import { makeFakeDurableFileSystem } from "./durable-file-system-fake.js"

const version = { major: 1, minor: 0, patch: 0 }
const runRef = { id: "run:durable-store", version }
const contracts = {
  planRef: { id: "plan:durable-store", version },
  protocolRef: { id: "protocol:durable-store", version },
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

const transition = (cause = "commit a canonical journal") => {
  const snapshot = Schema.decodeUnknownSync(RunLifecycle.LifecycleSnapshot)({
    _tag: "Draft",
    runRef,
    contracts,
    revision: 0,
    lastSequence: 0,
    history: [],
  })
  const request = Schema.decodeUnknownSync(RunLifecycle.TransitionRequest)({
    _tag: "Validate",
    requestId: "request:durable-store",
    expectedRevision: 0,
    cause,
    facts: [],
    secrets: [],
    contracts,
  })
  const result = success(RunLifecycle.reduce({ snapshot, request, priorResults: [] }))
  return { snapshot: result.snapshot, request, result, evidence: result.evidence }
}

const commitInput = (cause?: string) =>
  Effect.gen(function* () {
    const transitionResult = transition(cause)
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

const decodeEquivalentMalformedUtf8 = (bytes: Uint8Array): Uint8Array => {
  const replacement = bytes.findIndex(
    (byte, index) => byte === 0xef && bytes[index + 1] === 0xbf && bytes[index + 2] === 0xbd,
  )
  if (replacement === -1) throw new Error("Expected canonical replacement character")

  return Uint8Array.from([...bytes.slice(0, replacement), 0xff, ...bytes.slice(replacement + 3)])
}

const withStore =
  (fileSystem: DurableFileSystem.DurableFileSystemService) =>
  <Value, Error, Requirements>(effect: Effect.Effect<Value, Error, Requirements>) =>
    effect.pipe(
      Effect.provideService(DurableFileSystem.Service, fileSystem),
      Effect.provide(RunStore.layer),
      Effect.provide(cryptoLayer),
    )

it.effect("rejects a stale observed tail before a duplicate immutable segment can replace it", () =>
  Effect.gen(function* () {
    const fake = yield* makeFakeDurableFileSystem()
    const input = yield* commitInput()
    const first = yield* RunStore.commit(input).pipe(withStore(fake.fileSystem))
    const conflict = yield* Effect.result(RunStore.commit(input).pipe(withStore(fake.fileSystem)))

    expect(first).toMatchObject({ _tag: "Committed", snapshot: "current", revision: 1 })
    expect(conflict).toMatchObject({ _tag: "Failure", failure: { _tag: "TailConflict", actualRevision: 1 } })
  }).pipe(Effect.provide(cryptoLayer)),
)

it.effect(
  "rejects every externally constructible journal representation that disagrees before filesystem mutation",
  () =>
    Effect.gen(function* () {
      const input = yield* commitInput()
      const differentText = { ...input.journal }
      Reflect.set(differentText, "text", '{"tampered":true}')
      const mismatches = [
        {
          name: "different bytes",
          journal: { ...input.journal, bytes: new TextEncoder().encode('{"tampered":true}') },
        },
        {
          name: "different text",
          journal: differentText,
        },
      ]

      expect(mismatches).toHaveLength(2)
      for (const mismatch of mismatches) {
        const fake = yield* makeFakeDurableFileSystem()
        const outcome = yield* Effect.result(
          RunStore.commit({ ...input, journal: mismatch.journal }).pipe(withStore(fake.fileSystem)),
        )
        const operations = yield* Ref.get(fake.operations)

        expect(outcome).toMatchObject({
          _tag: "Failure",
          failure: { _tag: "MalformedPersistenceFormat", reason: "journal" },
        })
        expect(operations).toEqual([])
      }
    }).pipe(Effect.provide(cryptoLayer)),
)

it.effect("rejects a digest-valid impossible first transition before filesystem mutation", () =>
  Effect.gen(function* () {
    const input = yield* commitInput()
    const initial = Schema.decodeUnknownSync(RunLifecycle.LifecycleSnapshot)({
      _tag: "Draft",
      runRef,
      contracts,
      revision: 0,
      lastSequence: 0,
      history: [],
    })
    const cancellationRequest = Schema.decodeUnknownSync(RunLifecycle.TransitionRequest)({
      _tag: "RequestCancellation",
      requestId: "request:durable-store:cancellation",
      expectedRevision: 0,
      cause: "construct a digest-valid impossible first transition",
      facts: [],
      secrets: [],
      contracts,
    })
    const cancellationResult = success(
      RunLifecycle.reduce({ snapshot: initial, request: cancellationRequest, priorResults: [] }),
    )
    const journal = yield* PersistenceFormat.encodeJournal({
      ...input.journal.value,
      snapshot: cancellationResult.snapshot,
      result: cancellationResult,
      evidence: cancellationResult.evidence,
    })
    const snapshot = yield* PersistenceFormat.encodeSnapshot({
      ...input.snapshot.value,
      tailDigest: journal.value.payloadDigest,
      lifecycleSnapshot: cancellationResult.snapshot,
    })
    const fake = yield* makeFakeDurableFileSystem()
    const outcome = yield* Effect.result(
      RunStore.commit({ ...input, journal, snapshot }).pipe(withStore(fake.fileSystem)),
    )
    const operations = yield* Ref.get(fake.operations)

    expect(outcome).toMatchObject({
      _tag: "Failure",
      failure: { _tag: "CommitValidationFailure", reason: "lifecycle" },
    })
    expect(operations).toEqual([])
  }).pipe(Effect.provide(cryptoLayer)),
)

it.effect("leaves the exclusive temporary journal unacknowledged when publication has not begun", () =>
  Effect.gen(function* () {
    const fake = yield* makeFakeDurableFileSystem({ crashAt: "beforePublish" })
    const outcome = yield* Effect.result(RunStore.commit(yield* commitInput()).pipe(withStore(fake.fileSystem)))
    const operations = yield* Ref.get(fake.operations)

    expect(outcome).toMatchObject({
      _tag: "Failure",
      failure: { _tag: "DurableFileSystemFailure", operation: "publish" },
    })
    expect(operations).toContainEqual(expect.stringMatching(/^fileSync:/))
    expect(operations).not.toContainEqual(expect.stringMatching(/^directorySync:/))
  }).pipe(Effect.provide(cryptoLayer)),
)

it.effect("retries a pre-publication failure with a fresh temporary journal and preserves the orphan", () =>
  Effect.gen(function* () {
    const fake = yield* makeFakeDurableFileSystem()
    let failFirstPublication = true
    const fileSystem: DurableFileSystem.DurableFileSystemService = {
      ...fake.fileSystem,
      publishNoReplace: (temporaryPath, finalPath) => {
        if (failFirstPublication) {
          failFirstPublication = false
          return Effect.fail(
            new DurableFileSystem.DurableFileSystemFailure({ operation: "publish", code: "InjectedCrash" }),
          )
        }
        return fake.fileSystem.publishNoReplace(temporaryPath, finalPath)
      },
    }
    const input = yield* commitInput()
    const first = yield* Effect.result(RunStore.commit(input).pipe(withStore(fileSystem)))
    const second = yield* Effect.result(RunStore.commit(input).pipe(withStore(fileSystem)))
    const operations = yield* Ref.get(fake.operations)
    const temporaryPaths = operations
      .filter((operation) => operation.startsWith("create:") && operation.includes("/journal/"))
      .map((operation) => operation.slice("create:".length))

    expect(first).toMatchObject({
      _tag: "Failure",
      failure: { _tag: "DurableFileSystemFailure", operation: "publish" },
    })
    expect(success(second)).toMatchObject({ _tag: "Committed", revision: 1 })
    expect(temporaryPaths).toHaveLength(2)
    expect(new Set(temporaryPaths)).toHaveLength(2)
    expect(fake.contents.has(temporaryPaths[0]!)).toBe(true)
    expect(fake.contents.has(temporaryPaths[1]!)).toBe(false)
    expect(operations.some((operation) => operation.startsWith("removeTree:"))).toBe(false)
  }).pipe(Effect.provide(cryptoLayer)),
)

it.effect("honors exclusive temporary creation in the deterministic durable fake", () =>
  Effect.gen(function* () {
    const fake = yield* makeFakeDurableFileSystem()
    const path = "/workspace/exclusive-temp"
    const file = yield* fake.fileSystem.createExclusive(path, DurableFileSystem.PrivateFileMode)
    yield* file.close
    const duplicate = yield* Effect.result(fake.fileSystem.createExclusive(path, DurableFileSystem.PrivateFileMode))

    expect(duplicate).toMatchObject({
      _tag: "Failure",
      failure: { _tag: "DurableFileSystemFailure", operation: "createExclusive" },
    })
  }),
)

it.effect("rejects decode-equivalent malformed UTF-8 journal bytes before filesystem mutation", () =>
  Effect.gen(function* () {
    const input = yield* commitInput("commit a canonical journal \uFFFD")
    const bytes = decodeEquivalentMalformedUtf8(input.journal.bytes)
    const journal = { ...input.journal, bytes }
    const fake = yield* makeFakeDurableFileSystem()
    const outcome = yield* Effect.result(RunStore.commit({ ...input, journal }).pipe(withStore(fake.fileSystem)))
    const operations = yield* Ref.get(fake.operations)

    expect(new TextDecoder().decode(bytes)).toBe(journal.text)
    expect(outcome).toMatchObject({
      _tag: "Failure",
      failure: { _tag: "MalformedPersistenceFormat", reason: "journal" },
    })
    expect(operations).toEqual([])
  }).pipe(Effect.provide(cryptoLayer)),
)

it.effect("rejects decode-equivalent malformed UTF-8 snapshot bytes before filesystem mutation", () =>
  Effect.gen(function* () {
    const input = yield* commitInput("commit a canonical journal \uFFFD")
    const bytes = decodeEquivalentMalformedUtf8(input.snapshot.bytes)
    const snapshot = { ...input.snapshot, bytes }
    const fake = yield* makeFakeDurableFileSystem()
    const outcome = yield* Effect.result(RunStore.commit({ ...input, snapshot }).pipe(withStore(fake.fileSystem)))
    const operations = yield* Ref.get(fake.operations)

    expect(new TextDecoder().decode(bytes)).toBe(snapshot.text)
    expect(outcome).toMatchObject({
      _tag: "Failure",
      failure: { _tag: "MalformedPersistenceFormat", reason: "snapshot" },
    })
    expect(operations).toEqual([])
  }).pipe(Effect.provide(cryptoLayer)),
)

it.effect("returns an indeterminate receipt when publication may have occurred before directory sync", () =>
  Effect.gen(function* () {
    const fake = yield* makeFakeDurableFileSystem({ crashAt: "afterPublish" })
    const outcome = yield* Effect.result(RunStore.commit(yield* commitInput()).pipe(withStore(fake.fileSystem)))
    const published = yield* Deferred.await(fake.published)

    expect(outcome).toMatchObject({
      _tag: "Failure",
      failure: { _tag: "CommitIndeterminate", stage: "journalPublication" },
    })
    expect(published).toMatch(/^\/workspace\/\.effectify\/app-builder\/v1\/runs\/r1-/)
  }).pipe(Effect.provide(cryptoLayer)),
)

it.effect("returns an indeterminate receipt after journal publication when its directory sync fails", () =>
  Effect.gen(function* () {
    const fake = yield* makeFakeDurableFileSystem({ crashAt: "journalDirectorySync" })
    const outcome = yield* Effect.result(RunStore.commit(yield* commitInput()).pipe(withStore(fake.fileSystem)))
    const published = yield* Deferred.await(fake.published)

    expect(outcome).toMatchObject({
      _tag: "Failure",
      failure: { _tag: "CommitIndeterminate", stage: "journalDirectorySync" },
    })
    expect(published).toMatch(/\/journal\/00000000000000000001\.json$/)
  }).pipe(Effect.provide(cryptoLayer)),
)

it.effect("keeps the durable journal committed while reporting a stale snapshot when snapshot publication fails", () =>
  Effect.gen(function* () {
    const fake = yield* makeFakeDurableFileSystem({ crashAt: "snapshotPublish" })
    const receipt = yield* RunStore.commit(yield* commitInput()).pipe(withStore(fake.fileSystem))

    expect(receipt).toMatchObject({ _tag: "Committed", snapshot: "stale", revision: 1 })
  }).pipe(Effect.provide(cryptoLayer)),
)

it.effect("publishes the immutable journal before its disposable snapshot without introducing a lock operation", () =>
  Effect.gen(function* () {
    const fake = yield* makeFakeDurableFileSystem()
    const receipt = yield* RunStore.commit(yield* commitInput()).pipe(withStore(fake.fileSystem))
    const operations = yield* Ref.get(fake.operations)
    const journalPublication = operations.findIndex((operation) =>
      /publish:.*\/journal\/00000000000000000001\.json$/.test(operation),
    )
    const snapshotPublication = operations.findIndex((operation) => /publish:.*\/snapshot\.json$/.test(operation))
    const publishedPaths = Array.from(fake.contents.keys())

    expect(receipt).toMatchObject({ _tag: "Committed", snapshot: "current" })
    expect(journalPublication).toBeGreaterThanOrEqual(0)
    expect(snapshotPublication).toBeGreaterThan(journalPublication)
    expect(publishedPaths.filter((path) => path.endsWith(".json"))).toHaveLength(2)
    expect(operations.some((operation) => operation.includes("lock"))).toBe(false)
  }).pipe(Effect.provide(cryptoLayer)),
)
