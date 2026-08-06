import { expect, it } from "@effect/vitest"
import * as Result from "effect/Result"
import * as Schema from "effect/Schema"
import { EnvelopeIdentity } from "../src/envelope.js"

const shell = {
  protocolVersion: { major: 1, minor: 0, patch: 0 },
  runRef: { id: "run:one", version: { major: 1, minor: 0, patch: 0 } },
}

it("keeps optional references absent and composes one future outcome", () => {
  const identity = Result.getOrThrowWith(Schema.decodeUnknownResult(EnvelopeIdentity)(shell), (failure) => failure)
  expect(Object.keys(identity)).toEqual(["protocolVersion", "runRef"])
  const FutureEnvelope = EnvelopeIdentity.pipe(Schema.fieldsAssign({ outcome: Schema.Literal("Success") }))
  const composed = Result.getOrThrowWith(
    Schema.decodeUnknownResult(FutureEnvelope)({ ...shell, outcome: "Success" }),
    (failure) => failure,
  )
  expect("status" in composed).toBe(false)
})

it("preserves present trace and digest references", () => {
  const input = {
    ...shell,
    traceRef: { id: "trace:one", version: { major: 1, minor: 1, patch: 0 } },
    planDigestRef: {
      id: "digest:plan",
      version: { major: 1, minor: 2, patch: 0 },
      algorithm: "sha256",
      value: "plan-material",
    },
    outputDigestRef: {
      id: "digest:output",
      version: { major: 1, minor: 3, patch: 0 },
      algorithm: "sha256",
      value: "output-material",
    },
  }
  const identity = Result.getOrThrowWith(Schema.decodeUnknownResult(EnvelopeIdentity)(input), (failure) => failure)

  expect(identity.traceRef).toEqual(input.traceRef)
  expect(identity.planDigestRef).toEqual(input.planDigestRef)
  expect(identity.outputDigestRef).toEqual(input.outputDigestRef)
  expect(Schema.encodeUnknownResult(EnvelopeIdentity)(identity)).toMatchObject({
    _tag: "Success",
    success: input,
  })
})
