import { Task } from "@effectify/hatchet"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
export const greetingInput = Schema.Struct({
  name: Schema.NonEmptyString,
})
const greetingOutput = Schema.Struct({
  greeting: Schema.String,
})

export const greetingTask = Task.make({
  name: "react-router-durable-greeting",
  input: greetingInput,
  output: greetingOutput,
  fn: ({ name }) => Effect.succeed({ greeting: `Hello, ${name}!` }),
})
