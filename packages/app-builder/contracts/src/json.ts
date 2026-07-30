import * as Result from "effect/Result"
import { JsonFailure, type JsonFailureReason, jsonFailure } from "./json-failure.js"

const maximumContainerDepth = 256

export type JsonScalar = null | boolean | number | string
export type Json = JsonScalar | JsonArray | JsonRecord

export interface JsonArray extends ReadonlyArray<Json> {}

export interface JsonRecord {
  readonly [key: string]: Json
}

export interface JsonBoundaryOptions {
  readonly trustedObjectPrototypes?: ReadonlyArray<object>
}

export interface JsonNormalizer {
  readonly normalizeJson: (input: unknown) => Result.Result<Json, JsonFailure>
}

interface ArrayInspection {
  readonly kind: "array"
  readonly entries: ReadonlyArray<readonly [number, unknown]>
}

interface RecordInspection {
  readonly kind: "record"
  readonly entries: ReadonlyArray<readonly [string, unknown]>
}

type Inspection = ArrayInspection | RecordInspection

interface ArrayFrame {
  readonly kind: "array"
  readonly source: object
  readonly target: Array<Json>
  readonly entries: ReadonlyArray<readonly [number, unknown]>
  readonly depth: number
  readonly parent: Frame | undefined
  readonly parentKey: string | number | undefined
  index: number
}

interface RecordFrame {
  readonly kind: "record"
  readonly source: object
  readonly target: Record<string, Json>
  readonly entries: ReadonlyArray<readonly [string, unknown]>
  readonly depth: number
  readonly parent: Frame | undefined
  readonly parentKey: string | number | undefined
  index: number
}

type Frame = ArrayFrame | RecordFrame

const compareUtf16 = (left: string, right: string): number => (left < right ? -1 : left > right ? 1 : 0)

const isJsonScalar = (value: unknown): value is JsonScalar =>
  value === null ||
  typeof value === "boolean" ||
  typeof value === "string" ||
  (typeof value === "number" && Number.isFinite(value))

const normalizeScalar = (value: JsonScalar): JsonScalar =>
  typeof value === "number" && Object.is(value, -0) ? 0 : value

const isDataDescriptor = (
  descriptor: PropertyDescriptor,
): descriptor is PropertyDescriptor & { readonly value: unknown } => "value" in descriptor

const arrayIndex = (key: string): number | undefined => {
  if (key === "") return undefined

  const index = Number(key)
  return Number.isInteger(index) && index >= 0 && index < 4_294_967_295 && String(index) === key ? index : undefined
}

const guarded = <Value>(inspect: () => Value): Result.Result<Value, JsonFailure> =>
  Result.try({
    try: inspect,
    catch: () => jsonFailure("inspection-failed"),
  })

const invalid = <Value>(reason: JsonFailureReason): Result.Result<Value, JsonFailure> =>
  Result.fail(jsonFailure(reason))

const inspectArray = (
  descriptors: ReadonlyArray<readonly [PropertyKey, PropertyDescriptor]>,
): Result.Result<ArrayInspection, JsonFailure> => {
  let length: number | undefined
  const entries: Array<readonly [number, unknown]> = []

  for (const [key, descriptor] of descriptors) {
    if (key === "length") {
      if (
        !isDataDescriptor(descriptor) ||
        descriptor.enumerable ||
        typeof descriptor.value !== "number" ||
        !Number.isInteger(descriptor.value) ||
        descriptor.value < 0 ||
        descriptor.value >= 4_294_967_296
      ) {
        return invalid("invalid-array")
      }
      length = descriptor.value
      continue
    }

    if (typeof key !== "string" || !isDataDescriptor(descriptor) || !descriptor.enumerable) {
      return invalid("invalid-array")
    }

    const index = arrayIndex(key)
    if (index === undefined) return invalid("invalid-array")
    entries.push([index, descriptor.value])
  }

  if (length === undefined || entries.length !== length || descriptors.length !== entries.length + 1) {
    return invalid("invalid-array")
  }

  entries.sort(([left], [right]) => left - right)
  for (let index = 0; index < entries.length; index += 1) {
    if (entries[index][0] !== index) return invalid("invalid-array")
  }

  return Result.succeed({ kind: "array", entries })
}

const inspectRecord = (
  prototype: object | null,
  trustedObjectPrototypes: ReadonlyArray<object>,
  descriptors: ReadonlyArray<readonly [PropertyKey, PropertyDescriptor]>,
): Result.Result<RecordInspection, JsonFailure> => {
  if (prototype !== null && !trustedObjectPrototypes.some((trusted) => trusted === prototype)) {
    return invalid("invalid-record")
  }

  const entries: Array<readonly [string, unknown]> = []
  for (const [key, descriptor] of descriptors) {
    if (typeof key !== "string" || !isDataDescriptor(descriptor) || !descriptor.enumerable) {
      return invalid("invalid-record")
    }
    entries.push([key, descriptor.value])
  }

  entries.sort(([left], [right]) => compareUtf16(left, right))
  return Result.succeed({ kind: "record", entries })
}

