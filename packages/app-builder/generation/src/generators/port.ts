import { defineTodoGenerationBlock, fromTodoTemplate } from "./block.js"
import { defineTodoGenerator } from "./todo.js"

export const portGenerator = defineTodoGenerator({
  files: [{ relativePath: "src/port.ts", sourcePath: "__targetRoot__/src/port.ts.template" }],
  id: "port",
  packageId: "application",
  provides: ["todo-port"],
  requires: ["todo-model", "todo-event"],
})

export const portBlock = defineTodoGenerationBlock({
  files: [fromTodoTemplate("packages/todo/application/src/index.ts")],
  id: "port",
  manifestPath: "packages/todo/application/.effectify/generation/port.json",
  provides: ["todo.port"],
  requires: ["model"],
})
