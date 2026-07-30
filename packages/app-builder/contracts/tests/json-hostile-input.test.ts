import { expect, it } from "@effect/vitest"
import * as Result from "effect/Result"
import { normalizeJson } from "../src/json.js"

const failureReason = (input: unknown): string => {
  const result = normalizeJson(input)

  return Result.match(result, {
    onFailure: (failure) => failure.reason,
    onSuccess: () => {
      throw new Error("Expected hostile JSON input to fail")
    },
  })
}

const expectFiniteFailure = (input: unknown, reason: string): void => {
  expect(() => normalizeJson(input)).not.toThrow()
  const result = normalizeJson(input)
  expect(failureReason(input)).toBe(reason)
  expect(JSON.stringify(result)).not.toContain("secret")
}

it("returns inspection-failed for throwing own-key, prototype, and descriptor traps", () => {
  expectFiniteFailure(
    new Proxy(
      {},
      {
        ownKeys: () => {
          throw new Error("secret own keys")
        },
      },
    ),
    "inspection-failed",
  )
  expectFiniteFailure(
    new Proxy(
      {},
      {
        getPrototypeOf: () => {
          throw new Error("secret prototype")
        },
      },
    ),
    "inspection-failed",
  )
  expectFiniteFailure(
    new Proxy(
      { value: 1 },
      {
        getOwnPropertyDescriptor: () => {
          throw new Error("secret descriptor")
        },
      },
    ),
    "inspection-failed",
  )
})

it("rejects forbidden descriptors and shapes without executing accessors", () => {
  let accessorReads = 0
  const accessorRecord = {
    get value() {
      accessorReads += 1
      throw new Error("secret accessor")
    },
  }
  const symbolRecord = { value: 1, [Symbol("secret")]: true }
  const holey: Array<number> = []
  holey.length = 3
  holey[0] = 1
  holey[2] = 3
  const extra = [1]
  Object.defineProperty(extra, "extra", { enumerable: true, value: true })
  class ForbiddenClass {
    readonly value = 1
  }

  expectFiniteFailure(accessorRecord, "invalid-record")
  expect(accessorReads).toBe(0)
  expectFiniteFailure(symbolRecord, "invalid-record")
  expectFiniteFailure(holey, "invalid-array")
  expectFiniteFailure(extra, "invalid-array")
  expectFiniteFailure(new ForbiddenClass(), "invalid-record")
})

it("rejects unsupported scalar values with one stable reason", () => {
  for (const input of [Number.NaN, Number.POSITIVE_INFINITY, undefined, Symbol("secret"), () => 1, 1n]) {
    expectFiniteFailure(input, "unsupported-value")
  }
})