const makeNullPrototypeRecord = (): Record<string, Json> => Object.create(null)

const makeFrame = (
  source: object,
  inspection: Inspection,
  depth: number,
  parent: Frame | undefined,
  parentKey: string | number | undefined,
): Frame =>
  inspection.kind === "array"
    ? { kind: "array", source, target: [], entries: inspection.entries, depth, parent, parentKey, index: 0 }
    : {
        kind: "record",
        source,
        target: makeNullPrototypeRecord(),
        entries: inspection.entries,
        depth,
        parent,
        parentKey,
        index: 0,
      }

const assign = (frame: Frame, key: string | number, value: Json): void => {
  if (frame.kind === "array" && typeof key === "number") {
    frame.target[key] = value
    return
  }

  if (frame.kind === "record" && typeof key === "string") {
    frame.target[key] = value
  }
}

const freezeFrame = (frame: Frame): Json => Object.freeze(frame.target)

/** Creates an immutable, identity-authorized JSON normalizer for hostile unknown input. */
export const makeJsonNormalizer = (options: JsonBoundaryOptions = {}): JsonNormalizer => {
  const trustedObjectPrototypes = Object.freeze([Object.prototype, ...(options.trustedObjectPrototypes ?? [])])

  const inspectContainer = (source: object): Result.Result<Inspection, JsonFailure> => {
    const arrayResult = guarded(() => Array.isArray(source))
    if (Result.isFailure(arrayResult)) return Result.fail(arrayResult.failure)

    const keysResult = guarded(() => Reflect.ownKeys(source))
    if (Result.isFailure(keysResult)) return Result.fail(keysResult.failure)

    let prototype: object | null = null
    if (!arrayResult.success) {
      const prototypeResult = guarded(() => Reflect.getPrototypeOf(source))
      if (Result.isFailure(prototypeResult)) return Result.fail(prototypeResult.failure)
      prototype = prototypeResult.success
    }

    const descriptors: Array<readonly [PropertyKey, PropertyDescriptor]> = []
    for (const key of keysResult.success) {
      const descriptorResult = guarded(() => Reflect.getOwnPropertyDescriptor(source, key))
      if (Result.isFailure(descriptorResult)) return Result.fail(descriptorResult.failure)
      if (descriptorResult.success === undefined)
        return invalid(arrayResult.success ? "invalid-array" : "invalid-record")
      descriptors.push([key, descriptorResult.success])
    }

    return arrayResult.success
      ? inspectArray(descriptors)
      : inspectRecord(prototype, trustedObjectPrototypes, descriptors)
  }

  const normalizeJson = (input: unknown): Result.Result<Json, JsonFailure> => {
    if (isJsonScalar(input)) return Result.succeed(normalizeScalar(input))
    if (typeof input !== "object" || input === null) return invalid("unsupported-value")

    const inspectedRoot = inspectContainer(input)
    if (Result.isFailure(inspectedRoot)) return Result.fail(inspectedRoot.failure)

    const active = new Set<object>([input])
    const frames: Array<Frame> = [makeFrame(input, inspectedRoot.success, 1, undefined, undefined)]

    while (frames.length > 0) {
      const frame = frames[frames.length - 1]
      if (frame.index === frame.entries.length) {
        const material = freezeFrame(frame)
        frames.pop()
        active.delete(frame.source)
        if (frame.parent === undefined || frame.parentKey === undefined) return Result.succeed(material)
        assign(frame.parent, frame.parentKey, material)
        frame.parent.index += 1
        continue
      }

      const [key, child] = frame.entries[frame.index]
      if (isJsonScalar(child)) {
        assign(frame, key, normalizeScalar(child))
        frame.index += 1
        continue
      }

      if (typeof child !== "object" || child === null) return invalid("unsupported-value")
      if (active.has(child)) return invalid("cycle")

      const depth = frame.depth + 1
      if (depth > maximumContainerDepth) return invalid("depth-exceeded")

      const inspectedChild = inspectContainer(child)
      if (Result.isFailure(inspectedChild)) return Result.fail(inspectedChild.failure)

      active.add(child)
      frames.push(makeFrame(child, inspectedChild.success, depth, frame, key))
    }

    return invalid("unsupported-value")
  }

  return Object.freeze({ normalizeJson })
}

export const defaultJsonNormalizer = makeJsonNormalizer()
export const normalizeJson = defaultJsonNormalizer.normalizeJson
