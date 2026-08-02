import { expect, it } from "@effect/vitest"
import { createHash } from "node:crypto"
import * as Crypto from "effect/Crypto"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Result from "effect/Result"
import * as Schema from "effect/Schema"
import * as PersistenceFormat from "../src/persistence-format.js"
import { RunLifecycle } from "../src/index.js"

const version = { major: 1, minor: 0, patch: 0 }
const runRef = { id: "run:persistence-format", version }
const planRef = { id: "plan:persistence-format", version }
const protocolRef = { id: "protocol:persistence-format", version }
const contracts = { planRef, protocolRef }

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

const transition = () => {
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
    requestId: "request:persistence-format",
    expectedRevision: 0,
    cause: "persist exact lifecycle replay material",
    facts: [{ key: "workspace", value: "clean" }],
    secrets: [{ key: "token", present: true, source: "environment" }],
    contracts,
  })
  const result = success(RunLifecycle.reduce({ snapshot, request, priorResults: [] }))

  return { snapshot: result.snapshot, request, result, evidence: result.evidence }
}

const journalInput = (predecessorDigest?: string) => ({
  formatVersion: "effectify-run-store/1",
  canonicalJson: "effectify-cjson/1",
  runRef,
  revision: 1,
  sequence: 1,
  ...(predecessorDigest === undefined ? {} : { predecessorDigest }),
  ...transition(),
  priorResults: [],
})

it.effect("uses exact versions, canonical bytes, and SHA-256 payload digests", () =>
  Effect.gen(function* () {
    const digest = yield* PersistenceFormat.canonicalPayloadDigest({ b: 2, a: 1 })
    const first = yield* PersistenceFormat.encodeJournal(journalInput())
    const equivalent = yield* PersistenceFormat.encodeJournal(journalInput())

    expect(digest).toBe("43258cff783fe7036d8a43033f830adfc60ec037382473548ac742b888292777")
    expect(first.value.formatVersion).toBe("effectify-run-store/1")
    expect(first.value.canonicalJson).toBe("effectify-cjson/1")
    expect(first.text).toBe(equivalent.text)
    expect(first.value.payloadDigest).toBe(equivalent.value.payloadDigest)
  }).pipe(Effect.provide(cryptoLayer)),
)

it.effect("preserves predecessor and exact lifecycle replay material through canonical decode", () =>
  Effect.gen(function* () {
    const first = yield* PersistenceFormat.encodeJournal(journalInput())
    const chained = yield* PersistenceFormat.encodeJournal(journalInput(first.value.payloadDigest))
    const decoded = success(PersistenceFormat.decodeJournal(chained.text))

    expect(chained.value.predecessorDigest).toBe(first.value.payloadDigest)
    expect(decoded).toMatchObject({
      runRef,
      predecessorDigest: first.value.payloadDigest,
      request: { _tag: "Validate", requestId: "request:persistence-format" },
      result: { _tag: "Applied", snapshot: { revision: 1 } },
      evidence: { requestId: "request:persistence-format", nextRevision: 1 },
    })
    expect(decoded.request).toEqual(chained.value.request)
    expect(decoded.result).toEqual(chained.value.result)
    expect(decoded.evidence).toEqual(chained.value.evidence)
  }).pipe(Effect.provide(cryptoLayer)),
)

it.effect("marks a snapshot stale when its tail no longer exactly matches the journal", () =>
  Effect.gen(function* () {
    const journal = yield* PersistenceFormat.encodeJournal(journalInput())
    const snapshot = yield* PersistenceFormat.encodeSnapshot({
      formatVersion: "effectify-run-store/1",
      canonicalJson: "effectify-cjson/1",
      runRef,
      tailDigest: journal.value.payloadDigest,
      lifecycleSnapshot: journal.value.snapshot,
    })
    const nextJournal = yield* PersistenceFormat.encodeJournal(journalInput(journal.value.payloadDigest))

    expect(PersistenceFormat.snapshotMatchesJournal(snapshot.value, journal.value)).toBe(true)
    expect(PersistenceFormat.snapshotMatchesJournal(snapshot.value, nextJournal.value)).toBe(false)
  }).pipe(Effect.provide(cryptoLayer)),
)

it.effect("excludes untrusted secret values and hashes while rejecting unsupported versions", () =>
  Effect.gen(function* () {
    const untrusted = journalInput()
    const encoded = yield* PersistenceFormat.encodeJournal({
      ...untrusted,
      request: {
        ...untrusted.request,
        secrets: [
          {
            key: "token",
            present: true,
            source: "environment",
            value: "unpersisted-secret",
            hash: "unpersisted-secret-hash",
          },
        ],
      },
    })
    const unsupported = PersistenceFormat.decodeJournal(
      encoded.text.replace("effectify-run-store/1", "effectify-run-store/999"),
    )

    expect(encoded.text).not.toContain("unpersisted-secret")
    expect(encoded.text).not.toContain("unpersisted-secret-hash")
    expect(unsupported).toMatchObject({ _tag: "Failure", failure: { _tag: "UnsupportedFormatVersion" } })
  }).pipe(Effect.provide(cryptoLayer)),
)

it.effect("fails closed when canonical journal bytes carry a mismatched payload digest", () =>
  Effect.gen(function* () {
    const encoded = yield* PersistenceFormat.encodeJournal(journalInput())
    const tampered = JSON.parse(encoded.text)
    tampered.payloadDigest = "0000000000000000000000000000000000000000000000000000000000000000"
    const decoded = success(PersistenceFormat.decodeJournal(JSON.stringify(tampered)))
    const verification = yield* Effect.result(PersistenceFormat.verifyJournal(decoded))

    expect(verification).toMatchObject({ _tag: "Failure", failure: { _tag: "PayloadDigestMismatch" } })
  }).pipe(Effect.provide(cryptoLayer)),
)
