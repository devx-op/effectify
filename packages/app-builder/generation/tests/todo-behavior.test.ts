import { expect, it } from "@effect/vitest"
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { pathToFileURL } from "node:url"
import * as Effect from "effect/Effect"

type Todo = {
  readonly completed: boolean
  readonly createdAt: string
  readonly id: string
  readonly text: string
}

type TodoEvent =
  | { readonly _tag: "TodoAdded"; readonly todo: Todo }
  | { readonly _tag: "TodoCompleted"; readonly todo: Todo }
  | { readonly _tag: "TodoRemoved"; readonly todo: Todo }

interface TodoRuntime {
  readonly add: (text: string) => Effect.Effect<Todo, unknown>
  readonly complete: (id: string) => Effect.Effect<Todo, unknown>
  readonly events: () => Effect.Effect<ReadonlyArray<TodoEvent>>
  readonly list: () => Effect.Effect<ReadonlyArray<Todo>, unknown>
  readonly remove: (id: string) => Effect.Effect<Todo, unknown>
}

interface TodoCliModule {
  readonly createLiveRuntime: (path: string) => Effect.Effect<TodoRuntime, unknown>
  readonly createTestRuntime: (input: {
    readonly ids: ReadonlyArray<string>
    readonly now: string
  }) => Effect.Effect<TodoRuntime>
  readonly renderEvent: (event: TodoEvent) => string
}

type TodoPresetModule = typeof import("../src/todo-preset.js")

interface TodoTemplateModule {
  readonly todoTemplateFiles: () => ReadonlyArray<{ readonly content: string; readonly path: string }>
}

const intent = {
  version: "effectify.creation-intent/1",
  preset: "todo",
  capabilities: ["todo.events"],
}

const modules = () =>
  Effect.all({
    Planner: Effect.promise<typeof import("../src/planner.js")>(
      () => import(new URL("../src/planner.js", import.meta.url).href),
    ),
    TodoPreset: Effect.promise<TodoPresetModule>(() => import(new URL("../src/todo-preset.js", import.meta.url).href)),
    TodoTemplates: Effect.promise<TodoTemplateModule>(
      () => import(new URL("../src/templates/todo/index.js", import.meta.url).href),
    ),
  })

const withGeneratedTodo = <Value, Error>(
  use: (cli: TodoCliModule, workspace: string) => Effect.Effect<Value, Error>,
): Effect.Effect<Value, Error | unknown> =>
  Effect.gen(function* () {
    const { Planner, TodoPreset, TodoTemplates } = yield* modules()
    const topology = yield* TodoPreset.createTodoTopology(yield* Planner.planTodo(intent))
    const workspace = yield* Effect.tryPromise(() => mkdtemp(join(process.cwd(), "tests/.generated-todo-")))
    for (const file of topology.files) {
      yield* Effect.tryPromise(() => mkdir(dirname(join(workspace, file.path)), { recursive: true }))
      yield* Effect.tryPromise(() => writeFile(join(workspace, file.path), file.content))
    }
    const generatedTests = topology.files.filter((file) => file.path.includes("/tests/"))
    expect(generatedTests.map((file) => file.path)).toEqual(
      TodoTemplates.todoTemplateFiles()
        .map((file) => file.path)
        .filter((path) => path.includes("/tests/")),
    )
    expect(generatedTests.map((file) => file.path)).toContain("packages/todo/infrastructure/tests/todo-runtime.test.ts")
    const cli = yield* Effect.promise<TodoCliModule>(
      () => import(pathToFileURL(join(workspace, "apps/todo-cli/src/index.ts")).href),
    )
    return yield* use(cli, workspace).pipe(
      Effect.ensuring(Effect.promise(() => rm(workspace, { force: true, recursive: true }))),
    )
  })

it.effect("R07 and S12 expose fixed Test Layer ports with typed business failures", () =>
  withGeneratedTodo((cli) =>
    Effect.gen(function* () {
      const runtime = yield* cli.createTestRuntime({ ids: ["todo-1"], now: "2026-08-06T00:00:00.000Z" })
      const added = yield* runtime.add("write a focused PR")
      const blank = yield* runtime.add("  ").pipe(Effect.flip)
      const missing = yield* runtime.complete("missing").pipe(Effect.flip)

      expect(added).toEqual({
        completed: false,
        createdAt: "2026-08-06T00:00:00.000Z",
        id: "todo-1",
        text: "write a focused PR",
      })
      expect(blank).toMatchObject({ _tag: "TodoTextInvalid" })
      expect(missing).toMatchObject({ _tag: "TodoNotFound", id: "missing" })
    }),
  ),
)

it.effect("R08 and S15 retain visible events in write order through the generated Test Layer", () =>
  withGeneratedTodo((cli) =>
    Effect.gen(function* () {
      const runtime = yield* cli.createTestRuntime({
        ids: ["todo-1", "todo-2"],
        now: "2026-08-06T00:00:00.000Z",
      })
      const first = yield* runtime.add("first")
      const second = yield* runtime.add("second")
      const completed = yield* runtime.complete(first.id)
      yield* runtime.remove(second.id)
      const repeated = yield* runtime.complete(completed.id).pipe(Effect.flip)

      expect(yield* runtime.list()).toEqual([{ ...first, completed: true }])
      expect(yield* runtime.events()).toEqual([
        { _tag: "TodoAdded", todo: first },
        { _tag: "TodoAdded", todo: second },
        { _tag: "TodoCompleted", todo: { ...first, completed: true } },
        { _tag: "TodoRemoved", todo: second },
      ])
      expect((yield* runtime.events()).map(cli.renderEvent)).toEqual([
        "added:todo-1:first",
        "added:todo-2:second",
        "completed:todo-1:first",
        "removed:todo-2:second",
      ])
      expect(repeated).toMatchObject({ _tag: "TodoAlreadyCompleted", id: "todo-1" })
    }),
  ),
)

it.effect("S13 and S14 make the generated Live Layer durable across add, list, complete, and remove", () =>
  withGeneratedTodo((cli, workspace) =>
    Effect.gen(function* () {
      const storage = join(workspace, "state", "todos.json")
      const firstRun = yield* cli.createLiveRuntime(storage)
      const added = yield* firstRun.add("persist me")
      yield* firstRun.complete(added.id)

      const resumed = yield* cli.createLiveRuntime(storage)
      expect(yield* resumed.list()).toEqual([{ ...added, completed: true }])
      yield* resumed.remove(added.id)

      expect(yield* resumed.list()).toEqual([])
      expect(yield* Effect.tryPromise(() => readFile(storage, "utf8"))).toBe("[]\n")
    }),
  ),
)
