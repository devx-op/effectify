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

  it("authors the example through the vNext root surface first and uses mount for the dev fallback", () => {
    const counterRouteSource = readFileSync(new URL("../src/routes/counter-route.ts", import.meta.url), "utf8")
    const routerSource = readFileSync(new URL("../src/router.ts", import.meta.url), "utf8")
    const entryClientSource = readFileSync(new URL("../src/entry-client.ts", import.meta.url), "utf8")

    expect(counterRouteSource).toContain("Component.model")
    expect(counterRouteSource).toContain("Component.actions")
    expect(counterRouteSource).toContain("Component.view")
    expect(counterRouteSource).toContain("View.vstack")
    expect(counterRouteSource).toContain("View.hstack")
    expect(counterRouteSource).toContain("Web.data")
    expect(counterRouteSource).not.toContain("Html.el(")
    expect(routerSource).toContain("Component.children()")
    expect(routerSource).toContain("Component.use(appShell")
    expect(routerSource).toContain("Fallback.make(notFoundView)")
    expect(routerSource).not.toContain("Html.el(")
    expect(entryClientSource).toContain("mount({ counterRoute }")
  })
})
