import { expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import { execFile } from "node:child_process"
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path/posix"
import { fileURLToPath } from "node:url"
import { promisify } from "node:util"

type AtomicTodoModule = typeof import("../src/generators/index.js")
const context = () => ({
  version: "effectify.render-context/1" as const,
  workspace: { name: "task-workspace", npmScope: "@acme" },
  domain: { id: "domain", importName: "@acme/task-domain" },
  entity: { id: "task", singular: "Task", plural: "Tasks", importName: "@acme/task-cli" },
  packages: [
    { id: "domain", name: "@acme/task-domain", root: "modules/task-core" },
    { id: "application", name: "@acme/task-application", root: "modules/task-service" },
    { id: "infrastructure", name: "@acme/task-infrastructure", root: "adapters/task-files" },
    { id: "presentation", name: "@acme/task-cli", root: "tools/task-cli" },
  ],
})

const generators = () =>
  Effect.promise<AtomicTodoModule>(() => import(new URL("../src/generators/index.js", import.meta.url).href))

const implementationPaths = (plan: { readonly contributions: ReadonlyArray<{ readonly path: string }> }) =>
  plan.contributions
    .map((file) => file.path)
    .filter((path) => path.includes("/src/") && !path.endsWith("/src/index.ts"))

const [run, tsc] = [promisify(execFile), fileURLToPath(new URL("../../../../node_modules/.bin/tsc", import.meta.url))]
const compilationError = (cause: unknown) =>
  typeof cause === "object" && cause !== null && "stdout" in cause ? String(cause.stdout) : String(cause)
const compile = (files: Readonly<Record<string, string>>) =>
  Effect.tryPromise({
    catch: compilationError,
    try: async () => {
      const root = await mkdtemp(join(dirname(fileURLToPath(import.meta.url)), ".todo-atomic-"))
      try {
        await Promise.all(
          Object.entries(files).map(([path, content]) => {
            const target = join(root, path)
            return mkdir(dirname(target), { recursive: true }).then(() => writeFile(target, content))
          }),
        )
        await writeFile(
          join(root, "tsconfig.json"),
          JSON.stringify({
            compilerOptions: { types: ["node"] },
            extends: fileURLToPath(new URL("../../../../tsconfig.base.json", import.meta.url)),
            include: ["**/src/**/*.ts"],
          }),
        )
        await run(tsc, ["--noEmit", "-p", "tsconfig.json"], { cwd: root })
      } finally {
        await rm(root, { force: true, recursive: true })
      }
    },
  })

it.effect("each Todo capability closes only its real implementation prerequisites", () =>
  Effect.gen(function* () {
    const Todo = yield* generators()
    const output = {
      event: "modules/task-core/src/event.ts",
      "integration-adapter": "adapters/task-files/src/adapter.ts",
      model: "modules/task-core/src/model.ts",
      port: "modules/task-service/src/port.ts",
      presentation: "tools/task-cli/src/presentation.ts",
      "use-case": "modules/task-service/src/use-case.ts",
    } as const
    const expected = {
      model: ["model"],
      event: ["event", "model"],
      port: ["event", "model", "port"],
      "use-case": ["event", "model", "port", "use-case"],
      "integration-adapter": ["integration-adapter", "event", "model", "port", "use-case"],
      presentation: ["integration-adapter", "event", "model", "port", "use-case", "presentation"],
    } as const
    for (const selected of Object.keys(expected) as Array<keyof typeof expected>) {
      expect(implementationPaths(yield* Todo.composeTodoAtomic(context(), [selected]))).toEqual(
        expected[selected].map((id) => output[id]),
      )
    }
    const port = yield* Todo.composeTodoAtomic(context(), ["port"])
    expect(
      new TextDecoder().decode(
        port.contributions.find((file) => file.path === "modules/task-core/src/index.ts")?.bytes,
      ),
    ).toContain('export { TaskEvent } from "./event.js"')
    const missing = yield* Todo.composeTodoAtomic(
      { ...context(), packages: context().packages.filter((target) => target.id !== "application") },
      ["model"],
    ).pipe(Effect.flip)
    const invalid = yield* Todo.composeTodoAtomic(context(), ["unknown"]).pipe(Effect.flip)
    expect(missing).toMatchObject({ _tag: "RenderFailure", generatorId: "todo-surface-input", reason: "unsafe-path" })
    expect(invalid).toMatchObject({
      _tag: "CapabilityGraphFailure",
      capability: "unknown",
      reason: "missing-capability",
    })
  }),
)

it.effect(
  "semantically compiles reordered bytes and rejects missing runtime imports",
  () =>
    Effect.gen(function* () {
      const Todo = yield* generators()
      const plan = yield* Todo.composeTodoAtomic({ ...context(), packages: [...context().packages].reverse() })
      const files = Object.fromEntries(
        plan.contributions.map((file) => [file.path, new TextDecoder().decode(file.bytes)]),
      )
      yield* compile(files)
      expect(Object.values(files).join("\n")).not.toContain("packages/todo/")
      expect(yield* Todo.composeTodoAtomic(context())).toEqual(plan)
      expect(plan.generatorIds.slice(0, 2)).toEqual(["workspace-surface", "package-surface"])
      expect(new Set(plan.contributions.map((file) => file.path)).size).toBe(plan.contributions.length)
      expect(new Set(plan.contributions.map((file) => file.owner)).size).toBe(plan.contributions.length)
      const imports = [
        ["modules/task-core/src/model.ts", 'import * as Data from "effect/Data"\n', "Data"],
        ["modules/task-service/src/port.ts", 'import * as Context from "effect/Context"\n', "Context"],
        ["tools/task-cli/src/presentation.ts", 'import * as Effect from "effect/Effect"\n', "Effect"],
      ] as const
      for (const [path, source, symbol] of imports) {
        const error = yield* compile({ ...files, [path]: files[path].replace(source, "") }).pipe(Effect.flip)
        expect(error).toMatch(new RegExp(`Cannot find (name|namespace) '${symbol}'`))
      }
    }),
  15_000,
)

it.effect("compiles a valid hyphenated entity id with derived TypeScript identifiers", () =>
  Effect.gen(function* () {
    const Todo = yield* generators()
    const plan = yield* Todo.composeTodoAtomic({
      ...context(),
      entity: {
        id: "work-item",
        singular: "WorkItem",
        plural: "WorkItems",
        importName: "@acme/task-cli",
      },
    })
    const files = Object.fromEntries(
      plan.contributions.map((file) => [file.path, new TextDecoder().decode(file.bytes)]),
    )

    expect(files["modules/task-service/src/port.ts"]).toContain("readonly save: (workItem: WorkItem)")
    expect(files["tools/task-cli/src/presentation.ts"]).toContain("event.workItem.id")
    yield* compile(files)
  }),
)
