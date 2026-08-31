import * as Schema from "effect/Schema"
import { isValidEmail } from "./validators.js"

export const Email = Schema.String.check(
  Schema.isMinLength(3),
  Schema.makeFilter((value) => (isValidEmail(value) ? undefined : `${value} is not a valid email`)),
)
  .pipe(Schema.brand("Email"))
  .annotate({
    title: "Email",
    description: "An email address",
    format: "email",
  })

export type Email = typeof Email.Type
