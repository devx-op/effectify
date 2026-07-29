import * as Result from "effect/Result"
import * as Schema from "effect/Schema"
import { type IdentityDomain, MalformedIdentity, MalformedVersion } from "./identity-failure.js"
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
export const DigestRef = reference(DigestId)
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
export const decodeDigestRef = (input: unknown) => decode(DigestRef, decodeDigestId, input, "digest")
