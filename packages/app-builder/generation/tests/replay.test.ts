import { createTreeWithEmptyWorkspace } from "@nx/devkit/testing"
import { expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"

interface TodoPlan {
  readonly catalogVersion: string
  readonly intent: unknown
  readonly orderedCapabilities: ReadonlyArray<string>
}

interface TopologyFile {
  readonly content: string
  readonly owner: string
  readonly path: string
}

interface Topology {
  readonly files: ReadonlyArray<TopologyFile>
}

interface PlannerModule {
  readonly planTodo: (input: unknown) => Effect.Effect<TodoPlan, unknown>
}

interface TodoPresetModule {
  readonly createTodoTopology: (plan: TodoPlan) => Effect.Effect<Topology, unknown>
}

interface ApplyPlanModule {
  readonly applyTodoTopology: (
    tree: ReturnType<typeof createTreeWithEmptyWorkspace>,
    topology: Topology,
  ) => Effect.Effect<{ readonly writtenPaths: ReadonlyArray<string> }, unknown>
}

interface CjsonModule {
  readonly canonicalDigest: (input: unknown) => Effect.Effect<string, unknown>
}

interface ReplayProvenance {
  readonly version: string
}

interface ProvenanceModule {
  readonly captureReplayProvenance: (candidate: unknown) => Effect.Effect<ReplayProvenance, unknown>
  readonly semanticDependencyDigest: (dependencies: unknown) => Effect.Effect<string, unknown>
}

interface ReplayModule {
  readonly validateReplay: (
    provenance: ReplayProvenance,
    candidate: unknown,
    workspace: { readonly readOutput: (path: string) => string | undefined },
  ) => Effect.Effect<{ readonly diffPaths: ReadonlyArray<string>; readonly zeroDiff: boolean }, unknown>
}

const intent = {
  capabilities: [
    "todo.workspace",
    "todo.model",
    "todo.port",
    "todo.use-case",
    "todo.file-adapter",
    "todo.cli-presentation",
    "todo.events",
  ],
  preset: "todo",
  version: "effectify.creation-intent/1",
}

const dependencies = [
  {
    importer: "workspace",
    integrity: "sha512-effect",
    name: "effect",
    peers: { typescript: "6.0.3" },
    registry: "https://registry-one.example.invalid",
    storePath: "/one/store/effect",
    version: "4.0.0",
  },
]

const pins = {
  effect: "4.0.0",
  frozenInstall: true,
  nx: "23.1.0",
  packageManager: "pnpm@10.14.0",
  plugins: [{ name: "@effectify/app-builder-generation", version: "0.0.0" }],
}

const modules = () =>
  Effect.all({
    ApplyPlan: Effect.promise<ApplyPlanModule>(
      () => import(new URL("../../nx-plugin/src/apply-plan.js", import.meta.url).href),
    ),
    Cjson: Effect.promise<CjsonModule>(() => import(new URL("../src/cjson.js", import.meta.url).href)),
    Planner: Effect.promise<PlannerModule>(() => import(new URL("../src/planner.js", import.meta.url).href)),
    Provenance: Effect.promise<ProvenanceModule>(() => import(new URL("../src/provenance.js", import.meta.url).href)),
    Replay: Effect.promise<ReplayModule>(() => import(new URL("../src/replay.js", import.meta.url).href)),
    TodoPreset: Effect.promise<TodoPresetModule>(() => import(new URL("../src/todo-preset.js", import.meta.url).href)),
  })

const candidateFor = (plan: TodoPlan, topology: Topology, dependencyInput: unknown = dependencies) => ({
  blocks: ["workspace", "model", "port", "event", "use-case", "integration-adapter", "presentation"],
  catalog: { capabilities: plan.orderedCapabilities, version: plan.catalogVersion },
  dependencies: dependencyInput,
  intent: plan.intent,
  outputs: topology.files.map((file) => ({
    content: file.content,
    mode: "100644",
    owner: file.owner,
    path: file.path,
  })),
  pins,
  plan,
})

const valuesAt = (tree: ReturnType<typeof createTreeWithEmptyWorkspace>, paths: ReadonlyArray<string>) =>
  Object.fromEntries(paths.map((path) => [path, tree.read(path, "utf8")]))

it.effect("S21 canonicalizes source digests and semantic dependencies without lock transport metadata", () =>
  Effect.gen(function* () {
    const { Cjson, Provenance } = yield* modules()

    const left = yield* Cjson.canonicalDigest({ nested: { a: 1, b: 2 }, value: "same" })
    const right = yield* Cjson.canonicalDigest({ value: "same", nested: { b: 2, a: 1 } })
    const firstDependencies = yield* Provenance.semanticDependencyDigest(dependencies)
    const secondDependencies = yield* Provenance.semanticDependencyDigest([
      {
        ...dependencies[0],
        registry: "https://registry-two.example.invalid",
        storePath: "/two/store/effect",
      },
    ])

    expect(left).toBe(right)
    expect(firstDependencies).toBe(secondDependencies)
  }),
)

it.effect("R13 and S22-S23 record frozen provenance then replay a fresh Tree with zero writes and zero diff", () =>
  Effect.gen(function* () {
    const { ApplyPlan, Planner, Provenance, Replay, TodoPreset } = yield* modules()
    const plan = yield* Planner.planTodo(intent)
    const topology = yield* TodoPreset.createTodoTopology(plan)
    const candidate = candidateFor(plan, topology)
    const provenance = yield* Provenance.captureReplayProvenance(candidate)
    const unfrozen = yield* Provenance.captureReplayProvenance({
      ...candidate,
      pins: { ...pins, frozenInstall: false },
    }).pipe(Effect.flip)
    const tree = createTreeWithEmptyWorkspace()
    yield* ApplyPlan.applyTodoTopology(tree, topology)
    tree.write("notes/user-authored.ts", "export const preserved = true\n")
    const paths = topology.files.map((file) => file.path)
    const before = valuesAt(tree, paths)

    const replay = yield* Replay.validateReplay(provenance, candidate, {
      readOutput: (path) => tree.read(path, "utf8") ?? undefined,
    })
    const reapplied = yield* ApplyPlan.applyTodoTopology(tree, topology)

    expect(provenance.version).toBe("effectify.app-builder-replay-provenance/1")
    expect(unfrozen).toMatchObject({ _tag: "ReplayProvenanceError", field: "pins", reason: "unfrozen-install" })
    expect(replay).toEqual({ diffPaths: [], zeroDiff: true })
    expect(reapplied.writtenPaths).toEqual([])
    expect(valuesAt(tree, paths)).toEqual(before)
    expect(tree.read("notes/user-authored.ts", "utf8")).toBe("export const preserved = true\n")
  }),
)

it.effect("R12 and S24 reject dependency or output mismatch before writes and preserve unrelated user bytes", () =>
  Effect.gen(function* () {
    const { ApplyPlan, Planner, Provenance, Replay, TodoPreset } = yield* modules()
    const plan = yield* Planner.planTodo(intent)
    const topology = yield* TodoPreset.createTodoTopology(plan)
    const candidate = candidateFor(plan, topology)
    const provenance = yield* Provenance.captureReplayProvenance(candidate)
    const tree = createTreeWithEmptyWorkspace()
    yield* ApplyPlan.applyTodoTopology(tree, topology)
    tree.write("notes/user-authored.ts", "export const keep = 'unchanged'\n")
    const paths = topology.files.map((file) => file.path)
    const before = valuesAt(tree, paths)
    const [firstOutput] = candidate.outputs
    if (firstOutput === undefined) throw new Error("replay fixture requires an owned output")

    const dependencyFailure = yield* Replay.validateReplay(
      provenance,
      candidateFor(plan, topology, [{ ...dependencies[0], version: "4.1.0" }]),
      { readOutput: (path) => tree.read(path, "utf8") ?? undefined },
    ).pipe(Effect.flip)
    const candidateFailure = yield* Replay.validateReplay(
      provenance,
      { ...candidate, outputs: [{ ...firstOutput, content: "candidate-drift\n" }, ...candidate.outputs.slice(1)] },
      { readOutput: (path) => tree.read(path, "utf8") ?? undefined },
    ).pipe(Effect.flip)

    expect(valuesAt(tree, paths)).toEqual(before)
    tree.write(firstOutput.path, "workspace-drift\n")
    const workspaceFailure = yield* Replay.validateReplay(provenance, candidate, {
      readOutput: (path) => tree.read(path, "utf8") ?? undefined,
    }).pipe(Effect.flip)

    expect(dependencyFailure).toMatchObject({
      _tag: "ReplayEvidenceError",
      identity: "dependencies",
      phase: "candidate",
    })
    expect(candidateFailure).toMatchObject({ _tag: "ReplayEvidenceError", identity: "outputs", phase: "candidate" })
    expect(workspaceFailure).toMatchObject({ _tag: "ReplayEvidenceError", identity: "outputs", phase: "workspace" })
    expect(valuesAt(tree, paths)).toEqual({ ...before, [firstOutput.path]: "workspace-drift\n" })
    expect(tree.read("notes/user-authored.ts", "utf8")).toBe("export const keep = 'unchanged'\n")
  }),
)
