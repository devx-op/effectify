import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

type PackageManifest = {
  readonly name: string
  readonly private?: boolean
  readonly publishConfig?: {
    readonly access?: string
  }
  readonly exports?: Readonly<Record<string, unknown>>
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
const loomRootIndex = new URL("../src/index.ts", import.meta.url)

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

  it("documents and orders the root happy path as the primary Loom surface", () => {
    const manifest = readJson<PackageManifest>(new URL("../package.json", import.meta.url))
    const readme = readText(packageMatrixReadme)
    const index = readText(loomRootIndex)
    const exportKeys = Object.keys(manifest.exports ?? {})

    expect(exportKeys).toEqual([
      ".",
      "./Component",
      "./View",
      "./Web",
      "./Slot",
      "./mount",
      "./Html",
      "./Diagnostics",
      "./Hydration",
      "./Resumability",
    ])

    expect(index.indexOf('export * as Component from "./component.js"')).toBeLessThan(
      index.indexOf('export * as View from "./view.js"'),
    )
    expect(index.indexOf('export * as View from "./view.js"')).toBeLessThan(
      index.indexOf('export * as Web from "./web.js"'),
    )
    expect(index.indexOf('export * as Web from "./web.js"')).toBeLessThan(
      index.indexOf('export * as Slot from "./slot.js"'),
    )
    expect(index.indexOf('export * as Slot from "./slot.js"')).toBeLessThan(
      index.indexOf('export { mount } from "./mount.js"'),
    )
    expect(index.indexOf('export { mount } from "./mount.js"')).toBeLessThan(
      index.indexOf('export * as Html from "./html.js"'),
    )

    expect(readme).toContain("primary root surface")
    expect(readme).toContain("This is the primary documented/public contract for new Loom authoring.")
    expect(readme).toContain("Html")
    expect(readme).toContain("compatibility-first low-level AST / SSR seam")
  })
})
