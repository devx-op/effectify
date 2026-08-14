import { defineTodoGenerationBlock, fromTodoTemplate } from "./block.js"
import { defineTodoGenerator } from "./todo.js"

export const useCaseGenerator = defineTodoGenerator({
  files: [{ relativePath: "src/use-case.ts", sourcePath: "__targetRoot__/src/use-case.ts.template" }],
  id: "use-case",
  packageId: "application",
  provides: ["todo-use-case"],
  requires: ["todo-port"],
})

export const useCaseBlock = defineTodoGenerationBlock({
  files: [fromTodoTemplate("packages/todo/application/src/use-case.ts")],
  id: "use-case",
  manifestPath: "packages/todo/application/.effectify/generation/use-case.json",
  provides: ["todo.use-case"],
  requires: ["port"],
})
