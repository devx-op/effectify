import * as Result from "effect/Result"
import { type CanonicalJson, canonicalizeJson } from "./canonical-json.js"
import { type EncodedDeclaration, projectDeclaration } from "./tool-declaration-projection.js"
import { type Json, type JsonRecord, normalizeJson } from "./json.js"
import {
  type Baseline,
  type CallbackRecord,
  type ContinuationRecord,
  type PassivePlan,
  type PinnedInput,
  type Provenance,
  type ReplayExpectation,
  type Validation,
  decodeBaseline,
  decodeCallbackRecord,
  decodeContinuationRecord,
  decodePassivePlan,
  decodePinnedInput,
  decodeProvenance,
  decodeReplayExpectation,
  decodeValidation,
} from "./passive-record.js"
import { type DigestRef, type ProtocolRef, decodeDigestRef, decodeProtocolRef } from "./reference.js"
import { MalformedReplayContract, type ReplayFailure, UnsupportedReplayJson } from "./replay-failure.js"

export interface ReplayContract {
  readonly protocolRef: ProtocolRef
  readonly declarations: ReadonlyArray<EncodedDeclaration<unknown, unknown, unknown, unknown>>
  readonly plan: PassivePlan
  readonly pinnedInputs: ReadonlyArray<PinnedInput>
  readonly callbacks: ReadonlyArray<CallbackRecord>
  readonly continuations: ReadonlyArray<ContinuationRecord>
  readonly provenance: Provenance
  readonly baselines: ReadonlyArray<Baseline>
  readonly validations: ReadonlyArray<Validation>
  readonly expectations: ReadonlyArray<ReplayExpectation>
  readonly digestClaims: ReadonlyArray<DigestRef>
}

const replayKeys = [
  "protocolRef",
  "declarations",
  "plan",
  "pinnedInputs",
  "callbacks",
  "continuations",
  "provenance",
  "baselines",
  "validations",
  "expectations",
  "digestClaims",
] as const

const malformed = (): MalformedReplayContract => new MalformedReplayContract()
const unsupported = (): UnsupportedReplayJson => new UnsupportedReplayJson()
const isRecord = (value: Json): value is JsonRecord =>
  !Array.isArray(value) && typeof value === "object" && value !== null
const hasExactKeys = (value: JsonRecord, keys: ReadonlyArray<string>): boolean => {
  const actual = Object.keys(value)
  return actual.length === keys.length && keys.every((key) => Object.hasOwn(value, key))
}

const decodeArray = <Value>(
  value: Json,
  decode: (input: unknown) => Result.Result<Value, unknown>,
): Result.Result<ReadonlyArray<Value>, MalformedReplayContract> => {
  if (!Array.isArray(value)) return Result.fail(malformed())
  const values: Array<Value> = []
  for (const candidate of value) {
    const decoded = decode(candidate)
    if (Result.isFailure(decoded)) return Result.fail(malformed())
    values.push(decoded.success)
  }
  return Result.succeed(Object.freeze(values))
}

const decodeDeclarationArray = (
  value: Json,
): Result.Result<ReadonlyArray<EncodedDeclaration<unknown, unknown, unknown, unknown>>, MalformedReplayContract> => {
  if (!Array.isArray(value)) return Result.fail(malformed())
  const declarations: Array<EncodedDeclaration<unknown, unknown, unknown, unknown>> = []
  for (const candidate of value) {
    const decoded = projectDeclaration<unknown, unknown, unknown, unknown>(candidate)
    if (Result.isFailure(decoded)) return Result.fail(malformed())
    declarations.push(decoded.success)
  }
  return Result.succeed(Object.freeze(declarations))
}

const decodeReplayContractValue = (value: Json): Result.Result<ReplayContract, MalformedReplayContract> => {
  if (!isRecord(value) || !hasExactKeys(value, replayKeys)) return Result.fail(malformed())

  return Result.gen(function* () {
    const protocolRef = yield* decodeProtocolRef(value.protocolRef).pipe(Result.mapError(malformed))
    const declarations = yield* decodeDeclarationArray(value.declarations)
    const plan = yield* decodePassivePlan(value.plan).pipe(Result.mapError(malformed))
    const pinnedInputs = yield* decodeArray(value.pinnedInputs, decodePinnedInput)
    const callbacks = yield* decodeArray(value.callbacks, decodeCallbackRecord)
    const continuations = yield* decodeArray(value.continuations, decodeContinuationRecord)
    const provenance = yield* decodeProvenance(value.provenance).pipe(Result.mapError(malformed))
    const baselines = yield* decodeArray(value.baselines, decodeBaseline)
    const validations = yield* decodeArray(value.validations, decodeValidation)
    const expectations = yield* decodeArray(value.expectations, decodeReplayExpectation)
    const digestClaims = yield* decodeArray(value.digestClaims, decodeDigestRef)
    return Object.freeze({
      protocolRef,
      declarations,
      plan,
      pinnedInputs,
      callbacks,
      continuations,
      provenance,
      baselines,
      validations,
      expectations,
      digestClaims,
    })
  })
}

/** Decodes complete passive replay material without triggering execution or integrity checks. */
export const decodeReplayContract = (input: unknown): Result.Result<ReplayContract, ReplayFailure> =>
  normalizeJson(input).pipe(Result.mapError(unsupported), Result.flatMap(decodeReplayContractValue))

/** Produces canonical replay material; `effectify-cjson/1` owns key order and callers own any digest computation. */
export const projectReplayMaterial = (contract: ReplayContract): Result.Result<CanonicalJson, UnsupportedReplayJson> =>
  canonicalizeJson({ format: "effectify-replay/1", ...contract }).pipe(Result.mapError(unsupported))
