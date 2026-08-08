import { defineTodoGenerationBlock } from "./block.js"

export const useCaseBlock = defineTodoGenerationBlock({
  files: [
    { content: 'export { TodoApplication } from "./index.js"\n', path: "packages/todo/application/src/use-case.ts" },
  ],
  id: "use-case",
  manifestPath: "packages/todo/application/.effectify/generation/use-case.json",
  provides: ["todo.use-case"],
  requires: ["port"],
})
