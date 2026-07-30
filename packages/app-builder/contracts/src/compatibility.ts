import * as Result from "effect/Result"
import * as Schema from "effect/Schema"
import { canonicalizeJson } from "./canonical-json.js"
import {
  type CompatibilityFailure,
  DuplicateModule,
  MalformedCertification,
  SchemaMismatch,
  UndeclaredModuleVersion,
  UndeclaredProtocolVersion,
  UnknownModule,
} from "./compatibility-failure.js"
import { type Json, type JsonRecord, normalizeJson } from "./json.js"
import { ProtocolId, SchemaId, decodeProtocolId, decodeSchemaId } from "./identity.js"
import { type Version, VersionSupport, decodeVersion } from "./version.js"

export const CertifiedModuleName = Schema.Literals(["app-builder-contracts"])
export type CertifiedModuleName = typeof CertifiedModuleName.Type

export interface ProtocolCompatibilityDeclaration {
  readonly protocolId: string
  readonly range: VersionSupport
}

export interface SchemaCompatibilityDeclaration {
  readonly schemaId: string
  readonly range: VersionSupport
  readonly document: Json
}

export interface ModuleCompatibilityDeclaration {
  readonly module: CertifiedModuleName
  readonly range: VersionSupport
  readonly protocols: ReadonlyArray<ProtocolCompatibilityDeclaration>
  readonly schemas: ReadonlyArray<SchemaCompatibilityDeclaration>
}

export interface PackageCompatibilityCandidate {
  readonly module: string
  readonly version: Version
  readonly protocols: ReadonlyArray<{ readonly protocolId: string; readonly version: Version }>
  readonly schemas: ReadonlyArray<{ readonly schemaId: string; readonly version: Version; readonly document: Json }>
}

const versionSupport = (major: number, minor: number): VersionSupport =>
  Result.getOrThrowWith(
    Schema.decodeUnknownResult(VersionSupport)({ major, supportedMinors: [minor] }),
    () => new Error("invalid version support"),
  )

export const PackageCompatibilityDeclarations: ReadonlyArray<ModuleCompatibilityDeclaration> = Object.freeze([
  Object.freeze({
    module: "app-builder-contracts",
    range: versionSupport(1, 0),
    protocols: Object.freeze([
      Object.freeze({ protocolId: ProtocolId.make("protocol:app-builder"), range: versionSupport(1, 0) }),
    ]),
    schemas: Object.freeze([
      Object.freeze({
        schemaId: SchemaId.make("schema:result"),
        range: versionSupport(1, 0),
        document: Object.freeze({ type: "string" }),
      }),
    ]),
  }),
])

const malformed = (): MalformedCertification => new MalformedCertification()
const isRecord = (value: Json): value is JsonRecord =>
  !Array.isArray(value) && value !== null && typeof value === "object"
const hasExactKeys = (value: JsonRecord, keys: ReadonlyArray<string>): boolean => {
  const actual = Object.keys(value)
  return actual.length === keys.length && keys.every((key) => Object.hasOwn(value, key))
}

const supports = (candidate: Version, range: VersionSupport): boolean =>
  candidate.major === range.major && range.supportedMinors.includes(candidate.minor)

const decodeProtocolClaims = (
  input: Json,
): Result.Result<ReadonlyArray<PackageCompatibilityCandidate["protocols"][number]>, MalformedCertification> => {
  if (!Array.isArray(input)) return Result.fail(malformed())
  const claims: Array<PackageCompatibilityCandidate["protocols"][number]> = []
  for (const value of input) {
    if (!isRecord(value) || !hasExactKeys(value, ["protocolId", "version"])) return Result.fail(malformed())
    const protocolId = decodeProtocolId(value.protocolId).pipe(Result.mapError(malformed))
    const version = decodeVersion(value.version).pipe(Result.mapError(malformed))
    const decoded = Result.all({ protocolId, version })
    if (Result.isFailure(decoded)) return Result.fail(malformed())
    claims.push(Object.freeze(decoded.success))
  }
  return Result.succeed(Object.freeze(claims))
}

const decodeSchemaClaims = (
  input: Json,
): Result.Result<ReadonlyArray<PackageCompatibilityCandidate["schemas"][number]>, MalformedCertification> => {
  if (!Array.isArray(input)) return Result.fail(malformed())
  const claims: Array<PackageCompatibilityCandidate["schemas"][number]> = []
  for (const value of input) {
    if (!isRecord(value) || !hasExactKeys(value, ["schemaId", "version", "document"])) return Result.fail(malformed())
    const schemaId = decodeSchemaId(value.schemaId).pipe(Result.mapError(malformed))
    const version = decodeVersion(value.version).pipe(Result.mapError(malformed))
    const decoded = Result.all({ schemaId, version })
    if (Result.isFailure(decoded)) return Result.fail(malformed())
    claims.push(Object.freeze({ ...decoded.success, document: value.document }))
  }
  return Result.succeed(Object.freeze(claims))
}

