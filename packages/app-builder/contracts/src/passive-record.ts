import * as Result from "effect/Result"
import { type Json, type JsonRecord, normalizeJson } from "./json.js"
import {
  type DigestRef,
  type PlanRef,
  type RunRef,
  type SchemaRef,
  type TraceRef,
  type CallbackRef,
  type ContinuationRef,
  type ToolRef,
  decodeCallbackRef,
  decodeContinuationRef,
  decodeDigestRef,
  decodePlanRef,
  decodeRunRef,
  decodeSchemaRef,
  decodeToolRef,
  decodeTraceRef,
} from "./reference.js"

export interface PinnedInput {
  readonly inputKey: string
  readonly schemaRef: SchemaRef
  readonly value: Json
  readonly digestRef?: DigestRef
}

export interface CallbackRecord {
  readonly callbackRef: CallbackRef
  readonly responseSchemaRef: SchemaRef
}

export interface ContinuationRecord {
  readonly continuationRef: ContinuationRef
  readonly responseSchemaRef: SchemaRef
}

export interface ToolStep {
  readonly _tag: "ToolStep"
  readonly stepKey: string
  readonly toolRef: ToolRef
  readonly pinnedInputs: ReadonlyArray<PinnedInput>
}

export interface CallbackStep {
  readonly _tag: "CallbackStep"
  readonly stepKey: string
  readonly callback: CallbackRecord
}

export interface ContinuationStep {
  readonly _tag: "ContinuationStep"
  readonly stepKey: string
  readonly continuation: ContinuationRecord
}

export type PassiveStep = ToolStep | CallbackStep | ContinuationStep

export interface PassivePlan {
  readonly planRef: PlanRef
  readonly steps: ReadonlyArray<PassiveStep>
}

export interface Provenance {
  readonly runRef: RunRef
  readonly traceRef?: TraceRef
}

export interface Baseline {
  readonly planRef: PlanRef
  readonly materialDigestRef?: DigestRef
}

export interface AcceptedValidation {
  readonly _tag: "Accepted"
  readonly validationKey: string
}

export interface RejectedValidation {
  readonly _tag: "Rejected"
  readonly validationKey: string
}

export type Validation = AcceptedValidation | RejectedValidation

export interface EquivalentReplayExpectation {
  readonly _tag: "Equivalent"
  readonly expectationKey: string
}

export interface DifferentReplayExpectation {
  readonly _tag: "Different"
  readonly expectationKey: string
}

export type ReplayExpectation = EquivalentReplayExpectation | DifferentReplayExpectation

export class UnsupportedPassiveJson {
  readonly _tag = "UnsupportedPassiveJson" as const
  constructor(readonly reason: "hostile-input" | "unsupported-value") {}
}

export class MalformedPassiveRecord {
  readonly _tag = "MalformedPassiveRecord" as const
}

export type PassiveRecordFailure = UnsupportedPassiveJson | MalformedPassiveRecord

const isRecord = (value: Json): value is JsonRecord =>
  !Array.isArray(value) && typeof value === "object" && value !== null

const hasExactKeys = (value: JsonRecord, keys: ReadonlyArray<string>): boolean => {
  const actual = Object.keys(value)
  return actual.length === keys.length && keys.every((key) => Object.hasOwn(value, key))
}

const hasKeys = (value: JsonRecord, required: ReadonlyArray<string>, optional: ReadonlyArray<string>): boolean => {
  const actual = Object.keys(value)
  return (
    required.every((key) => Object.hasOwn(value, key)) &&
    actual.every((key) => required.includes(key) || optional.includes(key))
  )
}

const malformed = (): MalformedPassiveRecord => new MalformedPassiveRecord()
const unsupported = (): UnsupportedPassiveJson => new UnsupportedPassiveJson("hostile-input")
const nonEmptyString = (value: Json): Result.Result<string, MalformedPassiveRecord> =>
  typeof value === "string" && value.length > 0 ? Result.succeed(value) : Result.fail(malformed())

