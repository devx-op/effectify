import * as Effect from "effect/Effect"
import { Html } from "@effectify/loom"
import { Router } from "@effectify/loom-router"
import { describe, expect, it } from "vitest"
import { createTodoRouteRuntime } from "../src/routes/todo-route.js"
import { bodyForResult, resetExampleState, resolveAppRequest, statusForResult, titleForResult } from "../src/router.js"
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
  it("resolves / and /todos through the public router contract instead of source-shape assertions", () => {
    resetExampleState()
    const counterResult = resolveAppRequest("/")
    const todoResult = resolveAppRequest("/todos")

    expect(Router.isResolveSuccess(counterResult)).toBe(true)
    expect(Router.isResolveSuccess(todoResult)).toBe(true)
    expect(statusForResult(counterResult)).toBe(200)
    expect(statusForResult(todoResult)).toBe(200)
    expect(titleForResult(counterResult)).toBe("Counter")
    expect(titleForResult(todoResult)).toBe("Todo app")
    expect(Html.renderToString(bodyForResult(counterResult))).toContain('data-route-view="counter"')
    expect(Html.renderToString(bodyForResult(todoResult))).toContain('data-route-view="todo"')
    expect(Html.renderToString(bodyForResult(todoResult))).toContain('data-todo-add-action="true"')
    expect(Html.renderToString(bodyForResult(todoResult))).toContain('data-todo-runtime-status="true"')
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
