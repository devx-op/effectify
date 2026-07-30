import * as Schema from "effect/Schema"

export class UnsupportedReplayJson extends Schema.TaggedErrorClass<UnsupportedReplayJson>()(
  "UnsupportedReplayJson",
  {},
) {}

export class MalformedReplayContract extends Schema.TaggedErrorClass<MalformedReplayContract>()(
  "MalformedReplayContract",
  {},
) {}

export type ReplayFailure = UnsupportedReplayJson | MalformedReplayContract
