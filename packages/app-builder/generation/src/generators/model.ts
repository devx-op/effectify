import { defineTodoGenerationBlock, fromTodoTemplate } from "./block.js"

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
