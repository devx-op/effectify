import { defineTodoGenerationBlock, fromTodoTemplate } from "./block.js"

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
