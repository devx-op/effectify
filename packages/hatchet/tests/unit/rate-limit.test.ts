import { describe, expect, it } from "vitest"
import * as RateLimit from "../../src/RateLimit.js"
import * as Declarations from "../../src/internal/declaration-validation.js"
import * as SdkDeclaration from "../../src/internal/sdk-declaration.js"

describe("RateLimit", () => {
  it("creates frozen package-owned values without retaining unknown fields", () => {
    const limit = RateLimit.make(
      {
        units: 1,
        limit: "input.limit",
        key: "email",
        staticKey: "transactional",
        dynamicKey: "input.tenant",
        duration: "minute",
        extra: "ignored",
      } as RateLimit.Options & { readonly extra: string },
    )

    expect(limit).toEqual({
      _tag: "RateLimit",
      units: 1,
      limit: "input.limit",
      key: "email",
      staticKey: "transactional",
      dynamicKey: "input.tenant",
      duration: "minute",
    })
    expect(Object.isFrozen(limit)).toBe(true)
    expect(limit).not.toHaveProperty("extra")
  })

  it.each(
    [
      "second",
      "minute",
      "hour",
      "day",
      "week",
      "month",
      "year",
    ] as const,
  )("maps %s through the internal SDK adapter", (duration) => {
    expect(SdkDeclaration.rateLimitDuration(duration)).toBeDefined()
  })

  it("preserves duplicate declarations and all supported key fields", () => {
    const limit = RateLimit.make({
      units: "input.units",
      limit: 5,
      key: "key",
      staticKey: "static",
      dynamicKey: "input.dynamic",
      duration: "year",
    })

    expect(Declarations.rateLimits("task", [limit, limit])).toEqual([
      limit,
      limit,
    ])
  })

  it.each(
    [
      ["units", 0],
      ["units", Number.POSITIVE_INFINITY],
      ["units", 1.5],
      ["units", "  "],
      ["limit", 0],
      ["limit", "  "],
      ["key", ""],
      ["staticKey", " "],
      ["dynamicKey", " "],
    ] as const,
  )("rejects invalid %s values", (field, value) => {
    const limit = RateLimit.make({
      units: 1,
      [field]: value,
    } as RateLimit.Options)
    expect(() => Declarations.rateLimits("task", [limit])).toThrow(field)
  })
})
