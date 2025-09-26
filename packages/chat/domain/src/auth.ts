import * as Email from '@effectify/shared-domain/email.js'
import * as Schema from 'effect/Schema'

export const LoginSchema = Schema.Struct({
  email: Email.Email,
  password: Schema.String.pipe(Schema.minLength(3)),
})

export const RegisterSchema = Schema.Struct({
  name: Schema.String.pipe(Schema.minLength(2)),
  email: Email.Email,
  password: Schema.String.pipe(Schema.minLength(6)),
  confirmPassword: Schema.String.pipe(Schema.minLength(6)),
}).pipe(
  Schema.filter((input) => {
    const issues: Schema.FilterIssue[] = []
    if (input.password !== input.confirmPassword) {
      issues.push({
        path: ['confirmPassword'],
        message: 'Passwords do not match',
      })
    }
    return issues
  }),
)
