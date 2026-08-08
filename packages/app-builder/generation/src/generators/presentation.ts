import { defineTodoGenerationBlock, fromTodoTemplate } from "./block.js"

export const presentationBlock = defineTodoGenerationBlock({
  files: [fromTodoTemplate("apps/todo-cli/src/index.ts"), fromTodoTemplate("apps/todo-cli/tests/todo.test.ts")],
  id: "presentation",
  manifestPath: "apps/todo-cli/.effectify/generation/presentation.json",
  provides: ["todo.cli-presentation"],
  requires: ["integration-adapter"],
})
