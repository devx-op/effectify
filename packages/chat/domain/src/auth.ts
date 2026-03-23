// Stub for auth schemas - Effect v4 migration deferred
import * as Schema from "effect/Schema"

export const LoginSchema = Schema.Struct({
  email: Schema.String,
  password: Schema.String,
})

export const RegisterSchema = Schema.Struct({
  name: Schema.String,
  email: Schema.String,
  password: Schema.String,
  confirmPassword: Schema.String,
})
