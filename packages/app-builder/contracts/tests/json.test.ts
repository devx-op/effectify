import { expect, it } from "@effect/vitest"
import * as Result from "effect/Result"
import { runInNewContext } from "node:vm"
import { makeJsonNormalizer, normalizeJson, type Json, type JsonRecord } from "../src/json.js"

const success = <Value>(result: Result.Result<Value, unknown>): Value =>
  Result.match(result, {
    onFailure: (failure) => {
      throw failure
    },
    onSuccess: (value) => value,
  })

const failureReason = (result: Result.Result<unknown, { readonly reason: string }>): string =>
  Result.match(result, {
    onFailure: (failure) => failure.reason,
    onSuccess: () => {
      throw new Error("Expected JSON normalization to fail")
    },
  })

const nestedArrays = (containers: number): Array<unknown> => {
  const root: Array<unknown> = []
  let current = root

  for (let index = 1; index < containers; index += 1) {
    const next: Array<unknown> = []
    current.push(next)
    current = next
  }

  return root
}

const isJsonRecord = (value: Json): value is JsonRecord =>
  value !== null && typeof value === "object" && !Array.isArray(value)

it("copies and freezes normal and null-prototype records without inherited values", () => {
  const source: Record<string, unknown> = {}
  const nested: Record<string, unknown> = Object.create(null)
  nested.values = [true, null]
  source.nested = nested

  const material = success(normalizeJson(source))
  if (!isJsonRecord(material)) {
    throw new Error("Expected a copied JSON record")
  }
  const nestedMaterial = material.nested
  if (!isJsonRecord(nestedMaterial)) {
    throw new Error("Expected a copied nested JSON record")
  }
  const values = nestedMaterial.values
  if (!Array.isArray(values)) throw new Error("Expected copied JSON array values")

  expect(material).toEqual({ nested: { values: [true, null] } })
  expect(Object.getPrototypeOf(material)).toBeNull()
  expect(Object.isFrozen(material)).toBe(true)
  expect(Object.isFrozen(nestedMaterial)).toBe(true)
  expect(Object.isFrozen(values)).toBe(true)
  expect(Reflect.set(values, 0, false)).toBe(false)

  nested.values = [false]
  expect(values).toEqual([true, null])
})

it("accepts exactly 256 containers and reports depth overflow without throwing", () => {
  expect(() => normalizeJson(nestedArrays(256))).not.toThrow()
  expect(Result.isSuccess(normalizeJson(nestedArrays(256)))).toBe(true)
  expect(failureReason(normalizeJson(nestedArrays(257)))).toBe("depth-exceeded")
})

it("reports an active ancestor cycle before checking the next depth", () => {
  const root = nestedArrays(256)
  let current = root

  while (current.length > 0) {
    const child = current[0]
    if (!Array.isArray(child)) throw new Error("Expected nested JSON array")
    current = child
  }

  current.push(root)

  expect(failureReason(normalizeJson(root))).toBe("cycle")
})

it("uses only caller-supplied foreign object-prototype authority", () => {
  const foreignRecord = runInNewContext("({ nested: [1, 2, 3] })")
  if (foreignRecord === null || typeof foreignRecord !== "object" || Array.isArray(foreignRecord)) {
    throw new Error("Expected foreign JSON record")
  }
  const foreignPrototype = Object.getPrototypeOf(foreignRecord)
  const normalizer = makeJsonNormalizer({ trustedObjectPrototypes: [foreignPrototype] })

  expect(success(normalizer.normalizeJson(foreignRecord))).toEqual({ nested: [1, 2, 3] })
  expect(failureReason(normalizeJson(foreignRecord))).toBe("invalid-record")
})

it("snapshots trusted prototypes and never reads forged constructor certificates", () => {
  const foreignRecord = runInNewContext("({ value: 1 })")
  if (foreignRecord === null || typeof foreignRecord !== "object" || Array.isArray(foreignRecord)) {
    throw new Error("Expected foreign JSON record")
  }
  const foreignPrototype = Object.getPrototypeOf(foreignRecord)
  const options = [foreignPrototype]
  const normalizer = makeJsonNormalizer({ trustedObjectPrototypes: options })
  let constructorReads = 0
  const forgedPrototype = Object.create(null)
  Object.defineProperty(forgedPrototype, "constructor", {
    get: () => {
      constructorReads += 1
      throw new Error("constructor must not be read")
    },
  })
  const forgedRecord: Record<string, unknown> = Object.create(forgedPrototype)
  forgedRecord.value = 1
  const laterForeignRecord = runInNewContext("({ value: 2 })")
  if (laterForeignRecord === null || typeof laterForeignRecord !== "object" || Array.isArray(laterForeignRecord)) {
    throw new Error("Expected later foreign JSON record")
  }

  options.length = 0
  options.push(Object.prototype)
  options.push(Object.getPrototypeOf(laterForeignRecord))

  expect(Object.isFrozen(normalizer)).toBe(true)
  expect(success(normalizer.normalizeJson(foreignRecord))).toEqual({ value: 1 })
  expect(failureReason(normalizer.normalizeJson(laterForeignRecord))).toBe("invalid-record")
  expect(failureReason(normalizer.normalizeJson(forgedRecord))).toBe("invalid-record")
  expect(constructorReads).toBe(0)
})
