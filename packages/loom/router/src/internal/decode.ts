import * as Result from "effect/Result"
import type * as Decode from "../decode.js"

const withPhase = (phase: Decode.Issue["phase"], failure: Decode.Failure): Decode.Issue => ({
  ...failure,
  phase,
})

export const runDecoder = <Input, Output>(
  decoder: Decode.Decoder<Input, Output>,
  input: Input,
  phase: Decode.Issue["phase"],
): Result.Result<Output, ReadonlyArray<Decode.Issue>> =>
  Result.mapError(decoder.decode(input), (failure) => [withPhase(phase, failure)])
