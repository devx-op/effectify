import { expect, it } from "@effect/vitest"
import { readdirSync, readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import "../src/envelope.js"
import "../src/identity.js"
import "../src/identity-failure.js"
import "../src/reference.js"
import "../src/version.js"

it("keeps leaves direct and neutral", () => {
  const source = ["envelope", "identity", "identity-failure", "reference", "version"]
    .map((name) => readFileSync(fileURLToPath(new URL(`../src/${name}.ts`, import.meta.url)), "utf8"))
    .join("\n")
  expect(source).not.toMatch(/node:|Document|runtime|outcome|diagnostic|canonical|tools|passive|hash/i)
})

it("keeps private contracts in kebab-case with canonical Schema declarations", () => {
  const sourceDirectory = fileURLToPath(new URL("../src/", import.meta.url))
  expect(readdirSync(sourceDirectory).sort()).toEqual([
    "envelope.ts",
    "identity-failure.ts",
    "identity.ts",
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
