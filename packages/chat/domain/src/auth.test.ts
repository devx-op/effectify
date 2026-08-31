import * as Schema from "effect/Schema"
import { describe, expect, it } from "vitest"
import { LoginSchema, RegisterSchema } from "./auth.js"

describe("chat auth schemas", () => {
  it("keeps the historical login constraints", () => {
    expect(
      Schema.decodeSync(LoginSchema)({
        email: "ada@example.com",
        password: "abc",
      }),
    ).toEqual({ email: "ada@example.com", password: "abc" })

    expect(() =>
      Schema.decodeSync(LoginSchema)({
        email: "invalid",
        password: "abc",
      }),
    ).toThrow()
    expect(() =>
      Schema.decodeSync(LoginSchema)({
        email: "ada@example.com",
        password: "ab",
      }),
    ).toThrow()
  })

  it("keeps registration lengths and reports password mismatch on confirmPassword", () => {
    const input = {
      name: "Ada",
      email: "ada@example.com",
      password: "secret",
      confirmPassword: "different",
    }
    const result = Schema.toStandardSchemaV1(RegisterSchema)["~standard"].validate(input)

    if (result instanceof Promise) {
      throw new Error("expected synchronous schema validation")
    }

    expect(result.issues).toContainEqual(
      expect.objectContaining({
        message: "Passwords do not match",
        path: ["confirmPassword"],
      }),
    )

    expect(() => Schema.decodeSync(RegisterSchema)({ ...input, name: "A" })).toThrow()
    expect(() =>
      Schema.decodeSync(RegisterSchema)({
        ...input,
        password: "short",
        confirmPassword: "short",
      }),
    ).toThrow()
  })
})