const decodePinnedInputValue = (value: Json): Result.Result<PinnedInput, PassiveRecordFailure> => {
  if (!isRecord(value) || !hasKeys(value, ["inputKey", "schemaRef", "value"], ["digestRef"]))
    return Result.fail(malformed())

  return Result.gen(function* () {
    const inputKey = yield* nonEmptyString(value.inputKey)
    const schemaRef = yield* decodeSchemaRef(value.schemaRef).pipe(Result.mapError(malformed))
    const digestRef = Object.hasOwn(value, "digestRef")
      ? yield* decodeDigestRef(value.digestRef).pipe(Result.mapError(malformed))
      : undefined
    return Object.freeze(
      digestRef === undefined
        ? { inputKey, schemaRef, value: value.value }
        : { inputKey, schemaRef, value: value.value, digestRef },
    )
  })
}

const decodeCallbackRecordValue = (value: Json): Result.Result<CallbackRecord, PassiveRecordFailure> => {
  if (!isRecord(value) || !hasExactKeys(value, ["callbackRef", "responseSchemaRef"])) return Result.fail(malformed())
  return Result.all({
    callbackRef: decodeCallbackRef(value.callbackRef).pipe(Result.mapError(malformed)),
    responseSchemaRef: decodeSchemaRef(value.responseSchemaRef).pipe(Result.mapError(malformed)),
  }).pipe(Result.map((record) => Object.freeze(record)))
}

const decodeContinuationRecordValue = (value: Json): Result.Result<ContinuationRecord, PassiveRecordFailure> => {
  if (!isRecord(value) || !hasExactKeys(value, ["continuationRef", "responseSchemaRef"]))
    return Result.fail(malformed())
  return Result.all({
    continuationRef: decodeContinuationRef(value.continuationRef).pipe(Result.mapError(malformed)),
    responseSchemaRef: decodeSchemaRef(value.responseSchemaRef).pipe(Result.mapError(malformed)),
  }).pipe(Result.map((record) => Object.freeze(record)))
}

const decodeStep = (value: Json): Result.Result<PassiveStep, PassiveRecordFailure> => {
  if (
    !isRecord(value) ||
    typeof value._tag !== "string" ||
    typeof value.stepKey !== "string" ||
    value.stepKey.length === 0
  ) {
    return Result.fail(malformed())
  }
  const stepKey = value.stepKey

  switch (value._tag) {
    case "ToolStep": {
      const pinnedInputValues = value.pinnedInputs
      if (!hasExactKeys(value, ["_tag", "stepKey", "toolRef", "pinnedInputs"]) || !Array.isArray(pinnedInputValues)) {
        return Result.fail(malformed())
      }
      return Result.gen(function* () {
        const toolRef = yield* decodeToolRef(value.toolRef).pipe(Result.mapError(malformed))
        const pinnedInputs: Array<PinnedInput> = []
        for (const input of pinnedInputValues) pinnedInputs.push(yield* decodePinnedInputValue(input))
        return Object.freeze({ _tag: "ToolStep" as const, stepKey, toolRef, pinnedInputs: Object.freeze(pinnedInputs) })
      })
    }
    case "CallbackStep":
      if (!hasExactKeys(value, ["_tag", "stepKey", "callback"])) return Result.fail(malformed())
      return decodeCallbackRecordValue(value.callback).pipe(
        Result.map((callback) => Object.freeze({ _tag: "CallbackStep" as const, stepKey, callback })),
      )
    case "ContinuationStep":
      if (!hasExactKeys(value, ["_tag", "stepKey", "continuation"])) return Result.fail(malformed())
      return decodeContinuationRecordValue(value.continuation).pipe(
        Result.map((continuation) => Object.freeze({ _tag: "ContinuationStep" as const, stepKey, continuation })),
      )
    default:
      return Result.fail(malformed())
  }
}

