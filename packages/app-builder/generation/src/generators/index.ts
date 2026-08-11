import type { GenerationBlock, TodoGenerationBlockId } from "./block.js"
import { eventBlock } from "./event.js"
import { integrationAdapterBlock } from "./integration-adapter.js"
import { modelBlock } from "./model.js"
import { portBlock } from "./port.js"
import { presentationBlock } from "./presentation.js"
import { useCaseBlock } from "./use-case.js"

export { packageSurfaceGenerator, SurfaceCatalog, WorkspaceRootFiles, workspaceSurfaceGenerator } from "./surfaces.js"
export type { WorkspaceRootFile } from "./surfaces.js"

export { type GenerationBlock, type GenerationBlockFile, type TodoGenerationBlockId } from "./block.js"

export const TodoGenerationBlockIds = [
  "model",
  "port",
  "event",
  "use-case",
  "integration-adapter",
  "presentation",
] as const

const blockById: ReadonlyMap<TodoGenerationBlockId, GenerationBlock> = new Map([
  [modelBlock.id, modelBlock],
  [portBlock.id, portBlock],
  [eventBlock.id, eventBlock],
  [useCaseBlock.id, useCaseBlock],
  [integrationAdapterBlock.id, integrationAdapterBlock],
  [presentationBlock.id, presentationBlock],
])

const blockFor = (id: TodoGenerationBlockId): GenerationBlock => {
  const block = blockById.get(id)
  if (block === undefined) throw new Error(`Unknown Todo generation block: ${id}`)
  return block
}

/** Returns a dependency-closed, identity-ordered selection without a mutation adapter. */
export const composeTodoGenerationBlocks = (
  selected: ReadonlyArray<TodoGenerationBlockId>,
): ReadonlyArray<GenerationBlock> => {
  const included = new Set<TodoGenerationBlockId>()
  const include = (id: TodoGenerationBlockId): void => {
    if (included.has(id)) return
    const block = blockFor(id)
    block.requires.forEach(include)
    included.add(id)
  }
  selected.forEach(include)
  return Object.freeze(TodoGenerationBlockIds.flatMap((id) => (included.has(id) ? [blockFor(id)] : [])))
}

export const allTodoGenerationBlocks = (): ReadonlyArray<GenerationBlock> =>
  composeTodoGenerationBlocks(TodoGenerationBlockIds)
