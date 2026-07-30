import { expect, it } from "@effect/vitest"
import * as Result from "effect/Result"
import { decodeSchemaDocument } from "../src/schema-document.js"

const document = (id: string, value: unknown) =>
  Result.getOrThrowWith(
    decodeSchemaDocument<{ readonly value: string }>({
      ref: { id, version: { major: 1, minor: 0, patch: 0 } },
      document: value,
    }),
    (failure) => failure,
  )

it("retains explicit frozen schema references and JSON documents", () => {
  const input = document("schema:input", { type: "object", required: ["value"] })
  const output = document("schema:output", { type: "string" })

  expect(input).toMatchObject({
    ref: { id: "schema:input", version: { major: 1, minor: 0, patch: 0 } },
    document: { required: ["value"], type: "object" },
  })
  expect(output.ref.id).toBe("schema:output")
  expect(Object.isFrozen(input)).toBe(true)
  expect(Object.isFrozen(input.ref)).toBe(true)
  expect(Object.isFrozen(input.ref.version)).toBe(true)
  expect(Object.isFrozen(input.document)).toBe(true)
})

it("maps incomplete, conflicting, and hostile schema metadata to malformed metadata", () => {
  const failures = [
    undefined,
    { document: {} },
    { ref: { id: "schema:input", version: { major: 1, minor: 0, patch: 0 } } },
    { ref: { id: "schema:input", version: { major: 1, minor: 0, patch: 0 } }, document: {}, version: 2 },
    {
      get ref() {
        throw new Error("secret")
      },
      document: {},
    },
    new Proxy(
      {},
      {
        ownKeys: () => {
          throw new Error("secret")
        },
      },
    ),
  ]

  for (const input of failures) {
    const result = decodeSchemaDocument(input)
    expect(result).toMatchObject({ _tag: "Failure", failure: { _tag: "MalformedDeclarationMetadata" } })
    expect(JSON.stringify(result)).not.toContain("secret")
  }
})
