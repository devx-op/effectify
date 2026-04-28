import { beforeEach, describe, expect, it, vi } from "vitest"

const importFresh = async <Module>(relativePath: string): Promise<Module> => {
  const moduleUrl = new URL(relativePath, import.meta.url)
  return import(`${moduleUrl.href}?t=${Date.now()}`) as Promise<Module>
}

describe("loom example app import-time SSR safety", () => {
  beforeEach(() => {
    vi.resetModules()
    Reflect.deleteProperty(globalThis, "document")
  })

  it("imports template-authored routes and router without installing a global document", async () => {
    const counterRouteModule = await importFresh<{ default: unknown }>("../src/routes/counter-route.ts")
    const todoRouteModule = await importFresh<{ default: unknown }>("../src/routes/todo-route.ts")
    const routerModule = await importFresh<{ appRouter: unknown }>("../src/router.ts")

    expect(counterRouteModule.default).toBeDefined()
    expect(todoRouteModule.default).toBeDefined()
    expect(routerModule.appRouter).toBeDefined()
    expect(Reflect.has(globalThis, "document")).toBe(false)
  })

  it("imports the server entry without installing a global document", async () => {
    const entryServerModule = await importFresh<{ createServerRenderer: unknown }>("../src/entry-server.ts")

    expect(entryServerModule.createServerRenderer).toBeDefined()
    expect(Reflect.has(globalThis, "document")).toBe(false)
  })
})
