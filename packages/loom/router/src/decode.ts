import * as Result from "effect/Result"
import * as Schema from "effect/Schema"

export interface Failure {
  readonly _tag: "LoomRouterDecodeFailure"
  readonly message: string
  readonly input: unknown
}

export interface Issue extends Failure {
  readonly phase: "params" | "search"
}

export interface Decoder<Input, Output> {
  readonly _tag: "LoomRouterDecoder"
  readonly decode: (input: Input) => Result.Result<Output, Failure>
}

export type SchemaDecoder<Output> = Schema.Schema<Output> & {
  readonly DecodingServices: never
}

export type DecoderLike<Input, Output> = Decoder<Input, Output> | SchemaDecoder<Output>

/** Decoder result contract for router params/search decoding. */
export type DecodeResult<Output> = Result.Result<Output, Failure>

/** Create a decoder from an explicit Either-producing function. */
export const make = <Input, Output>(decode: (input: Input) => DecodeResult<Output>): Decoder<Input, Output> => ({
  _tag: "LoomRouterDecoder",
  decode,
})

/** Create a successful router decode result. */
export const succeed = <Output>(output: Output): DecodeResult<Output> => Result.succeed(output)

/** Create a failed router decode result. */
export const fail = (message: string, input: unknown): DecodeResult<never> =>
  Result.fail({
    _tag: "LoomRouterDecodeFailure",
    message,
    input,
  })

/** Create an identity decoder for passthrough params/search values. */
export const identity = <Value>(): Decoder<Value, Value> => make((value) => succeed(value))

/** Create a router decoder from an Effect Schema. */
export const schema = <Input, Output>(value: SchemaDecoder<Output>): Decoder<Input, Output> =>
  make((input) => {
    try {
      return succeed(Schema.decodeUnknownSync(value)(input))
    } catch (issue) {
      return fail(issue instanceof Error ? issue.message : String(issue), input)
    }
  })

/** Normalize a decoder-like input into the router decoder contract. */
export const toDecoder = <Input, Output>(value: DecoderLike<Input, Output>): Decoder<Input, Output> =>
  "decode" in value ? value : schema(value)
