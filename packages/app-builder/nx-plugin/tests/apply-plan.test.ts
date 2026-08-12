import { generateFiles } from "@nx/devkit"
import { createTree } from "@nx/devkit/testing"
import { expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import { vi } from "vitest"
import { surfaceRequest } from "../../generation/tests/surface-request.js"

const generatedPathsByCall = vi.hoisted(() => [] as Array<ReadonlyArray<string>>)
const generatedContentByPath = vi.hoisted(() => new Map<string, string>())

vi.mock("@nx/devkit", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@nx/devkit")>()
  return {
    ...actual,
    generateFiles: (...args: Parameters<typeof actual.generateFiles>) => {
      actual.generateFiles(...args)
      for (const [path, content] of generatedContentByPath) {
        if (args[0].exists(path)) args[0].write(path, content)
      }
      generatedPathsByCall.push(args[0].listChanges().map((change) => change.path))
    },
  }
})

type ApplyPlanModule = typeof import("../src/apply-plan.js")
type PublicModule = typeof import("../src/index.js")
type CliModule = typeof import("../../cli/src/index.js")
type GenerationModule = typeof import("@effectify/app-builder-generation")
type PlannerModule = typeof import("../../generation/src/planner.js")
type TodoPresetModule = typeof import("../../generation/src/todo-preset.js")

const roots = [
  "packages/todo/domain",
  "packages/todo/application",
  "packages/todo/infrastructure",
  "apps/todo-cli",
] as const
const workspaceRootFiles = [
  "nx.json",
  "package.json",
  "pnpm-workspace.yaml",
  "tsconfig.build.json",
  "vitest.config.mts",
]

const modules = () =>
  Effect.all({
    ApplyPlan: Effect.promise<ApplyPlanModule>(() => import(new URL("../src/apply-plan.js", import.meta.url).href)),
    Cli: Effect.promise<CliModule>(() => import(new URL("../../cli/src/index.js", import.meta.url).href)),
    Generation: Effect.promise<GenerationModule>(() => import("@effectify/app-builder-generation")),
    Planner: Effect.promise<PlannerModule>(
      () => import(new URL("../../generation/src/planner.js", import.meta.url).href),
    ),
    Public: Effect.promise<PublicModule>(() => import(new URL("../src/index.js", import.meta.url).href)),
    TodoPreset: Effect.promise<TodoPresetModule>(
      () => import(new URL("../../generation/src/todo-preset.js", import.meta.url).href),
    ),
  })

const canonicalPlan = (Planner: PlannerModule) =>
  Planner.planTodo({
    version: "effectify.creation-intent/1",
    preset: "todo",
    capabilities: ["todo.events"],
  })

const isAllowedPath = (path: string): boolean =>
  workspaceRootFiles.includes(path) || roots.some((root) => path.startsWith(`${root}/`))

it.effect("S05 and R06 apply an approved Todo plan through Tree with exactly four roots", () =>
  Effect.gen(function* () {
    const { ApplyPlan, Generation, Planner } = yield* modules()
    const tree = createTree()
    const plan = yield* canonicalPlan(Planner)
    const result = yield* ApplyPlan.applyTodoPlan(tree, plan)
    const direct = yield* Generation.TodoGeneration.composeTodoAtomic(Generation.TodoPreset.DefaultTodoRenderContext)
    const rootPaths = new Set<string>(Generation.TodoGeneration.WorkspaceRootFiles)
    const rootFiles = direct.contributions.filter((file) => rootPaths.has(file.path))

    expect(result.generatedRoots).toEqual(roots)
    expect(result.writtenPaths).not.toHaveLength(0)
    expect(result.writtenPaths.every(isAllowedPath)).toBe(true)
    expect(rootFiles).toHaveLength(5)
    expect(result.writtenPaths).toEqual(expect.arrayContaining(rootFiles.map((file) => file.path)))
    for (const file of rootFiles) {
      expect(tree.read(file.path, "utf8")).toBe(new TextDecoder().decode(file.bytes))
    }
    for (const root of roots) {
      expect(tree.exists(`${root}/package.json`)).toBe(true)
      expect(tree.exists(`${root}/src/index.ts`)).toBe(true)
    }
  }),
)

it.effect("accepts only canonical workspace-root files before mutating the Tree", () =>
  Effect.gen(function* () {
    const { ApplyPlan, Planner, TodoPreset } = yield* modules()
    const tree = createTree()
    const topology = yield* TodoPreset.createTodoTopology(yield* canonicalPlan(Planner))

    const failure = yield* ApplyPlan.applyTodoTopology(tree, {
      ...topology,
      files: [...topology.files, { content: "untrusted root file\n", owner: "test", path: "README.md" }],
    }).pipe(Effect.flip)

    expect(failure).toMatchObject({ _tag: "TodoTopologyApplyError", path: "README.md", reason: "ownership-conflict" })
    expect(tree.exists("nx.json")).toBe(false)
  }),
)

