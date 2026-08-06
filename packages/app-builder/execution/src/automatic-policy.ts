import { Reference } from "@effectify/app-builder-contracts"
import * as Schema from "effect/Schema"

export const PolicyRequestId = Schema.NonEmptyString.pipe(Schema.brand("AppBuilder.PolicyRequestId"))
export type PolicyRequestId = typeof PolicyRequestId.Type

export const FactValue = Schema.Union([Schema.Null, Schema.Boolean, Schema.Finite, Schema.String])
export type FactValue = typeof FactValue.Type

export const Fact = Schema.Struct({
  key: Schema.NonEmptyString,
  value: FactValue,
})
export type Fact = typeof Fact.Type

export const SecretSource = Schema.Literals(["environment", "prompt"])
export type SecretSource = typeof SecretSource.Type

export const SecretDescriptor = Schema.Struct({
  key: Schema.NonEmptyString,
  present: Schema.Boolean,
  source: SecretSource,
})
export type SecretDescriptor = typeof SecretDescriptor.Type

export const PolicyDecision = Schema.TaggedUnion({
  Approved: {},
  Denied: { reason: Schema.NonEmptyString },
  InputRequired: { reason: Schema.NonEmptyString },
})
export type PolicyDecision = typeof PolicyDecision.Type

export const PolicyRequest = Schema.Struct({
  requestId: PolicyRequestId,
  policyRef: Reference.ProtocolRef,
  runRef: Reference.RunRef,
  planRef: Reference.PlanRef,
  lifecycleIdempotent: Schema.Boolean,
  facts: Schema.Array(Fact),
  secrets: Schema.Array(SecretDescriptor),
})
export type PolicyRequest = typeof PolicyRequest.Type

export const PolicyReceipt = Schema.Struct({
  requestId: PolicyRequestId,
  policyRef: Reference.ProtocolRef,
  decision: PolicyDecision,
  facts: Schema.Array(Fact),
  secrets: Schema.Array(SecretDescriptor),
})
export type PolicyReceipt = typeof PolicyReceipt.Type
