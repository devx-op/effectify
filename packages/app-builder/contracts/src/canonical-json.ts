import * as Result from "effect/Result"
import * as Schema from "effect/Schema"
import { makeJsonNormalizer, type Json, type JsonBoundaryOptions } from "./json.js"
import { type JsonFailure } from "./json-failure.js"

export const CanonicalJsonAlgorithm = Schema.Literals(["effectify-cjson/1"])
export type CanonicalJsonAlgorithm = typeof CanonicalJsonAlgorithm.Type

export const CanonicalJsonText = Schema.String.pipe(Schema.brand("AppBuilder.CanonicalJsonText"))
export type CanonicalJsonText = typeof CanonicalJsonText.Type

export interface CanonicalJson {
  readonly algorithm: CanonicalJsonAlgorithm
  readonly material: Json
  readonly text: CanonicalJsonText
}

export interface JsonBoundary {
  readonly normalizeJson: (input: unknown) => Result.Result<Json, JsonFailure>
  readonly canonicalizeJson: (input: unknown) => Result.Result<CanonicalJson, JsonFailure>
  readonly canonicalJsonBytes: (value: CanonicalJson) => Uint8Array
}

interface ValueStep {
  readonly kind: "value"
  readonly value: Json
}

interface TextStep {
  readonly kind: "text"
  readonly value: string
}

type SerializerStep = ValueStep | TextStep

interface CodePoint {
  readonly value: number
  readonly width: number
}

const compareUtf16 = (left: string, right: string): number => (left < right ? -1 : left > right ? 1 : 0)

const isJsonArray = (value: Json): value is ReadonlyArray<Json> => Array.isArray(value)

const hexadecimal = (codeUnit: number): string => codeUnit.toString(16).padStart(4, "0")

const quoteJsonString = (value: string): string => {
  const output = ['"']

  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index)
    switch (codeUnit) {
      case 0x08:
        output.push("\\b")
        continue
      case 0x09:
        output.push("\\t")
        continue
      case 0x0a:
        output.push("\\n")
        continue
      case 0x0c:
        output.push("\\f")
        continue
      case 0x0d:
        output.push("\\r")
        continue
      case 0x22:
        output.push('\\"')
        continue
      case 0x5c:
        output.push("\\\\")
        continue
    }

    if (codeUnit < 0x20) {
      output.push(`\\u${hexadecimal(codeUnit)}`)
      continue
    }

    const nextCodeUnit = value.charCodeAt(index + 1)
    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      if (nextCodeUnit >= 0xdc00 && nextCodeUnit <= 0xdfff) {
        output.push(value[index], value[index + 1])
        index += 1
        continue
      }
      output.push(`\\u${hexadecimal(codeUnit)}`)
      continue
    }

    if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) {
      output.push(`\\u${hexadecimal(codeUnit)}`)
      continue
    }

    output.push(value[index])
  }

  output.push('"')
  return output.join("")
}

const serializeScalar = (value: null | boolean | number | string): string => {
  switch (typeof value) {
    case "string":
      return quoteJsonString(value)
    case "number":
      return Object.is(value, -0) ? "0" : String(value)
    case "boolean":
      return value ? "true" : "false"
    default:
      return "null"
  }
}

const serializeJson = (root: Json): string => {
  const output: Array<string> = []
  const steps: Array<SerializerStep> = [{ kind: "value", value: root }]

  while (steps.length > 0) {
    const step = steps.pop()
    if (step === undefined) break
    if (step.kind === "text") {
      output.push(step.value)
      continue
    }

    const value = step.value
    if (value === null || typeof value !== "object") {
      output.push(serializeScalar(value))
      continue
    }

    if (isJsonArray(value)) {
      output.push("[")
      if (value.length === 0) {
        output.push("]")
        continue
      }

      steps.push({ kind: "text", value: "]" })
      for (let index = value.length - 1; index >= 0; index -= 1) {
        steps.push({ kind: "value", value: value[index] })
        if (index > 0) steps.push({ kind: "text", value: "," })
      }
      continue
    }

    const keys = Object.keys(value).sort(compareUtf16)
    output.push("{")
    if (keys.length === 0) {
      output.push("}")
      continue
    }

    steps.push({ kind: "text", value: "}" })
    for (let index = keys.length - 1; index >= 0; index -= 1) {
      const key = keys[index]
      steps.push({ kind: "value", value: value[key] })
      steps.push({ kind: "text", value: ":" })
      steps.push({ kind: "text", value: quoteJsonString(key) })
      if (index > 0) steps.push({ kind: "text", value: "," })
    }
  }

  return output.join("")
}