it.effect("generic Nx planning behaviorally composes actual surface catalogs", () =>
  Effect.gen(function* () {
    const { Generation, Public } = yield* modules()
    for (const [scope, workspace] of [
      ["@acme", "task-workspace"],
      ["@globex", "console"],
    ]) {
      const options = surfaceRequest(Generation, scope, workspace)
      const direct = yield* Generation.composeCatalog(options)
      const adapter = yield* Public.composeGeneration(options)

      expect(adapter).toEqual(direct)
    }
  }),
)

it.effect("renders a non-default generic context through real Nx EJS with exact kernel parity", () =>
  Effect.gen(function* () {
    const { Cli, Generation } = yield* modules()
    const context = {
      version: "effectify.render-context/1" as const,
      workspace: { name: "operations-workspace", npmScope: "@acme" },
      domain: { id: "domain", importName: "@acme/work-item-domain" },
      entity: {
        id: "work-item",
        singular: "WorkItem",
        plural: "WorkItems",
        importName: "@acme/work-item-console",
      },
      packages: [
        { id: "domain", name: "@acme/work-item-domain", root: "modules/work-items/core" },
        { id: "application", name: "@acme/work-item-service", root: "services/work-items" },
        { id: "infrastructure", name: "@acme/work-item-storage", root: "adapters/work-items" },
        { id: "presentation", name: "@acme/work-item-console", root: "tools/work-items" },
      ],
    }
    const input = {
      packages: [
        {
          dependencies: [],
          exports: [
            { from: "./model.js", name: "WorkItem" },
            { from: "./event.js", name: "WorkItemEvent" },
          ],
          packageId: "domain",
        },
        {
          dependencies: ["domain"],
          exports: [{ from: "./use-case.js", name: "WorkItemApplication" }],
          packageId: "application",
        },
        { dependencies: ["application", "domain"], exports: [], packageId: "infrastructure" },
        { dependencies: ["infrastructure", "application", "domain"], exports: [], packageId: "presentation" },
      ],
    }
    const options = {
      catalog: Generation.TodoGeneration.TodoAtomicCatalog,
      context,
      input,
      selected: Generation.TodoGeneration.TodoAtomicCatalog.map((generator) => generator.id),
    }
    const plan = yield* Generation.composeCatalog(options)
    const cli = yield* Cli.composeGeneration(options)
    const tree = createTree()
    const initialPaths = new Set(tree.listChanges().map((change) => change.path))
    for (const group of Generation.Templates.templateGroups(plan.contributions)) {
      generateFiles(tree, Generation.Templates.templateDirectory(group), "", group.substitutions)
    }
    const expected = Object.fromEntries(
      plan.contributions.map((file) => [file.path, new TextDecoder().decode(file.bytes)]),
    )
    const actual = Object.fromEntries(
      tree
        .listChanges()
        .filter((change) => !initialPaths.has(change.path))
        .map((change) => [change.path, change.content?.toString()]),
    )

    expect(Object.keys(actual).sort()).toEqual(Object.keys(expected).sort())
    expect(actual).toEqual(expected)
    expect(cli).toEqual(plan)
    expect(actual["modules/work-items/core/src/model.ts"]).toContain("export const WorkItemId")
    expect(actual["services/work-items/src/use-case.ts"]).toContain("WorkItemEvent.WorkItemAdded({ workItem: value })")
    expect(actual["modules/work-items/core/src/index.ts"]).toContain('export { WorkItemEvent } from "./event.js"')
  }),
)

it.effect("S06 reapplies the same canonical Todo plan without changing generated files", () =>
  Effect.gen(function* () {
    const { ApplyPlan, Planner } = yield* modules()
    const tree = createTree()
    const plan = yield* canonicalPlan(Planner)
    yield* ApplyPlan.applyTodoPlan(tree, plan)
    const before = roots.map((root) => tree.read(`${root}/package.json`, "utf8"))
    const replay = yield* ApplyPlan.applyTodoPlan(tree, plan)

    expect(replay.writtenPaths).toEqual([])
    expect(roots.map((root) => tree.read(`${root}/package.json`, "utf8"))).toEqual(before)
  }),
)

it.effect("S07 rejects an existing unowned target before any Tree mutation", () =>
  Effect.gen(function* () {
    const { ApplyPlan, Planner } = yield* modules()
    const tree = createTree()
    const path = "packages/todo/domain/package.json"
    const userContent = '{"name":"user-authored-domain"}\n'
    tree.write(path, userContent)

    const failure = yield* ApplyPlan.applyTodoPlan(tree, yield* canonicalPlan(Planner)).pipe(Effect.flip)

    expect(failure).toMatchObject({ _tag: "TodoTopologyApplyError", path, reason: "ownership-conflict" })
    expect(tree.read(path, "utf8")).toBe(userContent)
    expect(tree.exists("packages/todo/application/package.json")).toBe(false)
  }),
)

