import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const publicSourceFiles = [
  "../../src/index.ts",
  "../../src/Hatchet.ts",
  "../../src/HatchetConfig.ts",
  "../../src/Task.ts",
  "../../src/Error.ts",
  "../../src/Model.ts",
].map((path) => new URL(path, import.meta.url))

const forbiddenManualLifecycleSymbols = [
  "RegisteredTask",
  "startWorker",
  "@deprecated",
  "readonly register:",
  "service.register(",
] as const

describe("public API source contract", () => {
  it("keeps manual worker lifecycle symbols out of public package modules", () => {
    for (const sourceFile of publicSourceFiles) {
      const source = readFileSync(sourceFile, "utf8")
      for (const forbidden of forbiddenManualLifecycleSymbols) {
        expect(
          source,
          `${sourceFile.pathname} contains ${forbidden}`,
        ).not.toContain(forbidden)
      }
    }
  })

  it("keeps manual worker lifecycle capabilities out of the root namespaces", async () => {
    const api = await import("@effectify/hatchet")

    expect(api).not.toHaveProperty("RegisteredTask")
    expect(api.Hatchet).not.toHaveProperty("register")
    expect(api.Hatchet).not.toHaveProperty("startWorker")
    expect(api.Hatchet).toHaveProperty("layer")
    expect(api).not.toHaveProperty("HatchetRuntime")
  })
})
