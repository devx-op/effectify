import { createTree } from "@nx/devkit/testing"
import { expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"

const blockIds = ["model", "use-case", "port", "integration-adapter", "event", "presentation"] as const
type BlockId = (typeof blockIds)[number]

type GeneratedFile = { readonly content: string; readonly owner: string; readonly path: string }
type Topology = {
  readonly files: ReadonlyArray<GeneratedFile>
  readonly projects: ReadonlyArray<unknown>
  readonly roots: ReadonlyArray<string>
}
type ApplyPlanModule = {
  readonly applyTodoTopology: (
    tree: ReturnType<typeof createTree>,
    topology: Topology,
  ) => Effect.Effect<
    { readonly generatedRoots: ReadonlyArray<string>; readonly writtenPaths: ReadonlyArray<string> },
    unknown
  >
}
type EvolutionModule = {
  readonly planTodoEvolution: (blocks: ReadonlyArray<BlockId>) => Effect.Effect<Topology, unknown>
}
type PlannerModule = { readonly planTodo: (input: unknown) => Effect.Effect<unknown, unknown> }
type TodoPresetModule = {
  readonly DefaultTodoRenderContext: unknown
  readonly createTodoTopology: (plan: unknown) => Effect.Effect<Topology, unknown>
}
type TodoGenerationModule = {
  readonly composeTodoAtomic: (context: unknown) => Effect.Effect<
    {
      readonly contributions: ReadonlyArray<{
        readonly bytes: Uint8Array
        readonly owner: string
        readonly path: string
      }>
    },
    unknown
  >
}

const dependencies: Readonly<Record<BlockId, ReadonlyArray<BlockId>>> = {
  model: [],
  port: ["model"],
  event: ["model"],
  "use-case": ["port"],
  "integration-adapter": ["use-case"],
  presentation: ["integration-adapter"],
}

const ownerFor = (id: BlockId): string => `@effectify/app-builder/${id}/1`
const valuesAt = (tree: ReturnType<typeof createTree>, paths: ReadonlyArray<string>) =>
  Object.fromEntries(paths.map((path) => [path, tree.read(path, "utf8")]))

const modules = () =>
  Effect.all({
    ApplyPlan: Effect.promise<ApplyPlanModule>(
      () => import(new URL("../../nx-plugin/src/apply-plan.js", import.meta.url).href),
    ),
    Evolution: Effect.promise<EvolutionModule>(() => import(new URL("../src/evolution.js", import.meta.url).href)),
    Planner: Effect.promise<PlannerModule>(() => import(new URL("../src/planner.js", import.meta.url).href)),
    TodoPreset: Effect.promise<TodoPresetModule>(() => import(new URL("../src/todo-preset.js", import.meta.url).href)),
    TodoGeneration: Effect.promise<TodoGenerationModule>(
      () => import(new URL("../src/generators/index.js", import.meta.url).href),
    ),
  })

it.effect("the public Todo topology is exactly the direct atomic catalog output", () =>
  Effect.gen(function* () {
    const { Planner, TodoGeneration, TodoPreset } = yield* modules()
    const topology = yield* TodoPreset.createTodoTopology(
      yield* Planner.planTodo({
        capabilities: ["todo.events"],
        preset: "todo",
        version: "effectify.creation-intent/1",
      }),
    )
    const direct = yield* TodoGeneration.composeTodoAtomic(TodoPreset.DefaultTodoRenderContext)

    expect(topology.files).toEqual(
      direct.contributions.map((file) => ({
        content: new TextDecoder().decode(file.bytes),
        owner: file.owner,
        path: file.path,
      })),
    )
  }),
)

it.effect("R03 and S05 compose dependency-closed additions that write only their owned leaves", () =>
  Effect.gen(function* () {
    const { ApplyPlan, Evolution } = yield* modules()

    for (const id of blockIds) {
      const tree = createTree()
      const baseline = yield* Evolution.planTodoEvolution(dependencies[id])
      yield* ApplyPlan.applyTodoTopology(tree, baseline)
      tree.write("notes/user-authored.ts", "export const preserved = true\n")

      const addition = yield* Evolution.planTodoEvolution([id])
      const direct = addition.files.filter((file) => file.owner === ownerFor(id))
      const result = yield* ApplyPlan.applyTodoTopology(tree, addition)
      const manifest = direct.find((file) => file.path.endsWith(`.effectify/generation/${id}.json`))

      expect(direct.map((file) => file.path)).not.toHaveLength(0)
      expect(result.writtenPaths).toEqual(direct.map((file) => file.path))
      expect(JSON.parse(manifest?.content ?? "{}")).toMatchObject({
        canonicalJson: "effectify-cjson/1",
        generatorId: id,
        owner: ownerFor(id),
        provenance: { generator: `@effectify/app-builder/generation/${id}@1.0.0` },
      })
      expect(tree.read("notes/user-authored.ts", "utf8")).toBe("export const preserved = true\n")
    }
  }),
)

it.effect("R04 and S06 evolve a four-root Todo baseline and replay the same addition with zero diff", () =>
  Effect.gen(function* () {
    const { ApplyPlan, Evolution } = yield* modules()
    const tree = createTree()
    const fullTopology = yield* Evolution.planTodoEvolution(blockIds)
    const baseline = { ...fullTopology, files: fullTopology.files.filter((file) => file.owner !== ownerFor("event")) }
    yield* ApplyPlan.applyTodoTopology(tree, baseline)
    const event = yield* Evolution.planTodoEvolution(["event"])
    const eventFiles = event.files.filter((file) => file.owner === ownerFor("event"))
    const first = yield* ApplyPlan.applyTodoTopology(tree, event)
    const before = valuesAt(
      tree,
      eventFiles.map((file) => file.path),
    )
    const replay = yield* ApplyPlan.applyTodoTopology(tree, event)

    expect(tree.exists("packages/todo/domain/src/index.ts")).toBe(true)
    expect(tree.exists("packages/todo/application/src/index.ts")).toBe(true)
    expect(tree.exists("packages/todo/infrastructure/src/index.ts")).toBe(true)
    expect(tree.exists("apps/todo-cli/src/index.ts")).toBe(true)
    expect(first.generatedRoots).toEqual(["packages/todo/domain"])
    expect(first.writtenPaths).toEqual(eventFiles.map((file) => file.path))
    expect(replay.writtenPaths).toEqual([])
    expect(
      valuesAt(
        tree,
        eventFiles.map((file) => file.path),
      ),
    ).toEqual(before)
  }),
)

it.effect("S07 rejects changed owned output before the Tree adapter mutates another leaf", () =>
  Effect.gen(function* () {
    const { ApplyPlan, Evolution } = yield* modules()
    const tree = createTree()
    const topology = yield* Evolution.planTodoEvolution(["presentation"])
    yield* ApplyPlan.applyTodoTopology(tree, topology)
    const changed = topology.files.find((file) => file.owner === ownerFor("presentation"))
    if (changed === undefined) throw new Error("presentation must own a generated leaf")
    tree.write(changed.path, "user-changed-owned-output\n")
    const before = valuesAt(
      tree,
      topology.files.map((file) => file.path),
    )

    const failure = yield* ApplyPlan.applyTodoTopology(tree, topology).pipe(Effect.flip)

    expect(failure).toMatchObject({ _tag: "TodoTopologyApplyError", path: changed.path, reason: "ownership-conflict" })
    expect(
      valuesAt(
        tree,
        topology.files.map((file) => file.path),
      ),
    ).toEqual(before)
  }),
)

it.effect("S08 rejects an unowned target without touching unrelated user-authored code", () =>
  Effect.gen(function* () {
    const { ApplyPlan, Evolution } = yield* modules()
    const tree = createTree()
    const topology = yield* Evolution.planTodoEvolution(["model"])
    const [target] = topology.files
    if (target === undefined) throw new Error("model must own generated output")
    tree.write(target.path, "user-authored-model\n")
    tree.write("notes/keep.ts", "export const keep = 'unchanged'\n")

    const failure = yield* ApplyPlan.applyTodoTopology(tree, topology).pipe(Effect.flip)

    expect(failure).toMatchObject({ _tag: "TodoTopologyApplyError", path: target.path, reason: "ownership-conflict" })
    expect(tree.read(target.path, "utf8")).toBe("user-authored-model\n")
    expect(tree.read("notes/keep.ts", "utf8")).toBe("export const keep = 'unchanged'\n")
    expect(topology.files.slice(1).every((file) => tree.exists(file.path) === false)).toBe(true)
  }),
)