const nextCodePoint = (text: string, index: number): CodePoint => {
  const codeUnit = text.charCodeAt(index)
  if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
    const nextCodeUnit = text.charCodeAt(index + 1)
    if (nextCodeUnit >= 0xdc00 && nextCodeUnit <= 0xdfff) {
      return { value: (codeUnit - 0xd800) * 0x400 + nextCodeUnit - 0xdc00 + 0x10000, width: 2 }
    }
    return { value: 0xfffd, width: 1 }
  }
  if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) return { value: 0xfffd, width: 1 }
  return { value: codeUnit, width: 1 }
}

const utf8Length = (text: string): number => {
  let length = 0
  for (let index = 0; index < text.length;) {
    const codePoint = nextCodePoint(text, index)
    length += codePoint.value < 0x80 ? 1 : codePoint.value < 0x800 ? 2 : codePoint.value < 0x10000 ? 3 : 4
    index += codePoint.width
  }
  return length
}

const encodeUtf8 = (text: string): Uint8Array => {
  const bytes = new Uint8Array(utf8Length(text))
  let offset = 0

  for (let index = 0; index < text.length;) {
    const codePoint = nextCodePoint(text, index)
    if (codePoint.value < 0x80) {
      bytes[offset] = codePoint.value
      offset += 1
    } else if (codePoint.value < 0x800) {
      bytes[offset] = 0xc0 | (codePoint.value >> 6)
      bytes[offset + 1] = 0x80 | (codePoint.value & 0x3f)
      offset += 2
    } else if (codePoint.value < 0x10000) {
      bytes[offset] = 0xe0 | (codePoint.value >> 12)
      bytes[offset + 1] = 0x80 | ((codePoint.value >> 6) & 0x3f)
      bytes[offset + 2] = 0x80 | (codePoint.value & 0x3f)
      offset += 3
    } else {
      bytes[offset] = 0xf0 | (codePoint.value >> 18)
      bytes[offset + 1] = 0x80 | ((codePoint.value >> 12) & 0x3f)
      bytes[offset + 2] = 0x80 | ((codePoint.value >> 6) & 0x3f)
      bytes[offset + 3] = 0x80 | (codePoint.value & 0x3f)
      offset += 4
    }
    index += codePoint.width
  }

  return bytes
}

const makeCanonicalJson = (material: Json): CanonicalJson => {
  const canonical: CanonicalJson = {
    algorithm: "effectify-cjson/1",
    material,
    text: CanonicalJsonText.make(serializeJson(material)),
  }
  return Object.freeze(canonical)
}

/** Creates a frozen private JSON boundary with explicit trusted prototype identities. */
export const makeJsonBoundary = (options?: JsonBoundaryOptions): JsonBoundary => {
  const normalizer = makeJsonNormalizer(options)
  const boundary: JsonBoundary = {
    normalizeJson: normalizer.normalizeJson,
    canonicalizeJson: (input) => normalizer.normalizeJson(input).pipe(Result.map(makeCanonicalJson)),
    canonicalJsonBytes: (value) => encodeUtf8(value.text),
  }
  return Object.freeze(boundary)
}

export const defaultJsonBoundary = makeJsonBoundary()
export const normalizeJson = defaultJsonBoundary.normalizeJson
export const canonicalizeJson = defaultJsonBoundary.canonicalizeJson
export const canonicalJsonBytes = defaultJsonBoundary.canonicalJsonBytes
