import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import type * as Schema from "effect/Schema"
import type * as RateLimit from "./RateLimit.js"
import type * as Trigger from "./Trigger.js"

const emptyRateLimits: ReadonlyArray<RateLimit.RateLimit> = Object.freeze([])
const emptyTriggers: ReadonlyArray<Trigger.Trigger> = Object.freeze([])

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

export interface DurableContext extends Context {
  readonly invocationCount: number
}

export const DurableContext = {
  empty: {
    ...Context.empty,
    invocationCount: 0,
  } satisfies DurableContext,
}

export type Kind = "Ordinary" | "Durable"

export interface Task<
  out Name extends string,
  out Input,
  out Output,
  out Error,
  out Requirements,
> {
  readonly _tag: "Ordinary"
  readonly name: Name
  readonly rateLimits: ReadonlyArray<RateLimit.RateLimit>
  readonly triggers: ReadonlyArray<Trigger.Trigger>
  readonly inputSchema: Schema.Codec<Input, unknown, never, never> | undefined
  readonly outputSchema:
    | Schema.Codec<Output, unknown, never, never>
    | undefined
  execute(
    input: Input,
    context: Context,
  ): Effect.Effect<Output, Error, Requirements>
}

export interface DurableTask<
  out Name extends string,
  out Input,
  out Output,
  out Error,
  out Requirements,
> {
  readonly _tag: "Durable"
  readonly name: Name
  readonly rateLimits: ReadonlyArray<RateLimit.RateLimit>
  readonly triggers: ReadonlyArray<Trigger.Trigger>
  readonly inputSchema: Schema.Codec<Input, unknown, never, never> | undefined
  readonly outputSchema:
    | Schema.Codec<Output, unknown, never, never>
    | undefined
  execute(
    input: Input,
    context: DurableContext,
  ): Effect.Effect<Output, Error, Requirements>
}

export type Of<Name extends string, Input, Output, Error, Requirements> =
  | Task<Name, Input, Output, Error, Requirements>
  | DurableTask<Name, Input, Output, Error, Requirements>

export type Any<Requirements = unknown> = Of<
  string,
  unknown,
  unknown,
  unknown,
  Requirements
>

export type Declaration<Requirements = unknown> = Any<Requirements>

export type Requirements<T> = T extends Of<string, unknown, unknown, unknown, infer R> ? R : never

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
  readonly rateLimits?: ReadonlyArray<RateLimit.RateLimit>
  readonly triggers?: ReadonlyArray<Trigger.Trigger>
  readonly fn: (
    input: Input,
    context: Context,
  ) => Effect.Effect<Output, Error, Requirements>
}

export interface DurableOptions<
  Name extends string,
  Input,
  Output,
  Error,
  Requirements,
> {
  readonly name: Name
  readonly input?: Schema.Codec<Input, unknown, never, never>
  readonly output?: Schema.Codec<Output, unknown, never, never>
  readonly rateLimits?: ReadonlyArray<RateLimit.RateLimit>
  readonly triggers?: ReadonlyArray<Trigger.Trigger>
  readonly fn: (
    input: Input,
    context: DurableContext,
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
  _tag: "Ordinary",
  name: options.name,
  rateLimits: options.rateLimits ?? emptyRateLimits,
  triggers: options.triggers ?? emptyTriggers,
  inputSchema: options.input,
  outputSchema: options.output,
  execute: options.fn,
})

export const durable = <
  const Name extends string,
  Input,
  Output,
  Error,
  Requirements,
>(
  options: DurableOptions<Name, Input, Output, Error, Requirements>,
): DurableTask<Name, Input, Output, Error, Requirements> => ({
  _tag: "Durable",
  name: options.name,
  rateLimits: options.rateLimits ?? emptyRateLimits,
  triggers: options.triggers ?? emptyTriggers,
  inputSchema: options.input,
  outputSchema: options.output,
  execute: options.fn,
})
