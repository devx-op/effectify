import { expect, it } from "@effect/vitest"
import * as Result from "effect/Result"
import * as Schema from "effect/Schema"
import { type ProtocolId, type RunId, decodeToolId } from "../src/identity.js"
import {
  CallbackRef,
  ContinuationRef,
  DigestRef,
  PlanRef,
  ProtocolRef,
  RunRef,
  SchemaRef,
  ToolRef,
  TraceRef,
  decodeCallbackRef,
  decodeContinuationRef,
  decodeDigestRef,
  decodePlanRef,
  decodeProtocolRef,
  decodeRunRef,
  decodeSchemaRef,
  decodeToolRef,
  decodeTraceRef,
} from "../src/reference.js"

const input = { id: "app-builder:item", version: { major: 1, minor: 0, patch: 0 } }
const digestInput = {
  id: "digest:replay-material",
  version: { major: 1, minor: 0, patch: 0 },
  algorithm: "sha256",
  value: "55e5182971d95806bc67a72c04387e34e8a81e2001ab258058534f95b90e4b1f",
}

const assertRoundTrip = <S extends Schema.ConstraintDecoder<unknown> & Schema.ConstraintEncoder<unknown>, E>(
  schema: S,
  decode: (input: unknown) => Result.Result<S["Type"], E>,
) => {
  const encoded = Result.match(decode(input), {
    onFailure: (failure) => {
      throw failure
    },
    onSuccess: (decoded) => Schema.encodeUnknownResult(schema)(decoded),
  })
  expect(encoded).toMatchObject({ _tag: "Success", success: input })
}

it("round trips eight ordinary branded references", () => {
  assertRoundTrip(ProtocolRef, decodeProtocolRef)
  assertRoundTrip(RunRef, decodeRunRef)
  assertRoundTrip(ToolRef, decodeToolRef)
  assertRoundTrip(PlanRef, decodePlanRef)
  assertRoundTrip(CallbackRef, decodeCallbackRef)
  assertRoundTrip(ContinuationRef, decodeContinuationRef)
  assertRoundTrip(TraceRef, decodeTraceRef)
  assertRoundTrip(SchemaRef, decodeSchemaRef)
})

it("round trips an external four-key digest reference without computing a digest", () => {
  const decoded = Result.getOrThrowWith(decodeDigestRef(digestInput), (failure) => failure)

  expect(Object.keys(decoded).sort()).toEqual(["algorithm", "id", "value", "version"])
  expect(decoded).toEqual(digestInput)
  expect(Schema.encodeUnknownResult(DigestRef)(decoded)).toMatchObject({ _tag: "Success", success: digestInput })
})

it("rejects absent or malformed external digest metadata", () => {
  expect(decodeDigestRef({ id: "digest:replay-material", version: input.version })).toMatchObject({
    _tag: "Failure",
    failure: { _tag: "MalformedDigestMetadata" },
  })
  expect(decodeDigestRef({ ...digestInput, algorithm: "SHA256" })).toMatchObject({
    _tag: "Failure",
    failure: { _tag: "MalformedDigestMetadata" },
  })
})

it("rejects malformed IDs and stages malformed reference versions", () => {
  expect(decodeToolId("UPPER")).toMatchObject({
    _tag: "Failure",
    failure: { _tag: "MalformedIdentity", domain: "tool" },
  })
  expect(decodeRunRef({ id: "run:one", version: { major: -1, minor: 0, patch: 0 } })).toMatchObject({
    _tag: "Failure",
    failure: { _tag: "MalformedVersion", source: "reference" },
  })
})

declare const protocolId: ProtocolId
declare const runId: RunId
const assertNominalIdentity = () => {
  const retainedProtocolId: ProtocolId = protocolId
  // @ts-expect-error protocol and run IDs are distinct nominal types
  const rejectedProtocolId: ProtocolId = runId
  void retainedProtocolId
  void rejectedProtocolId
}
void assertNominalIdentity
