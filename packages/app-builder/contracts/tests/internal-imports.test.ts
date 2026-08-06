import { expect, it } from "@effect/vitest"
import { existsSync, readdirSync, readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import "../src/diagnostic.js"
import "../src/envelope.js"
import "../src/identity.js"
import "../src/identity-failure.js"
import "../src/json-failure.js"
import "../src/json.js"
import "../src/outcome-failure.js"
import "../src/outcome.js"
import "../src/reference.js"
import "../src/version.js"
import "../src/canonical-json.js"
import "../src/declaration-failure.js"
import "../src/requirement.js"
import "../src/schema-document.js"
import "../src/tool-declaration.js"
import "../src/tool-declaration-projection.js"
import "../src/wizard-draft.js"

it("keeps leaves direct and neutral", () => {
  const leaves = [
    "canonical-json",
    "compatibility-failure",
    "compatibility",
    "declaration-failure",
    "diagnostic",
    "digest",
    "envelope",
    "identity",
    "identity-failure",
    "json",
    "json-failure",
    "outcome",
    "outcome-failure",
    "reference",
    "passive-record",
    "replay-failure",
    "replay",
    "requirement",
    "schema-document",
    "tool-declaration",
    "tool-declaration-projection",
    "version",
    "wizard-draft",
  ]
  const source = leaves
    .map((name) => readFileSync(fileURLToPath(new URL(`../src/${name}.ts`, import.meta.url)), "utf8"))
    .join("\n")
  const canonicalizationSource = ["canonical-json", "json", "json-failure"]
    .map((name) => readFileSync(fileURLToPath(new URL(`../src/${name}.ts`, import.meta.url)), "utf8"))
    .join("\n")

  expect(source).not.toMatch(
    /node:|window|runtime|handler|execute|evaluate|evaluation|effect\/(?:Context|Effect|Layer)|Context\.Service|registry/i,
  )
  expect(canonicalizationSource).not.toMatch(/hash|digest|replay/i)

  const outcomeSource = ["diagnostic", "outcome", "outcome-failure"]
    .map((name) => readFileSync(fileURLToPath(new URL(`../src/${name}.ts`, import.meta.url)), "utf8"))
    .join("\n")
  expect(outcomeSource).not.toMatch(
    /from "\.\/(?:canonical-json|json|json-failure|runtime|permission|tool|replay|hash|certification|index)\.js"/,
  )

  const contractDependencies = {
    "diagnostic.ts": ["outcome-failure.js"],
    "outcome-failure.ts": [],
    "outcome.ts": ["outcome-failure.js", "reference.js"],
    "envelope.ts": ["diagnostic.js", "outcome-failure.js", "outcome.js", "reference.js", "version.js"],
    "declaration-failure.ts": ["json-failure.js"],
    "requirement.ts": ["declaration-failure.js", "json.js"],
    "schema-document.ts": ["declaration-failure.js", "json.js", "reference.js"],
    "tool-declaration.ts": [
      "declaration-failure.js",
      "json.js",
      "reference.js",
      "requirement.js",
      "schema-document.js",
    ],
    "tool-declaration-projection.ts": ["canonical-json.js", "declaration-failure.js", "tool-declaration.js"],
    "passive-record.ts": ["json.js", "reference.js"],
    "replay.ts": [
      "canonical-json.js",
      "tool-declaration-projection.js",
      "json.js",
      "passive-record.js",
      "reference.js",
      "replay-failure.js",
    ],
    "compatibility.ts": ["canonical-json.js", "compatibility-failure.js", "json.js", "identity.js", "version.js"],
    "wizard-draft.ts": ["identity.js", "json.js", "passive-record.js", "reference.js"],
  } as const

  for (const [file, allowed] of Object.entries(contractDependencies)) {
    const imports = Array.from(
      readFileSync(new URL(`../src/${file}`, import.meta.url), "utf8").matchAll(/from "\.\/([^"]+)"/g),
      ([, imported]) => imported,
    )

    expect(imports).toEqual(allowed)
  }
})

it("keeps private contracts in kebab-case with canonical Schema declarations", () => {
  const sourceDirectory = fileURLToPath(new URL("../src/", import.meta.url))
  expect(readdirSync(sourceDirectory).sort()).toEqual([
    "canonical-json.ts",
    "compatibility-failure.ts",
    "compatibility.ts",
    "declaration-failure.ts",
    "diagnostic.ts",
    "digest.ts",
    "envelope.ts",
    "identity-failure.ts",
    "identity.ts",
    "index.ts",
    "json-failure.ts",
    "json.ts",
    "outcome-failure.ts",
    "outcome.ts",
    "passive-record.ts",
    "reference.ts",
    "replay-failure.ts",
    "replay.ts",
    "requirement.ts",
    "schema-document.ts",
    "tool-declaration-projection.ts",
    "tool-declaration.ts",
    "version.ts",
    "wizard-draft.ts",
  ])

  const source = readdirSync(sourceDirectory)
    .map((name) => readFileSync(new URL(`../src/${name}`, import.meta.url), "utf8"))
    .join("\n")

  expect(source).not.toContain("Schema.Schema.Type")
  expect(source).toMatch(/typeof \w+\.Type/)
  expect(source).toContain("Schema.Literals")
  expect(source).not.toContain("Schema.Class")

  expect(existsSync(fileURLToPath(new URL("../src/index.ts", import.meta.url)))).toBe(true)
  const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as {
    readonly exports?: unknown
  }
  expect(packageJson.exports).toBeDefined()
})
