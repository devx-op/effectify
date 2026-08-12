import { defineTodoGenerationBlock, fromTodoTemplate } from "./block.js"
import { defineTodoGenerator } from "./todo.js"

export const presentationGenerator = defineTodoGenerator({
  files: [{ relativePath: "src/presentation.ts", sourcePath: "__targetRoot__/src/entrypoint.ts.template" }],
  id: "presentation",
  packageId: "presentation",
  provides: ["todo-cli-presentation"],
  requires: ["todo-file-adapter"],
})

export const presentationBlock = defineTodoGenerationBlock({
  files: [fromTodoTemplate("apps/todo-cli/src/index.ts"), fromTodoTemplate("apps/todo-cli/tests/todo.test.ts")],
  id: "presentation",
  manifestPath: "apps/todo-cli/.effectify/generation/presentation.json",
  provides: ["todo.cli-presentation"],
  requires: ["integration-adapter"],
})
