import { Email } from "@effectify/shared-domain/email.js"
import * as Schema from "effect/Schema"

export const LoginSchema = Schema.Struct({
  email: Email,
  password: Schema.String.check(Schema.isMinLength(3)),
})

export const RegisterSchema = Schema.Struct({
  name: Schema.String.check(Schema.isMinLength(2)),
  email: Email,
  password: Schema.String.check(Schema.isMinLength(6)),
  confirmPassword: Schema.String.check(Schema.isMinLength(6)),
}).check(
  Schema.makeFilter((input) =>
    input.password === input.confirmPassword
      ? undefined
      : { path: ["confirmPassword"], issue: "Passwords do not match" },
  ),
)
