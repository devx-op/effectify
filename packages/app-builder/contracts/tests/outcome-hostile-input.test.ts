import { expect, it } from "@effect/vitest"
import * as Result from "effect/Result"
import * as Schema from "effect/Schema"
import { decodeDiagnostic } from "../src/diagnostic.js"
import { CompleteEnvelope, decodeCompleteEnvelope } from "../src/envelope.js"
import { decodeOutcome, Outcome } from "../src/outcome.js"

const outcome = Outcome(Schema.String, Schema.String)
const completeEnvelope = CompleteEnvelope(Schema.String, Schema.String)

const expectNonEchoingMalformedDiagnostic = (input: unknown): void => {
  expect(() => decodeDiagnostic(input)).not.toThrow()

  const result = decodeDiagnostic(input)
  expect(result).toMatchObject({ _tag: "Failure", failure: { _tag: "MalformedDiagnostic" } })
  expect(JSON.stringify(result)).not.toContain("secret")
  expect(
    Result.match(result, {
      onFailure: (failure) => Object.keys(failure),
      onSuccess: () => {
        throw new Error("Expected hostile diagnostic input to fail")
      },
    }),
  ).toEqual(["_tag"])

  expect(decodeDiagnostic(input)).not.toBe(result)
}

const expectNonEchoingMalformedOutcome = (input: unknown): void => {
  expect(() => decodeOutcome(outcome, input)).not.toThrow()

  const result = decodeOutcome(outcome, input)
  expect(result).toMatchObject({ _tag: "Failure", failure: { _tag: "MalformedOutcome" } })
  expect(JSON.stringify(result)).not.toContain("secret")
  expect(
    Result.match(result, {
      onFailure: (failure) => Object.keys(failure),
      onSuccess: () => {
        throw new Error("Expected hostile outcome input to fail")
      },
    }),
  ).toEqual(["_tag"])

  expect(decodeOutcome(outcome, input)).not.toBe(result)
}

const expectNonEchoingMalformedCompleteEnvelope = (input: unknown): void => {
  expect(() => decodeCompleteEnvelope(completeEnvelope, input)).not.toThrow()

  const result = decodeCompleteEnvelope(completeEnvelope, input)
  expect(result).toMatchObject({ _tag: "Failure", failure: { _tag: "MalformedCompleteEnvelope" } })
  expect(JSON.stringify(result)).not.toContain("secret")
  expect(
    Result.match(result, {
      onFailure: (failure) => Object.keys(failure),
      onSuccess: () => {
        throw new Error("Expected hostile complete envelope input to fail")
      },
    }),
  ).toEqual(["_tag"])

  expect(decodeCompleteEnvelope(completeEnvelope, input)).not.toBe(result)
}

it("turns throwing diagnostic inspection into a fresh non-echoing failure", () => {
  expectNonEchoingMalformedDiagnostic({
    get severity() {
      throw new Error("secret getter")
    },
  })
  expectNonEchoingMalformedDiagnostic(
    new Proxy(
      {},
      {
        ownKeys: () => {
          throw new Error("secret own keys")
        },
      },
    ),
  )
})

it("turns throwing outcome inspection into a fresh non-echoing failure", () => {
  expectNonEchoingMalformedOutcome({
    get _tag() {
      throw new Error("secret tag")
    },
  })
  expectNonEchoingMalformedOutcome(
    new Proxy(
      {},
      {
        get: () => {
          throw new Error("secret get")
        },
      },
    ),
  )
})

it("turns throwing complete-envelope inspection into a fresh non-echoing failure", () => {
  expectNonEchoingMalformedCompleteEnvelope(
    new Proxy(
      {},
      {
        getOwnPropertyDescriptor: () => {
          throw new Error("secret descriptor")
        },
      },
    ),
  )
})
