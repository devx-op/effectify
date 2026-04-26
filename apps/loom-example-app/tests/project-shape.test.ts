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
    const todoRouteSource = readFileSync(new URL("../src/routes/todo-route.ts", import.meta.url), "utf8")
    const todoRouteComponentSource = readFileSync(
      new URL("../src/routes/todo-route/todo-route-component.ts", import.meta.url),
      "utf8",
    )
    const todoHeroSource = readFileSync(new URL("../src/routes/todo-route/todo-hero.ts", import.meta.url), "utf8")
    const todoComposerSource = readFileSync(
      new URL("../src/routes/todo-route/todo-composer.ts", import.meta.url),
      "utf8",
    )
    const todoListSource = readFileSync(new URL("../src/routes/todo-route/todo-list.ts", import.meta.url), "utf8")
    const todoRouteStateSource = readFileSync(new URL("../src/routes/todo-route-state.ts", import.meta.url), "utf8")
    const routerSource = readFileSync(new URL("../src/router.ts", import.meta.url), "utf8")
    const entryClientSource = readFileSync(new URL("../src/entry-client.ts", import.meta.url), "utf8")
    const loomReadmeSource = readFileSync(new URL("../../../packages/loom/README.md", import.meta.url), "utf8")
    const loomPrdSource = readFileSync(new URL("../../../docs/loom-prd.md", import.meta.url), "utf8")
    const loomRfcSource = readFileSync(new URL("../../../docs/loom-rfc.md", import.meta.url), "utf8")

    expect(counterRouteSource).toContain("Component.state")
    expect(counterRouteSource).toContain('export const CounterRoute = Component.make("CounterRoute").pipe(')
    expect(counterRouteSource).toContain("export const component = CounterRoute")
    expect(counterRouteSource).not.toContain("export const counterRoute =")
    expect(counterRouteSource).not.toContain("Component.stateFactory")
    expect(counterRouteSource).toContain("Component.actions")
    expect(counterRouteSource).toContain("Component.view")
    expect(counterRouteSource).toContain("Web.as")
    expect(counterRouteSource).toContain("View.vstack")
    expect(counterRouteSource).toContain("View.hstack")
    expect(counterRouteSource).toContain("Web.data")
    expect(counterRouteSource).not.toContain("Html.el(")
    expect(counterRouteSource).not.toContain("Route.make({")
    expect(counterRouteSource).not.toContain("counterPageRoute")
    expect(todoRouteStateSource).toContain("export const todoItemsAtom = Atom.make")
    expect(todoRouteSource).toContain("export const component = Object.assign(TodoRoute, { registry: todoRegistry })")
    expect(todoRouteSource).toContain("export const loader = pipe(")
    expect(todoRouteSource).toContain("Route.loader({")
    expect(todoRouteSource).toContain("Effect.fn(function*({ services }: { readonly services: TodoRouteServices }) {")
    expect(todoRouteSource).toContain("export const action = pipe(")
    expect(todoRouteSource).toContain("Route.action({")
    expect(todoRouteSource).toContain(
      "}: { readonly input: typeof TodoCommandSchema.Type; readonly services: TodoRouteServices }) {",
    )
    expect(todoRouteSource).toContain("input: TodoCommandSchema,")
    expect(todoRouteSource).toContain("output: TodoCommandResultSchema,")
    expect(todoRouteSource).toContain("error: TodoRouteErrorSchema,")
    expect(todoRouteSource).not.toContain("const todoLoaderOptions = {")
    expect(todoRouteSource).not.toContain("const todoActionOptions = {")
    expect(todoRouteSource).not.toContain("Route.ModuleLoader<")
    expect(todoRouteSource).not.toContain("Route.ModuleAction<")
    expect(todoRouteSource).not.toContain("Route.ModuleLoaderContext<")
    expect(todoRouteSource).not.toContain("Route.ModuleActionContext<")
    expect(todoRouteSource).not.toContain("todoActionDecoder")
    expect(todoRouteSource).not.toContain("toTodoRouteFailure")
    expect(todoRouteComponentSource).toContain('Component.make("TodoRoute").pipe(')
    expect(todoRouteComponentSource).toContain("Component.use(TodoHero")
    expect(todoRouteComponentSource).toContain("Component.use(TodoList")
    expect(todoRouteComponentSource).not.toContain("attachTodoRegistry")
    expect(todoRouteComponentSource).not.toContain("View.fragment()")
    expect(todoRouteComponentSource).not.toContain("todoRegistry")
    expect(todoRouteComponentSource).not.toContain("Object.assign(")
    expect(todoHeroSource).toContain('export const TodoHero = Component.make("TodoHero").pipe(')
    expect(todoHeroSource).toContain('Component.make("TodoHero").pipe(')
    expect(todoHeroSource).toContain("Component.state({")
    expect(todoHeroSource).not.toContain("Component.children()")
    expect(todoHeroSource).not.toContain("attachTodoRegistry")
    expect(todoHeroSource).not.toContain("withTodoRouteRegistry")
    expect(todoHeroSource).toContain("View.link")
    expect(todoHeroSource).not.toContain("registry: todoRegistry")
    expect(todoComposerSource).toContain('export const TodoComposer = Component.make("TodoComposer").pipe(')
    expect(todoComposerSource).toContain('Component.make("TodoComposer").pipe(')
    expect(todoComposerSource).not.toContain("Component.stateFactory")
    expect(todoComposerSource).not.toContain("attachTodoRegistry")
    expect(todoComposerSource).toContain("View.button")
    expect(todoComposerSource).toContain("View.input()")
    expect(todoComposerSource).toContain("Web.value(")
    expect(todoComposerSource).not.toContain("registry: todoRegistry")
    expect(todoListSource).toContain('export const TodoList = Component.make("TodoList").pipe(')
    expect(todoListSource).toContain("View.button")
    expect(todoListSource).not.toContain("attachTodoRegistry")
    expect(todoListSource).not.toContain("withTodoRouteRegistry")
    expect(todoListSource).not.toContain("registry: todoRegistry")
    expect(todoRouteSource).not.toContain('Web.as("input")')
    expect(todoRouteSource).not.toContain('Web.attr("value"')
    expect(todoRouteSource).not.toContain("syncTodoInputValue")
    expect(todoRouteSource).not.toContain("Html.el(")
    expect(todoRouteSource).not.toContain("todoPageRoute")
    expect(todoRouteSource).not.toContain("Route.make({")
    expect(routerSource).toContain('import * as counterRouteModule from "./routes/counter-route.js"')
    expect(routerSource).toContain("module: counterRouteModule,")
    expect(routerSource).not.toContain("Component.children()")
    expect(routerSource).toContain('Component.make("AppShell")')
    expect(routerSource).toContain("Component.use(AppShell")
    expect(routerSource).toContain("Fallback.make(notFoundView)")
    expect(routerSource).toContain("RouteModule.compile({")
    expect(routerSource).toContain("component: () => Component.use(todoRouteModule.component)")
    expect(routerSource).not.toContain("internal/route-modules")
    expect(routerSource).not.toContain("Html.el(")
    expect(routerSource).not.toContain("registry: todoRegistry")
    expect(entryClientSource).toContain('import * as counterRouteModule from "./routes/counter-route.js"')
    expect(entryClientSource).toContain('import * as todoRouteModule from "./routes/todo-route.js"')
    expect(entryClientSource).toContain("mount({ counterRoute: counterRouteModule.component }, { root })")
    expect(entryClientSource).toContain("mount({ todoRoute: todoRouteModule.component }, { root })")

    for (const docSource of [loomReadmeSource, loomPrdSource, loomRfcSource]) {
      expect(docSource).not.toContain("Component.stateFactory")
      expect(docSource).not.toContain("Component.children()")
    }

    expect(loomReadmeSource).toContain('Component.make("CounterRoute")')
    expect(loomReadmeSource).toContain("RouteModule.compile({")
    expect(loomReadmeSource).toContain("module: { component: CounterRoute, loader },")
    expect(loomReadmeSource).toContain("Route.loader({")
    expect(loomReadmeSource).toContain("children }) =>")
    expect(loomPrdSource).toContain('Component.make("CounterRoute")')
    expect(loomPrdSource).toContain("RouteModule.compile({")
    expect(loomPrdSource).toContain("module: { component: CounterRoute, loader },")
    expect(loomPrdSource).toContain("Component.view(({ children }) =>")
    expect(loomRfcSource).toContain('Component.make("CounterRoute")')
    expect(loomRfcSource).toContain("RouteModule.compile({")
    expect(loomRfcSource).toContain("module: { component: CounterRoute, loader },")
    expect(loomRfcSource).toContain("Component.view(({ children }) =>")
  })
})
