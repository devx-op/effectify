import * as Schema from "effect/Schema"
import { describe, expect, it } from "vitest"
import { Email } from "./email.js"

describe("Email", () => {
  it("constructs and decodes valid email addresses without normalizing them", () => {
    const input = "Ada.Lovelace+chat@Example.COM"

    expect(Email.make(input)).toBe(input)
    expect(Schema.decodeSync(Email)(input)).toBe(input)
  })

  it("rejects invalid values during construction and decoding", () => {
    expect(() => Email.make("not-an-email")).toThrow()
    expect(() => Email.make("a@b")).toThrow()
    expect(() => Schema.decodeSync(Email)("not-an-email")).toThrow()
    expect(() => Schema.decodeUnknownSync(Email)(42)).toThrow()
  })
})
