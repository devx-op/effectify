import * as Schema from 'effect/Schema'

export const LoginSchema = Schema.standardSchemaV1(
  Schema.Struct({
    email: Schema.String.pipe(
      Schema.minLength(3),
      Schema.annotations({
        message: () => '[Effect/Schema] You must have a length of at least 3',
      }),
    ),
    password: Schema.String.pipe(
      Schema.minLength(3),
      Schema.annotations({
        message: () => '[Effect/Schema] You must have a length of at least 3',
      }),
    ),
  }),
)

export const RegisterSchema = Schema.standardSchemaV1(
  Schema.Struct({
    name: Schema.String.pipe(
      Schema.minLength(2),
      Schema.annotations({
        message: () => '[Effect/Schema] Name must have a length of at least 2',
      }),
    ),
    email: Schema.String.pipe(
      Schema.minLength(3),
      Schema.annotations({
        message: () => '[Effect/Schema] You must have a length of at least 3',
      }),
    ),
    password: Schema.String.pipe(
      Schema.minLength(6),
      Schema.annotations({
        message: () => '[Effect/Schema] Password must have a length of at least 6',
      }),
    ),
    confirmPassword: Schema.String.pipe(
      Schema.minLength(6),
      Schema.annotations({
        message: () => '[Effect/Schema] Confirm password must have a length of at least 6',
      }),
    ),
  }).pipe(
    Schema.filter((input) => {
      const issues: Array<Schema.FilterIssue> = []
      if (input.password !== input.confirmPassword) {
        issues.push({
          path: ['confirmPassword'],
          message: '[Effect/Schema] Passwords do not match',
        })
      }
      return issues
    }),
  ),
)
