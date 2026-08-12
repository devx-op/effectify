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

const outwardProjects = new Set(["@effectify/todo-infrastructure", "@effectify/todo-cli"])

class StagingTree implements Tree {
  readonly root = "/effectify-template-staging"
  readonly #allowedPaths: ReadonlySet<string>
  readonly #files = new Map<string, Buffer>()

  constructor(allowedPaths: ReadonlyArray<string>) {
    this.#allowedPaths = new Set(allowedPaths)
  }

  read(path: string): Buffer | null
  read(path: string, encoding: BufferEncoding): string | null
  read(path: string, encoding?: BufferEncoding): Buffer | string | null {
    const content = this.#files.get(path)
    return content === undefined ? null : encoding === undefined ? Buffer.from(content) : content.toString(encoding)
  }
  write(path: string, content: Buffer | string): void {
    if (!this.#allowedPaths.has(path)) return
    this.#files.set(path, Buffer.isBuffer(content) ? Buffer.from(content) : Buffer.from(content))
  }
  exists(path: string): boolean {
    return this.#files.has(path)
  }
  delete(path: string): void {
    this.#files.delete(path)
  }
  rename(from: string, to: string): void {
    const content = this.#files.get(from)
    if (content !== undefined) this.#files.set(to, content)
    this.#files.delete(from)
  }
  isFile(path: string): boolean {
    return this.#files.has(path)
  }
  children(path: string): string[] {
    const prefix = path.length === 0 ? "" : `${path.replace(/\/$/, "")}/`
    return [
      ...new Set(
        [...this.#files.keys()]
          .filter((file) => file.startsWith(prefix))
          .map((file) => file.slice(prefix.length).split("/")[0]),
      ),
    ]
  }
  listChanges(): ReturnType<Tree["listChanges"]> {
    return [...this.#files].map(([path, content]) => ({ content, path, type: "CREATE" as const }))
  }
  changePermissions(): void {}
}

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

const validateTemplates = (topology: TodoPreset.TodoTopology): TodoTopologyApplyError | undefined => {
  const templateFiles = topology.files.filter((file) => file.template !== undefined)
  const templatePaths = templateFiles.map((file) => file.path).sort()
  const staging = new StagingTree(templatePaths)
  const groups = Templates.templateGroups(topology.files)
  try {
    for (const group of groups) {
      generateFiles(staging, Templates.templateDirectory(group), "", group.substitutions)
    }
  } catch {
    return new TodoTopologyApplyError({ reason: "ownership-conflict" })
  }
  const stagedPaths = staging
    .listChanges()
    .map((change) => change.path)
    .sort()
  if (JSON.stringify(stagedPaths) !== JSON.stringify(templatePaths)) {
    return new TodoTopologyApplyError({ reason: "ownership-conflict" })
  }
  for (const file of templateFiles) {
    if (staging.read(file.path, "utf8") !== file.content) {
      return new TodoTopologyApplyError({ path: file.path, reason: "ownership-conflict" })
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
    const failure = validateDependencies(topology) ?? validateOwnership(tree, topology) ?? validateTemplates(topology)
    if (failure !== undefined) {
      return yield* Effect.fail(failure)
    }

    const writtenPaths = yield* Effect.try({
      try: () => {
        const written: Array<string> = []
        try {
          for (const file of topology.files) {
            if (tree.read(file.path, "utf8") === null) {
              tree.write(file.path, file.content)
              written.push(file.path)
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
