import { createTree } from "@nx/devkit/testing"
import { expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import { surfaceRequest } from "../../generation/tests/surface-request.js"

type ApplyPlanModule = typeof import("../src/apply-plan.js")
type PublicModule = typeof import("../src/index.js")
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
