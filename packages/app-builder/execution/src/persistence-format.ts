import { CanonicalJson, Reference } from "@effectify/app-builder-contracts"
import * as Crypto from "effect/Crypto"
import * as Effect from "effect/Effect"
import * as Result from "effect/Result"
import * as Schema from "effect/Schema"
import * as RunLifecycle from "./lifecycle.js"
import * as TransitionEvidence from "./transition-evidence.js"

export const CurrentFormatVersion = "effectify-run-store/1" as const

export const FormatVersion = Schema.Literals([CurrentFormatVersion])
export type FormatVersion = typeof FormatVersion.Type

export const PayloadDigest = Schema.String.check(Schema.isPattern(/^[a-f0-9]{64}$/)).pipe(
  Schema.brand("AppBuilder.RunStorePayloadDigest"),
)
export type PayloadDigest = typeof PayloadDigest.Type

export class MalformedPersistenceFormat extends Schema.TaggedErrorClass<MalformedPersistenceFormat>()(
  "MalformedPersistenceFormat",
  { reason: Schema.Literals(["canonical", "digest", "journal", "snapshot"]) },
) {}

export class UnsupportedFormatVersion extends Schema.TaggedErrorClass<UnsupportedFormatVersion>()(
  "UnsupportedFormatVersion",
  { version: Schema.String },
) {}

export class PayloadDigestMismatch extends Schema.TaggedErrorClass<PayloadDigestMismatch>()("PayloadDigestMismatch", {
  expected: PayloadDigest,
  actual: PayloadDigest,
}) {}

export type PersistenceFormatFailure = MalformedPersistenceFormat | PayloadDigestMismatch | UnsupportedFormatVersion

const journalPayloadFields = {
  formatVersion: FormatVersion,
  canonicalJson: CanonicalJson.CanonicalJsonAlgorithm,
  runRef: Reference.RunRef,
  revision: TransitionEvidence.Counter,
  sequence: TransitionEvidence.Counter,
  predecessorDigest: Schema.optionalKey(PayloadDigest),
  snapshot: RunLifecycle.LifecycleSnapshot,
  request: RunLifecycle.TransitionRequest,
  result: RunLifecycle.TransitionResult,
  priorResults: Schema.Array(RunLifecycle.PriorTransitionResult),
  evidence: TransitionEvidence.TransitionEvidence,
}

export const JournalPayload = Schema.Struct(journalPayloadFields)
export type JournalPayload = typeof JournalPayload.Type

export const Journal = Schema.Struct({ ...journalPayloadFields, payloadDigest: PayloadDigest })
export type Journal = typeof Journal.Type

const snapshotPayloadFields = {
  formatVersion: FormatVersion,
  canonicalJson: CanonicalJson.CanonicalJsonAlgorithm,
  runRef: Reference.RunRef,
  tailDigest: PayloadDigest,
  lifecycleSnapshot: RunLifecycle.LifecycleSnapshot,
}

export const SnapshotPayload = Schema.Struct(snapshotPayloadFields)
export type SnapshotPayload = typeof SnapshotPayload.Type

export const Snapshot = Schema.Struct({ ...snapshotPayloadFields, payloadDigest: PayloadDigest })
export type Snapshot = typeof Snapshot.Type

export interface Encoded<Value> {
  readonly bytes: Uint8Array
  readonly text: CanonicalJson.CanonicalJsonText
  readonly value: Value
}

const malformed = (reason: MalformedPersistenceFormat["reason"]): MalformedPersistenceFormat =>
  new MalformedPersistenceFormat({ reason })

const toHex = (bytes: Uint8Array): string => Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")

const fromResult = <Value, Failure>(result: Result.Result<Value, Failure>): Effect.Effect<Value, Failure> =>
  Result.match(result, { onFailure: Effect.fail, onSuccess: Effect.succeed })

const canonicalize = (input: unknown): Result.Result<CanonicalJson.CanonicalJson, MalformedPersistenceFormat> =>
  CanonicalJson.canonicalizeJson(input).pipe(Result.mapError(() => malformed("canonical")))

const encode = <Value>(value: Value): Result.Result<Encoded<Value>, MalformedPersistenceFormat> =>
  canonicalize(value).pipe(
    Result.map((canonical) =>
      Object.freeze({ bytes: CanonicalJson.canonicalJsonBytes(canonical), text: canonical.text, value }),
    ),
  )

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const decodeVersion = (
  input: unknown,
  malformedReason: MalformedPersistenceFormat["reason"],
): Result.Result<Readonly<Record<string, unknown>>, PersistenceFormatFailure> => {
  if (!isRecord(input) || typeof input.formatVersion !== "string") return Result.fail(malformed(malformedReason))
  if (input.formatVersion !== CurrentFormatVersion)
    return Result.fail(new UnsupportedFormatVersion({ version: input.formatVersion }))
  return Result.succeed(input)
}

const parseJson = (
  text: string,
  malformedReason: MalformedPersistenceFormat["reason"],
): Result.Result<unknown, MalformedPersistenceFormat> => {
  try {
    return Result.succeed(JSON.parse(text))
  } catch {
    return Result.fail(malformed(malformedReason))
  }
}

