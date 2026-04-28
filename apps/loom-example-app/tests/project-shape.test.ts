import { readFileSync } from "node:fs"
import { pathToFileURL } from "node:url"
import { Html } from "@effectify/loom"
import { Router } from "@effectify/loom-router"
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

  it("documents web:input and web:submit in the supported phase-1 directive list", () => {
    const readme = readFileSync(new URL("../../../packages/loom/README.md", import.meta.url), "utf8")

    expect(readme).toContain(
      "Supported phase-1 directives are limited to `web:click`, `web:input`, `web:submit`, `web:value` / `web:inputValue`, `web:hydrate`, `web:class`, and `web:style`.",
    )
  })

  it("exports behavior-first route/document contracts through public entry points", async () => {
    const counterRouteModule = await import(
      pathToFileURL(new URL("../src/routes/counter-route.ts", import.meta.url).pathname).href
    )
    const todoRouteModule = await import(
      pathToFileURL(new URL("../src/routes/todo-route.ts", import.meta.url).pathname).href
    )
    const todoRouteStateModule = await import(
      pathToFileURL(new URL("../src/routes/todo-route-state.ts", import.meta.url).pathname).href
    )
    const routerModule = await import(pathToFileURL(new URL("../src/router.ts", import.meta.url).pathname).href)
    const documentModule = await import(pathToFileURL(new URL("../src/document.ts", import.meta.url).pathname).href)

    const counterResult = routerModule.resolveAppRequest("/")
    const todoResult = routerModule.resolveAppRequest("/todos")
    const missingResult = routerModule.resolveAppRequest("/missing")
    const counterHtml = Html.renderToString(routerModule.bodyForResult(counterResult))
    const todoHtml = Html.renderToString(routerModule.bodyForResult(todoResult))
    const missingHtml = Html.renderToString(routerModule.bodyForResult(missingResult))
    const documentHtml = Html.renderToString(
      documentModule.createDocument({
        body: routerModule.bodyForResult(counterResult),
        title: routerModule.titleForResult(counterResult),
      }),
    )

    expect(counterRouteModule.component).toBe(counterRouteModule.CounterRoute)
    expect(counterRouteModule.counterRoutePath).toBe("/")
    expect(todoRouteModule.component.registry).toBe(todoRouteStateModule.todoRegistry)
    expect(Router.isResolveSuccess(counterResult)).toBe(true)
    expect(Router.isResolveSuccess(todoResult)).toBe(true)
    expect(Router.isResolveNotFound(missingResult)).toBe(true)
    expect(routerModule.statusForResult(counterResult)).toBe(200)
    expect(routerModule.statusForResult(todoResult)).toBe(200)
    expect(routerModule.statusForResult(missingResult)).toBe(404)
    expect(routerModule.titleForResult(counterResult)).toBe("Counter")
    expect(routerModule.titleForResult(todoResult)).toBe("Todo app")
    expect(counterHtml).toContain('data-route-view="counter"')
    expect(counterHtml).toContain('data-counter-action="increment"')
    expect(counterHtml).toContain('data-counter-reactive-cue="true"')
    expect(todoHtml).toContain('data-route-view="todo"')
    expect(todoHtml).toContain('data-todo-add-action="true"')
    expect(todoHtml).toContain('data-todo-runtime-status="true"')
    expect(todoHtml).toContain('data-todo-empty-state="true"')
    expect(missingHtml).toContain('data-route-view="not-found"')
    expect(missingHtml).toContain("Requested path: /missing")
    expect(documentHtml).toContain('<html lang="en">')
    expect(documentHtml).toContain('id="loom-root"')
    expect(documentHtml).toContain('id="__loom_payload__"')
  })
})
