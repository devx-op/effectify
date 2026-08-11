import type { Tree } from "@nx/devkit"
import { TodoPreset, type TodoPlan } from "@effectify/app-builder-generation"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"

export interface AppliedTodoTopology {
  readonly generatedRoots: ReadonlyArray<TodoPreset.TodoTopologyRoot>
  readonly writtenPaths: ReadonlyArray<string>
}

export class TodoTopologyApplyError extends Data.TaggedError("TodoTopologyApplyError")<{
  readonly path?: string
  readonly project?: string
  readonly reason: "dependency-direction" | "ownership-conflict"
}> {}

const outwardProjects = new Set(["@effectify/todo-infrastructure", "@effectify/todo-cli"])

const isAllowedPath = (path: string): boolean =>
  path.length > 0 &&
  !path.includes("\\") &&
  path
    .split("/")
    .every((segment) => segment !== "." && segment !== ".." && /^[A-Za-z0-9.][A-Za-z0-9._-]*$/.test(segment)) &&
  TodoPreset.isTodoTopologyPath(path)

const validateOwnership = (tree: Tree, topology: TodoPreset.TodoTopology): TodoTopologyApplyError | undefined => {
  const filesByPath = new Map<string, TodoPreset.TodoTopologyFile>()

  for (const file of topology.files) {
    const existing = filesByPath.get(file.path)
    if (!isAllowedPath(file.path) || existing !== undefined) {
      return new TodoTopologyApplyError({ path: file.path, reason: "ownership-conflict" })
    }
    filesByPath.set(file.path, file)

    const current = tree.read(file.path, "utf8")
    if (current !== null && current !== file.content) {
      return new TodoTopologyApplyError({ path: file.path, reason: "ownership-conflict" })
    }
  }

  return undefined
}

const validateDependencies = (topology: TodoPreset.TodoTopology): TodoTopologyApplyError | undefined => {
  for (const project of topology.projects) {
    const isInwardOnly = project.name === "@effectify/todo-domain" || project.name === "@effectify/todo-application"
    if (isInwardOnly && project.dependencies.some((dependency: string) => outwardProjects.has(dependency))) {
      return new TodoTopologyApplyError({ project: project.name, reason: "dependency-direction" })
    }
  }

  return undefined
}

/** Applies a fully validated topology in one Tree-only mutation boundary. */
export const applyTodoTopology = (
  tree: Tree,
  topology: TodoPreset.TodoTopology,
): Effect.Effect<AppliedTodoTopology, TodoTopologyApplyError> =>
  Effect.gen(function* () {
    const failure = validateDependencies(topology) ?? validateOwnership(tree, topology)
    if (failure !== undefined) {
      return yield* Effect.fail(failure)
    }

    const writtenPaths: Array<string> = []
    for (const file of topology.files) {
      if (tree.read(file.path, "utf8") === null) {
        tree.write(file.path, file.content)
        writtenPaths.push(file.path)
      }
    }

    return Object.freeze({
      generatedRoots: Object.freeze([...topology.roots]),
      writtenPaths: Object.freeze(writtenPaths),
    })
  })

/** Resolves the pure canonical preset before crossing into the Nx Tree adapter. */
export const applyTodoPlan = (
  tree: Tree,
  plan: TodoPlan,
): Effect.Effect<AppliedTodoTopology, TodoPreset.TodoPresetError | TodoTopologyApplyError> =>
  Effect.flatMap(TodoPreset.createTodoTopology(plan), (topology) => applyTodoTopology(tree, topology))
