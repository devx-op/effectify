import { createTree } from "@nx/devkit/testing"
import { generateFiles } from "@nx/devkit"
import { expect, it } from "@effect/vitest"
import { beforeEach, vi } from "vitest"
import { readFile, rm } from "node:fs/promises"
import { isAbsolute, join } from "node:path"
import * as Effect from "effect/Effect"
import { composeCatalog } from "../../generation/src/catalog.js"
import { TodoGenerationBlockIds } from "../../generation/src/generators/index.js"
import { TodoV1AtomicCatalog, todoV1GeneratorIds } from "../../generation/src/generators/todo-v1-atomic.js"
import { templateDirectory, templateGroups } from "../../generation/src/templates.js"

const generateFilesSpy = vi.hoisted(() => vi.fn())
const stagedPathsByCall = vi.hoisted(() => [] as Array<ReadonlyArray<string>>)

vi.mock("@nx/devkit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@nx/devkit")>()
  return {
    ...actual,
    generateFiles: (...args: Parameters<typeof actual.generateFiles>) => {
      generateFilesSpy(...args)
      const result = actual.generateFiles(...args)
      stagedPathsByCall.push(
        args[0]
          .listChanges()
          .map((change) => change.path)
          .sort(),
      )
      return result
    },
  }
})

beforeEach(() => {
  generateFilesSpy.mockClear()
  stagedPathsByCall.length = 0
})

const intent = {
  version: "effectify.creation-intent/1",
  preset: "todo",
  capabilities: ["todo.events"],
}

it.effect("stages real template groups through generateFiles before committing exact planned bytes", () =>
  Effect.gen(function* () {
    const [{ applyTodoPlan }, Planner, TodoPreset] = yield* Effect.all([
      Effect.promise(() => import("../src/apply-plan.js")),
      Effect.promise(() => import("../../generation/src/planner.js")),
      Effect.promise(() => import("../../generation/src/todo-preset.js")),
    ])
    const tree = createTree()
    const plan = yield* Planner.planTodo(intent)
    const topology = yield* TodoPreset.createTodoTopology(plan)
    const result = yield* applyTodoPlan(tree, plan)

    expect(generateFilesSpy).toHaveBeenCalled()
    expect(
      generateFilesSpy.mock.calls.every(
        ([, source, target, substitutions]) =>
          isAbsolute(source) && !target.endsWith(".template") && substitutions.tmpl === "",
      ),
    ).toBe(true)
    expect(generateFilesSpy.mock.calls.some(([, source]) => source.endsWith("/templates/assets/todo-v1"))).toBe(true)
    expect(result.writtenPaths).toEqual(topology.files.map((file) => file.path))
    for (const file of topology.files) expect(tree.read(file.path, "utf8")).toBe(file.content)
  }),
)

it.effect("materializes non-Todo Todo-v1 identity and roots", () =>
  Effect.gen(function* () {
    const context = {
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
    }
    const plan = yield* composeCatalog({
      catalog: TodoV1AtomicCatalog,
      context,
      input: undefined,
      selected: todoV1GeneratorIds(TodoGenerationBlockIds),
    })
    const tree = createTree()
    const groups = templateGroups(plan.contributions)
    for (const group of groups)
      generateFiles(tree, templateDirectory(group), group.targetDirectory, group.substitutions)
    const source = tree
      .listChanges()
      .map(({ content, path }) => `${path}\n${content}`)
      .join("\n")
    expect(plan.contributions.map(({ path }) => path)).toEqual(
      expect.arrayContaining([
        "modules/task-core/tests/task.test.ts",
        "modules/task-service/src/index.ts",
        "adapters/task-files/tests/task-runtime.test.ts",
        "tools/task-cli/tests/task.test.ts",
      ]),
    )
    expect([plan.contributions.length, groups.every(({ substitutions }) => Object.isFrozen(substitutions))]).toEqual([
      18,
      true,
    ])
    expect(source).toContain("@acme/task-domain")
    expect(source).toContain('Schema.brand("Acme.TaskId")')
    expect(source).not.toMatch(/Todo|@effectify|\.template$/m)
  }),
)

it.effect("stages only the template paths selected by a partial evolution", () =>
  Effect.gen(function* () {
    const [{ applyTodoTopology }, Evolution] = yield* Effect.all([
      Effect.promise(() => import("../src/apply-plan.js")),
      Effect.promise(() => import("../../generation/src/evolution.js")),
    ])
    const topology = yield* Evolution.planTodoEvolution(["event"])
    const expected = topology.files
      .filter((file) => file.template !== undefined)
      .map((file) => file.path)
      .sort()

    yield* applyTodoTopology(createTree(), topology)

    expect(stagedPathsByCall.at(-1)).toEqual(expected)
  }),
)

it.effect("keeps CLI and Nx path sets and bytes equivalent from the same template source", () => {
  const workspace = join(process.cwd(), "tests/template-equivalence")
  return Effect.acquireUseRelease(
    Effect.promise(async () => {
      await rm(workspace, { force: true, recursive: true })
      return workspace
    }),
    (targetWorkspace) =>
      Effect.gen(function* () {
        const [{ generateTodo }, { applyTodoPlan }, Planner, TodoPreset] = yield* Effect.all([
          Effect.promise(() => import("../../cli/src/generate.js")),
          Effect.promise(() => import("../src/apply-plan.js")),
          Effect.promise(() => import("../../generation/src/planner.js")),
          Effect.promise(() => import("../../generation/src/todo-preset.js")),
        ])
        const tree = createTree()
        const plan = yield* Planner.planTodo(intent)
        const topology = yield* TodoPreset.createTodoTopology(plan)
        const relativeWorkspace = targetWorkspace.slice(process.cwd().length + 1)
        const [cli, nx] = yield* Effect.all([
          generateTodo({ intent, workspace: relativeWorkspace }),
          applyTodoPlan(tree, plan),
        ])

        expect(cli.writtenPaths).toEqual(nx.writtenPaths)
        for (const file of topology.files) {
          expect(yield* Effect.promise(() => readFile(join(targetWorkspace, file.path), "utf8"))).toBe(
            tree.read(file.path, "utf8"),
          )
        }
      }),
    (targetWorkspace) => Effect.promise(() => rm(targetWorkspace, { force: true, recursive: true })),
  )
})
