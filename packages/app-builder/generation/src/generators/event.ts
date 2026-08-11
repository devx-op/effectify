import { defineTodoGenerationBlock } from "./block.js"
import { domainTemplate } from "../templates/todo/domain.js"
import { defineTodoGenerator } from "./todo.js"

const eventTemplate = `import * as Data from "effect/Data"\nimport type { Todo } from "./model.js"\n\n${domainTemplate.slice(domainTemplate.indexOf("export type TodoEvent"))}`

export const eventGenerator = defineTodoGenerator({
  files: [{ content: eventTemplate, relativePath: "src/event.ts" }],
  id: "event",
  packageId: "domain",
  provides: ["todo-event"],
  requires: ["todo-model"],
})

export const eventBlock = defineTodoGenerationBlock({
  files: [{ content: 'export type { TodoEvent } from "./index.js"\n', path: "packages/todo/domain/src/events.ts" }],
  id: "event",
  manifestPath: "packages/todo/domain/.effectify/generation/event.json",
  provides: ["todo.events"],
  requires: ["model"],
})
