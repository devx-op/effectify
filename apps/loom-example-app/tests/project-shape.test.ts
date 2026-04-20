import { readFileSync } from "node:fs"
import { pathToFileURL } from "node:url"
import { describe, expect, it } from "vitest"

const readJson = (relativePath: string): unknown =>
  JSON.parse(readFileSync(new URL(relativePath, import.meta.url), "utf8"))

describe("loom example app project shape", () => {
  it("declares explicit Nx lint, test, and typecheck targets plus tsconfig references", () => {
    const project = readJson("../project.json") as {
      name: string
      targets: Record<string, unknown>
    }
    const tsconfig = readJson("../tsconfig.json") as {
      references: ReadonlyArray<{ path: string }>
    }

    expect(project.name).toBe("@effectify/loom-example-app")
    expect(Object.keys(project.targets)).toEqual(expect.arrayContaining(["lint", "test", "typecheck"]))
    expect(tsconfig.references).toEqual([
      { path: "./tsconfig.app.json" },
      { path: "./tsconfig.spec.json" },
    ])
  })

  it("uses only the public Loom packages and registers the Loom Vite plugin", async () => {
    const packageJson = readJson("../package.json") as {
      dependencies: Record<string, string>
    }
    const viteModuleUrl = pathToFileURL(new URL("../vite.config.mts", import.meta.url).pathname).href
    const viteConfigModule = await import(viteModuleUrl)
    const viteConfig = "default" in viteConfigModule ? viteConfigModule.default : viteConfigModule
    const config = typeof viteConfig === "function" ? await viteConfig() : viteConfig

    expect(Object.keys(packageJson.dependencies)).toEqual(
      expect.arrayContaining([
        "@effectify/loom",
        "@effectify/loom-nitro",
        "@effectify/loom-router",
        "@effectify/loom-vite",
      ]),
    )
    expect(config.plugins.map((plugin: { name?: string }) => plugin.name)).toEqual(
      expect.arrayContaining(["effectify:loom-vite"]),
    )
  })

  it("authors the shell and primary routes through the vNext root surface first", () => {
    const appShellSource = readFileSync(new URL("../src/app-shell.ts", import.meta.url), "utf8")
    const homeRouteSource = readFileSync(new URL("../src/routes/home-route.ts", import.meta.url), "utf8")
    const docsRouteSource = readFileSync(new URL("../src/routes/docs-about-route.ts", import.meta.url), "utf8")

    expect(appShellSource).toContain("Component")
    expect(appShellSource).toContain("View")
    expect(appShellSource).toContain("Slot.required")
    expect(homeRouteSource).toContain("Component.make")
    expect(homeRouteSource).toContain("View.stack")
    expect(docsRouteSource).toContain("Component.make")
    expect(docsRouteSource).toContain("View.stack")
  })
})
