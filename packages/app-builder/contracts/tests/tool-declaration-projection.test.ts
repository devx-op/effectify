import { expect, it } from "@effect/vitest"
import * as Result from "effect/Result"
import { makeDeclaration } from "../src/tool-declaration.js"
import { projectDeclaration, projectDeclarations } from "../src/tool-declaration-projection.js"

interface Input {
  readonly path: string
}

interface Output {
  readonly text: string
}

interface Failure {
  readonly message: string
}

interface Requirement {
  readonly grant: "workspace"
}

const rawDeclaration = (id: string, version = 1, inputDocument: unknown = { type: "object" }) => ({
  ref: { id, version: { major: version, minor: 0, patch: 0 } },
  input: { ref: { id: "schema:input", version: { major: 1, minor: 0, patch: 0 } }, document: inputDocument },
  output: { ref: { id: "schema:output", version: { major: 1, minor: 0, patch: 0 } }, document: { type: "string" } },
  error: { ref: { id: "schema:error", version: { major: 1, minor: 0, patch: 0 } }, document: { type: "null" } },
  requirements: [
    { kind: "capability", metadata: { resource: "files" } },
    { kind: "permission", metadata: { name: "workspace:read" } },
  ],
})

const declaration = (id: string, version = 1, inputDocument: unknown = { type: "object" }) =>
  Result.getOrThrowWith(
    makeDeclaration<Input, Output, Failure, Requirement>(rawDeclaration(id, version, inputDocument)),
    (failure) => failure,
  )

it("projects compatible declarations in declared order with JSON metadata only", () => {
  const result = Result.getOrThrowWith(
    projectDeclarations([declaration("tool:read-file"), declaration("tool:write-file")]),
    (failure) => failure,
  )

  expect(result.map((value) => value.ref.id)).toEqual(["tool:read-file", "tool:write-file"])
  expect(Object.keys(result[0]).sort()).toEqual(["error", "input", "output", "ref", "requirements"])
  expect(result[0].requirements.map((requirement) => requirement.kind)).toEqual(["capability", "permission"])
  expect(JSON.stringify(result)).not.toMatch(/codec|handler|service|grant/i)
  expect(Object.isFrozen(result)).toBe(true)
  expect(Object.isFrozen(result[0])).toBe(true)
})

it("accepts equivalent schema documents despite object-key insertion order", () => {
  const result = Result.getOrThrowWith(
    projectDeclarations([
      declaration("tool:read-file", 1, {
        type: "object",
        properties: { path: { type: "string" }, recursive: { type: "boolean" } },
      }),
      declaration("tool:write-file", 1, {
        properties: { recursive: { type: "boolean" }, path: { type: "string" } },
        type: "object",
      }),
    ]),
    (failure) => failure,
  )

  expect(result.map((value) => value.ref.id)).toEqual(["tool:read-file", "tool:write-file"])
})

it("retains distinct duplicate, version, metadata, malformed, and projection failure tags", () => {
  expect(projectDeclarations([declaration("tool:read-file"), declaration("tool:read-file")])).toMatchObject({
    _tag: "Failure",
    failure: { _tag: "DuplicateDeclarationIdentity" },
  })
  expect(projectDeclarations([declaration("tool:read-file", 1), declaration("tool:read-file", 2)])).toMatchObject({
    _tag: "Failure",
    failure: { _tag: "IncompatibleDeclarationVersion" },
  })
  expect(
    projectDeclarations([declaration("tool:read-file"), declaration("tool:write-file", 1, { type: "array" })]),
  ).toMatchObject({
    _tag: "Failure",
    failure: { _tag: "DeclarationMetadataMismatch" },
  })
  expect(projectDeclaration({ ...rawDeclaration("tool:invalid"), extra: true })).toMatchObject({
    _tag: "Failure",
    failure: { _tag: "MalformedDeclarationMetadata" },
  })
  expect(
    projectDeclarations(
      new Proxy([declaration("tool:read-file")], {
        get: () => {
          throw new Error("secret")
        },
      }),
    ),
  ).toMatchObject({ _tag: "Failure", failure: { _tag: "DeclarationProjectionFailure" } })
})
