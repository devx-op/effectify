import * as Schema from "effect/Schema"
import { Diagnostic } from "./diagnostic.js"
import { decodeStrict, MalformedCompleteEnvelope } from "./outcome-failure.js"
import { Outcome, type ServiceFreeCodec } from "./outcome.js"
import { DigestRef, RunRef, TraceRef } from "./reference.js"
import { Version } from "./version.js"

export const EnvelopeIdentity = Schema.Struct({
  protocolVersion: Version,
  runRef: RunRef,
  traceRef: Schema.optionalKey(TraceRef),
  planDigestRef: Schema.optionalKey(DigestRef),
  outputDigestRef: Schema.optionalKey(DigestRef),
})
export type EnvelopeIdentity = typeof EnvelopeIdentity.Type

export const CompleteEnvelope = <Success extends ServiceFreeCodec, Failure extends ServiceFreeCodec>(
  success: Success,
  failure: Failure,
) =>
  EnvelopeIdentity.pipe(
    Schema.fieldsAssign({
      outcome: Outcome(success, failure),
      diagnostics: Schema.Array(Diagnostic),
    }),
  )

export type CompleteEnvelopeType<Success extends ServiceFreeCodec, Failure extends ServiceFreeCodec> = ReturnType<
  typeof CompleteEnvelope<Success, Failure>
>["Type"]

export type CompleteEnvelopeEncoded<Success extends ServiceFreeCodec, Failure extends ServiceFreeCodec> = ReturnType<
  typeof CompleteEnvelope<Success, Failure>
>["Encoded"]

export const decodeCompleteEnvelope = <Success extends ServiceFreeCodec, Failure extends ServiceFreeCodec>(
  envelope: ReturnType<typeof CompleteEnvelope<Success, Failure>>,
  input: unknown,
) => decodeStrict(envelope, input, () => new MalformedCompleteEnvelope())
