import { beforeEach, describe, expect, it, vi } from "vitest"

const importFresh = async <Module>(relativePath: string): Promise<Module> => {
  const moduleUrl = new URL(relativePath, import.meta.url)
  return import(`${moduleUrl.href}?t=${Date.now()}`) as Promise<Module>
}

type EntryServerModule = typeof import("../src/entry-server.js")

describe("loom example app import-time SSR safety", () => {
  beforeEach(() => {
    vi.resetModules()
    Reflect.deleteProperty(globalThis, "document")
  })

  it("imports template-authored routes and router without installing a global document", async () => {
    const counterRouteModule = await importFresh<{
      readonly CounterRoute: unknown
      readonly counterRouteId: string
      readonly counterRoutePath: string
      readonly counterRouteTitle: string
      readonly default: unknown
    }>("../src/routes/counter-route.ts")
    const todoRouteModule = await importFresh<{
      readonly action: unknown
      readonly createTodoRouteRuntime: unknown
      readonly default: unknown
      readonly loader: unknown
      readonly prepareTodoRoute: unknown
      readonly resetTodoRouteExampleState: unknown
      readonly submitTodoRoute: unknown
      readonly todoPageRoute: Record<string, unknown>
      readonly todoRouteId: string
      readonly todoRoutePath: string
      readonly todoRouteTitle: string
    }>("../src/routes/todo-route.ts")
    const routerModule = await importFresh<{
      readonly appRouter: Record<string, unknown>
      readonly prepareAppRequest: unknown
      readonly resetExampleState: unknown
      readonly resolveAppRequest: unknown
      readonly todoRouteId: string
      readonly todoRoutePath: string
      readonly todoRouteTitle: string
    }>("../src/router.ts")

    expect(counterRouteModule.counterRouteId).toBe("counter")
    expect(counterRouteModule.counterRoutePath).toBe("/")
    expect(counterRouteModule.counterRouteTitle).toBe("Counter")
    expect(counterRouteModule.default).toBe(counterRouteModule.CounterRoute)

    expect(todoRouteModule.todoRouteId).toBe("todo")
    expect(todoRouteModule.todoRoutePath).toBe("/todos")
    expect(todoRouteModule.todoRouteTitle).toBe("Todo app")
    expect(todoRouteModule.default).toHaveProperty("registry")
    expect(todoRouteModule.todoPageRoute.identifier).toBe(todoRouteModule.todoRouteId)
    expect(todoRouteModule.todoPageRoute.path).toBe(todoRouteModule.todoRoutePath)
    expect(typeof todoRouteModule.action).toBe("object")
    expect(typeof todoRouteModule.createTodoRouteRuntime).toBe("function")
    expect(typeof todoRouteModule.loader).toBe("object")
    expect(typeof todoRouteModule.prepareTodoRoute).toBe("function")
    expect(typeof todoRouteModule.resetTodoRouteExampleState).toBe("function")
    expect(typeof todoRouteModule.submitTodoRoute).toBe("function")

    expect(routerModule.todoRouteId).toBe(todoRouteModule.todoRouteId)
    expect(routerModule.todoRoutePath).toBe(todoRouteModule.todoRoutePath)
    expect(routerModule.todoRouteTitle).toBe(todoRouteModule.todoRouteTitle)
    expect(typeof routerModule.prepareAppRequest).toBe("function")
    expect(typeof routerModule.resetExampleState).toBe("function")
    expect(typeof routerModule.resolveAppRequest).toBe("function")
    expect(routerModule.appRouter).toHaveProperty("identifier")
    expect(Reflect.has(globalThis, "document")).toBe(false)
  })

  it("imports the server entry without installing a global document", async () => {
    const entryServerModule = await importFresh<EntryServerModule>("../src/entry-server.ts")

    expect(typeof entryServerModule.createServerRenderer).toBe("function")
    expect(entryServerModule.createServerRenderer()).toMatchObject({
      name: "effectify:loom-nitro",
      render: expect.any(Function),
    })
    expect(Reflect.has(globalThis, "document")).toBe(false)
  })
})