const decodeCandidate = (input: Json): Result.Result<PackageCompatibilityCandidate, MalformedCertification> => {
  if (!isRecord(input) || !hasExactKeys(input, ["module", "version", "protocols", "schemas"])) {
    return Result.fail(malformed())
  }
  const module = input.module
  if (typeof module !== "string") return Result.fail(malformed())
  return Result.gen(function* () {
    const version = yield* decodeVersion(input.version).pipe(Result.mapError(malformed))
    const protocols = yield* decodeProtocolClaims(input.protocols)
    const schemas = yield* decodeSchemaClaims(input.schemas)
    return Object.freeze({ module, version, protocols, schemas })
  })
}

const decodeCandidates = (
  input: unknown,
): Result.Result<ReadonlyArray<PackageCompatibilityCandidate>, MalformedCertification> =>
  normalizeJson(input).pipe(
    Result.mapError(malformed),
    Result.flatMap((value) => {
      if (!Array.isArray(value)) return Result.fail(malformed())
      const candidates: Array<PackageCompatibilityCandidate> = []
      for (const candidate of value) {
        const decoded = decodeCandidate(candidate)
        if (Result.isFailure(decoded)) return Result.fail(malformed())
        candidates.push(decoded.success)
      }
      return Result.succeed(Object.freeze(candidates))
    }),
  )

const sameDocument = (left: Json, right: Json): boolean => {
  const leftCanonical = canonicalizeJson(left)
  const rightCanonical = canonicalizeJson(right)
  return (
    Result.isSuccess(leftCanonical) &&
    Result.isSuccess(rightCanonical) &&
    leftCanonical.success.text === rightCanonical.success.text
  )
}

const certifyModule = (
  candidate: PackageCompatibilityCandidate,
  declaration: ModuleCompatibilityDeclaration,
): Result.Result<PackageCompatibilityCandidate, CompatibilityFailure> => {
  if (!supports(candidate.version, declaration.range)) return Result.fail(new UndeclaredModuleVersion())

  for (const expected of declaration.protocols) {
    const claim = candidate.protocols.find((protocol) => protocol.protocolId === expected.protocolId)
    if (claim === undefined || !supports(claim.version, expected.range))
      return Result.fail(new UndeclaredProtocolVersion())
  }
  for (const claim of candidate.protocols) {
    const expected = declaration.protocols.find((protocol) => protocol.protocolId === claim.protocolId)
    if (expected === undefined || !supports(claim.version, expected.range))
      return Result.fail(new UndeclaredProtocolVersion())
  }

  for (const expected of declaration.schemas) {
    const claim = candidate.schemas.find((schema) => schema.schemaId === expected.schemaId)
    if (
      claim === undefined ||
      !supports(claim.version, expected.range) ||
      !sameDocument(claim.document, expected.document)
    )
      return Result.fail(new SchemaMismatch())
  }
  for (const claim of candidate.schemas) {
    const expected = declaration.schemas.find((schema) => schema.schemaId === claim.schemaId)
    if (
      expected === undefined ||
      !supports(claim.version, expected.range) ||
      !sameDocument(claim.document, expected.document)
    ) {
      return Result.fail(new SchemaMismatch())
    }
  }

  return Result.succeed(candidate)
}

/** Certifies only finite declared compatibility ranges; it never infers versions or solves ranges. */
export const certifyPackageCompatibility = (
  input: unknown,
): Result.Result<ReadonlyArray<PackageCompatibilityCandidate>, CompatibilityFailure> =>
  decodeCandidates(input).pipe(
    Result.flatMap((candidates) => {
      const byModule = new Map<string, PackageCompatibilityCandidate>()
      for (const candidate of candidates) {
        if (byModule.has(candidate.module)) return Result.fail(new DuplicateModule())
        byModule.set(candidate.module, candidate)
      }

      const certified: Array<PackageCompatibilityCandidate> = []
      for (const declaration of PackageCompatibilityDeclarations) {
        const candidate = byModule.get(declaration.module)
        if (candidate === undefined) continue
        const result = certifyModule(candidate, declaration)
        if (Result.isFailure(result)) return Result.fail(result.failure)
        certified.push(result.success)
      }
      for (const candidate of candidates) {
        if (!PackageCompatibilityDeclarations.some((declaration) => declaration.module === candidate.module)) {
          return Result.fail(new UnknownModule())
        }
      }
      return Result.succeed(Object.freeze(certified))
    }),
  )
