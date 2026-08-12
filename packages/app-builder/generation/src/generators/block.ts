import { renderTemplate, templateAsset, templateSubstitutions } from "../templates.js"
import { DefaultTodoRenderContext } from "./todo-v1-atomic.js"

export type TodoGenerationBlockId = "model" | "port" | "event" | "use-case" | "integration-adapter" | "presentation"

export interface GenerationBlockFile {
  readonly content: string
  readonly owner: string
  readonly path: string
  readonly template?: import("../templates.js").TemplateAsset
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

export const fromTodoTemplate = (
  path: string,
): Readonly<{ content: string; path: string; template?: import("../templates.js").TemplateAsset }> => {
  const target = DefaultTodoRenderContext.packages.find(({ root }) => path.startsWith(`${root}/`))!
  const layer = `layer-${DefaultTodoRenderContext.packages.indexOf(target) + 1}`
  const relative = path
    .slice(target.root.length + 1)
    .replace("todo-runtime.test.ts", "__entityId__-runtime.test.ts")
    .replace("todo.test.ts", "__entityId__.test.ts")
  const template = templateAsset({
    directory: `blueprint/${layer}`,
    group: `todo-v1-${layer}`,
    sourcePath: `__targetRoot__/${relative}.template`,
    substitutions: templateSubstitutions(DefaultTodoRenderContext, { targetRoot: target.root }),
  })
  return Object.freeze({ content: renderTemplate(template), path, template })
}

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
