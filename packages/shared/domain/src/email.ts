import * as B from "effect/Brand"
import type * as Predicate from "effect/Predicate"
import * as Schema from "effect/Schema"
import * as Validators from "./validators.js"

export const EmailBrandSymbol: unique symbol = Symbol.for("Domain/EmailBrandSymbol")
export const EmailBrand = B.nominal<EmailBrand>()
export type EmailBrand = string & B.Brand<typeof EmailBrandSymbol>

export const Email = Schema.NonEmptyString.pipe(
  Schema.minLength(3),
  Schema.fromBrand(EmailBrand),
  Schema.annotations({
    title: "Email",
    description: "An email address",
    jsonSchema: {
      format: "email",
      type: "string",
    },
  }),
  Schema.filter(Validators.isValidEmail as Predicate.Refinement<string, EmailBrand>, {
    arbitrary: () => (fc) => fc.emailAddress().map((_) => _ as EmailBrand),
  }),
  Schema.annotations({
    title: "Email",
    jsonSchema: {
      format: "email",
      type: "string",
    },
    message: (issue) => `${issue.actual} is not a valid email`,
  }),
)

export type Email = typeof Email.Type
