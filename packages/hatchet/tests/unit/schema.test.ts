/**
 * @effectify/hatchet - Schema Tests
 */

import { describe, expect, it } from "vitest"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import { getRawInput, getValidatedInput, HatchetStepContext } from "@effectify/hatchet"
import { createMockContext } from "@effectify/hatchet"

describe("getValidatedInput", () => {
  it("should validate input against a valid schema", async () => {
    const UserSchema = Schema.Struct({
      userId: Schema.String,
      name: Schema.String,
    })

    const mockCtx = createMockContext({
      input: { userId: "123", name: "John" },
    })

    const mockLayer = Layer.succeed(HatchetStepContext, mockCtx as any)
    const effect = getValidatedInput(UserSchema)
    const result = await Effect.runPromiseExit(
      Effect.provide(effect, mockLayer),
    )

    expect(result._tag).toBe("Success")
    if (result._tag === "Success") {
      expect(result.value.userId).toBe("123")
      expect(result.value.name).toBe("John")
    }
  })

  it("should fail with invalid input", async () => {
    const UserSchema = Schema.Struct({
      userId: Schema.String,
    })

    // Pass number instead of string
    const mockCtx = createMockContext({
      input: { userId: 123 },
    })

    const mockLayer = Layer.succeed(HatchetStepContext, mockCtx as any)
    const effect = getValidatedInput(UserSchema)
    const result = await Effect.runPromiseExit(
      Effect.provide(effect, mockLayer),
    )

    expect(result._tag).toBe("Failure")
  })

  it("should fail with missing required field", async () => {
    const UserSchema = Schema.Struct({
      userId: Schema.String,
      email: Schema.String,
    })

    // Missing email
    const mockCtx = createMockContext({
      input: { userId: "123" },
    })

    const mockLayer = Layer.succeed(HatchetStepContext, mockCtx as any)
    const effect = getValidatedInput(UserSchema)
    const result = await Effect.runPromiseExit(
      Effect.provide(effect, mockLayer),
    )

    expect(result._tag).toBe("Failure")
  })

  it("should validate optional fields", async () => {
    const UserSchema = Schema.Struct({
      userId: Schema.String,
      nickname: Schema.optional(Schema.String),
    })

    // Without optional field
    const mockCtx = createMockContext({
      input: { userId: "123" },
    })

    const mockLayer = Layer.succeed(HatchetStepContext, mockCtx as any)
    const effect = getValidatedInput(UserSchema)
    const result = await Effect.runPromiseExit(
      Effect.provide(effect, mockLayer),
    )

    expect(result._tag).toBe("Success")
    if (result._tag === "Success") {
      expect(result.value.nickname).toBeUndefined()
    }
  })
})

describe("getRawInput", () => {
  it("should return raw input without validation", async () => {
    const mockCtx = createMockContext({
      input: { anything: "goes" },
    })

    const mockLayer = Layer.succeed(HatchetStepContext, mockCtx as any)
    const effect = getRawInput()
    const result = await Effect.runPromiseExit(
      Effect.provide(effect, mockLayer),
    )

    expect(result._tag).toBe("Success")
    if (result._tag === "Success") {
      expect(result.value).toEqual({ anything: "goes" })
    }
  })
})
