import { defineTodoGenerationBlock, fromTodoTemplate } from "./block.js"
import { applicationTemplate } from "../templates/todo/application.js"
import { defineTodoGenerator } from "./todo.js"

const portTemplate = `import * as Context from "effect/Context"\nimport * as Effect from "effect/Effect"\nimport { TodoId, type Todo, type TodoEvent as Event, TodoIdExhausted, TodoPersistenceError } from "../../domain/src/index.js"\n\n${applicationTemplate.slice(applicationTemplate.indexOf("export interface TodoRepositoryApi"), applicationTemplate.indexOf("type TodoFailure"))}`

export const portGenerator = defineTodoGenerator({
  files: [{ content: portTemplate, relativePath: "src/port.ts" }],
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
