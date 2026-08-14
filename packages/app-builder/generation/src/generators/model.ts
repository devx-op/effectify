import { defineTodoGenerationBlock, fromTodoTemplate } from "./block.js"
import { defineTodoGenerator } from "./todo.js"

export const modelGenerator = defineTodoGenerator({
  files: [
    { relativePath: "src/model.ts", sourcePath: "__targetRoot__/src/model.ts.template" },
    { relativePath: "tests/model.test.ts", sourcePath: "__targetRoot__/tests/model.test.ts.template" },
  ],
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
