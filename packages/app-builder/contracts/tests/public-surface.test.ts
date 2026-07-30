import { expect, it } from "@effect/vitest"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import * as Contracts from "../src/index.js"

it("publishes only the exact named allowlist and module namespaces", () => {
  expect(Object.keys(Contracts).sort()).toEqual(
    [
      "CanonicalJson",
      "Compatibility",
      "Declaration",
      "Diagnostic",
      "Digest",
      "Envelope",
      "Identity",
      "Json",
      "Outcome",
      "PassiveRecord",
      "Reference",
      "Replay",
      "Requirement",
      "SchemaDocument",
      "Version",
      "PackageCompatibilityDeclarations",
      "canonicalJsonBytes",
      "canonicalizeJson",
      "certifyPackageCompatibility",
      "decodeCompleteEnvelope",
      "decodeDigestRef",
      "decodePassivePlan",
      "decodeReplayContract",
      "makeDeclaration",
      "projectDeclarations",
      "projectReplayMaterial",
    ].sort(),
  )
  expect(Contracts.Replay.projectReplayMaterial).toBe(Contracts.projectReplayMaterial)
  expect("decodePinnedInput" in Contracts).toBe(false)
  expect("MalformedReplayContract" in Contracts).toBe(false)
})

it("documents the root import, compatibility matrix, canonicalization, and external digest ownership", () => {
  const readme = readFileSync(fileURLToPath(new URL("../README.md", import.meta.url)), "utf8")

  expect(readme).toContain('from "@effectify/app-builder-contracts"')
  expect(readme).toContain("## Compatibility matrix")
  expect(readme).toContain("effectify-cjson/1")
  expect(readme).toMatch(/external.*digest/i)
  expect(readme).toMatch(/does not.*hash|never.*hash/i)
})
