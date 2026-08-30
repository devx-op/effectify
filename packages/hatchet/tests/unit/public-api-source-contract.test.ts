import { existsSync, readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const publicSourceFiles = [
  "../../src/index.ts",
  "../../src/Hatchet.ts",
  "../../src/HatchetConfig.ts",
  "../../src/Task.ts",
  "../../src/Error.ts",
  "../../src/Model.ts",
].map((path) => new URL(path, import.meta.url))
const exampleSourceFile = new URL("../../scripts/test-workflow.ts", import.meta.url)
const removedLegacySourcePaths = [
  "../../src/clients",
  "../../src/core",
  "../../src/logging",
  "../../src/schema",
  "../../src/testing/mock-client.ts",
  "../../src/testing/mock-context.ts",
].map((path) => new URL(path, import.meta.url))
const retainedModernSourcePaths = [
  "../../src/Hatchet.ts",
  "../../src/internal/live.ts",
  "../../src/testing/index.ts",
].map((path) => new URL(path, import.meta.url))

const forbiddenManualLifecycleSymbols = [
  "RegisteredTask",
  "startWorker",
  "@deprecated",
  "readonly register:",
  "service.register(",
] as const

describe("public API source contract", () => {
  it("removes the legacy graph while retaining the modern live and testing entry points", () => {
    for (const removedPath of removedLegacySourcePaths) {
      expect(existsSync(removedPath), removedPath.pathname).toBe(false)
    }
    for (const retainedPath of retainedModernSourcePaths) {
      expect(existsSync(retainedPath), retainedPath.pathname).toBe(true)
    }
  })

  it("keeps manual worker lifecycle symbols out of public package modules", () => {
    for (const sourceFile of publicSourceFiles) {
      const source = readFileSync(sourceFile, "utf8")
      for (const forbidden of forbiddenManualLifecycleSymbols) {
        expect(source, `${sourceFile.pathname} contains ${forbidden}`).not.toContain(forbidden)
      }
    }
  })

  it("keeps manual worker lifecycle capabilities out of the root namespaces", async () => {
    const api = await import("@effectify/hatchet")

    expect(api).not.toHaveProperty("RegisteredTask")
    expect(api.Hatchet).not.toHaveProperty("register")
    expect(api.Hatchet).not.toHaveProperty("startWorker")
    expect(api.Hatchet).toHaveProperty("layer")
    expect(api).toHaveProperty("RateLimit")
    expect(api).toHaveProperty("Trigger")
    expect(api).toHaveProperty("TaskDeclarationError")
    expect(api).not.toHaveProperty("HatchetRuntime")
  })

  it("keeps forced process termination in the CLI example after Effect finalization", () => {
    const exampleSource = readFileSync(exampleSourceFile, "utf8")

    expect(exampleSource).toContain("Effect.runPromise(program).then(")
    expect(exampleSource).toContain("process.exit(exitCode)")
    expect(exampleSource).toContain("Layer finalizers have completed")
    for (const sourceFile of publicSourceFiles) {
      expect(readFileSync(sourceFile, "utf8")).not.toContain("process.exit(")
    }
  })
})
