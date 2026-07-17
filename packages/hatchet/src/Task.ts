import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import type * as Schema from "effect/Schema"

export interface Context {
  readonly workflowRunId: Option.Option<string>
  readonly taskRunExternalId: Option.Option<string>
  readonly interruption: Effect.Effect<never, never, never>
}

export const Context = {
  empty: {
    workflowRunId: Option.none(),
    taskRunExternalId: Option.none(),
    interruption: Effect.never,
  } satisfies Context,
}

export interface Task<
  out Name extends string,
  out Input,
  out Output,
  out Error,
  out Requirements,
> {
  readonly name: Name
  readonly inputSchema: Schema.Codec<Input, unknown, never, never> | undefined
  readonly outputSchema:
    | Schema.Codec<Output, unknown, never, never>
    | undefined
  execute(
    input: Input,
    context: Context,
  ): Effect.Effect<Output, Error, Requirements>
}

export type Any<Requirements = unknown> = Task<
  string,
  unknown,
  unknown,
  unknown,
  Requirements
>

export type Requirements<T> = T extends Task<string, unknown, unknown, unknown, infer R> ? R : never

export interface MakeOptions<
  Name extends string,
  Input,
  Output,
  Error,
  Requirements,
> {
  readonly name: Name
  readonly input?: Schema.Codec<Input, unknown, never, never>
  readonly output?: Schema.Codec<Output, unknown, never, never>
  readonly fn: (
    input: Input,
    context: Context,
  ) => Effect.Effect<Output, Error, Requirements>
}

export const make = <
  const Name extends string,
  Input,
  Output,
  Error,
  Requirements,
>(
  options: MakeOptions<Name, Input, Output, Error, Requirements>,
): Task<Name, Input, Output, Error, Requirements> => ({
  name: options.name,
  inputSchema: options.input,
  outputSchema: options.output,
  execute: options.fn,
})
