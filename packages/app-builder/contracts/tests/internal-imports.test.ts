import { expect, it } from "@effect/vitest"
import { readdirSync, readFileSync } from "node:fs"
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

it("keeps leaves direct and neutral", () => {
  const leaves = [
    "canonical-json",
    "diagnostic",
    "envelope",
    "identity",
    "identity-failure",
    "json",
    "json-failure",
    "outcome",
    "outcome-failure",
    "reference",
    "version",
  ]
  const source = leaves
    .map((name) => readFileSync(fileURLToPath(new URL(`../src/${name}.ts`, import.meta.url)), "utf8"))
    .join("\n")
  const canonicalizationSource = ["canonical-json", "json", "json-failure"]
    .map((name) => readFileSync(fileURLToPath(new URL(`../src/${name}.ts`, import.meta.url)), "utf8"))
    .join("\n")

  expect(source).not.toMatch(/node:|Document|window|runtime|tools|passive/i)
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
    "diagnostic.ts",
    "envelope.ts",
    "identity-failure.ts",
    "identity.ts",
    "json-failure.ts",
    "json.ts",
    "outcome-failure.ts",
    "outcome.ts",
    "reference.ts",
    "version.ts",
  ])

  const source = readdirSync(sourceDirectory)
    .map((name) => readFileSync(new URL(`../src/${name}`, import.meta.url), "utf8"))
    .join("\n")

  expect(source).not.toContain("Schema.Schema.Type")
  expect(source).toMatch(/typeof \w+\.Type/)
  expect(source).toContain("Schema.Literals")
  expect(source).not.toContain("Schema.Class")
})
