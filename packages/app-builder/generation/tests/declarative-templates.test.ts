import { expect, it } from "@effect/vitest"
import { readFile, readdir } from "node:fs/promises"
import { isAbsolute, relative } from "node:path"
import * as Effect from "effect/Effect"
import * as TodoGeneration from "../src/generators/index.js"
import * as Templates from "../src/templates.js"

const customContext = {
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

it.effect("renders generated source and root outputs from real template assets with typed substitutions", () =>
  Effect.gen(function* () {
    const plan = yield* TodoGeneration.composeTodoAtomic(customContext)
    const generated = new TextDecoder().decode(
      plan.contributions.find((file) => file.path === "modules/task-core/src/model.ts")?.bytes,
    )
    const workspacePackage = new TextDecoder().decode(
      plan.contributions.find((file) => file.path === "package.json")?.bytes,
    )

    expect(generated).toContain("export const TaskId")
    expect(generated).toContain("export const Task")
    expect(generated).not.toContain("Todo")
    expect(workspacePackage).toContain('"name": "@acme/task-workspace"')
    expect(plan.contributions.map((file) => file.path)).toEqual(
      expect.arrayContaining([
        "modules/task-core/src/model.ts",
        "modules/task-service/src/use-case.ts",
        "adapters/task-files/src/adapter.ts",
        "tools/task-cli/src/presentation.ts",
      ]),
    )
    expect(
      new TextDecoder().decode(
        plan.contributions.find((file) => file.path === "modules/task-service/package.json")?.bytes,
      ),
    ).toContain('"name": "@acme/task-application"')
    expect(
      new TextDecoder().decode(
        plan.contributions.find((file) => file.path === "modules/task-service/src/use-case.ts")?.bytes,
      ),
    ).toContain("export class TaskApplication")
    expect(plan.contributions.every((file) => file.template !== undefined)).toBe(true)

    const groups = Templates.templateGroups(plan.contributions)
    expect(groups.length).toBeGreaterThan(0)
    for (const group of groups) {
      const directory = Templates.templateDirectory(group)
      const entries = yield* Effect.promise(() => readdir(directory, { recursive: true }))
      expect(isAbsolute(directory)).toBe(true)
      expect(relative(Templates.templateRoot(), directory)).not.toMatch(/^\.\./)
      expect(entries.some((path) => path.endsWith(".template"))).toBe(true)
      expect(group.substitutions).toMatchObject({ tmpl: "" })
    }
  }),
)

it.effect("keeps generated payloads out of TypeScript template-string constants", () =>
  Effect.gen(function* () {
    const sourceRoot = new URL("../src/", import.meta.url)
    const sourceFiles = [
      "generators/model.ts",
      "generators/event.ts",
      "generators/port.ts",
      "generators/use-case.ts",
      "generators/integration-adapter.ts",
      "generators/presentation.ts",
      "generators/surfaces.ts",
      "generators/todo-v1-atomic.ts",
    ]
    const sources = yield* Effect.promise(() =>
      Promise.all(sourceFiles.map(async (path) => [path, await readFile(new URL(path, sourceRoot), "utf8")] as const)),
    )

    for (const [path, source] of sources) {
      expect(source, path).not.toMatch(/String\.raw`/)
      expect(source.match(/(?:const|export const)\s+\w*(?:Template|Files)\w*\s*=\s*`[^`]{500,}`/g) ?? [], path).toEqual(
        [],
      )
    }

    const packageBarrel = yield* Effect.promise(() =>
      readFile(
        new URL("../src/templates/assets/generic/package/__targetRoot__/src/index.ts.template", import.meta.url),
        "utf8",
      ),
    )
    expect(packageBarrel).toContain("<% for (const entry of JSON.parse(exportsJson)) { -%>")
    expect(sources.find(([path]) => path === "generators/surfaces.ts")?.[1]).not.toMatch(/\.map\(\(entry\) => `export /)
  }),
)

it.effect("ships the same template assets through the built package", () =>
  Effect.gen(function* () {
    const Built = yield* Effect.promise<typeof import("../dist/src/templates.js")>(
      () => import(new URL("../dist/src/templates.js", import.meta.url).href),
    )
    const source = Templates.templateAsset({
      directory: "generic/workspace",
      group: "workspace-surface",
      outputPath: "package.json",
      sourcePath: "package.json.template",
      substitutions: { tmpl: "", workspacePackageName: "@acme/task-workspace" },
    })
    const built = Built.templateAsset(source)

    expect(Built.renderTemplate(built)).toBe(Templates.renderTemplate(source))
    expect(Built.templateRoot()).toContain("/dist/src/templates/assets/")
  }),
)
