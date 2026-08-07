import { createTreeWithEmptyWorkspace } from "@nx/devkit/testing"
import { expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"

type ApplyPlanModule = typeof import("../src/apply-plan.js")
type PlannerModule = typeof import("../../generation/src/planner.js")
type TodoPresetModule = typeof import("../../generation/src/todo-preset.js")

const roots = [
  "packages/todo/domain",
  "packages/todo/application",
  "packages/todo/infrastructure",
  "apps/todo-cli",
] as const

const modules = () =>
  Effect.all({
    ApplyPlan: Effect.promise<ApplyPlanModule>(() => import(new URL("../src/apply-plan.js", import.meta.url).href)),
    Planner: Effect.promise<PlannerModule>(
      () => import(new URL("../../generation/src/planner.js", import.meta.url).href),
    ),
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

const isAllowedPath = (path: string): boolean => roots.some((root) => path.startsWith(`${root}/`))

it.effect("S05 and R06 apply an approved Todo plan through Tree with exactly four roots", () =>
  Effect.gen(function* () {
    const { ApplyPlan, Planner } = yield* modules()
    const tree = createTreeWithEmptyWorkspace()
    const result = yield* ApplyPlan.applyTodoPlan(tree, yield* canonicalPlan(Planner))

    expect(result.generatedRoots).toEqual(roots)
    expect(result.writtenPaths).not.toHaveLength(0)
    expect(result.writtenPaths.every(isAllowedPath)).toBe(true)
    for (const root of roots) {
      expect(tree.exists(`${root}/package.json`)).toBe(true)
      expect(tree.exists(`${root}/src/index.ts`)).toBe(true)
    }
  }),
)

it.effect("S06 reapplies the same canonical Todo plan without changing generated files", () =>
  Effect.gen(function* () {
    const { ApplyPlan, Planner } = yield* modules()
    const tree = createTreeWithEmptyWorkspace()
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
    const tree = createTreeWithEmptyWorkspace()
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
    const tree = createTreeWithEmptyWorkspace()
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
    const tree = createTreeWithEmptyWorkspace()
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
