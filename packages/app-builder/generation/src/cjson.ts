import { canonicalJsonBytes, canonicalizeJson } from "@effectify/app-builder-contracts"
import { createHash } from "node:crypto"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as Result from "effect/Result"

export const CanonicalJsonAlgorithm = "effectify-cjson/1" as const

export class CanonicalJsonError extends Data.TaggedError("CanonicalJsonError")<{
  readonly reason: "unsupported-json"
}> {}

const sha256 = (value: string | Uint8Array): string => `sha256:${createHash("sha256").update(value).digest("hex")}`

export const canonicalDigest = (input: unknown): Effect.Effect<string, CanonicalJsonError> =>
  Result.match(canonicalizeJson(input), {
    onFailure: () => Effect.fail(new CanonicalJsonError({ reason: "unsupported-json" })),
    onSuccess: (value) => Effect.succeed(sha256(canonicalJsonBytes(value))),
  })

export const normalizeSource = (source: string): string => source.replace(/\r\n?/g, "\n")

export const canonicalSourceDigest = (source: string): string => sha256(normalizeSource(source))
