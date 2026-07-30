import * as Result from "effect/Result"
import {
  type DeclarationFailure,
  MalformedDeclarationMetadata,
  UnsupportedDeclarationJson,
} from "./declaration-failure.js"
import { type Json, type JsonRecord, normalizeJson } from "./json.js"
import { type ToolRef, decodeToolRef } from "./reference.js"
import { type Requirement, decodeRequirements } from "./requirement.js"
import { type SchemaDocument, decodeSchemaDocument } from "./schema-document.js"

export interface Declaration<out I, out O, out E, in out R> {
  readonly ref: ToolRef
  readonly input: SchemaDocument<I>
  readonly output: SchemaDocument<O>
  readonly error: SchemaDocument<E>
  readonly requirements: ReadonlyArray<Requirement>
}

export interface DeclarationInput<I, O, E, R> {
  readonly ref: unknown
  readonly input: unknown
  readonly output: unknown
  readonly error: unknown
  readonly requirements: unknown
}

const malformed = (): MalformedDeclarationMetadata => new MalformedDeclarationMetadata()

const unsupported = (reason: UnsupportedDeclarationJson["reason"]): UnsupportedDeclarationJson =>
  new UnsupportedDeclarationJson({ reason })

const isRecord = (value: Json): value is JsonRecord =>
  !Array.isArray(value) && typeof value === "object" && value !== null

const hasExactKeys = (value: JsonRecord, keys: ReadonlyArray<string>): boolean => {
  const actual = Object.keys(value)
  return actual.length === keys.length && keys.every((key) => Object.hasOwn(value, key))
}

const freezeRef = (ref: ToolRef): ToolRef =>
  Object.freeze({
    id: ref.id,
    version: Object.freeze({ major: ref.version.major, minor: ref.version.minor, patch: ref.version.patch }),
  })

const decodeNormalizedDeclaration = <I, O, E, R>(
  value: Json,
): Result.Result<Declaration<I, O, E, R>, DeclarationFailure> => {
  if (!isRecord(value) || !hasExactKeys(value, ["ref", "input", "output", "error", "requirements"])) {
    return Result.fail(malformed())
  }

  return Result.gen(function* () {
    const ref = yield* decodeToolRef(value.ref).pipe(Result.mapError(malformed))
    const input = yield* decodeSchemaDocument<I>(value.input)
    const output = yield* decodeSchemaDocument<O>(value.output)
    const error = yield* decodeSchemaDocument<E>(value.error)
    const requirements = yield* decodeRequirements(value.requirements)

    return Object.freeze({ ref: freezeRef(ref), input, output, error, requirements })
  })
}

export const makeDeclaration = <I, O, E, R>(
  input: unknown,
): Result.Result<Declaration<I, O, E, R>, DeclarationFailure> =>
  normalizeJson(input).pipe(
    Result.mapError((failure) => unsupported(failure.reason)),
    Result.flatMap(decodeNormalizedDeclaration<I, O, E, R>),
  )
