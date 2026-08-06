import * as Schema from "effect/Schema"
import { decodeStrict, MalformedOutcome } from "./outcome-failure.js"
import { CallbackRef, ContinuationRef, SchemaRef } from "./reference.js"

export type ServiceFreeCodec = Schema.ConstraintCodec<unknown, unknown, never, never>

export const Outcome = <Success extends ServiceFreeCodec, Failure extends ServiceFreeCodec>(
  success: Success,
  failure: Failure,
) =>
  Schema.TaggedUnion({
    Success: { value: success },
    Failure: { failure },
    InputRequired: {
      callbackRef: CallbackRef,
      continuationRef: ContinuationRef,
      responseSchemaRef: SchemaRef,
    },
  })

export type OutcomeType<Success extends ServiceFreeCodec, Failure extends ServiceFreeCodec> = ReturnType<
  typeof Outcome<Success, Failure>
>["Type"]

export type OutcomeEncoded<Success extends ServiceFreeCodec, Failure extends ServiceFreeCodec> = ReturnType<
  typeof Outcome<Success, Failure>
>["Encoded"]

export const decodeOutcome = <Success extends ServiceFreeCodec, Failure extends ServiceFreeCodec>(
  outcome: ReturnType<typeof Outcome<Success, Failure>>,
  input: unknown,
) => decodeStrict(outcome, input, () => new MalformedOutcome())
