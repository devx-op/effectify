import { expect, it } from "@effect/vitest"
import * as Result from "effect/Result"
import * as Schema from "effect/Schema"
import { CompleteEnvelope, decodeCompleteEnvelope } from "../src/envelope.js"

const completeEnvelope = CompleteEnvelope(Schema.NumberFromString, Schema.DateFromString)
const reference = (id: string) => ({ id, version: { major: 1, minor: 0, patch: 0 } })
const encodedEnvelope = {
  protocolVersion: { major: 1, minor: 0, patch: 0 },
  runRef: reference("run:diagnostics"),
  outcome: { _tag: "Success", value: "42" },
  diagnostics: [
    { severity: "warning", code: "field.invalid", message: "First warning", path: ["items", 0] },
    { severity: "error", code: "field.invalid", message: "Second warning", path: ["items", 1, "name"] },
  ],
} as const

it("composes identity, one typed outcome, and one root-only ordered diagnostics collection", () => {
  const decoded = decodeCompleteEnvelope(completeEnvelope, encodedEnvelope)

  expect(decoded).toMatchObject({
    _tag: "Success",
    success: {
      protocolVersion: encodedEnvelope.protocolVersion,
      runRef: encodedEnvelope.runRef,
      outcome: { _tag: "Success", value: 42 },
      diagnostics: encodedEnvelope.diagnostics,
    },
  })
  expect(
    Result.match(decoded, {
      onFailure: (failure) => {
        throw failure
      },
      onSuccess: (value) => Object.keys(value.outcome).sort(),
    }),
  ).toEqual(["_tag", "value"])

  const encoded = Result.match(decoded, {
    onFailure: (failure) => {
      throw failure
    },
    onSuccess: (value) => Schema.encodeUnknownResult(completeEnvelope, { onExcessProperty: "error" })(value),
  })
  expect(encoded).toMatchObject({ _tag: "Success", success: encodedEnvelope })
})

it("round trips failure and input-required envelopes through the shared root", () => {
  const inputs = [
    {
      ...encodedEnvelope,
      outcome: { _tag: "Failure", failure: "2026-07-29T00:00:00.000Z" },
      diagnostics: [],
    },
    {
      ...encodedEnvelope,
      outcome: {
        _tag: "InputRequired",
        callbackRef: reference("callback:request"),
        continuationRef: reference("continuation:request"),
        responseSchemaRef: reference("schema:request"),
      },
      diagnostics: [encodedEnvelope.diagnostics[1]],
    },
  ] as const

  for (const input of inputs) {
    const decoded = decodeCompleteEnvelope(completeEnvelope, input)
    const encoded = Result.match(decoded, {
      onFailure: (failure) => {
        throw failure
      },
      onSuccess: (value) => Schema.encodeUnknownResult(completeEnvelope, { onExcessProperty: "error" })(value),
    })

    expect(encoded).toMatchObject({ _tag: "Success", success: input })
  }
})

it("rejects excess root, outcome, and diagnostic fields", () => {
  for (const input of [
    { ...encodedEnvelope, extra: "rejected" },
    { ...encodedEnvelope, outcome: { ...encodedEnvelope.outcome, extra: "rejected" } },
    { ...encodedEnvelope, outcome: { ...encodedEnvelope.outcome, diagnostics: [] } },
    {
      ...encodedEnvelope,
      diagnostics: [{ ...encodedEnvelope.diagnostics[0], extra: "rejected" }],
    },
  ]) {
    expect(decodeCompleteEnvelope(completeEnvelope, input)).toMatchObject({
      _tag: "Failure",
      failure: { _tag: "MalformedCompleteEnvelope" },
    })
  }
})
