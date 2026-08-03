import * as Effect from "effect/Effect"
import type * as Crypto from "effect/Crypto"
import * as DurableFileSystem from "./durable-file-system.js"
import * as ManagedPath from "./managed-path.js"
import * as Ownership from "./ownership.js"
import * as Recovery from "./recovery.js"
import * as Result from "effect/Result"
import * as WorkspaceLock from "./workspace-lock.js"

export interface CleanupInput {
  readonly workspace: string
  readonly ownership: Ownership.WorkspaceOwnership
  readonly runRef: Recovery.RecoveryInput["runRef"]
  readonly expectedTailDigest: string
}

export interface Cleaned {
  readonly _tag: "Cleaned"
  readonly tail: Recovery.RecoveryTail
}

export interface CleanupPreserved {
  readonly _tag: "CleanupPreserved"
  readonly reason:
    | "ExclusiveAuthorityRequired"
    | "InvalidEvidence"
    | "NonTerminal"
    | "RemovalFailed"
    | "TailMismatch"
    | "UnsupportedDurability"
}

export type CleanupOutcome = Cleaned | CleanupPreserved

const preserved = (reason: CleanupPreserved["reason"]): CleanupPreserved =>
  Object.freeze({ _tag: "CleanupPreserved", reason })

/** Validate terminal evidence before deferring deletion to an exclusive owner. */
export const cleanupClosed = Effect.fn("AppBuilder.Cleanup.cleanupClosed")(function* (input: CleanupInput) {
  const lockPath = WorkspaceLock.workspaceLockPath(input.workspace)
  if (!Ownership.isActiveFor(input.ownership, input.workspace, lockPath)) {
    return preserved("ExclusiveAuthorityRequired")
  }
  const recovery = yield* Recovery.recover({ workspace: input.workspace, runRef: input.runRef })
  if (recovery._tag === "RecoveryBlocked")
    return preserved(recovery.reason === "UnsupportedDurability" ? "UnsupportedDurability" : "InvalidEvidence")
  if (recovery._tag !== "Recovered") return preserved("NonTerminal")
  if (recovery.tail.payloadDigest !== input.expectedTailDigest) return preserved("TailMismatch")
  if (!Ownership.isActiveFor(input.ownership, input.workspace, lockPath)) {
    return preserved("ExclusiveAuthorityRequired")
  }
  const layout = ManagedPath.runLayout(
    input.workspace,
    `${input.runRef.id}@${input.runRef.version.major}.${input.runRef.version.minor}.${input.runRef.version.patch}`,
  )
  if (Result.isFailure(layout)) return preserved("InvalidEvidence")
  const fileSystem = yield* DurableFileSystem.Service
  const removal = yield* fileSystem.removeTree(layout.success.runDirectory.absolute).pipe(Effect.result)
  if (Result.isFailure(removal)) return preserved("RemovalFailed")
  return Object.freeze({ _tag: "Cleaned", tail: recovery.tail })
})

export const cleanup = (
  input: CleanupInput,
): Effect.Effect<CleanupOutcome, never, DurableFileSystem.Service | Crypto.Crypto> => cleanupClosed(input)
