import { renderTemplate, templateAsset, type TemplateAsset } from "../../templates.js"

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

const files: ReadonlyArray<TodoTemplateFile> = paths.map((path) => {
  const template = templateAsset({
    directory: "todo-v1",
    group: "todo-v1",
    outputPath: path,
    sourcePath: `${path}.template`,
    substitutions: { tmpl: "" },
  })
  return Object.freeze({ content: renderTemplate(template), path, template })
})

export const todoTemplateFiles = (): ReadonlyArray<TodoTemplateFile> => Object.freeze([...files])

export const todoTemplateContent = (path: string): string => {
  const file = files.find((candidate) => candidate.path === path)
  if (file === undefined) throw new Error(`Unknown Todo template: ${path}`)
  return file.content
}
