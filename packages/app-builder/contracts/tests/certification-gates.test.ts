import { expect, it } from "@effect/vitest"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

it("enforces replay-certification coverage gates through an Nx target", () => {
  const project = JSON.parse(readFileSync(fileURLToPath(new URL("../project.json", import.meta.url)), "utf8")) as {
    readonly targets?: Record<string, { readonly options?: { readonly command?: string } }>
  }
  const config = readFileSync(fileURLToPath(new URL("../vitest.config.mts", import.meta.url)), "utf8")

  expect(project.targets?.["test-coverage"]?.options?.command).toContain("--coverage")
  expect(config).toContain("lines: 95")
  expect(config).toContain("functions: 95")
  expect(config).toContain("statements: 95")
  expect(config).toContain("branches: 90")
})
