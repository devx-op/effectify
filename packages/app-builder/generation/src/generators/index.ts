import { composeCatalog } from "../catalog.js"
import * as Effect from "effect/Effect"
import { CapabilityGraphFailure, decodeRenderContext, defineCatalog, type AtomicGenerator } from "../kernel.js"
import type { GenerationBlock } from "./block.js"
import { eventBlock, eventGenerator } from "./event.js"
import { integrationAdapterBlock, integrationAdapterGenerator } from "./integration-adapter.js"
import { modelBlock, modelGenerator } from "./model.js"
import { portBlock, portGenerator } from "./port.js"
import { presentationBlock, presentationGenerator } from "./presentation.js"
import { TodoGenerationBlockIds, todoSurfaceInput, type TodoGenerationBlockId } from "./todo.js"
import { packageSurfaceGenerator, workspaceSurfaceGenerator } from "./surfaces.js"
import { useCaseBlock, useCaseGenerator } from "./use-case.js"
import { isTodoV1Context, TodoV1AtomicCatalog, todoV1GeneratorIds } from "./todo-v1-atomic.js"
export { DefaultTodoRenderContext } from "./todo-v1-atomic.js"

export { packageSurfaceGenerator, SurfaceCatalog, WorkspaceRootFiles, workspaceSurfaceGenerator } from "./surfaces.js"
export type { WorkspaceRootFile } from "./surfaces.js"

export { type GenerationBlock, type GenerationBlockFile } from "./block.js"
export { TodoGenerationBlockIds, type TodoGenerationBlockId } from "./todo.js"

const atomicById: Readonly<Record<TodoGenerationBlockId, AtomicGenerator<unknown>>> = {
  event: eventGenerator,
  "integration-adapter": integrationAdapterGenerator,
  model: modelGenerator,
  port: portGenerator,
  presentation: presentationGenerator,
  "use-case": useCaseGenerator,
}

export const TodoAtomicCatalog = defineCatalog([
  workspaceSurfaceGenerator,
  packageSurfaceGenerator,
  ...TodoGenerationBlockIds.map((id) => atomicById[id]),
])

const isTodoGenerationBlockId = (value: string): value is TodoGenerationBlockId =>
  TodoGenerationBlockIds.some((id) => id === value)

export const composeTodoAtomic = (context: unknown, selected: ReadonlyArray<string> = TodoGenerationBlockIds) =>
  decodeRenderContext(context).pipe(
    Effect.flatMap((decoded) => {
      const invalid = selected.find((id) => !isTodoGenerationBlockId(id))
      if (invalid !== undefined) {
        return Effect.fail(new CapabilityGraphFailure({ capability: invalid, reason: "missing-capability" }))
      }
      const capabilities = selected.filter(isTodoGenerationBlockId)
      if (isTodoV1Context(decoded)) {
        return composeCatalog({
          catalog: TodoV1AtomicCatalog,
          context: decoded,
          input: undefined,
          selected: todoV1GeneratorIds(capabilities),
        })
      }
      return todoSurfaceInput(decoded, capabilities).pipe(
        Effect.flatMap((input) =>
          composeCatalog({
            catalog: TodoAtomicCatalog,
            context: decoded,
            input,
            selected: capabilities.map((id) => atomicById[id].id),
          }),
        ),
      )
    }),
  )

export const composeTodoV1Atomic = (context: unknown, selected: ReadonlyArray<string> = TodoGenerationBlockIds) =>
  decodeRenderContext(context).pipe(
    Effect.flatMap((decoded) => {
      const invalid = selected.find((id) => !isTodoGenerationBlockId(id))
      return invalid === undefined
        ? composeCatalog({
            catalog: TodoV1AtomicCatalog,
            context: decoded,
            input: undefined,
            selected: todoV1GeneratorIds(selected.filter(isTodoGenerationBlockId)),
          })
        : Effect.fail(new CapabilityGraphFailure({ capability: invalid, reason: "missing-capability" }))
    }),
  )

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
