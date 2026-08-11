import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import { composeTodoAtomic, WorkspaceRootFiles, type GenerationBlockFile } from "./generators/index.js"
import type { TodoPlan } from "./planner.js"

export const TodoTopologyRoots = [
  "packages/todo/domain",
  "packages/todo/application",
  "packages/todo/infrastructure",
  "apps/todo-cli",
] as const

export type TodoTopologyRoot = (typeof TodoTopologyRoots)[number]

export type TodoTopologyFile = GenerationBlockFile

/** The canonical workspace surface emitted with the Todo package and application outputs. */
export const isTodoTopologyPath = (path: string): boolean =>
  WorkspaceRootFiles.some((file) => file === path) || TodoTopologyRoots.some((root) => path.startsWith(`${root}/`))

/** Fixed render context for the public Todo preset. */
export const DefaultTodoRenderContext = Object.freeze({
  version: "effectify.render-context/1" as const,
  workspace: Object.freeze({ name: "todo", npmScope: "@effectify" }),
  domain: Object.freeze({ id: "domain", importName: "@effectify/todo-domain" }),
  entity: Object.freeze({ id: "todo", singular: "Todo", plural: "Todos", importName: "@effectify/todo-cli" }),
  packages: Object.freeze([
    Object.freeze({ id: "domain", name: "@effectify/todo-domain", root: "packages/todo/domain" }),
    Object.freeze({ id: "application", name: "@effectify/todo-application", root: "packages/todo/application" }),
    Object.freeze({
      id: "infrastructure",
      name: "@effectify/todo-infrastructure",
      root: "packages/todo/infrastructure",
    }),
    Object.freeze({ id: "presentation", name: "@effectify/todo-cli", root: "apps/todo-cli" }),
  ]),
})

export interface TodoTopologyProject {
  readonly dependencies: ReadonlyArray<string>
  readonly name: string
  readonly root: TodoTopologyRoot
}

export interface TodoTopology {
  readonly files: ReadonlyArray<TodoTopologyFile>
  readonly projects: ReadonlyArray<TodoTopologyProject>
  readonly roots: ReadonlyArray<TodoTopologyRoot>
}

export class TodoPresetError extends Data.TaggedError("TodoPresetError")<{
  readonly reason: "atomic-composition" | "missing-capability"
}> {}

const requiredCapabilities = [
  "todo.workspace",
  "todo.model",
  "todo.port",
  "todo.use-case",
  "todo.file-adapter",
  "todo.cli-presentation",
  "todo.events",
] as const

const project = (name: string, root: TodoTopologyRoot, dependencies: ReadonlyArray<string>): TodoTopologyProject => ({
  dependencies: Object.freeze([...dependencies]),
  name,
  root,
})

const hasRequiredCapabilities = (plan: TodoPlan): boolean =>
  requiredCapabilities.every((capability) => plan.orderedCapabilities.includes(capability))

/** Builds the public Todo topology directly from the canonical atomic catalog without an Nx Tree dependency. */
export const createTodoTopology = (plan: TodoPlan): Effect.Effect<TodoTopology, TodoPresetError> => {
  if (!hasRequiredCapabilities(plan)) {
    return Effect.fail(new TodoPresetError({ reason: "missing-capability" }))
  }

  const projects = Object.freeze([
    project("@effectify/todo-domain", "packages/todo/domain", []),
    project("@effectify/todo-application", "packages/todo/application", ["@effectify/todo-domain"]),
    project("@effectify/todo-infrastructure", "packages/todo/infrastructure", [
      "@effectify/todo-application",
      "@effectify/todo-domain",
    ]),
    project("@effectify/todo-cli", "apps/todo-cli", [
      "@effectify/todo-infrastructure",
      "@effectify/todo-application",
      "@effectify/todo-domain",
    ]),
  ])

  return composeTodoAtomic(DefaultTodoRenderContext).pipe(
    Effect.map(({ contributions }) =>
      Object.freeze({
        files: Object.freeze(
          contributions.map((file) =>
            Object.freeze({ content: new TextDecoder().decode(file.bytes), owner: file.owner, path: file.path }),
          ),
        ),
        projects,
        roots: Object.freeze([...TodoTopologyRoots]),
      }),
    ),
    Effect.mapError(() => new TodoPresetError({ reason: "atomic-composition" })),
  )
}
