import * as Result from "effect/Result"
import { MalformedDeclarationMetadata } from "./declaration-failure.js"
import { type Json, type JsonRecord, normalizeJson } from "./json.js"
import { type SchemaRef, decodeSchemaRef } from "./reference.js"

export interface SchemaDocument<out A> {
  readonly ref: SchemaRef
  readonly document: Json
}

const malformed = (): MalformedDeclarationMetadata => new MalformedDeclarationMetadata()

const isRecord = (value: Json): value is JsonRecord =>
  !Array.isArray(value) && typeof value === "object" && value !== null

const hasExactKeys = (value: JsonRecord, keys: ReadonlyArray<string>): boolean => {
  const actual = Object.keys(value)
  return actual.length === keys.length && keys.every((key) => Object.hasOwn(value, key))
}

const freezeRef = (ref: SchemaRef): SchemaRef =>
  Object.freeze({
    id: ref.id,
    version: Object.freeze({ major: ref.version.major, minor: ref.version.minor, patch: ref.version.patch }),
  })

const decodeNormalizedSchemaDocument = <A>(
  value: Json,
): Result.Result<SchemaDocument<A>, MalformedDeclarationMetadata> => {
  if (!isRecord(value) || !hasExactKeys(value, ["ref", "document"])) return Result.fail(malformed())

  return decodeSchemaRef(value.ref).pipe(
    Result.mapError(malformed),
    Result.map((ref) => Object.freeze({ ref: freezeRef(ref), document: value.document })),
  )
}

export const decodeSchemaDocument = <A>(
  input: unknown,
): Result.Result<SchemaDocument<A>, MalformedDeclarationMetadata> =>
  normalizeJson(input).pipe(Result.mapError(malformed), Result.flatMap(decodeNormalizedSchemaDocument<A>))
