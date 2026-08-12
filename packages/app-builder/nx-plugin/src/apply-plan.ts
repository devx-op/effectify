import { generateFiles, type Tree } from "@nx/devkit"
import { Templates, TodoPreset, type TodoPlan } from "@effectify/app-builder-generation"
import { Buffer } from "node:buffer"
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

interface StagedOutput {
  readonly bytes: Buffer
  readonly path: string
}

const isAllowedPath = (path: string, roots: ReadonlyArray<string>): boolean =>
  path.length > 0 &&
  !path.includes("\\") &&
  path
    .split("/")
    .every((segment) => segment !== "." && segment !== ".." && /^[A-Za-z0-9.][A-Za-z0-9._-]*$/.test(segment)) &&
  TodoPreset.isTodoTopologyPath(path, roots)

const validateOwnership = (tree: Tree, outputs: ReadonlyArray<StagedOutput>): TodoTopologyApplyError | undefined => {
  for (const output of outputs) {
    const current = tree.read(output.path)
    if (current !== null && !current.equals(output.bytes)) {
      return new TodoTopologyApplyError({ path: output.path, reason: "ownership-conflict" })
    }
  }

  return undefined
}

const validateDependencies = (topology: TodoPreset.TodoTopology): TodoTopologyApplyError | undefined => {
  const outwardNames = new Set(
    topology.projects
      .filter(({ role }) => role === "infrastructure" || role === "presentation")
      .map(({ name }) => name),
  )
  for (const project of topology.projects) {
    const isInwardOnly = project.role === "domain" || project.role === "application"
    if (isInwardOnly && project.dependencies.some((dependency: string) => outwardNames.has(dependency))) {
      return new TodoTopologyApplyError({ project: project.name, reason: "dependency-direction" })
    }
  }

  return undefined
}

const stageTemplates = (
  tree: Tree,
  topology: TodoPreset.TodoTopology,
): ReadonlyArray<StagedOutput> | TodoTopologyApplyError => {
  const paths = new Set<string>()
  for (const file of topology.files) {
    if (!isAllowedPath(file.path, topology.roots) || file.owner.length === 0 || paths.has(file.path)) {
      return new TodoTopologyApplyError({ path: file.path, reason: "ownership-conflict" })
    }
    paths.add(file.path)
  }
  const staged = new Map<string, Buffer>()
  const staging = new Proxy(tree, {
    get: (target, property, receiver) =>
      property === "exists"
        ? (path: string) => staged.has(path)
        : property === "write"
          ? (path: string, content: Buffer | string) => {
              if (paths.has(path)) staged.set(path, Buffer.from(content))
            }
          : Reflect.get(target, property, receiver),
  })
  try {
    for (const file of topology.files) if (file.template === undefined) staged.set(file.path, Buffer.from(file.content))
    for (const group of Templates.templateGroups(topology.files)) {
      generateFiles(staging, Templates.templateDirectory(group), "", group.substitutions)
    }
  } catch {
    return new TodoTopologyApplyError({ reason: "ownership-conflict" })
  }
  if (staged.size !== paths.size) {
    return new TodoTopologyApplyError({ reason: "ownership-conflict" })
  }
  const outputs: Array<StagedOutput> = []
  for (const path of paths) {
    const bytes = staged.get(path)
    if (bytes === undefined) {
      return new TodoTopologyApplyError({ path, reason: "ownership-conflict" })
    }
    outputs.push(Object.freeze({ bytes, path }))
  }
  return Object.freeze(outputs)
}

/** Applies a fully validated topology in one Tree-only mutation boundary. */
export const applyTodoTopology = (
  tree: Tree,
  topology: TodoPreset.TodoTopology,
): Effect.Effect<AppliedTodoTopology, TodoTopologyApplyError> =>
  Effect.gen(function* () {
    const dependencyFailure = validateDependencies(topology)
    if (dependencyFailure !== undefined) return yield* Effect.fail(dependencyFailure)
    const stagedResult = stageTemplates(tree, topology)
    if (stagedResult instanceof TodoTopologyApplyError) return yield* Effect.fail(stagedResult)
    const staged = stagedResult
    const failure = validateOwnership(tree, staged)
    if (failure !== undefined) {
      return yield* Effect.fail(failure)
    }

    const writtenPaths = yield* Effect.try({
      try: () => {
        const written: Array<string> = []
        try {
          for (const output of staged) {
            if (tree.read(output.path, "utf8") === null) {
              tree.write(output.path, output.bytes)
              written.push(output.path)
            }
          }
          return written
        } catch (error) {
          for (const path of written.reverse()) tree.delete(path)
          throw error
        }
      },
      catch: () => new TodoTopologyApplyError({ reason: "ownership-conflict" }),
    })

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
