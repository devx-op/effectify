import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"

export const CliCommands = ["catalog", "plan", "generate", "verify", "replay", "explain", "doctor"] as const
export const CliCommandSchema = Schema.Literals(CliCommands)
export type CliCommand = typeof CliCommandSchema.Type

export const CliRequestSchema = Schema.Struct({
  version: Schema.Literal("effectify.app-builder-cli-request/1"),
  command: CliCommandSchema,
  payload: Schema.Unknown,
})
export type CliRequest = typeof CliRequestSchema.Type

export const CliSuccessSchema = Schema.Struct({
  _tag: Schema.Literal("Success"),
  command: CliCommandSchema,
  result: Schema.Unknown,
})
export const CliUnavailableSchema = Schema.Struct({
  _tag: Schema.Literal("NotAvailable"),
  command: CliCommandSchema,
})
export const CliErrorSchema = Schema.Struct({
  _tag: Schema.Literals(["InputError", "ConflictError", "HostError"]),
  reason: Schema.String,
})
export const CliTerminalEnvelopeSchema = Schema.Struct({
  version: Schema.Literal("effectify.app-builder-cli-terminal/1"),
  terminal: Schema.Unknown,
})
export const CliEventSchema = Schema.Struct({
  version: Schema.Literal("effectify.app-builder-cli-event/1"),
  _tag: Schema.Literal("Event"),
  command: CliCommandSchema,
  event: Schema.Literal("accepted"),
})

export interface CliSuccess {
  readonly _tag: "Success"
  readonly command: CliCommand
  readonly result: unknown
}

export interface CliUnavailable {
  readonly _tag: "NotAvailable"
  readonly command: CliCommand
}

export type CliTerminal = CliSuccess | CliUnavailable

export class InputError extends Data.TaggedError("InputError")<{
  readonly reason: string
}> {}

export class ConflictError extends Data.TaggedError("ConflictError")<{
  readonly reason: string
}> {}

export class HostError extends Data.TaggedError("HostError")<{
  readonly reason: string
}> {}

export type CliFailure = ConflictError | InputError | HostError

export const isCliCommand = (value: string): value is CliCommand =>
  value === "catalog" ||
  value === "plan" ||
  value === "generate" ||
  value === "verify" ||
  value === "replay" ||
  value === "explain" ||
  value === "doctor"

export const decodeCliRequest = (input: unknown): Effect.Effect<CliRequest, InputError> =>
  Schema.decodeUnknownEffect(CliRequestSchema, { onExcessProperty: "error" })(input).pipe(
    Effect.mapError(() => new InputError({ reason: "request must match effectify.app-builder-cli-request/1" })),
  )

export const success = (command: CliCommand, result: unknown): CliSuccess => ({ _tag: "Success", command, result })

export const unavailable = (command: CliCommand): CliUnavailable => ({ _tag: "NotAvailable", command })
