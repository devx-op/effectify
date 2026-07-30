import * as Schema from "effect/Schema"

export const IdentityDomain = Schema.Literals([
  "protocol",
  "run",
  "tool",
  "plan",
  "callback",
  "continuation",
  "trace",
  "schema",
  "digest",
])
export type IdentityDomain = typeof IdentityDomain.Type

export const VersionFailureSource = Schema.Literals(["candidate", "support", "reference"])
export type VersionFailureSource = typeof VersionFailureSource.Type

export const IncompatibleVersionReason = Schema.Literals(["unsupported-major", "unsupported-minor"])
export type IncompatibleVersionReason = typeof IncompatibleVersionReason.Type

export class MalformedIdentity extends Schema.TaggedErrorClass<MalformedIdentity>()("MalformedIdentity", {
  domain: IdentityDomain,
}) {}

export class MalformedVersion extends Schema.TaggedErrorClass<MalformedVersion>()("MalformedVersion", {
  source: VersionFailureSource,
}) {}

export class IncompatibleVersion extends Schema.TaggedErrorClass<IncompatibleVersion>()("IncompatibleVersion", {
  reason: IncompatibleVersionReason,
}) {}

export class MalformedDigestMetadata extends Schema.TaggedErrorClass<MalformedDigestMetadata>()(
  "MalformedDigestMetadata",
  {},
) {}
