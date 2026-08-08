import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import { composeTodoGenerationBlocks, type TodoGenerationBlockId } from "./generators/index.js"
import { TodoTopologyRoots, type TodoTopology } from "./todo-preset.js"

export class TodoEvolutionError extends Data.TaggedError("TodoEvolutionError")<{
  readonly path: string
  readonly reason: "duplicate-ownership"
}> {}

/** Plans atomic additions before a caller chooses to cross the Tree-only mutation boundary. */
export const planTodoEvolution = (
  selected: ReadonlyArray<TodoGenerationBlockId>,
): Effect.Effect<TodoTopology, TodoEvolutionError> =>
  Effect.gen(function* () {
    const files = composeTodoGenerationBlocks(selected).flatMap((block) => block.files)
    const paths = new Set<string>()
    const duplicate = files.find((file) => {
      if (paths.has(file.path)) return true
      paths.add(file.path)
      return false
    })
    if (duplicate !== undefined)
      return yield* Effect.fail(new TodoEvolutionError({ path: duplicate.path, reason: "duplicate-ownership" }))

    const roots = TodoTopologyRoots.filter((root) => files.some((file) => file.path.startsWith(`${root}/`)))
    return Object.freeze({
      files: Object.freeze(files),
      projects: Object.freeze([]),
      roots: Object.freeze(roots),
    })
  })