const decodeCanonical = <Value>(
  text: string,
  schema: Schema.ConstraintDecoder<Value>,
  malformedReason: MalformedPersistenceFormat["reason"],
): Result.Result<Value, PersistenceFormatFailure> =>
  parseJson(text, malformedReason).pipe(
    Result.flatMap((input) => decodeVersion(input, malformedReason)),
    Result.flatMap((input) =>
      Schema.decodeUnknownResult(schema)(input).pipe(Result.mapError(() => malformed(malformedReason))),
    ),
    Result.flatMap((value) =>
      canonicalize(value).pipe(
        Result.flatMap((canonical) =>
          canonical.text === text ? Result.succeed(value) : Result.fail(malformed(malformedReason)),
        ),
      ),
    ),
  )

/** Hash canonical JSON bytes with the platform-provided SHA-256 implementation. */
export const canonicalPayloadDigest = (
  input: unknown,
): Effect.Effect<PayloadDigest, MalformedPersistenceFormat, Crypto.Crypto> =>
  Effect.gen(function* () {
    const canonical = yield* fromResult(canonicalize(input))
    const crypto = yield* Crypto.Crypto
    const digest = yield* crypto
      .digest("SHA-256", CanonicalJson.canonicalJsonBytes(canonical))
      .pipe(Effect.mapError(() => malformed("digest")))
    return PayloadDigest.make(toHex(digest))
  })

/** Encode the authoritative, versioned journal material and its payload digest. */
export const encodeJournal = (
  input: unknown,
): Effect.Effect<Encoded<Journal>, MalformedPersistenceFormat, Crypto.Crypto> =>
  Effect.gen(function* () {
    const payload = yield* fromResult(
      Schema.decodeUnknownResult(JournalPayload)(input).pipe(Result.mapError(() => malformed("journal"))),
    )
    const payloadDigest = yield* canonicalPayloadDigest(payload)
    return yield* fromResult(encode(Object.freeze({ ...payload, payloadDigest })))
  })

/** Decode canonical journal bytes and reject malformed, unsupported, or non-canonical material. */
export const decodeJournal = (text: string): Result.Result<Journal, PersistenceFormatFailure> =>
  decodeCanonical(text, Journal, "journal")

/** Recompute the canonical payload digest before treating a decoded journal as authoritative. */
export const verifyJournal = (
  journal: Journal,
): Effect.Effect<Journal, MalformedPersistenceFormat | PayloadDigestMismatch, Crypto.Crypto> =>
  Effect.gen(function* () {
    const { payloadDigest: expected, ...payload } = journal
    const actual = yield* canonicalPayloadDigest(payload)
    if (actual !== expected) return yield* Effect.fail(new PayloadDigestMismatch({ expected, actual }))
    return journal
  })

/** Recompute a snapshot digest before accepting it as a durable acceleration record. */
export const verifySnapshot = (
  snapshot: Snapshot,
): Effect.Effect<Snapshot, MalformedPersistenceFormat | PayloadDigestMismatch, Crypto.Crypto> =>
  Effect.gen(function* () {
    const { payloadDigest: expected, ...payload } = snapshot
    const actual = yield* canonicalPayloadDigest(payload)
    if (actual !== expected) return yield* Effect.fail(new PayloadDigestMismatch({ expected, actual }))
    return snapshot
  })

/** Encode a disposable snapshot whose tail is tied to one authoritative journal digest. */
export const encodeSnapshot = (
  input: unknown,
): Effect.Effect<Encoded<Snapshot>, MalformedPersistenceFormat, Crypto.Crypto> =>
  Effect.gen(function* () {
    const payload = yield* fromResult(
      Schema.decodeUnknownResult(SnapshotPayload)(input).pipe(Result.mapError(() => malformed("snapshot"))),
    )
    const payloadDigest = yield* canonicalPayloadDigest(payload)
    return yield* fromResult(encode(Object.freeze({ ...payload, payloadDigest })))
  })

/** Decode canonical snapshot bytes without treating them as journal authority. */
export const decodeSnapshot = (text: string): Result.Result<Snapshot, PersistenceFormatFailure> =>
  decodeCanonical(text, Snapshot, "snapshot")

const sameReference = (left: Reference.RunRef, right: Reference.RunRef): boolean =>
  left.id === right.id &&
  left.version.major === right.version.major &&
  left.version.minor === right.version.minor &&
  left.version.patch === right.version.patch

/** A snapshot is usable only when it names the exact journal tail and resulting lifecycle snapshot. */
export const snapshotMatchesJournal = (snapshot: Snapshot, journal: Journal): boolean =>
  snapshot.tailDigest === journal.payloadDigest &&
  sameReference(snapshot.runRef, journal.runRef) &&
  Result.match(canonicalize(snapshot.lifecycleSnapshot), {
    onFailure: () => false,
    onSuccess: (snapshotCanonical) =>
      Result.match(canonicalize(journal.snapshot), {
        onFailure: () => false,
        onSuccess: (journalCanonical) => snapshotCanonical.text === journalCanonical.text,
      }),
  })
