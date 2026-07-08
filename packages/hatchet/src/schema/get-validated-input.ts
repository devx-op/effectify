/**
 * @effectify/hatchet - Schema Validation
 *
 * Utilities for validating workflow input using Effect Schema.
 */

import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import { HatchetStepContext } from "../core/context.js"

/**
 * Extracts and validates the workflow input against a Schema.
 *
 * This is the main way to get type-safe input in your tasks.
 *
 * @param schema - The Schema to validate against
 * @returns Effect that resolves to the parsed input
 *
 * @example
 * ```typescript
 * const UserSchema = Schema.Struct({
 *   userId: Schema.String,
 *   email: Schema.String.pipe(Schema.email()),
 * })
 *
 * const myTask = task(
 *   { name: "process-user" },
 *   Effect.gen(function*() {
 *     const input = yield* getValidatedInput(UserSchema)
 *     // input is now typed as { userId: string, email: string }
 *     return yield* processUser(input)
 *   })
 * )
 * ```
 */
export const getValidatedInput = <A>(
  schema: Schema.Schema<A>,
): Effect.Effect<A, Schema.SchemaError, HatchetStepContext> =>
  Effect.flatMap(Effect.service(HatchetStepContext), (ctx) => {
    // SDK v1: input is a property, not ctx.workflowInput()
    const rawInput = ctx.input

    // Use decodeUnknownOption - returns Option, no Effect context needed
    // We cast schema to any because the Schema type system is complex
    // and decodeUnknownOption has constraints we don't need
    const decodeOption = Schema.decodeUnknownOption as (
      s: Schema.Schema<A>,
    ) => (input: unknown) => Option.Option<A>
    const option = decodeOption(schema)(rawInput)

    // Convert Option to Effect - None becomes SchemaError failure
    return Option.match(option, {
      onNone: () => {
        // Create a simple error message - SchemaError expects specific types
        const error = new Error("Input validation failed")
        return Effect.fail(
          Object.assign(error, { _tag: "SchemaError" }) as Schema.SchemaError,
        )
      },
      onSome: (a) => Effect.succeed(a),
    })
  })

/**
 * Extracts raw input without validation.
 * Use this if you want to validate manually or don't need validation.
 *
 * @returns The raw input from the Hatchet context
 */
export const getRawInput = (): Effect.Effect<
  unknown,
  never,
  HatchetStepContext
> => Effect.map(Effect.service(HatchetStepContext), (ctx) => ctx.input)

/**
 * Creates a decoder Effect from a schema.
 * Useful for composing with other Effects.
 *
 * @param schema - The Schema to decode with
 * @returns Effect that decodes the input
 */
export const decodeInput = <A>(
  schema: Schema.Schema<A>,
): Effect.Effect<A, Schema.SchemaError, HatchetStepContext> => getValidatedInput(schema)
