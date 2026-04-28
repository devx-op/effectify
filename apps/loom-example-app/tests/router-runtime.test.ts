import * as Effect from "effect/Effect"
import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { createTodoRouteRuntime } from "../src/router-runtime.js"
import { type TodoItem, TodoNotFoundError, type TodoServiceApi } from "../src/todo-service.js"

const makeTestTodoService = (seed: ReadonlyArray<TodoItem>) => {
  let todos = [...seed]
  let nextId = seed.length + 1
  const calls = {
    dispatch: 0,
    list: 0,
  }

  const todoService: TodoServiceApi = {
    dispatch: (command) =>
      Effect.gen(function*() {
        calls.dispatch += 1

        switch (command.intent) {
          case "create":
            todos = [...todos, { completed: false, id: nextId++, title: command.title }]
            return { intent: command.intent }
          case "toggle":
            if (!todos.some((todo) => todo.id === command.id)) {
              return yield* Effect.fail(new TodoNotFoundError({ id: command.id }))
            }

            todos = todos.map((todo) => todo.id === command.id ? { ...todo, completed: !todo.completed } : todo)
            return { intent: command.intent }
          case "remove":
            if (!todos.some((todo) => todo.id === command.id)) {
              return yield* Effect.fail(new TodoNotFoundError({ id: command.id }))
            }

            todos = todos.filter((todo) => todo.id !== command.id)
            return { intent: command.intent }
          case "clear-completed":
            todos = todos.filter((todo) => !todo.completed)
            return { intent: command.intent }
        }
      }),
    list: () =>
      Effect.sync(() => {
        calls.list += 1
        return todos
      }),
    reset: () =>
      Effect.sync(() => {
        todos = [...seed]
        nextId = seed.length + 1
      }),
  }

  return {
    calls,
    todoService,
  }
}

describe("loom example app todo router runtime", () => {
  it("authors the /todos route as a route module and compiles it at the router boundary", () => {
    const counterRouteSource = readFileSync(new URL("../src/routes/counter-route.ts", import.meta.url), "utf8")
    const todoRouteSource = readFileSync(new URL("../src/routes/todo-route.ts", import.meta.url), "utf8")
    const todoRouteComponentSource = readFileSync(
      new URL("../src/routes/todo-route/todo-route-component.ts", import.meta.url),
      "utf8",
    )
    const routerSource = readFileSync(new URL("../src/router.ts", import.meta.url), "utf8")

    expect(counterRouteSource).toContain('export const CounterRoute = Component.make("CounterRoute").pipe(')
    expect(counterRouteSource).toContain("export const component = CounterRoute")
    expect(counterRouteSource).toContain("html`")
    expect(counterRouteSource).toContain("web:click")
    expect(counterRouteSource).not.toContain("View.button")
    expect(counterRouteSource).not.toContain("Route.make({")
    expect(counterRouteSource).not.toContain("counterPageRoute")
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
    expect(todoRouteSource).not.toContain("todoActionDecoder")
    expect(todoRouteSource).not.toContain("todoPageRoute")
    expect(todoRouteSource).not.toContain("Route.make({")
    expect(todoRouteComponentSource).toContain('Component.make("TodoRoute").pipe(')
    expect(todoRouteComponentSource).toContain("html`")
    expect(todoRouteComponentSource).toContain("View.use(TodoHero)")
    expect(todoRouteComponentSource).toContain("View.use(TodoList)")
    expect(todoRouteComponentSource).not.toContain("attachTodoRegistry")
    expect(todoRouteComponentSource).not.toContain("withTodoRouteRegistry")
    expect(todoRouteComponentSource).not.toContain("todoRegistry")
    expect(routerSource).toContain('import * as counterRouteModule from "./routes/counter-route.js"')
    expect(routerSource).toContain("module: counterRouteModule,")
    expect(routerSource).toContain("RouteModule.compile({")
    expect(routerSource).toContain("html`")
    expect(routerSource).toContain("View.use(AppShell")
    expect(routerSource).toContain("component: () => View.use(todoRouteModule.component)")
    expect(routerSource).toContain('children ?? ""')
    expect(routerSource).toContain('Component.make("ShellBody")')
    expect(routerSource).toContain("View.use(AppShell, View.use(ShellBody, { content: child }))")
    expect(counterRouteSource).not.toContain("template-dom-support")
    expect(counterRouteSource).not.toContain("ensureTemplateDocument")
    expect(todoRouteComponentSource).not.toContain("template-dom-support")
    expect(todoRouteComponentSource).not.toContain("ensureTemplateDocument")
    expect(routerSource).not.toContain("template-dom-support")
    expect(routerSource).not.toContain("ensureTemplateDocument")
    expect(routerSource).not.toContain("Component.use(AppShell")
    expect(routerSource).not.toContain("internal/route-modules")
  })

  it("executes the initial loader through the route runtime", async () => {
    const { calls, todoService } = makeTestTodoService([
      { completed: false, id: 1, title: "Ship the loader demo" },
    ])
    const runtime = createTodoRouteRuntime({ todoService })

    const loaded = await runtime.load()

    expect(loaded).toEqual({
      _tag: "success",
      data: [{ completed: false, id: 1, title: "Ship the loader demo" }],
      route: loaded.route,
    })
    expect(calls).toEqual({ dispatch: 0, list: 1 })
  })

  it("revalidates the loader after a successful action", async () => {
    const { calls, todoService } = makeTestTodoService([
      { completed: false, id: 1, title: "Ship the loader demo" },
    ])
    const runtime = createTodoRouteRuntime({ todoService })

    await runtime.load()
    const result = await runtime.submit({
      submission: { intent: "create", title: "Close the runtime loop" },
    })

    expect(result.action).toEqual({
      _tag: "success",
      result: { intent: "create" },
      revalidated: false,
      route: result.action.route,
    })
    expect(result.loader).toEqual({
      _tag: "success",
      data: [
        { completed: false, id: 1, title: "Ship the loader demo" },
        { completed: false, id: 2, title: "Close the runtime loop" },
      ],
      route: result.loader?.route,
    })
    expect(calls).toEqual({ dispatch: 1, list: 2 })
  })

  it("returns invalid-input results without dispatching the action", async () => {
    const { calls, todoService } = makeTestTodoService([
      { completed: false, id: 1, title: "Ship the loader demo" },
    ])
    const runtime = createTodoRouteRuntime({ todoService })

    await runtime.load()
    const result = await runtime.submit({
      submission: { intent: "create", title: "   " },
    })

    expect(result).toEqual({
      action: {
        _tag: "invalid-input",
        issues: [{
          _tag: "LoomRouterActionInputFailure",
          input: { intent: "create", title: "   " },
          message: expect.stringContaining("length of at least 1"),
        }],
        route: result.action.route,
        submission: { intent: "create", title: "   " },
      },
    })
    expect(calls).toEqual({ dispatch: 0, list: 1 })
  })

  it("surfaces typed route action failures without revalidating the loader", async () => {
    const { calls, todoService } = makeTestTodoService([
      { completed: false, id: 1, title: "Ship the loader demo" },
    ])
    const runtime = createTodoRouteRuntime({ todoService })

    await runtime.load()
    const result = await runtime.submit({
      submission: { id: "99", intent: "remove" },
    })

    expect(result).toEqual({
      action: {
        _tag: "failure",
        error: expect.objectContaining({
          error: expect.objectContaining({ _tag: "TodoNotFoundError", id: 99 }),
        }),
        route: result.action.route,
      },
    })
    expect(calls).toEqual({ dispatch: 1, list: 1 })
  })
})
