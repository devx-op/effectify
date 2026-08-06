import { expect, it } from "@effect/vitest"
import * as Result from "effect/Result"
import { PackageCompatibilityDeclarations, certifyPackageCompatibility } from "../src/compatibility.js"

const version = { major: 1, minor: 0, patch: 0 }

const candidate = (overrides: Record<string, unknown> = {}) => ({
  module: "app-builder-contracts",
  version,
  protocols: [{ protocolId: "protocol:app-builder", version }],
  schemas: [{ schemaId: "schema:result", version, document: { type: "string" } }],
  ...overrides,
})

it("certifies fixed declared compatibility in package declaration order", () => {
  const result = Result.getOrThrowWith(certifyPackageCompatibility([candidate()]), (failure) => failure)

  expect(result.map((module) => module.module)).toEqual(PackageCompatibilityDeclarations.map((module) => module.module))
  expect(result[0]).toMatchObject({
    module: "app-builder-contracts",
    protocols: [{ protocolId: "protocol:app-builder" }],
  })
  expect(Object.isFrozen(result)).toBe(true)
})

it("rejects unknown, duplicate, undeclared, and schema-mismatched compatibility claims with distinct tags", () => {
  expect(certifyPackageCompatibility([candidate({ module: "unknown-module" })])).toMatchObject({
    _tag: "Failure",
    failure: { _tag: "UnknownModule" },
  })
  expect(certifyPackageCompatibility([candidate(), candidate()])).toMatchObject({
    _tag: "Failure",
    failure: { _tag: "DuplicateModule" },
  })
  expect(certifyPackageCompatibility([candidate({ version: { major: 2, minor: 0, patch: 0 } })])).toMatchObject({
    _tag: "Failure",
    failure: { _tag: "UndeclaredModuleVersion" },
  })
  expect(
    certifyPackageCompatibility([
      candidate({ protocols: [{ protocolId: "protocol:app-builder", version: { major: 2, minor: 0, patch: 0 } }] }),
    ]),
  ).toMatchObject({
    _tag: "Failure",
    failure: { _tag: "UndeclaredProtocolVersion" },
  })
  expect(
    certifyPackageCompatibility([
      candidate({ schemas: [{ schemaId: "schema:result", version, document: { type: "number" } }] }),
    ]),
  ).toMatchObject({
    _tag: "Failure",
    failure: { _tag: "SchemaMismatch" },
  })
})

it("rejects candidates that omit required protocol or schema claims", () => {
  expect(certifyPackageCompatibility([candidate({ protocols: [] })])).toMatchObject({
    _tag: "Failure",
    failure: { _tag: "UndeclaredProtocolVersion" },
  })
  expect(certifyPackageCompatibility([candidate({ schemas: [] })])).toMatchObject({
    _tag: "Failure",
    failure: { _tag: "SchemaMismatch" },
  })
})

it("rejects malformed candidate structures instead of guessing missing ranges", () => {
  expect(certifyPackageCompatibility({ module: "app-builder-contracts" })).toMatchObject({
    _tag: "Failure",
    failure: { _tag: "MalformedCertification" },
  })
  expect(certifyPackageCompatibility([candidate({ module: 1 })])).toMatchObject({
    _tag: "Failure",
    failure: { _tag: "MalformedCertification" },
  })
  expect(certifyPackageCompatibility([candidate({ protocols: {} })])).toMatchObject({
    _tag: "Failure",
    failure: { _tag: "MalformedCertification" },
  })
  expect(certifyPackageCompatibility([candidate({ protocols: [{ protocolId: "UPPER", version }] })])).toMatchObject({
    _tag: "Failure",
    failure: { _tag: "MalformedCertification" },
  })
  expect(
    certifyPackageCompatibility([
      candidate({ schemas: [{ schemaId: "schema:result", version: { major: -1, minor: 0, patch: 0 }, document: {} }] }),
    ]),
  ).toMatchObject({
    _tag: "Failure",
    failure: { _tag: "MalformedCertification" },
  })
})
