import * as Effect from "effect/Effect"
import * as Result from "effect/Result"
import * as Cleanup from "./cleanup.js"
import * as DurableFileSystem from "./durable-file-system.js"
import * as ManagedPath from "./managed-path.js"
import * as Ownership from "./ownership.js"
import * as Recovery from "./recovery.js"
import * as WorkspaceLock from "./workspace-lock.js"

export interface CleanupTicket {
  readonly _tag: "CleanupFinalizationTicket"
}

interface TicketState {
  readonly path: string
  readonly tail: Recovery.RecoveryTail
  readonly manifest: ReadonlyArray<DurableFileSystem.TreeEntry>
}

const tickets = new WeakMap<CleanupTicket, TicketState>()
const preserved = (reason: Cleanup.CleanupPreserved["reason"]): Cleanup.CleanupPreserved =>
  Object.freeze({ _tag: "CleanupPreserved", reason })

/** Capture terminal evidence under live ownership for exactly one post-release compare-remove. */
export const prepare = Effect.fn("AppBuilder.CleanupFinalization.prepare")(function* (input: Cleanup.CleanupInput) {
  const lockPath = WorkspaceLock.workspaceLockPath(input.workspace)
  if (!Ownership.isActiveFor(input.ownership, input.workspace, lockPath)) return preserved("ExclusiveAuthorityRequired")
  const recovery = yield* Recovery.recover({ workspace: input.workspace, runRef: input.runRef })
  if (recovery._tag === "RecoveryBlocked")
    return preserved(recovery.reason === "UnsupportedDurability" ? "UnsupportedDurability" : "InvalidEvidence")
  if (recovery._tag !== "Recovered") return preserved("NonTerminal")
  if (recovery.tail.payloadDigest !== input.expectedTailDigest) return preserved("TailMismatch")
  const layout = ManagedPath.runLayout(
    input.workspace,
    `${input.runRef.id}@${input.runRef.version.major}.${input.runRef.version.minor}.${input.runRef.version.patch}`,
  )
  if (Result.isFailure(layout)) return preserved("InvalidEvidence")
  const fileSystem = yield* DurableFileSystem.Service
  const manifest = yield* fileSystem.captureTree(layout.success.runDirectory.absolute).pipe(Effect.result)
  if (Result.isFailure(manifest)) return preserved("RemovalFailed")
  const ticket: CleanupTicket = Object.freeze({ _tag: "CleanupFinalizationTicket" })
  tickets.set(ticket, { path: layout.success.runDirectory.absolute, tail: recovery.tail, manifest: manifest.success })
  return ticket
})

/** Consume a private ticket once; any changed or failed comparison retains all evidence. */
export const deletePrepared = (
  ticket: CleanupTicket,
): Effect.Effect<Cleanup.CleanupOutcome, never, DurableFileSystem.Service> =>
  Effect.gen(function* () {
    const state = tickets.get(ticket)
    tickets.delete(ticket)
    if (state === undefined) return preserved("InvalidTicket")
    const removed = yield* (yield* DurableFileSystem.Service)
      .removeTreeIfUnchanged(state.path, state.manifest)
      .pipe(Effect.result)
    if (Result.isFailure(removed)) return preserved("RemovalFailed")
    return removed.success
      ? Object.freeze({ _tag: "Cleaned" as const, tail: state.tail })
      : preserved("EvidenceChanged")
  })
