import { renderTemplate, templateAsset, templateSubstitutions, type TemplateAsset } from "../../templates.js"

export interface TodoTemplateFile {
  readonly content: string
  readonly path: string
  readonly template: TemplateAsset
}

const paths = [
  "packages/todo/domain/src/index.ts",
  "packages/todo/domain/src/events.ts",
  "packages/todo/application/src/index.ts",
  "packages/todo/application/src/use-case.ts",
  "packages/todo/infrastructure/src/index.ts",
  "apps/todo-cli/src/index.ts",
  "packages/todo/domain/tests/todo.test.ts",
  "packages/todo/infrastructure/tests/todo-runtime.test.ts",
  "apps/todo-cli/tests/todo.test.ts",
] as const

const defaults = {
  workspace: { name: "todo-workspace", npmScope: "@effectify" },
  entity: { id: "todo", singular: "Todo", plural: "Todos" },
  packages: [
    ["domain", "@effectify/todo-domain", "packages/todo/domain"],
    ["application", "@effectify/todo-application", "packages/todo/application"],
    ["infrastructure", "@effectify/todo-infrastructure", "packages/todo/infrastructure"],
    ["presentation", "@effectify/todo-cli", "apps/todo-cli"],
  ].map(([id, name, root]) => ({ id: id!, name: name!, root: root! })),
}

const files: ReadonlyArray<TodoTemplateFile> = paths.map((path) => {
  const sourceRoot = [
    "apps/todo-cli",
    "packages/todo/application",
    "packages/todo/domain",
    "packages/todo/infrastructure",
  ].find((root) => path.startsWith(`${root}/`))
  const sourcePath = path
    .replaceAll("todo.test.ts", "__entityId__.test.ts")
    .replace("todo-runtime.test.ts", "__entityId__-runtime.test.ts")
  const template = templateAsset({
    directory: sourceRoot === undefined ? "todo-v1" : `todo-v1/${sourceRoot}`,
    group: `todo-v1-${sourceRoot ?? "workspace"}`,
    outputPath: path,
    sourcePath: `${sourceRoot === undefined ? sourcePath : sourcePath.slice(sourceRoot.length + 1)}.template`,
    substitutions: templateSubstitutions(defaults),
    targetDirectory: sourceRoot ?? "",
  })
  return Object.freeze({ content: renderTemplate(template), path, template })
})

export const todoTemplateFiles = (): ReadonlyArray<TodoTemplateFile> => Object.freeze([...files])

export const todoTemplateContent = (path: string): string => {
  const file = files.find((candidate) => candidate.path === path)
  if (file === undefined) throw new Error(`Unknown Todo template: ${path}`)
  return file.content
}
