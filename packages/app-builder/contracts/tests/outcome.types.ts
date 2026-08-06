import * as Schema from "effect/Schema"
import { CompleteEnvelope, type CompleteEnvelopeEncoded, type CompleteEnvelopeType } from "../src/envelope.js"
import type { CallbackRef, ContinuationRef, RunRef, SchemaRef } from "../src/reference.js"
import type { Version } from "../src/version.js"
import { Outcome, type OutcomeEncoded, type OutcomeType } from "../src/outcome.js"

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <Value>() => Value extends Right ? 1 : 2 ? true : false
type Expect<Value extends true> = Value

const outcome = Outcome(Schema.NumberFromString, Schema.DateFromString)
const completeEnvelope = CompleteEnvelope(Schema.NumberFromString, Schema.DateFromString)

type Decoded = OutcomeType<typeof Schema.NumberFromString, typeof Schema.DateFromString>
type Encoded = OutcomeEncoded<typeof Schema.NumberFromString, typeof Schema.DateFromString>

declare const callbackRef: CallbackRef
declare const continuationRef: ContinuationRef
declare const responseSchemaRef: SchemaRef
declare const protocolVersion: Version
declare const runRef: RunRef

const decodedSuccess: Decoded = { _tag: "Success", value: 42 }
const decodedFailure: Decoded = { _tag: "Failure", failure: new Date("2026-07-29T00:00:00.000Z") }
const decodedInputRequired: Decoded = { _tag: "InputRequired", callbackRef, continuationRef, responseSchemaRef }
const encodedSuccess: Encoded = { _tag: "Success", value: "42" }
const encodedFailure: Encoded = { _tag: "Failure", failure: "2026-07-29T00:00:00.000Z" }
const decodedEnvelope: CompleteEnvelopeType<typeof Schema.NumberFromString, typeof Schema.DateFromString> = {
  protocolVersion,
  runRef,
  outcome: decodedSuccess,
  diagnostics: [],
}
const encodedEnvelope: CompleteEnvelopeEncoded<typeof Schema.NumberFromString, typeof Schema.DateFromString> = {
  protocolVersion: { major: 1, minor: 0, patch: 0 },
  runRef: { id: "run:outcome", version: { major: 1, minor: 0, patch: 0 } },
  outcome: encodedSuccess,
  diagnostics: [],
}

export type ExactTags = Expect<Equal<Decoded["_tag"], "Success" | "Failure" | "InputRequired">>

// @ts-expect-error encoded success values remain strings, not decoded numbers
const rejectedEncodedSuccess: Encoded = { _tag: "Success", value: 42 }
// @ts-expect-error decoded failure values remain Dates, not their encoded strings
const rejectedDecodedFailure: Decoded = { _tag: "Failure", failure: "2026-07-29T00:00:00.000Z" }
// @ts-expect-error success values cannot occupy the failure branch.
const rejectedDecodedBranch: Decoded = { _tag: "Failure", failure: 42 }
const rejectedEncodedEnvelope: CompleteEnvelopeEncoded<typeof Schema.NumberFromString, typeof Schema.DateFromString> = {
  ...encodedEnvelope,
  // @ts-expect-error encoded envelopes retain encoded outcome payloads after fieldsAssign
  outcome: decodedSuccess,
}

interface RequiredService {
  readonly service: "required"
}
declare const serviceCodec: Schema.ConstraintCodec<unknown, unknown, RequiredService, never>

// @ts-expect-error synchronous Outcome codecs must be service-free
Outcome(serviceCodec, Schema.String)

void outcome
void completeEnvelope
void decodedSuccess
void decodedFailure
void decodedInputRequired
void encodedSuccess
void encodedFailure
void decodedEnvelope
void encodedEnvelope
void rejectedEncodedSuccess
void rejectedDecodedFailure
void rejectedDecodedBranch
void rejectedEncodedEnvelope
