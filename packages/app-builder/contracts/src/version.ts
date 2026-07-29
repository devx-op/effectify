import * as Order from "effect/Order"
import * as Result from "effect/Result"
import * as Schema from "effect/Schema"
import { type VersionFailureSource, IncompatibleVersion, MalformedVersion } from "./identity-failure.js"

export const VersionComponent = Schema.Number.check(
  Schema.isInt(),
  Schema.isGreaterThanOrEqualTo(0),
  Schema.isLessThanOrEqualTo(Number.MAX_SAFE_INTEGER),
).pipe(Schema.brand("AppBuilder.VersionComponent"))
export type VersionComponent = typeof VersionComponent.Type

export const Version = Schema.Struct({ major: VersionComponent, minor: VersionComponent, patch: VersionComponent })
export type Version = typeof Version.Type
export const VersionSupport = Schema.Struct({
  major: VersionComponent,
  supportedMinors: Schema.Array(VersionComponent),
})
export type VersionSupport = typeof VersionSupport.Type

const decode = <S extends Schema.ConstraintDecoder<unknown>>(
  schema: S,
  input: unknown,
  source: VersionFailureSource,
): Result.Result<S["Type"], MalformedVersion> =>
  Result.try({
    try: () => Schema.decodeUnknownResult(schema)(input),
    catch: () => new MalformedVersion({ source }),
  }).pipe(
    Result.flatMap((result) => result),
    Result.mapError(() => new MalformedVersion({ source })),
  )

export const decodeVersion = (input: unknown) => decode(Version, input, "candidate")

const VersionOrder = Order.combineAll([
  Order.mapInput(Order.Number, (version: Version) => version.major),
  Order.mapInput(Order.Number, (version: Version) => version.minor),
  Order.mapInput(Order.Number, (version: Version) => version.patch),
])

export const compareVersions = VersionOrder

const checkSupport = (candidate: Version, support: VersionSupport) =>
  Result.succeed(support).pipe(
    Result.filterOrFail(
      (value) => value.major === candidate.major,
      () => new IncompatibleVersion({ reason: "unsupported-major" }),
    ),
    Result.filterOrFail(
      (value) => value.supportedMinors.includes(candidate.minor),
      () => new IncompatibleVersion({ reason: "unsupported-minor" }),
    ),
    Result.map(() => candidate),
  )

export const checkCompatibility = (
  candidate: unknown,
  support: unknown,
): Result.Result<Version, MalformedVersion | IncompatibleVersion> =>
  Result.gen(function* () {
    const decodedCandidate = yield* decodeVersion(candidate)
    const decodedSupport = yield* decode(VersionSupport, support, "support")
    return yield* checkSupport(decodedCandidate, decodedSupport)
  })
