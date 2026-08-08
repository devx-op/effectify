import { applicationTemplate } from "./application.js"
import { cliTemplate } from "./cli.js"
import { domainTemplate } from "./domain.js"
import { infrastructureTemplate } from "./infrastructure.js"

export interface TodoTemplateFile {
  readonly content: string
  readonly path: string
}

const testTemplate = `import { expect, it } from "@effect/vitest"\nimport * as Effect from "effect/Effect"\nimport { createTestRuntime } from "../src/index.js"\n\nit.effect("runs deterministic Todo behavior", () => Effect.gen(function* () {\n  const todo = yield* createTestRuntime({ ids: ["todo-1"], now: "2026-01-01T00:00:00.000Z" })\n  expect(yield* todo.list()).toEqual([])\n  expect((yield* todo.add("write tests")).id).toBe("todo-1")\n}))\n`
const domainTestTemplate = `import { expect, it } from "vitest"\nimport * as Schema from "effect/Schema"\nimport { Todo } from "../src/index.js"\n\nit("decodes a Todo schema", () => {\n  expect(Schema.is(Todo)({ completed: false, createdAt: "2026-01-01T00:00:00.000Z", id: "todo-1", text: "write tests" })).toBe(true)\n})\n`
const infrastructureTestTemplate = `import { expect, it } from "@effect/vitest"\nimport * as Effect from "effect/Effect"\nimport * as Layer from "effect/Layer"\nimport * as Application from "../../application/src/index.js"\nimport { TodoTestProbe, testLayer } from "../src/index.js"\n\nit.effect("publishes ordered Test Layer events after writes", () => Effect.gen(function* () {\n  const layer = Application.layer.pipe(Layer.provideMerge(testLayer({ ids: ["todo-1"], now: "2026-01-01T00:00:00.000Z" })))\n  const services = yield* Effect.all({ app: Application.TodoApplication, probe: TodoTestProbe }).pipe(Effect.provide(layer))\n  const added = yield* services.app.add("write tests")\n  yield* services.app.complete(added.id)\n  expect(yield* services.probe.events()).toEqual([{ _tag: "TodoAdded", todo: added }, { _tag: "TodoCompleted", todo: { ...added, completed: true } }])\n}))\n`

const files: ReadonlyArray<TodoTemplateFile> = [
  { content: domainTemplate, path: "packages/todo/domain/src/index.ts" },
  { content: applicationTemplate, path: "packages/todo/application/src/index.ts" },
  { content: infrastructureTemplate, path: "packages/todo/infrastructure/src/index.ts" },
  { content: cliTemplate, path: "apps/todo-cli/src/index.ts" },
  { content: domainTestTemplate, path: "packages/todo/domain/tests/todo.test.ts" },
  { content: infrastructureTestTemplate, path: "packages/todo/infrastructure/tests/todo-runtime.test.ts" },
  { content: testTemplate, path: "apps/todo-cli/tests/todo.test.ts" },
]

export const todoTemplateFiles = (): ReadonlyArray<TodoTemplateFile> => Object.freeze([...files])

export const todoTemplateContent = (path: string): string => {
  const file = files.find((candidate) => candidate.path === path)
  if (file === undefined) throw new Error(`Unknown Todo template: ${path}`)
  return file.content
}
