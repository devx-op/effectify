import * as Result from "effect/Result"
import { canonicalizeJson } from "./canonical-json.js"
import {
  type DeclarationProjectionError,
  DeclarationMetadataMismatch,
  DeclarationProjectionFailure,
  DuplicateDeclarationIdentity,
  IncompatibleDeclarationVersion,
} from "./declaration-failure.js"
import { type Declaration, makeDeclaration } from "./tool-declaration.js"

export interface EncodedDeclaration<out I, out O, out E, in out R> {
  readonly ref: Declaration<I, O, E, R>["ref"]
  readonly input: Declaration<I, O, E, R>["input"]
  readonly output: Declaration<I, O, E, R>["output"]
  readonly error: Declaration<I, O, E, R>["error"]
  readonly requirements: Declaration<I, O, E, R>["requirements"]
}

interface ReferenceKey {
  readonly id: string
  readonly version: {
    readonly major: number
    readonly minor: number
    readonly patch: number
  }
}

const project = <I, O, E, R>(declaration: Declaration<I, O, E, R>): EncodedDeclaration<I, O, E, R> =>
  Object.freeze({
    ref: declaration.ref,
    input: declaration.input,
    output: declaration.output,
    error: declaration.error,
    requirements: declaration.requirements,
  })

const refKey = (ref: ReferenceKey): string =>
  `${ref.id}\u0000${ref.version.major}\u0000${ref.version.minor}\u0000${ref.version.patch}`

const sameToolRef = (left: ReferenceKey, right: ReferenceKey): boolean => refKey(left) === refKey(right)

const checkSchemaDocuments = <I, O, E, R>(
  declaration: EncodedDeclaration<I, O, E, R>,
  documents: Map<string, string>,
): Result.Result<void, DeclarationMetadataMismatch | DeclarationProjectionFailure> => {
  for (const document of [declaration.input, declaration.output, declaration.error]) {
    const canonical = canonicalizeJson(document.document)
    if (Result.isFailure(canonical)) return Result.fail(new DeclarationProjectionFailure())

    const key = refKey(document.ref)
    const existing = documents.get(key)
    if (existing !== undefined && existing !== canonical.success.text) {
      return Result.fail(new DeclarationMetadataMismatch())
    }
    documents.set(key, canonical.success.text)
  }

  return Result.succeed(undefined)
}

export const projectDeclaration = <I, O, E, R>(
  input: unknown,
): Result.Result<EncodedDeclaration<I, O, E, R>, DeclarationProjectionError> =>
  makeDeclaration<I, O, E, R>(input).pipe(Result.map(project))

export const projectDeclarations = <I, O, E, R>(
  values: ReadonlyArray<Declaration<I, O, E, R>>,
): Result.Result<ReadonlyArray<EncodedDeclaration<I, O, E, R>>, DeclarationProjectionError> =>
  Result.try<Array<Declaration<I, O, E, R>>, DeclarationProjectionFailure>({
    try: () => Array.from(values),
    catch: () => new DeclarationProjectionFailure(),
  }).pipe(
    Result.flatMap((declarations) => {
      const projected: Array<EncodedDeclaration<I, O, E, R>> = []
      const toolRefs = new Map<string, Declaration<I, O, E, R>["ref"]>()
      const documents = new Map<string, string>()

      for (const declaration of declarations) {
        const encoded = projectDeclaration<I, O, E, R>(declaration)
        if (Result.isFailure(encoded)) return Result.fail(encoded.failure)

        const existingRef = toolRefs.get(encoded.success.ref.id)
        if (existingRef !== undefined) {
          return Result.fail(
            sameToolRef(existingRef, encoded.success.ref)
              ? new DuplicateDeclarationIdentity()
              : new IncompatibleDeclarationVersion(),
          )
        }

        const documentResult = checkSchemaDocuments(encoded.success, documents)
        if (Result.isFailure(documentResult)) return Result.fail(documentResult.failure)

        toolRefs.set(encoded.success.ref.id, encoded.success.ref)
        projected.push(encoded.success)
      }

      return Result.succeed(Object.freeze(projected))
    }),
  )
