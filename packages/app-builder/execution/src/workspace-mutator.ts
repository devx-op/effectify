import { isAbsolute, relative, resolve, sep } from "node:path"
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
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
}

const isWorkspaceRelativePath = (workspace: string, relativePath: string): boolean => {
  if (relativePath.length === 0 || relativePath.includes("\u0000") || isAbsolute(relativePath)) return false
  const resolvedWorkspace = resolve(workspace)
  const target = resolve(resolvedWorkspace, relativePath)
  const pathRelative = relative(resolvedWorkspace, target)
  return pathRelative.length > 0 && pathRelative !== ".." && !pathRelative.startsWith(`..${sep}`)
}

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
  return operation(resolve(workspace, input.relativePath))
}
