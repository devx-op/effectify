import { defineTodoGenerationBlock, fromTodoTemplate } from "./block.js"

export const portBlock = defineTodoGenerationBlock({
  files: [fromTodoTemplate("packages/todo/application/src/index.ts")],
  id: "port",
  manifestPath: "packages/todo/application/.effectify/generation/port.json",
  provides: ["todo.port"],
  requires: ["model"],
})
