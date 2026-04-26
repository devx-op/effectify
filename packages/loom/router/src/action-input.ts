import * as Result from "effect/Result"
import * as Schema from "effect/Schema"

export type Value = string | ReadonlyArray<string>

export type Normalized = Readonly<Record<string, Value>>

type RecordValue = string | number | boolean | null | undefined
type SubmissionRecord = Readonly<Record<string, RecordValue | ReadonlyArray<RecordValue>>>

export type Submission =
  | FormData
  | URLSearchParams
  | SubmissionRecord
  | Normalized

export interface Failure {
  readonly _tag: "LoomRouterActionInputFailure"
  readonly message: string
  readonly input: unknown
}

export interface Decoder<Output> {
  readonly _tag: "LoomRouterActionInputDecoder"
  readonly decode: (input: Normalized) => Result.Result<Output, Failure>
}

export type SchemaDecoder<Output> = Schema.Schema<Output> & {
  readonly DecodingServices: never
}

export type DecoderLike<Output> = Decoder<Output> | SchemaDecoder<Output>

export type DecodeResult<Output> = Result.Result<Output, Failure>

const isNormalized = (value: Submission): value is Normalized => {
  if (value instanceof FormData || value instanceof URLSearchParams) {
    return false
  }

  return Object.values(value).every((entry) =>
    typeof entry === "string" || Array.isArray(entry) && entry.every((item) => typeof item === "string")
  )
}

const normalizeScalar = (value: RecordValue): string => {
  if (value === null || value === undefined) {
    return ""
  }

  return String(value)
}

const isRecordValueArray = (value: SubmissionRecord[string]): value is ReadonlyArray<RecordValue> =>
  Array.isArray(value)

const normalizeRecordEntry = (value: SubmissionRecord[string]): Value => {
  if (isRecordValueArray(value)) {
    return value.map((entry) => normalizeScalar(entry))
  }

  return normalizeScalar(value)
}

const appendValue = (target: Record<string, Value>, key: string, value: string): void => {
  const current = target[key]

  if (current === undefined) {
    target[key] = value
    return
  }

  if (Array.isArray(current)) {
    target[key] = [...current, value]
    return
  }

  target[key] = typeof current === "string" ? [current, value] : [value]
}

/** Create an explicit decoder for normalized action submissions. */
export const make = <Output>(decode: (input: Normalized) => DecodeResult<Output>): Decoder<Output> => ({
  _tag: "LoomRouterActionInputDecoder",
  decode,
})

/** Create a successful action-input decode result. */
export const succeed = <Output>(output: Output): DecodeResult<Output> => Result.succeed(output)

/** Create a failed action-input decode result. */
export const fail = (message: string, input: unknown): DecodeResult<never> =>
  Result.fail({
    _tag: "LoomRouterActionInputFailure",
    message,
    input,
  })

/** Create an action-input decoder from an Effect Schema. */
export const schema = <Output>(value: SchemaDecoder<Output>): Decoder<Output> =>
  make((input) => {
    try {
      return succeed(Schema.decodeUnknownSync(value)(input))
    } catch (issue) {
      return fail(issue instanceof Error ? issue.message : String(issue), input)
    }
  })

/** Normalize form-like input into a plain record of string values. */
export const normalize = (submission: Submission): DecodeResult<Normalized> => {
  if (isNormalized(submission)) {
    return succeed(submission)
  }

  const normalized: Record<string, Value> = {}

  if (submission instanceof URLSearchParams) {
    for (const [key, value] of submission.entries()) {
      appendValue(normalized, key, value)
    }

    return succeed(normalized)
  }

  if (submission instanceof FormData) {
    for (const [key, value] of submission.entries()) {
      if (typeof value !== "string") {
        return fail("File uploads are not supported by the current Loom action-input runtime", submission)
      }

      appendValue(normalized, key, value)
    }

    return succeed(normalized)
  }

  for (const [key, value] of Object.entries(submission as SubmissionRecord)) {
    normalized[key] = normalizeRecordEntry(value)
  }

  return succeed(normalized)
}

/** Normalize a decoder-like input into the action-input decoder contract. */
export const toDecoder = <Output>(value: DecoderLike<Output>): Decoder<Output> =>
  "decode" in value ? value : schema(value)

/** Decode normalized action submissions from form-like transport values. */
export const decode = <Output>(options: {
  readonly decoder: DecoderLike<Output>
  readonly submission: Submission
}): DecodeResult<Output> => {
  const normalized = normalize(options.submission)

  if (Result.isFailure(normalized)) {
    return Result.fail(normalized.failure)
  }

  return toDecoder(options.decoder).decode(normalized.success)
}

/** Build a standardized invalid-input failure when submit(...) lacks decoder metadata. */
export const missingDecoderFailure = (input: Submission): Failure => ({
  _tag: "LoomRouterActionInputFailure",
  message: "Action submission requires explicit input or decodeInput metadata on the route action descriptor",
  input,
})
