import { lstat, mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { dirname, isAbsolute, relative, resolve } from "node:path"
import { Planner, Replay, TodoPreset, type ReplayProvenance } from "@effectify/app-builder-generation"
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"

const GenerateRequest = Schema.Struct({
  intent: Schema.Unknown,
  workspace: Schema.String,
})

type GenerateRequest = typeof GenerateRequest.Type

interface PendingOutput {
  readonly content: string
  readonly path: string
  readonly target: string
}

export interface GenerateResult {
  readonly generatedRoots: ReadonlyArray<TodoPreset.TodoTopologyRoot>
  readonly provenance: ReplayProvenance
  readonly workspace: string
  readonly writtenPaths: ReadonlyArray<string>
}

export class GenerateInputError extends Data.TaggedError("GenerateInputError")<{
  readonly reason: string
}> {}

export class GenerateConflictError extends Data.TaggedError("GenerateConflictError")<{
  readonly path: string
}> {}

export class GenerateHostError extends Data.TaggedError("GenerateHostError")<{
  readonly reason: string
}> {}

type GenerateError = GenerateConflictError | GenerateHostError | GenerateInputError

const safeWorkspaceSegment = (segment: string): boolean => /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(segment)

const safeOutputSegment = (segment: string): boolean =>
  segment !== "." && segment !== ".." && /^[A-Za-z0-9.][A-Za-z0-9._-]*$/.test(segment)

const safeSegments = (path: string, isSafeSegment: (segment: string) => boolean): ReadonlyArray<string> | undefined => {
  if (path.length === 0 || isAbsolute(path) || path.includes("\\")) return undefined
  const segments = path.split("/")
  return segments.every(isSafeSegment) ? segments : undefined
}

const hasCode = (error: unknown, code: string): boolean =>
  typeof error === "object" && error !== null && Reflect.get(error, "code") === code

const existingEntry = async (path: string) => {
  try {
    return await lstat(path)
  } catch (error) {
    if (hasCode(error, "ENOENT")) return undefined
    throw error
  }
}

const workspacePath = (workspace: string): Effect.Effect<string, GenerateInputError> => {
  const segments = safeSegments(workspace, safeWorkspaceSegment)
  if (segments === undefined) {
    return Effect.fail(new GenerateInputError({ reason: "workspace must be a safe relative path" }))
  }

  const root = resolve(process.cwd())
  const target = resolve(root, ...segments)
  const pathRelative = relative(root, target)
  return pathRelative.length === 0 || pathRelative === ".." || pathRelative.startsWith("../")
    ? Effect.fail(new GenerateInputError({ reason: "workspace must stay below the current directory" }))
    : Effect.succeed(target)
}

const outputPath = (workspace: string, path: string): string => {
  const segments = safeSegments(path, safeOutputSegment)
  const isOwned = TodoPreset.isTodoTopologyPath(path)
  if (segments === undefined || !isOwned) {
    throw new GenerateHostError({ reason: "generated topology contains an unsafe output path" })
  }

  const target = resolve(workspace, ...segments)
  const pathRelative = relative(workspace, target)
  if (pathRelative.length === 0 || pathRelative === ".." || pathRelative.startsWith("../")) {
    throw new GenerateHostError({ reason: "generated topology escapes the requested workspace" })
  }
  return target
}

const requireSafeDirectories = async (workspace: string, output: PendingOutput): Promise<void> => {
  const workspaceEntry = await existingEntry(workspace)
  if (workspaceEntry !== undefined && (!workspaceEntry.isDirectory() || workspaceEntry.isSymbolicLink())) {
    throw new GenerateConflictError({ path: workspace })
  }

  const relativeDirectory = relative(workspace, dirname(output.target))
  let current = workspace
  for (const segment of relativeDirectory.length === 0 ? [] : relativeDirectory.split("/")) {
    current = resolve(current, segment)
    const entry = await existingEntry(current)
    if (entry !== undefined && (!entry.isDirectory() || entry.isSymbolicLink())) {
      throw new GenerateConflictError({ path: current })
    }
  }
}

const prevalidate = async (
  workspace: string,
  topology: TodoPreset.TodoTopology,
): Promise<ReadonlyArray<PendingOutput>> => {
  const paths = new Set<string>()
  const pending: Array<PendingOutput> = []

  for (const file of [...topology.files].sort((left, right) => left.path.localeCompare(right.path))) {
    if (paths.has(file.path)) throw new GenerateConflictError({ path: file.path })
    paths.add(file.path)
    const target = outputPath(workspace, file.path)
    const output = { content: file.content, path: file.path, target }
    await requireSafeDirectories(workspace, output)
    const existing = await existingEntry(target)
    if (existing === undefined) {
      pending.push(output)
      continue
    }
    if (!existing.isFile() || existing.isSymbolicLink() || (await readFile(target, "utf8")) !== file.content) {
      throw new GenerateConflictError({ path: file.path })
    }
  }

  return Object.freeze(pending)
}

const writeOutputs = async (outputs: ReadonlyArray<PendingOutput>): Promise<ReadonlyArray<string>> => {
  const written: Array<PendingOutput> = []
  try {
    for (const output of outputs) {
      await mkdir(dirname(output.target), { recursive: true })
      await writeFile(output.target, output.content, { encoding: "utf8", flag: "wx" })
      written.push(output)
    }
  } catch (error) {
    await Promise.all(written.map((output) => rm(output.target, { force: true })))
    if (hasCode(error, "EEXIST")) throw new GenerateConflictError({ path: "concurrent-output" })
    throw error
  }
  return Object.freeze(written.map((output) => output.path))
}

const candidate = (plan: Planner.TodoPlan, topology: TodoPreset.TodoTopology) => ({
  blocks: topology.files.map(({ owner, path }) => ({ owner, path })),
  catalog: { capabilities: plan.orderedCapabilities, version: plan.catalogVersion },
  dependencies: [],
  intent: plan.intent,
  outputs: topology.files.map(({ content, owner, path }) => ({ content, mode: "100644", owner, path })),
  pins: {
    effect: "4.0.0",
    frozenInstall: true,
    nx: "23.1.0",
    packageManager: "pnpm@10.14.0",
    plugins: plan.selectedPlugins.map(({ packageName, packageVersion }) => ({
      name: packageName,
      version: packageVersion,
    })),
  },
  plan,
})

/** Generates the finite Todo topology through a prevalidated, one-way filesystem boundary. */
export const generateTodo = (payload: unknown): Effect.Effect<GenerateResult, GenerateError> =>
  Effect.gen(function* () {
    const input: GenerateRequest = yield* Schema.decodeUnknownEffect(GenerateRequest, { onExcessProperty: "error" })(
      payload,
    ).pipe(
      Effect.mapError(() => new GenerateInputError({ reason: "generate payload must include intent and workspace" })),
    )
    const workspace = yield* workspacePath(input.workspace)
    const plan = yield* Planner.planTodo(input.intent).pipe(
      Effect.mapError(() => new GenerateInputError({ reason: "generate intent is not valid" })),
    )
    const topology = yield* TodoPreset.createTodoTopology(plan).pipe(
      Effect.mapError(() => new GenerateInputError({ reason: "generate intent is missing required capabilities" })),
    )
    const provenance = yield* Replay.captureReplayProvenance(candidate(plan, topology)).pipe(
      Effect.mapError(() => new GenerateHostError({ reason: "unable to capture generation provenance" })),
    )
    const pending = yield* Effect.tryPromise({
      try: () => prevalidate(workspace, topology),
      catch: (error) =>
        error instanceof GenerateConflictError || error instanceof GenerateHostError
          ? error
          : new GenerateHostError({ reason: "unable to prevalidate generated output" }),
    })
    const writtenPaths = yield* Effect.tryPromise({
      try: () => writeOutputs(pending),
      catch: (error) =>
        error instanceof GenerateConflictError
          ? error
          : new GenerateHostError({ reason: "unable to write generated output" }),
    })

    return Object.freeze({
      generatedRoots: Object.freeze([...topology.roots]),
      provenance,
      workspace: input.workspace,
      writtenPaths,
    })
  })
