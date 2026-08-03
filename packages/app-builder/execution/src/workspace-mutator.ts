import { isAbsolute, relative, resolve, sep } from "node:path"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import * as DurableFileSystem from "./durable-file-system.js"
import * as Ownership from "./ownership.js"
import * as WorkspaceLock from "./workspace-lock.js"

export class WorkspaceMutationRejected extends Schema.TaggedErrorClass<WorkspaceMutationRejected>()(
  "WorkspaceMutationRejected",
  { reason: Schema.Literals(["PathOutsideWorkspace"]) },
) {}

export interface MutationInput {
  readonly workspace: string
  readonly ownership: Ownership.WorkspaceOwnership
  readonly relativePath: string
  readonly fileSystem: DurableFileSystem.DurableFileSystemService
}

const isWorkspaceRelativePath = (workspace: string, relativePath: string): boolean => {
  if (relativePath.length === 0 || relativePath.includes("\u0000") || isAbsolute(relativePath)) return false
  const resolvedWorkspace = resolve(workspace)
  const target = resolve(resolvedWorkspace, relativePath)
  const pathRelative = relative(resolvedWorkspace, target)
  return pathRelative.length > 0 && pathRelative !== ".." && !pathRelative.startsWith(`..${sep}`)
}

const reject = () => Effect.fail(new WorkspaceMutationRejected({ reason: "PathOutsideWorkspace" }))

const assertPhysicalContainment = (
  fileSystem: DurableFileSystem.DurableFileSystemService,
  workspace: string,
  target: string,
): Effect.Effect<void, WorkspaceMutationRejected> =>
  Effect.gen(function* () {
    if (!fileSystem.capabilities.noFollowPaths) return yield* reject()
    const root = yield* fileSystem.inspect(workspace).pipe(Effect.result)
    if (root._tag === "Failure" || root.success?.type !== "directory") return yield* reject()
    const segments = relative(workspace, target).split(sep)
    let current = workspace
    for (const [index, segment] of segments.entries()) {
      current = resolve(current, segment)
      const inspected = yield* fileSystem.inspect(current).pipe(Effect.result)
      if (inspected._tag === "Failure") return yield* reject()
      const entry = inspected.success
      if (entry === undefined) return
      if (entry.type === "symlink" || entry.device !== root.success.device) return yield* reject()
      if (index < segments.length - 1 && entry.type !== "directory") return yield* reject()
    }
  })

/** Internal mutation gate: the operation receives only the validated workspace target. */
export const mutate = <Value, Error, Requirements>(
  input: MutationInput,
  operation: (target: string) => Effect.Effect<Value, Error, Requirements>,
): Effect.Effect<Value, Error | WorkspaceLock.OwnershipRejected | WorkspaceMutationRejected, Requirements> => {
  const workspace = resolve(input.workspace)
  if (!Ownership.isActiveFor(input.ownership, workspace, WorkspaceLock.workspaceLockPath(workspace))) {
    return Effect.fail(new WorkspaceLock.OwnershipRejected({ reason: "WrongScope" }))
  }
  if (!isWorkspaceRelativePath(workspace, input.relativePath)) {
    return Effect.fail(new WorkspaceMutationRejected({ reason: "PathOutsideWorkspace" }))
  }
  const target = resolve(workspace, input.relativePath)
  return assertPhysicalContainment(input.fileSystem, workspace, target).pipe(Effect.andThen(operation(target)))
}
