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

const Identifier = Schema.String.check(Schema.isPattern(/^[a-z][a-z0-9-]{0,62}$/))
const TypeName = Schema.String.check(Schema.isPattern(/^[A-Z][A-Za-z0-9]{0,62}$/))
const Naming = Schema.Struct({
  workspace: Identifier,
  npmScope: Schema.String.check(Schema.isPattern(/^@[a-z][a-z0-9-]{0,62}$/)),
  domain: Schema.Struct({ id: Identifier, name: TypeName }),
  entity: Schema.Struct({ id: Identifier, singular: TypeName, plural: TypeName }),
  entrypoint: Schema.Struct({ id: Identifier, name: TypeName }),
})

export const CreationIntentSchema = Schema.Struct({
  version: Schema.Literal("effectify.creation-intent/1"),
  preset: Schema.Literal("todo"),
  capabilities: Schema.Array(Capability),
  naming: Schema.optionalKey(Naming),
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
