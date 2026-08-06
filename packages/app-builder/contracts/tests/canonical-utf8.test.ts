import { expect, it } from "@effect/vitest"
import * as Result from "effect/Result"
import { canonicalJsonBytes, canonicalizeJson, type CanonicalJson } from "../src/canonical-json.js"

const success = (result: Result.Result<CanonicalJson, unknown>): CanonicalJson =>
  Result.match(result, {
    onFailure: (failure) => {
      throw failure
    },
    onSuccess: (value) => value,
  })

it("encodes canonical text directly as RFC 3629 UTF-8 with U+FEFF as content", () => {
  const canonical = success(canonicalizeJson({ text: "\uFEFF\uD800" }))
  const bytes = canonicalJsonBytes(canonical)

  expect(canonical.text).toBe('{"text":"﻿\\ud800"}')
  expect(Array.from(bytes)).toEqual([
    0x7b, 0x22, 0x74, 0x65, 0x78, 0x74, 0x22, 0x3a, 0x22, 0xef, 0xbb, 0xbf, 0x5c, 0x75, 0x64, 0x38, 0x30, 0x30, 0x22,
    0x7d,
  ])
  expect(bytes[0]).toBe(0x7b)
})

it("returns isolated fresh byte allocations for every request", () => {
  const canonical = success(canonicalizeJson({ value: "same" }))
  const first = canonicalJsonBytes(canonical)
  const second = canonicalJsonBytes(canonical)

  first[0] = 0

  expect(first).not.toBe(second)
  expect(second[0]).toBe(0x7b)
  expect(Array.from(second)).toEqual([
    0x7b, 0x22, 0x76, 0x61, 0x6c, 0x75, 0x65, 0x22, 0x3a, 0x22, 0x73, 0x61, 0x6d, 0x65, 0x22, 0x7d,
  ])
})
