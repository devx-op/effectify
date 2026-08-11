import { defineTodoGenerationBlock } from "./block.js"
import { applicationTemplate } from "../templates/todo/application.js"
import { defineTodoGenerator } from "./todo.js"

const useCaseTemplate = `import * as Context from "effect/Context"\nimport * as Effect from "effect/Effect"\nimport * as Layer from "effect/Layer"\nimport * as Option from "effect/Option"\nimport * as Schema from "effect/Schema"\nimport { TodoEvent, TodoId, type Todo, TodoAlreadyCompleted, TodoIdExhausted, TodoNotFound, TodoPersistenceError, TodoTextInvalid } from "../../domain/src/index.js"\nimport { TodoClock, TodoEvents, TodoIdGenerator, TodoRepository } from "./port.js"\n\n${applicationTemplate.slice(applicationTemplate.indexOf("type TodoFailure"))}`

export const useCaseGenerator = defineTodoGenerator({
  files: [{ content: useCaseTemplate, relativePath: "src/use-case.ts" }],
  id: "use-case",
  packageId: "application",
  provides: ["todo-use-case"],
  requires: ["todo-port"],
})

export const useCaseBlock = defineTodoGenerationBlock({
  files: [
    { content: 'export { TodoApplication } from "./index.js"\n', path: "packages/todo/application/src/use-case.ts" },
  ],
  id: "use-case",
  manifestPath: "packages/todo/application/.effectify/generation/use-case.json",
  provides: ["todo.use-case"],
  requires: ["port"],
})
