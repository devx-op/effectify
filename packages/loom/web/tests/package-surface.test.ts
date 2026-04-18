import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

type PackageManifest = {
  readonly name: string
  readonly private?: boolean
  readonly publishConfig?: {
    readonly access?: string
  }
}

type ProjectConfig = {
  readonly tags?: ReadonlyArray<string>
}

const publicPackages = [
  ["@effectify/loom", new URL("../package.json", import.meta.url), new URL("../project.json", import.meta.url)],
  [
    "@effectify/loom-router",
    new URL("../../router/package.json", import.meta.url),
    new URL("../../router/project.json", import.meta.url),
  ],
  [
    "@effectify/loom-vite",
    new URL("../../vite/package.json", import.meta.url),
    new URL("../../vite/project.json", import.meta.url),
  ],
  [
    "@effectify/loom-nitro",
    new URL("../../nitro/package.json", import.meta.url),
    new URL("../../nitro/project.json", import.meta.url),
  ],
] as const

const internalPackages = [
  [
    "@effectify/loom-core",
    new URL("../../core/package.json", import.meta.url),
    new URL("../../core/project.json", import.meta.url),
  ],
  [
    "@effectify/loom-runtime",
    new URL("../../runtime/package.json", import.meta.url),
    new URL("../../runtime/project.json", import.meta.url),
  ],
] as const

const packageMatrixReadme = new URL("../../README.md", import.meta.url)

const readJson = <Value>(url: URL): Value => JSON.parse(readFileSync(url, "utf8")) as Value
const readText = (url: URL): string => readFileSync(url, "utf8")

describe("loom package surface guardrails", () => {
  it("keeps only the supported Loom packages public", () => {
    for (const [name, packageUrl, projectUrl] of publicPackages) {
      const manifest = readJson<PackageManifest>(packageUrl)
      const project = readJson<ProjectConfig>(projectUrl)

      expect(manifest.name).toBe(name)
      expect(manifest.private).not.toBe(true)
      expect(manifest.publishConfig?.access).toBe("public")
      expect(project.tags).toContain("public")
      expect(project.tags).not.toContain("internal")
    }

    for (const [name, packageUrl, projectUrl] of internalPackages) {
      const manifest = readJson<PackageManifest>(packageUrl)
      const project = readJson<ProjectConfig>(projectUrl)

      expect(manifest.name).toBe(name)
      expect(manifest.private).toBe(true)
      expect(manifest.publishConfig?.access).toBeUndefined()
      expect(project.tags).toContain("internal")
      expect(project.tags).not.toContain("public")
    }
  })

  it("documents the public package matrix and internal-only packages", () => {
    const readme = readText(packageMatrixReadme)

    for (const [name] of publicPackages) {
      expect(readme).toContain(name)
    }

    for (const [name] of internalPackages) {
      expect(readme).toContain(name)
    }

    expect(readme).toContain("Internal-only packages")
    expect(readme).toContain("public package surface")
  })
})