const decodePassivePlanValue = (value: Json): Result.Result<PassivePlan, PassiveRecordFailure> => {
  if (!isRecord(value) || !hasExactKeys(value, ["planRef", "steps"])) return Result.fail(malformed())
  const stepValues = value.steps
  if (!Array.isArray(stepValues)) return Result.fail(malformed())
  return Result.gen(function* () {
    const planRef = yield* decodePlanRef(value.planRef).pipe(Result.mapError(malformed))
    const steps: Array<PassiveStep> = []
    for (const step of stepValues) steps.push(yield* decodeStep(step))
    return Object.freeze({ planRef, steps: Object.freeze(steps) })
  })
}

const decodeUnknown = <Value>(input: unknown, decode: (value: Json) => Result.Result<Value, PassiveRecordFailure>) =>
  normalizeJson(input).pipe(Result.mapError(unsupported), Result.flatMap(decode))

export const decodePinnedInput = (input: unknown) => decodeUnknown(input, decodePinnedInputValue)
export const decodeCallbackRecord = (input: unknown) => decodeUnknown(input, decodeCallbackRecordValue)
export const decodeContinuationRecord = (input: unknown) => decodeUnknown(input, decodeContinuationRecordValue)
export const decodePassivePlan = (input: unknown) => decodeUnknown(input, decodePassivePlanValue)

export const decodeProvenance = (input: unknown): Result.Result<Provenance, PassiveRecordFailure> =>
  decodeUnknown(input, (value) => {
    if (!isRecord(value) || !hasKeys(value, ["runRef"], ["traceRef"])) return Result.fail(malformed())
    return Result.gen(function* () {
      const runRef = yield* decodeRunRef(value.runRef).pipe(Result.mapError(malformed))
      const traceRef = Object.hasOwn(value, "traceRef")
        ? yield* decodeTraceRef(value.traceRef).pipe(Result.mapError(malformed))
        : undefined
      return Object.freeze(traceRef === undefined ? { runRef } : { runRef, traceRef })
    })
  })

export const decodeBaseline = (input: unknown): Result.Result<Baseline, PassiveRecordFailure> =>
  decodeUnknown(input, (value) => {
    if (!isRecord(value) || !hasKeys(value, ["planRef"], ["materialDigestRef"])) return Result.fail(malformed())
    return Result.gen(function* () {
      const planRef = yield* decodePlanRef(value.planRef).pipe(Result.mapError(malformed))
      const materialDigestRef = Object.hasOwn(value, "materialDigestRef")
        ? yield* decodeDigestRef(value.materialDigestRef).pipe(Result.mapError(malformed))
        : undefined
      return Object.freeze(materialDigestRef === undefined ? { planRef } : { planRef, materialDigestRef })
    })
  })

export const decodeValidation = (input: unknown): Result.Result<Validation, PassiveRecordFailure> =>
  decodeUnknown(input, (value) => {
    if (
      !isRecord(value) ||
      !hasExactKeys(value, ["_tag", "validationKey"]) ||
      typeof value.validationKey !== "string"
    ) {
      return Result.fail(malformed())
    }
    return value._tag === "Accepted" || value._tag === "Rejected"
      ? Result.succeed(Object.freeze({ _tag: value._tag, validationKey: value.validationKey }))
      : Result.fail(malformed())
  })

export const decodeReplayExpectation = (input: unknown): Result.Result<ReplayExpectation, PassiveRecordFailure> =>
  decodeUnknown(input, (value) => {
    if (
      !isRecord(value) ||
      !hasExactKeys(value, ["_tag", "expectationKey"]) ||
      typeof value.expectationKey !== "string"
    ) {
      return Result.fail(malformed())
    }
    return value._tag === "Equivalent" || value._tag === "Different"
      ? Result.succeed(Object.freeze({ _tag: value._tag, expectationKey: value.expectationKey }))
      : Result.fail(malformed())
  })
