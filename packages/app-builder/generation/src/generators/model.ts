import { domainTemplate } from "../templates/todo/domain.js"
import { defineTodoGenerationBlock, fromTodoTemplate } from "./block.js"
import { defineTodoGenerator } from "./todo.js"

const modelTemplate = `import * as Data from "effect/Data"\nimport * as Schema from "effect/Schema"\n\n${domainTemplate.slice(domainTemplate.indexOf("export const TodoId"), domainTemplate.indexOf("export type TodoEvent"))}`

export const modelGenerator = defineTodoGenerator({
  files: [{ content: modelTemplate, relativePath: "src/model.ts" }],
  id: "model",
  packageId: "domain",
  provides: ["todo-model"],
  requires: ["package-surface"],
})

export const modelBlock = defineTodoGenerationBlock({
  files: [
    fromTodoTemplate("packages/todo/domain/src/index.ts"),
    fromTodoTemplate("packages/todo/domain/tests/todo.test.ts"),
  ],
  id: "model",
  manifestPath: "packages/todo/domain/.effectify/generation/model.json",
  provides: ["todo.model"],
  requires: [],
})
