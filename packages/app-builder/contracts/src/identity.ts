import * as Result from "effect/Result"
import * as Schema from "effect/Schema"
import { type IdentityDomain, MalformedIdentity } from "./identity-failure.js"

export const Identity = Schema.String.check(Schema.isPattern(/^[a-z0-9][a-z0-9._:/-]{0,127}$/))
export const ProtocolId = Identity.pipe(Schema.brand("AppBuilder.ProtocolId"))
export type ProtocolId = typeof ProtocolId.Type
export const RunId = Identity.pipe(Schema.brand("AppBuilder.RunId"))
export type RunId = typeof RunId.Type
export const ToolId = Identity.pipe(Schema.brand("AppBuilder.ToolId"))
export type ToolId = typeof ToolId.Type
export const PlanId = Identity.pipe(Schema.brand("AppBuilder.PlanId"))
export type PlanId = typeof PlanId.Type
export const CallbackId = Identity.pipe(Schema.brand("AppBuilder.CallbackId"))
export type CallbackId = typeof CallbackId.Type
export const ContinuationId = Identity.pipe(Schema.brand("AppBuilder.ContinuationId"))
export type ContinuationId = typeof ContinuationId.Type
export const TraceId = Identity.pipe(Schema.brand("AppBuilder.TraceId"))
export type TraceId = typeof TraceId.Type
export const SchemaId = Identity.pipe(Schema.brand("AppBuilder.SchemaId"))
export type SchemaId = typeof SchemaId.Type
export const DigestId = Identity.pipe(Schema.brand("AppBuilder.DigestId"))
export type DigestId = typeof DigestId.Type

const decode = <S extends Schema.ConstraintDecoder<unknown>>(schema: S, input: unknown, domain: IdentityDomain) =>
  Result.try({
    try: () => Schema.decodeUnknownResult(schema)(input),
    catch: () => new MalformedIdentity({ domain }),
  }).pipe(
    Result.flatMap((result) => result),
    Result.mapError(() => new MalformedIdentity({ domain })),
  )

export const decodeProtocolId = (input: unknown) => decode(ProtocolId, input, "protocol")
export const decodeRunId = (input: unknown) => decode(RunId, input, "run")
export const decodeToolId = (input: unknown) => decode(ToolId, input, "tool")
export const decodePlanId = (input: unknown) => decode(PlanId, input, "plan")
export const decodeCallbackId = (input: unknown) => decode(CallbackId, input, "callback")
export const decodeContinuationId = (input: unknown) => decode(ContinuationId, input, "continuation")
export const decodeTraceId = (input: unknown) => decode(TraceId, input, "trace")
export const decodeSchemaId = (input: unknown) => decode(SchemaId, input, "schema")
export const decodeDigestId = (input: unknown) => decode(DigestId, input, "digest")
