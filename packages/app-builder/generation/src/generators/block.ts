import { todoTemplateContent } from "../templates/todo/index.js"

export type TodoGenerationBlockId = "model" | "port" | "event" | "use-case" | "integration-adapter" | "presentation"

export interface GenerationBlockFile {
  readonly content: string
  readonly owner: string
  readonly path: string
}

export interface GenerationBlock {
  readonly files: ReadonlyArray<GenerationBlockFile>
  readonly id: TodoGenerationBlockId
  readonly owner: string
  readonly provides: ReadonlyArray<string>
  readonly requires: ReadonlyArray<TodoGenerationBlockId>
}

interface Definition {
  readonly files: ReadonlyArray<Readonly<{ content: string; path: string }>>
  readonly id: TodoGenerationBlockId
  readonly manifestPath: string
  readonly provides: ReadonlyArray<string>
  readonly requires: ReadonlyArray<TodoGenerationBlockId>
}

export const fromTodoTemplate = (path: string): Readonly<{ content: string; path: string }> => ({
  content: todoTemplateContent(path),
  path,
})

export const defineTodoGenerationBlock = (definition: Definition): GenerationBlock => {
  const owner = `@effectify/app-builder/${definition.id}/1`
  const manifest = `${JSON.stringify(
    {
      canonicalJson: "effectify-cjson/1",
      generatorId: definition.id,
      owner,
      provides: definition.provides,
      provenance: { generator: `@effectify/app-builder/generation/${definition.id}@1.0.0` },
      requires: definition.requires,
    },
    null,
    2,
  )}\n`

  return Object.freeze({
    files: Object.freeze([
      ...definition.files.map((file) => Object.freeze({ ...file, owner })),
      Object.freeze({ content: manifest, owner, path: definition.manifestPath }),
    ]),
    id: definition.id,
    owner,
    provides: Object.freeze([...definition.provides]),
    requires: Object.freeze([...definition.requires]),
  })
}
