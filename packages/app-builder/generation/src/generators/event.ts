import { defineTodoGenerationBlock } from "./block.js"

export const eventBlock = defineTodoGenerationBlock({
  files: [{ content: 'export type { TodoEvent } from "./index.js"\n', path: "packages/todo/domain/src/events.ts" }],
  id: "event",
  manifestPath: "packages/todo/domain/.effectify/generation/event.json",
  provides: ["todo.events"],
  requires: ["model"],
})
