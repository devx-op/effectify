import * as Result from "effect/Result"
import * as Schema from "effect/Schema"
import { DigestAlgorithm, DigestValue } from "./digest.js"
import {
  type IdentityDomain,
  MalformedDigestMetadata,
  MalformedIdentity,
  MalformedVersion,
} from "./identity-failure.js"
import {
  CallbackId,
  ContinuationId,
  DigestId,
  PlanId,
  ProtocolId,
  RunId,
  SchemaId,
  ToolId,
  TraceId,
  decodeCallbackId,
  decodeContinuationId,
  decodeDigestId,
  decodePlanId,
  decodeProtocolId,
  decodeRunId,
  decodeSchemaId,
  decodeToolId,
  decodeTraceId,
} from "./identity.js"
import { Version, decodeVersion } from "./version.js"
import { type Json, type JsonRecord, normalizeJson } from "./json.js"

const reference = <Id extends Schema.ConstraintDecoder<unknown>>(id: Id) => Schema.Struct({ id, version: Version })

export const ProtocolRef = reference(ProtocolId)
export type ProtocolRef = typeof ProtocolRef.Type
export const RunRef = reference(RunId)
export type RunRef = typeof RunRef.Type
export const ToolRef = reference(ToolId)
export type ToolRef = typeof ToolRef.Type
export const PlanRef = reference(PlanId)
export type PlanRef = typeof PlanRef.Type
export const CallbackRef = reference(CallbackId)
export type CallbackRef = typeof CallbackRef.Type
export const ContinuationRef = reference(ContinuationId)
export type ContinuationRef = typeof ContinuationRef.Type
export const TraceRef = reference(TraceId)
export type TraceRef = typeof TraceRef.Type
export const SchemaRef = reference(SchemaId)
export type SchemaRef = typeof SchemaRef.Type
export const DigestRef = Schema.Struct({
  id: DigestId,
  version: Version,
  algorithm: DigestAlgorithm,
  value: DigestValue,
})
export type DigestRef = typeof DigestRef.Type

const isObject = (value: unknown): value is object => typeof value === "object" && value !== null

const readId = (value: object, domain: IdentityDomain) =>
  Result.try({
    try: () => Reflect.get(value, "id"),
    catch: () => new MalformedIdentity({ domain }),
  })

const readVersion = (value: object) =>
  Result.try({
    try: () => Reflect.get(value, "version"),
    catch: () => new MalformedVersion({ source: "reference" }),
  })

const readReference = (input: unknown, domain: IdentityDomain) =>
  Result.liftPredicate(
    isObject,
    () => new MalformedIdentity({ domain }),
  )(input).pipe(
    Result.flatMap((value) =>
      readId(value, domain).pipe(
        Result.flatMap((id) => readVersion(value).pipe(Result.map((version) => ({ id, version })))),
      ),
    ),
  )

const decode = <Id, S extends Schema.ConstraintDecoder<unknown>>(
  schema: S,
  decodeId: (input: unknown) => Result.Result<Id, MalformedIdentity>,
  input: unknown,
  domain: IdentityDomain,
): Result.Result<S["Type"], MalformedIdentity | MalformedVersion> =>
  readReference(input, domain).pipe(
    Result.flatMap(({ id, version }) =>
      Result.all({
        id: decodeId(id),
        version: decodeVersion(version).pipe(Result.mapError(() => new MalformedVersion({ source: "reference" }))),
      }),
    ),
    Result.flatMap((reference) =>
      Schema.decodeUnknownResult(schema)(reference).pipe(Result.mapError(() => new MalformedIdentity({ domain }))),
    ),
  )

export const decodeProtocolRef = (input: unknown) => decode(ProtocolRef, decodeProtocolId, input, "protocol")
export const decodeRunRef = (input: unknown) => decode(RunRef, decodeRunId, input, "run")
export const decodeToolRef = (input: unknown) => decode(ToolRef, decodeToolId, input, "tool")
export const decodePlanRef = (input: unknown) => decode(PlanRef, decodePlanId, input, "plan")
export const decodeCallbackRef = (input: unknown) => decode(CallbackRef, decodeCallbackId, input, "callback")
export const decodeContinuationRef = (input: unknown) =>
  decode(ContinuationRef, decodeContinuationId, input, "continuation")
export const decodeTraceRef = (input: unknown) => decode(TraceRef, decodeTraceId, input, "trace")
export const decodeSchemaRef = (input: unknown) => decode(SchemaRef, decodeSchemaId, input, "schema")

const isRecord = (value: Json): value is JsonRecord =>
  !Array.isArray(value) && typeof value === "object" && value !== null

const hasExactKeys = (value: JsonRecord, keys: ReadonlyArray<string>): boolean => {
  const actual = Object.keys(value)
  return actual.length === keys.length && keys.every((key) => Object.hasOwn(value, key))
}

const malformedDigestMetadata = (): MalformedDigestMetadata => new MalformedDigestMetadata()

/** Decodes a four-key external digest claim; this boundary never computes or verifies a digest. */
export const decodeDigestRef = (
  input: unknown,
): Result.Result<DigestRef, MalformedIdentity | MalformedVersion | MalformedDigestMetadata> =>
  normalizeJson(input).pipe(
    Result.mapError(malformedDigestMetadata),
    Result.flatMap((value) => {
      if (!isRecord(value) || !hasExactKeys(value, ["id", "version", "algorithm", "value"])) {
        return Result.fail(malformedDigestMetadata())
      }

      return Result.all({
        id: decodeDigestId(value.id),
        version: decodeVersion(value.version).pipe(
          Result.mapError(() => new MalformedVersion({ source: "reference" })),
        ),
        algorithm: Schema.decodeUnknownResult(DigestAlgorithm)(value.algorithm).pipe(
          Result.mapError(malformedDigestMetadata),
        ),
        value: Schema.decodeUnknownResult(DigestValue)(value.value).pipe(Result.mapError(malformedDigestMetadata)),
      }).pipe(Result.map((digest) => Object.freeze(digest)))
    }),
  )
