import { defineTodoGenerationBlock, fromTodoTemplate } from "./block.js"
import { defineTodoGenerator } from "./todo.js"

export const integrationAdapterGenerator = defineTodoGenerator({
  files: [{ relativePath: "src/adapter.ts", sourcePath: "__targetRoot__/src/adapter.ts.template" }],
  id: "integration-adapter",
  packageId: "infrastructure",
  provides: ["todo-file-adapter"],
  requires: ["todo-use-case"],
})

export const integrationAdapterBlock = defineTodoGenerationBlock({
  files: [
    fromTodoTemplate("packages/todo/infrastructure/src/index.ts"),
    fromTodoTemplate("packages/todo/infrastructure/tests/todo-runtime.test.ts"),
  ],
  id: "integration-adapter",
  manifestPath: "packages/todo/infrastructure/.effectify/generation/integration-adapter.json",
  provides: ["todo.file-adapter"],
  requires: ["use-case"],
})