it.effect("S08 rejects duplicate ownership claims before applying any files", () =>
  Effect.gen(function* () {
    const { ApplyPlan, Planner, TodoPreset } = yield* modules()
    const tree = createTree()
    const topology = yield* TodoPreset.createTodoTopology(yield* canonicalPlan(Planner))
    const [first] = topology.files
    if (first === undefined) {
      throw new Error("Todo topology must contain generated files")
    }

    const failure = yield* ApplyPlan.applyTodoTopology(tree, {
      ...topology,
      files: [...topology.files, first],
    }).pipe(Effect.flip)

    expect(failure).toMatchObject({ _tag: "TodoTopologyApplyError", path: first.path, reason: "ownership-conflict" })
    expect(tree.exists(first.path)).toBe(false)
  }),
)

it.effect("rolls back caller Tree writes when committing a validated template plan fails", () =>
  Effect.gen(function* () {
    const { ApplyPlan, Planner, TodoPreset } = yield* modules()
    const tree = createTree()
    const topology = yield* TodoPreset.createTodoTopology(yield* canonicalPlan(Planner))
    const originalWrite = tree.write.bind(tree)
    let writes = 0
    tree.write = (path, content, options) => {
      writes += 1
      if (writes === 2) throw new Error("simulated Tree write failure")
      originalWrite(path, content, options)
    }

    const failure = yield* ApplyPlan.applyTodoTopology(tree, topology).pipe(Effect.flip)

    expect(failure).toMatchObject({ _tag: "TodoTopologyApplyError", reason: "ownership-conflict" })
    expect(topology.files.some((file) => tree.exists(file.path))).toBe(false)
  }),
)

it.effect("commits generated partial-evolution bytes instead of descriptor content", () =>
  Effect.gen(function* () {
    const { ApplyPlan } = yield* modules()
    const Evolution = yield* Effect.promise(() => import("../../generation/src/evolution.js"))
    const tree = createTree()
    const topology = yield* Evolution.planTodoEvolution(["event"])
    const nonTemplate = topology.files.find((file) => file.template === undefined)
    if (nonTemplate === undefined) throw new Error("Partial evolution must contain non-template output")
    const generatedContent = `${nonTemplate.content}// generated by Nx\n`
    generatedPathsByCall.length = 0
    generatedContentByPath.set(nonTemplate.path, generatedContent)

    yield* ApplyPlan.applyTodoTopology(tree, topology)
    generatedContentByPath.clear()

    expect(generatedPathsByCall.some((paths) => paths.includes(nonTemplate.path))).toBe(true)
    expect(generatedContent).not.toBe(nonTemplate.content)
    expect(tree.read(nonTemplate.path, "utf8")).toBe(generatedContent)
  }),
)

it.effect("S10 emits the inward-only Todo dependency direction", () =>
  Effect.gen(function* () {
    const { Planner, TodoPreset } = yield* modules()
    const topology = yield* TodoPreset.createTodoTopology(yield* canonicalPlan(Planner))

    expect(topology.projects.map((project) => [project.name, project.dependencies])).toEqual([
      ["@effectify/todo-domain", []],
      ["@effectify/todo-application", ["@effectify/todo-domain"]],
      ["@effectify/todo-infrastructure", ["@effectify/todo-application", "@effectify/todo-domain"]],
      [
        "@effectify/todo-cli",
        ["@effectify/todo-infrastructure", "@effectify/todo-application", "@effectify/todo-domain"],
      ],
    ])
  }),
)

it.effect("S11 rejects outward Domain dependencies before any Tree mutation", () =>
  Effect.gen(function* () {
    const { ApplyPlan, Planner, TodoPreset } = yield* modules()
    const tree = createTree()
    const topology = yield* TodoPreset.createTodoTopology(yield* canonicalPlan(Planner))
    const [domain, ...remaining] = topology.projects
    if (domain === undefined) {
      throw new Error("Todo topology must contain a domain project")
    }

    const failure = yield* ApplyPlan.applyTodoTopology(tree, {
      ...topology,
      projects: [{ ...domain, dependencies: ["@effectify/todo-infrastructure"] }, ...remaining],
    }).pipe(Effect.flip)

    expect(failure).toMatchObject({
      _tag: "TodoTopologyApplyError",
      project: "@effectify/todo-domain",
      reason: "dependency-direction",
    })
    expect(tree.exists("packages/todo/domain/package.json")).toBe(false)
  }),
)
