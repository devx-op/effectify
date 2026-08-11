import { expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"

type CatalogModule = typeof import("../src/catalog.js")
type KernelModule = typeof import("../src/kernel.js")
type SurfaceModule = typeof import("../src/generators/surfaces.js")

const modules = () =>
  Effect.all({
    Catalog: Effect.promise<CatalogModule>(() => import(new URL("../src/catalog.js", import.meta.url).href)),
    Kernel: Effect.promise<KernelModule>(() => import(new URL("../src/kernel.js", import.meta.url).href)),
    Surfaces: Effect.promise<SurfaceModule>(
      () => import(new URL("../src/generators/surfaces.js", import.meta.url).href),
    ),
  })

const context = (
  scope = "@acme",
  workspace = "task-workspace",
  roots = {
    application: "apps/task-app",
    domain: "packages/task/core",
    infrastructure: "packages/task/infrastructure",
  },
) => ({
  version: "effectify.render-context/1" as const,
  workspace: { name: workspace, npmScope: scope },
  domain: { id: "domain", importName: `${scope}/task-core` },
  entity: { id: "task", singular: "Task", plural: "Tasks", importName: `${scope}/task-app` },
  packages: [
    { id: "domain", name: `${scope}/task-core`, root: roots.domain },
    { id: "application", name: `${scope}/task-app`, root: roots.application },
    { id: "infrastructure", name: `${scope}/task-infrastructure`, root: roots.infrastructure },
  ],
})

const request = (Kernel: KernelModule, Surfaces: SurfaceModule, renderContext = context()) => ({
  catalog: Surfaces.SurfaceCatalog,
  context: renderContext,
  input: {
    packages: [
      { dependencies: [], exports: [{ from: "./domain.js", name: "TaskDomain" }], packageId: "domain" },
      { dependencies: ["domain"], exports: [{ from: "./task.js", name: "Task" }], packageId: "application" },
      {
        dependencies: ["application", "domain"],
        exports: [{ from: "./repository.js", name: "TaskRepository" }],
        packageId: "infrastructure",
      },
    ],
  },
  selected: [Kernel.identifier("workspace-surface"), Kernel.identifier("package-surface")],
})

it.effect("the closed surface catalog owns fixed roots and every validated package", () =>
  Effect.gen(function* () {
    const { Catalog, Kernel, Surfaces } = yield* modules()
    const result = yield* Catalog.composeCatalog(request(Kernel, Surfaces))
    const files = new Map<string, string>(
      result.contributions.map((file) => [file.path, new TextDecoder().decode(file.bytes)]),
    )
    const workspace = result.contributions.filter((file) => file.package === "workspace")

    expect(result.generatorIds).toEqual(["workspace-surface", "package-surface"])
    expect(workspace.map((file) => file.path)).toEqual([...Surfaces.WorkspaceRootFiles])
    expect([...files.keys()]).toEqual([
      "apps/task-app/package.json",
      "apps/task-app/src/index.ts",
      "nx.json",
      "package.json",
      "packages/task/core/package.json",
      "packages/task/core/src/index.ts",
      "packages/task/infrastructure/package.json",
      "packages/task/infrastructure/src/index.ts",
      "pnpm-workspace.yaml",
      "tsconfig.build.json",
      "vitest.config.mts",
    ])
    expect(files.get("package.json")).toContain('"name": "@acme/task-workspace"')
    expect(files.get("apps/task-app/package.json")).toContain('"@acme/task-core": "workspace:*"')
    expect(files.get("apps/task-app/src/index.ts")).toBe('export { Task } from "./task.js"\n')
    expect(files.get("packages/task/infrastructure/package.json")).toContain('"@acme/task-app": "workspace:*"')
    expect(files.get("packages/task/infrastructure/src/index.ts")).toBe(
      'export { TaskRepository } from "./repository.js"\n',
    )

    const parameterized = yield* Catalog.composeCatalog(
      request(
        Kernel,
        Surfaces,
        context("@globex", "console", {
          application: "apps/console",
          domain: "packages/console/core",
          infrastructure: "packages/console/infrastructure",
        }),
      ),
    )
    expect(parameterized.contributions.map((file) => file.path)).toContain("apps/console/package.json")
    expect(
      new TextDecoder().decode(parameterized.contributions.find((file) => file.path === "package.json")?.bytes),
    ).toContain('"name": "@globex/console"')
  }),
)
