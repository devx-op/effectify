import { expect, it } from "@effect/vitest"
import * as Result from "effect/Result"
import {
  DeclarationMetadataMismatch,
  DeclarationProjectionFailure,
  DuplicateDeclarationIdentity,
  IncompatibleDeclarationVersion,
  MalformedDeclarationMetadata,
  UnsupportedDeclarationJson,
} from "../src/declaration-failure.js"
import { makeDeclaration } from "../src/tool-declaration.js"

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

const declarationInput = (requirements: unknown = [{ kind: "capability", metadata: { resource: "files" } }]) => ({
  ref: { id: "tool:read-file", version: { major: 1, minor: 0, patch: 0 } },
  input: { ref: { id: "schema:input", version: { major: 1, minor: 0, patch: 0 } }, document: { type: "object" } },
  output: { ref: { id: "schema:output", version: { major: 1, minor: 0, patch: 0 } }, document: { type: "string" } },
  error: { ref: { id: "schema:error", version: { major: 1, minor: 0, patch: 0 } }, document: { type: "null" } },
  requirements,
})

it("creates a passive frozen declaration with ordered requirements and no handler surface", () => {
  const declaration = Result.getOrThrowWith(
    makeDeclaration<Input, Output, Failure, Requirement>(
      [
        declarationInput([
          { kind: "constraint", metadata: { maxAttempts: 2 } },
          { kind: "permission", metadata: { name: "workspace:read" } },
        ]),
      ][0],
    ),
    (failure) => failure,
  )

  expect(declaration.ref).toEqual({ id: "tool:read-file", version: { major: 1, minor: 0, patch: 0 } })
  expect(declaration.requirements.map((requirement) => requirement.kind)).toEqual(["constraint", "permission"])
  expect(Object.keys(declaration).sort()).toEqual(["error", "input", "output", "ref", "requirements"])
  expect("handler" in declaration).toBe(false)
  expect(Object.isFrozen(declaration)).toBe(true)
  expect(Object.isFrozen(declaration.ref)).toBe(true)
  expect(Object.isFrozen(declaration.requirements)).toBe(true)
})

it("uses all six declaration failure tags without codec or annotation metadata", () => {
  const failures = [
    new UnsupportedDeclarationJson({ reason: "unsupported-value" }),
    new MalformedDeclarationMetadata(),
    new DuplicateDeclarationIdentity(),
    new IncompatibleDeclarationVersion(),
    new DeclarationMetadataMismatch(),
    new DeclarationProjectionFailure(),
  ]

  expect(failures.map((failure) => failure._tag)).toEqual([
    "UnsupportedDeclarationJson",
    "MalformedDeclarationMetadata",
    "DuplicateDeclarationIdentity",
    "IncompatibleDeclarationVersion",
    "DeclarationMetadataMismatch",
    "DeclarationProjectionFailure",
  ])
  expect(makeDeclaration<Input, Output, Failure, Requirement>({ ...declarationInput(), handler: true })).toMatchObject({
    _tag: "Failure",
    failure: { _tag: "MalformedDeclarationMetadata" },
  })
  expect(
    makeDeclaration<Input, Output, Failure, Requirement>(declarationInput([{ kind: "capability", metadata: () => 1 }])),
  ).toMatchObject({
    _tag: "Failure",
    failure: { _tag: "UnsupportedDeclarationJson" },
  })
})
