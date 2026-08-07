import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import type { TodoPlan } from "./planner.js"

export const TodoTopologyRoots = [
  "packages/todo/domain",
  "packages/todo/application",
  "packages/todo/infrastructure",
  "apps/todo-cli",
] as const

export type TodoTopologyRoot = (typeof TodoTopologyRoots)[number]

export interface TodoTopologyFile {
  readonly content: string
  readonly owner: "@effectify/app-builder/todo-preset/1"
  readonly path: string
}

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
  readonly reason: "missing-capability"
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

const owner = "@effectify/app-builder/todo-preset/1" as const

const packageFile = (name: string, dependencies: Readonly<Record<string, string>>): string =>
  `${JSON.stringify({ name, private: true, type: "module", dependencies }, null, 2)}\n`

const sourceFile = (name: string): string => `export const topologyRoot = "${name}"\n`

const project = (name: string, root: TodoTopologyRoot, dependencies: ReadonlyArray<string>): TodoTopologyProject => ({
  dependencies: Object.freeze([...dependencies]),
  name,
  root,
})

const filesFor = (topologyProject: TodoTopologyProject): ReadonlyArray<TodoTopologyFile> => {
  const dependencies = Object.fromEntries(topologyProject.dependencies.map((dependency) => [dependency, "workspace:*"]))
  return [
    {
      content: packageFile(topologyProject.name, dependencies),
      owner,
      path: `${topologyProject.root}/package.json`,
    },
    {
      content: sourceFile(topologyProject.name),
      owner,
      path: `${topologyProject.root}/src/index.ts`,
    },
  ]
}

const hasRequiredCapabilities = (plan: TodoPlan): boolean =>
  requiredCapabilities.every((capability) => plan.orderedCapabilities.includes(capability))

/** Builds the owned, deterministic four-root Todo topology without an Nx Tree dependency. */
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

  return Effect.succeed(
    Object.freeze({
      files: Object.freeze(projects.flatMap(filesFor)),
      projects,
      roots: Object.freeze([...TodoTopologyRoots]),
    }),
  )
}
