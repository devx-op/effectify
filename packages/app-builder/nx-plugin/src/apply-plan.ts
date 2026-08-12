import { generateFiles, type Tree } from "@nx/devkit"
import { Templates, TodoPreset, type TodoPlan } from "@effectify/app-builder-generation"
import { Buffer } from "node:buffer"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { tmpdir } from "node:os"
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

interface StagedOutput {
  readonly bytes: Buffer
  readonly owner: string
  readonly path: string
}

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
    if (!this.#allowedPaths.has(to)) return
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
  for (const project of topology.projects) {
    const isInwardOnly = project.name === "@effectify/todo-domain" || project.name === "@effectify/todo-application"
    if (isInwardOnly && project.dependencies.some((dependency: string) => outwardProjects.has(dependency))) {
      return new TodoTopologyApplyError({ project: project.name, reason: "dependency-direction" })
    }
  }

  return undefined
}

const stageTemplates = (topology: TodoPreset.TodoTopology): ReadonlyArray<StagedOutput> | TodoTopologyApplyError => {
  const paths = new Set<string>()
  const expected = new Map<string, string>()
  for (const file of topology.files) {
    if (!isAllowedPath(file.path) || file.owner.length === 0 || paths.has(file.path)) {
      return new TodoTopologyApplyError({ path: file.path, reason: "ownership-conflict" })
    }
    paths.add(file.path)
    expected.set(file.path, file.owner)
  }
  const staging = new StagingTree([...paths])
  const groups = Templates.templateGroups(topology.files)
  let fallbackDirectory: string | undefined
  let fallbackChanges: ReturnType<Tree["listChanges"]> = []
  try {
    const fallbackFiles = topology.files.filter((file) => file.template === undefined)
    if (fallbackFiles.length > 0) {
      const fallbackStaging = new StagingTree(fallbackFiles.map((file) => file.path))
      fallbackDirectory = mkdtempSync(join(tmpdir(), "effectify-nx-"))
      for (const file of fallbackFiles) {
        const source = join(fallbackDirectory, `${file.path}.template`)
        mkdirSync(dirname(source), { recursive: true })
        writeFileSync(source, file.content)
      }
      generateFiles(fallbackStaging, fallbackDirectory, "", { tmpl: "" })
      fallbackChanges = fallbackStaging.listChanges()
    }
    for (const group of groups) {
      generateFiles(staging, Templates.templateDirectory(group), "", group.substitutions)
    }
    for (const change of fallbackChanges) if (change.content !== null) staging.write(change.path, change.content)
  } catch {
    return new TodoTopologyApplyError({ reason: "ownership-conflict" })
  } finally {
    if (fallbackDirectory !== undefined) rmSync(fallbackDirectory, { force: true, recursive: true })
  }
  const stagedPaths = staging
    .listChanges()
    .map((change) => change.path)
    .sort()
  if (JSON.stringify(stagedPaths) !== JSON.stringify([...paths].sort())) {
    return new TodoTopologyApplyError({ reason: "ownership-conflict" })
  }
  const outputs: Array<StagedOutput> = []
  for (const path of paths) {
    const bytes = staging.read(path)
    const owner = expected.get(path)
    if (bytes === null || owner === undefined) {
      return new TodoTopologyApplyError({ path, reason: "ownership-conflict" })
    }
    outputs.push(Object.freeze({ bytes, owner, path }))
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
    const stagedResult = stageTemplates(topology)
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
