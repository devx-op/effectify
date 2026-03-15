import * as Schema from "effect/Schema"

// Simple email regex for validation
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Effect v4 compatible email schema
export const Email = Schema.String.pipe(
  Schema.filter((s) => s.length > 0, {
    message: () => "Email cannot be empty",
  }),
  Schema.filter((s) => s.length >= 3, {
    message: () => "Email must be at least 3 characters long",
  }),
  Schema.filter((s) => emailRegex.test(s), {
    message: (actual) => `${actual} is not a valid email format`,
  }),
  Schema.annotations({
    title: "Email",
    description: "An email address",
    jsonSchema: {
      format: "email",
      type: "string",
    },
  }),
)

export type Email = typeof Email.Type
