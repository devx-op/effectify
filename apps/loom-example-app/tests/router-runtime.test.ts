import * as Effect from "effect/Effect"
import { describe, expect, it } from "vitest"
import { createTodoRouteRuntime } from "../src/routes/todo-route.js"
import type { TodoItem, TodoServiceApi } from "../src/todo-service.js"

const makeTestTodoService = (seed: ReadonlyArray<TodoItem>) => {
  let todos = [...seed]
  let nextId = seed.length + 1
  const calls = {
    dispatch: 0,
    list: 0,
  }

  const todoService: TodoServiceApi = {
    dispatch: (command) =>
      Effect.sync(() => {
        calls.dispatch += 1

        switch (command.intent) {
          case "create":
            todos = [...todos, { completed: false, id: nextId++, title: command.title }]
            return { intent: command.intent }
          case "toggle":
            todos = todos.map((todo) => todo.id === command.id ? { ...todo, completed: !todo.completed } : todo)
            return { intent: command.intent }
          case "remove":
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
          message: "Todo title is required",
        }],
        route: result.action.route,
        submission: { intent: "create", title: "   " },
      },
    })
    expect(calls).toEqual({ dispatch: 0, list: 1 })
  })
})
