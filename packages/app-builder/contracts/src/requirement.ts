import * as Result from "effect/Result"
import { MalformedDeclarationMetadata, UnsupportedDeclarationJson } from "./declaration-failure.js"
import { type Json, type JsonRecord, normalizeJson } from "./json.js"

export interface CapabilityRequirement {
  readonly kind: "capability"
  readonly metadata: Json
}

export interface ConstraintRequirement {
  readonly kind: "constraint"
  readonly metadata: Json
}

export interface PermissionRequirement {
  readonly kind: "permission"
  readonly metadata: Json
}

export type Requirement = CapabilityRequirement | ConstraintRequirement | PermissionRequirement

const malformed = (): MalformedDeclarationMetadata => new MalformedDeclarationMetadata()

const unsupported = (reason: UnsupportedDeclarationJson["reason"]): UnsupportedDeclarationJson =>
  new UnsupportedDeclarationJson({ reason })

const isRecord = (value: Json): value is JsonRecord =>
  !Array.isArray(value) && typeof value === "object" && value !== null

const hasExactKeys = (value: JsonRecord, keys: ReadonlyArray<string>): boolean => {
  const actual = Object.keys(value)
  return actual.length === keys.length && keys.every((key) => Object.hasOwn(value, key))
}

const makeRequirement = (kind: string, metadata: Json): Result.Result<Requirement, MalformedDeclarationMetadata> => {
  switch (kind) {
    case "capability":
      return Result.succeed(Object.freeze({ kind, metadata }))
    case "constraint":
      return Result.succeed(Object.freeze({ kind, metadata }))
    case "permission":
      return Result.succeed(Object.freeze({ kind, metadata }))
    default:
      return Result.fail(malformed())
  }
}

const decodeNormalizedRequirement = (value: Json): Result.Result<Requirement, MalformedDeclarationMetadata> => {
  if (!isRecord(value) || !hasExactKeys(value, ["kind", "metadata"]) || typeof value.kind !== "string") {
    return Result.fail(malformed())
  }

  return makeRequirement(value.kind, value.metadata)
}

export const decodeRequirement = (
  input: unknown,
): Result.Result<Requirement, UnsupportedDeclarationJson | MalformedDeclarationMetadata> =>
  normalizeJson(input).pipe(
    Result.mapError((failure) => unsupported(failure.reason)),
    Result.flatMap(decodeNormalizedRequirement),
  )

export const decodeRequirements = (
  input: unknown,
): Result.Result<ReadonlyArray<Requirement>, UnsupportedDeclarationJson | MalformedDeclarationMetadata> =>
  normalizeJson(input).pipe(
    Result.mapError((failure) => unsupported(failure.reason)),
    Result.flatMap((value) => {
      if (!Array.isArray(value)) return Result.fail(malformed())

      const requirements: Array<Requirement> = []
      for (const requirement of value) {
        const decoded = decodeNormalizedRequirement(requirement)
        if (Result.isFailure(decoded)) return Result.fail(decoded.failure)
        requirements.push(decoded.success)
      }

      return Result.succeed(Object.freeze(requirements))
    }),
  )
