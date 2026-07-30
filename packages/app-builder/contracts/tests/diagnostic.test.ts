import { expect, it } from "@effect/vitest"
import * as Result from "effect/Result"
import * as Schema from "effect/Schema"
import { Diagnostic, decodeDiagnostic } from "../src/diagnostic.js"

const strict = { onExcessProperty: "error" } as const

it("round trips ordered diagnostics with repeated codes and mixed path segments", () => {
  const diagnostics = [
    { severity: "warning", code: "field.invalid", message: "First warning", path: ["items", 0, "name"] },
    { severity: "error", code: "field.invalid", message: "Second warning", path: ["items", 1] },
  ] as const

  const decoded = Schema.decodeUnknownResult(Schema.Array(Diagnostic), strict)(diagnostics)
  const encoded = Result.match(decoded, {
    onFailure: (failure) => {
      throw failure
    },
    onSuccess: (value) => Schema.encodeUnknownResult(Schema.Array(Diagnostic), strict)(value),
  })

  expect(encoded).toMatchObject({ _tag: "Success", success: diagnostics })
})

it("accepts the exact diagnostic fields and rejects invalid or excess shapes", () => {
  expect(decodeDiagnostic({ severity: "info", code: "request.accepted", message: "Request accepted" })).toMatchObject({
    _tag: "Success",
    success: { severity: "info", code: "request.accepted", message: "Request accepted" },
  })

  for (const input of [
    { severity: "fatal", code: "field.invalid", message: "Invalid field" },
    { severity: "error", code: "", message: "Invalid field" },
    { severity: "error", code: "field.invalid", message: "", path: [] },
    { severity: "error", code: "field.invalid", message: "Invalid field", path: [true] },
    { severity: "error", code: "field.invalid", message: "Invalid field", extra: "rejected" },
  ]) {
    expect(decodeDiagnostic(input)).toMatchObject({
      _tag: "Failure",
      failure: { _tag: "MalformedDiagnostic" },
    })
  }
})
