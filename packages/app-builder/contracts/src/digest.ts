import * as Schema from "effect/Schema"

/** External digest algorithm identity. Digest computation is intentionally outside this package. */
export const DigestAlgorithm = Schema.String.check(Schema.isPattern(/^[a-z][a-z0-9-]{0,63}$/)).pipe(
  Schema.brand("AppBuilder.DigestAlgorithm"),
)
export type DigestAlgorithm = typeof DigestAlgorithm.Type

/** Opaque, externally supplied digest value. This contract never hashes or verifies it. */
export const DigestValue = Schema.NonEmptyString.pipe(Schema.brand("AppBuilder.DigestValue"))
export type DigestValue = typeof DigestValue.Type
