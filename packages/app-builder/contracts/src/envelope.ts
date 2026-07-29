import * as Schema from "effect/Schema"
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
