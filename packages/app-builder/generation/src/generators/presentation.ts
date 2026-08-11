import { cliTemplate } from "../templates/todo/cli.js"
import { defineTodoGenerationBlock, fromTodoTemplate } from "./block.js"
import { defineTodoGenerator } from "./todo.js"

export const presentationGenerator = defineTodoGenerator({
  files: [{ content: cliTemplate, relativePath: "src/presentation.ts" }],
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
