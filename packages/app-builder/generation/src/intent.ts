import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"

export const Capability = Schema.Literals([
  "todo.workspace",
  "todo.model",
  "todo.port",
  "todo.use-case",
  "todo.file-adapter",
  "todo.cli-presentation",
  "todo.community-labels",
  "todo.events",
])
export type Capability = typeof Capability.Type

export const CreationIntentSchema = Schema.Struct({
  version: Schema.Literal("effectify.creation-intent/1"),
  preset: Schema.Literal("todo"),
  capabilities: Schema.Array(Capability),
})
export type CreationIntent = typeof CreationIntentSchema.Type

export class InvalidCreationIntent extends Data.TaggedError("InvalidCreationIntent")<{
  readonly reason: "schema"
}> {}

/** Decodes the closed, versioned planning input without granting execution authority. */
export const decodeCreationIntent = (input: unknown): Effect.Effect<CreationIntent, InvalidCreationIntent> =>
  Schema.decodeUnknownEffect(CreationIntentSchema, { onExcessProperty: "error" })(input).pipe(
    Effect.mapError(() => new InvalidCreationIntent({ reason: "schema" })),
  )
