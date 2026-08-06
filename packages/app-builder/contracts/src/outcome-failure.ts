import * as Result from "effect/Result"
import * as Schema from "effect/Schema"

export class MalformedDiagnostic extends Schema.TaggedErrorClass<MalformedDiagnostic>()("MalformedDiagnostic", {}) {}

export class MalformedOutcome extends Schema.TaggedErrorClass<MalformedOutcome>()("MalformedOutcome", {}) {}

export class MalformedCompleteEnvelope extends Schema.TaggedErrorClass<MalformedCompleteEnvelope>()(
  "MalformedCompleteEnvelope",
  {},
) {}

const strict = { onExcessProperty: "error" } as const

export const decodeStrict = <S extends Schema.ConstraintDecoder<unknown>, E>(
  schema: S,
  input: unknown,
  freshFailure: () => E,
): Result.Result<S["Type"], E> =>
  Result.try({
    try: () => Schema.decodeUnknownResult(schema, strict)(input),
    catch: freshFailure,
  }).pipe(
    Result.flatMap((result) => result),
    Result.mapError(() => freshFailure()),
  )
