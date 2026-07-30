import { expect, it } from "@effect/vitest"
import * as Result from "effect/Result"
import * as Schema from "effect/Schema"
import { decodeOutcome, Outcome } from "../src/outcome.js"

const outcome = Outcome(Schema.NumberFromString, Schema.DateFromString)
const reference = (id: string) => ({ id, version: { major: 1, minor: 0, patch: 0 } })
const inputRequired = {
  _tag: "InputRequired",
  callbackRef: reference("callback:request"),
  continuationRef: reference("continuation:request"),
  responseSchemaRef: reference("schema:request"),
} as const

it("round trips distinct decoded and encoded success and failure payload channels", () => {
  const success = decodeOutcome(outcome, { _tag: "Success", value: "42" })
  const failure = decodeOutcome(outcome, { _tag: "Failure", failure: "2026-07-29T00:00:00.000Z" })

  expect(success).toMatchObject({ _tag: "Success", success: { _tag: "Success", value: 42 } })
  expect(failure).toMatchObject({
    _tag: "Success",
    success: { _tag: "Failure", failure: new Date("2026-07-29T00:00:00.000Z") },
  })

  const encoded = Result.match(success, {
    onFailure: (failure) => {
      throw failure
    },
    onSuccess: (value) => Schema.encodeUnknownResult(outcome, { onExcessProperty: "error" })(value),
  })
  expect(encoded).toMatchObject({ _tag: "Success", success: { _tag: "Success", value: "42" } })

  const encodedFailure = Result.match(failure, {
    onFailure: (failure) => {
      throw failure
    },
    onSuccess: (value) => Schema.encodeUnknownResult(outcome, { onExcessProperty: "error" })(value),
  })
  expect(encodedFailure).toMatchObject({
    _tag: "Success",
    success: { _tag: "Failure", failure: "2026-07-29T00:00:00.000Z" },
  })
})

it("defines exactly the three closed outcome cases and exposes reference-only input requests", () => {
  expect(Object.keys(outcome.cases)).toEqual(["Success", "Failure", "InputRequired"])

  const decoded = decodeOutcome(outcome, inputRequired)
  expect(decoded).toMatchObject({ _tag: "Success", success: inputRequired })
  expect(
    Result.match(decoded, {
      onFailure: (failure) => {
        throw failure
      },
      onSuccess: (value) => Object.keys(value).sort(),
    }),
  ).toEqual(["_tag", "callbackRef", "continuationRef", "responseSchemaRef"])

  const encoded = Result.match(decoded, {
    onFailure: (failure) => {
      throw failure
    },
    onSuccess: (value) => Schema.encodeUnknownResult(outcome, { onExcessProperty: "error" })(value),
  })
  expect(encoded).toMatchObject({ _tag: "Success", success: inputRequired })
})

it("rejects unknown, contradictory, incomplete, and excess outcome cases", () => {
  for (const input of [
    { _tag: "Pending" },
    { _tag: "Success", value: "42", failure: "2026-07-29T00:00:00.000Z" },
    { _tag: "Failure" },
    { ...inputRequired, value: "unexpected" },
  ]) {
    expect(decodeOutcome(outcome, input)).toMatchObject({
      _tag: "Failure",
      failure: { _tag: "MalformedOutcome" },
    })
  }
})
