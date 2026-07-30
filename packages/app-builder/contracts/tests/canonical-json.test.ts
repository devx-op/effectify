import { expect, it } from "@effect/vitest"
import * as Result from "effect/Result"
import { canonicalizeJson, makeJsonBoundary, type CanonicalJson } from "../src/canonical-json.js"
import { type Json, type JsonRecord } from "../src/json.js"

const success = (result: Result.Result<CanonicalJson, unknown>): CanonicalJson =>
  Result.match(result, {
    onFailure: (failure) => {
      throw failure
    },
    onSuccess: (value) => value,
  })

const isJsonRecord = (value: Json): value is JsonRecord =>
  value !== null && typeof value === "object" && !Array.isArray(value)

it("pairs canonical text with deeply frozen material isolated from source mutation", () => {
  const source = { b: { values: [true, null] }, a: "first" }
  const equivalent = { a: "first", b: { values: [true, null] } }
  const first = success(canonicalizeJson(source))
  const second = success(canonicalizeJson(equivalent))

  source.b.values[0] = false

  expect(first.algorithm).toBe("effectify-cjson/1")
  expect(first.text).toBe('{"a":"first","b":{"values":[true,null]}}')
  expect(second.text).toBe(first.text)
  expect(first.material).toEqual({ a: "first", b: { values: [true, null] } })
  expect(Object.isFrozen(first)).toBe(true)
  if (!isJsonRecord(first.material) || !isJsonRecord(first.material.b) || !Array.isArray(first.material.b.values)) {
    throw new Error("Expected frozen canonical record material")
  }
  expect(Object.isFrozen(first.material.b.values)).toBe(true)
})

it("orders raw UTF-16 keys while preserving arrays and ECMAScript scalar text", () => {
  const canonical = success(
    canonicalizeJson({
      "\uE000": "bmp",
      𐀀: "astral",
      "\uD800": "lone-key",
      values: ["last", "first", -0, 0.000001, 1e-7, 1e21],
    }),
  )

  expect(canonical.text).toBe(
    '{"values":["last","first",0,0.000001,1e-7,1e+21],"\\ud800":"lone-key","𐀀":"astral","":"bmp"}',
  )
})

it("escapes controls and lone surrogates without replacing valid astral characters", () => {
  const canonical = success(canonicalizeJson({ value: '\b\t\n\f\r"\\\u0000\uD800😀' }))

  expect(canonical.text).toBe('{"value":"\\b\\t\\n\\f\\r\\"\\\\\\u0000\\ud800😀"}')
})

it("freezes the configured canonical boundary", () => {
  const boundary = makeJsonBoundary()

  expect(Object.isFrozen(boundary)).toBe(true)
  expect(Reflect.set(boundary, "normalizeJson", () => Result.succeed(null))).toBe(false)
})
