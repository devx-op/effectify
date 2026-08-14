import { defineTodoGenerationBlock, fromTodoTemplate } from "./block.js"
import { defineTodoGenerator } from "./todo.js"

export const eventGenerator = defineTodoGenerator({
  files: [{ relativePath: "src/event.ts", sourcePath: "__targetRoot__/src/event.ts.template" }],
  id: "event",
  packageId: "domain",
  provides: ["todo-event"],
  requires: ["todo-model"],
})

export const eventBlock = defineTodoGenerationBlock({
  files: [fromTodoTemplate("packages/todo/domain/src/events.ts")],
  id: "event",
  manifestPath: "packages/todo/domain/.effectify/generation/event.json",
  provides: ["todo.events"],
  requires: ["model"],
})
