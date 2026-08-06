import { expect, it } from "@effect/vitest"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import * as Effect from "effect/Effect"

type CatalogModule = typeof import("../src/catalog.js")
type IntentModule = typeof import("../src/intent.js")
type PlannerModule = typeof import("../src/planner.js")
type TodoPlan = import("../src/planner.js").TodoPlan
interface CliPlanModule {
  readonly renderTodoPlan: (plan: TodoPlan) => Effect.Effect<string>
}

const fixture = readFileSync(fileURLToPath(new URL("./fixtures/todo-plan.json", import.meta.url)), "utf8").trim()
const intent = {
  version: "effectify.creation-intent/1",
  preset: "todo",
  capabilities: ["todo.events", "todo.community-labels", "todo.cli-presentation"],
}

const modules = () =>
  Effect.all({
    Intent: Effect.promise<IntentModule>(() => import(new URL("../src/intent.js", import.meta.url).href)),
    Catalog: Effect.promise<CatalogModule>(() => import(new URL("../src/catalog.js", import.meta.url).href)),
    Planner: Effect.promise<PlannerModule>(() => import(new URL("../src/planner.js", import.meta.url).href)),
    CliPlan: Effect.promise<CliPlanModule>(() => import(new URL("../../cli/src/plan.js", import.meta.url).href)),
  })

it.effect("S01 returns the canonical Todo envelope and visible plan fixture", () =>
  Effect.gen(function* () {
    const { Planner, CliPlan } = yield* modules()
    const plan = yield* Planner.planTodo(intent)
    expect(plan).toEqual(JSON.parse(fixture))
    expect(JSON.parse(yield* CliPlan.renderTodoPlan(plan))).toEqual(JSON.parse(fixture))
  }),
)

it.effect("R01 rejects arbitrary module, template, callback, and command selectors", () =>
  Effect.gen(function* () {
    const { Intent } = yield* modules()
    for (const selector of ["module", "template", "callback", "command"]) {
      const failure = yield* Intent.decodeCreationIntent({ ...intent, [selector]: "node:child_process" }).pipe(
        Effect.flip,
      )
      expect(failure).toMatchObject({ _tag: "InvalidCreationIntent", reason: "schema" })
    }
  }),
)

it.effect("S02 resolves only the exact preinstalled allowlisted community metadata", () =>
  Effect.gen(function* () {
    const { Intent, Catalog } = yield* modules()
    const resolved = yield* Catalog.resolveCatalog(yield* Intent.decodeCreationIntent(intent))
    expect(resolved.entries.map((entry) => entry.capability)).toEqual(JSON.parse(fixture).orderedCapabilities)
    expect(resolved.entries.filter((entry) => entry.kind === "community")).toEqual([
      expect.objectContaining({
        allowlisted: true,
        capability: "todo.community-labels",
        exportName: "todoLabels",
        installedVersion: "1.0.0",
        packageName: "@effectify-community/todo-labels",
        packageVersion: "1.0.0",
      }),
    ])
  }),
)

it.effect("R02 rejects unavailable and incompatible community metadata without loading it", () =>
  Effect.gen(function* () {
    const { Intent, Catalog } = yield* modules()
    const decoded = yield* Intent.decodeCreationIntent(intent)
    for (const update of [{ allowlisted: false }, { installedVersion: "2.0.0" }]) {
      const catalog = {
        ...Catalog.TodoCatalog,
        entries: Catalog.TodoCatalog.entries.map((entry) =>
          entry.capability === "todo.community-labels" ? { ...entry, ...update } : entry,
        ),
      }
      const failure = yield* Catalog.resolveCatalog(decoded, catalog).pipe(Effect.flip)
      expect(failure).toMatchObject({ _tag: "CatalogResolutionError", capability: "todo.community-labels" })
    }
  }),
)

it.effect("S03 and S04 close dependencies in a deterministic order for equivalent selectors", () =>
  Effect.gen(function* () {
    const { Planner } = yield* modules()
    const first = yield* Planner.planTodo(intent)
    const second = yield* Planner.planTodo({ ...intent, capabilities: [...intent.capabilities].reverse() })
    expect(first).toEqual(second)
    expect(first.orderedCapabilities).toEqual(JSON.parse(fixture).orderedCapabilities)
  }),
)

it.effect("R05 and S09 keep planning non-mutating and free of Nx Tree authority", () =>
  Effect.gen(function* () {
    const { Planner } = yield* modules()
    const plan = yield* Planner.planTodo(intent)
    const sources = ["intent", "catalog", "planner"].map((name) =>
      readFileSync(fileURLToPath(new URL(`../src/${name}.ts`, import.meta.url)), "utf8"),
    )
    expect(plan.mutation).toBe("none")
    expect(sources.join("\n")).not.toMatch(/@nx\/devkit|\bTree\b|app-builder-execution/)
  }),
)
