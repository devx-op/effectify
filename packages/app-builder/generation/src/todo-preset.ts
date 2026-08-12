import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import {
  composeTodoV1Atomic,
  DefaultTodoRenderContext,
  WorkspaceRootFiles,
  type GenerationBlockFile,
} from "./generators/index.js"
import type { TodoPlan } from "./planner.js"

export const TodoTopologyRoots = [
  "packages/todo/domain",
  "packages/todo/application",
  "packages/todo/infrastructure",
  "apps/todo-cli",
] as const

export type TodoTopologyRoot = string
export type TodoPackageRole = "application" | "domain" | "infrastructure" | "presentation"

export type TodoTopologyFile = GenerationBlockFile

/** The canonical workspace surface emitted with the Todo package and application outputs. */
export const isTodoTopologyPath = (path: string, roots: ReadonlyArray<string> = TodoTopologyRoots): boolean =>
  WorkspaceRootFiles.some((file) => file === path) || roots.some((root) => path.startsWith(`${root}/`))

export { DefaultTodoRenderContext }

export interface TodoTopologyProject {
  readonly dependencies: ReadonlyArray<string>
  readonly name: string
  readonly root: TodoTopologyRoot
  readonly role: TodoPackageRole
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

const hasRequiredCapabilities = (plan: TodoPlan): boolean =>
  requiredCapabilities.every((capability) => plan.orderedCapabilities.includes(capability))

/** Builds the public Todo topology directly from the canonical atomic catalog without an Nx Tree dependency. */
export const createTodoTopology = (plan: TodoPlan): Effect.Effect<TodoTopology, TodoPresetError> => {
  if (!hasRequiredCapabilities(plan)) {
    return Effect.fail(new TodoPresetError({ reason: "missing-capability" }))
  }

  const naming = plan.intent.naming ?? {
    workspace: DefaultTodoRenderContext.workspace.name,
    npmScope: DefaultTodoRenderContext.workspace.npmScope,
    domain: DefaultTodoRenderContext.domain,
    entity: DefaultTodoRenderContext.entity,
    entrypoint: DefaultTodoRenderContext.entrypoint,
  }
  const roles = ["domain", "application", "infrastructure", "presentation"] as const
  const packages = roles.map((id) => ({
    id,
    name: `${naming.npmScope}/${id === "presentation" ? naming.entrypoint.id : `${naming.domain.id}-${id}`}`,
    root: id === "presentation" ? `apps/${naming.entrypoint.id}` : `packages/${naming.domain.id}/${id}`,
  }))
  const [domain, , , presentation] = packages
  const projects = Object.freeze(
    packages.map((target, index) =>
      Object.freeze({
        ...target,
        role: target.id,
        dependencies: Object.freeze(
          packages
            .slice(0, index)
            .reverse()
            .map(({ name }) => name),
        ),
      }),
    ),
  )
  const context = {
    version: "effectify.render-context/1" as const,
    workspace: { name: naming.workspace, npmScope: naming.npmScope },
    domain: { ...naming.domain, importName: domain.name },
    entity: naming.entity,
    entrypoint: { ...naming.entrypoint, importName: presentation.name },
    packages,
  }

  return composeTodoV1Atomic(context).pipe(
    Effect.map(({ contributions }) =>
      Object.freeze({
        files: Object.freeze(
          contributions.map((file) =>
            Object.freeze({
              content: new TextDecoder().decode(file.bytes),
              owner: file.owner,
              path: file.path,
              ...(file.template === undefined ? {} : { template: file.template }),
            }),
          ),
        ),
        projects,
        roots: Object.freeze(packages.map(({ root }) => root)),
      }),
    ),
    Effect.mapError(() => new TodoPresetError({ reason: "atomic-composition" })),
  )
}
