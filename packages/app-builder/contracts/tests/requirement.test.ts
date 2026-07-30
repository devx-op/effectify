import { expect, it } from "@effect/vitest"
import * as Result from "effect/Result"
import { decodeRequirement, decodeRequirements } from "../src/requirement.js"

const failureTag = (input: unknown): string => {
  const result = decodeRequirement(input)

  return Result.match(result, {
    onFailure: (failure) => failure._tag,
    onSuccess: () => {
      throw new Error("Expected the requirement to fail")
    },
  })
}

it("decodes frozen capability, constraint, and permission requirements in declared order", () => {
  const result = Result.getOrThrowWith(
    decodeRequirements([
      { kind: "capability", metadata: { resource: "files", modes: ["read", "write"] } },
      { kind: "constraint", metadata: { maxAttempts: 3 } },
      { kind: "permission", metadata: { name: "workspace:read" } },
    ]),
    (failure) => failure,
  )

  expect(result.map((requirement) => requirement.kind)).toEqual(["capability", "constraint", "permission"])
  expect(result[0].metadata).toEqual({ modes: ["read", "write"], resource: "files" })
  expect(Object.isFrozen(result)).toBe(true)
  expect(Object.isFrozen(result[0])).toBe(true)
  expect(Object.isFrozen(result[0].metadata)).toBe(true)
  const firstMetadata = result[0].metadata
  expect(Array.isArray(firstMetadata)).toBe(false)
  if (!Array.isArray(firstMetadata) && firstMetadata !== null && typeof firstMetadata === "object") {
    const modes = Reflect.getOwnPropertyDescriptor(firstMetadata, "modes")?.value
    expect(Array.isArray(modes)).toBe(true)
    expect(Object.isFrozen(modes)).toBe(true)
  }

  const duplicates = Result.getOrThrowWith(
    decodeRequirements([
      { kind: "capability", metadata: { resource: "files" } },
      { kind: "capability", metadata: { resource: "files" } },
    ]),
    (failure) => failure,
  )
  expect(duplicates.map((requirement) => requirement.kind)).toEqual(["capability", "capability"])
})

it("distinguishes malformed metadata from unsupported JSON without evaluating hostile values", () => {
  let getterReads = 0
  const cyclic: { value?: unknown } = {}
  cyclic.value = cyclic
  let deep: unknown = null
  for (let depth = 0; depth <= 256; depth += 1) deep = [deep]

  expect(failureTag({ kind: "capability" })).toBe("MalformedDeclarationMetadata")
  expect(failureTag({ kind: "unknown", metadata: {} })).toBe("MalformedDeclarationMetadata")
  expect(failureTag({ kind: "permission", metadata: {}, extra: true })).toBe("MalformedDeclarationMetadata")

  const unsupportedCases: ReadonlyArray<readonly [unknown, string]> = [
    [{ kind: "capability", metadata: () => "secret" }, "unsupported-value"],
    [{ kind: "constraint", metadata: cyclic }, "cycle"],
    [{ kind: "permission", metadata: { value: Symbol("secret") } }, "unsupported-value"],
    [{ kind: "capability", metadata: deep }, "depth-exceeded"],
    [
      {
        kind: "constraint",
        get metadata() {
          getterReads += 1
          throw new Error("secret")
        },
      },
      "invalid-record",
    ],
    [
      new Proxy(
        { kind: "permission", metadata: {} },
        {
          ownKeys: () => {
            throw new Error("secret")
          },
        },
      ),
      "inspection-failed",
    ],
  ]

  for (const [value, reason] of unsupportedCases) {
    const result = decodeRequirement(value)
    expect(failureTag(value)).toBe("UnsupportedDeclarationJson")
    expect(result).toMatchObject({ _tag: "Failure", failure: { reason } })
    expect(JSON.stringify(result)).not.toContain("secret")
  }

  expect(getterReads).toBe(0)
})
