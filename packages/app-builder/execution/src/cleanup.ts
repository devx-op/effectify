import * as Effect from "effect/Effect"
import type * as Crypto from "effect/Crypto"
import * as DurableFileSystem from "./durable-file-system.js"
import * as Recovery from "./recovery.js"

export interface CleanupInput {
  readonly workspace: string
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
  const recovery = yield* Recovery.recover({ workspace: input.workspace, runRef: input.runRef })
  if (recovery._tag === "RecoveryBlocked")
    return preserved(recovery.reason === "UnsupportedDurability" ? "UnsupportedDurability" : "InvalidEvidence")
  if (recovery._tag !== "Recovered") return preserved("NonTerminal")
  if (recovery.tail.payloadDigest !== input.expectedTailDigest) return preserved("TailMismatch")
  return preserved("ExclusiveAuthorityRequired")
})

export const cleanup = (
  input: CleanupInput,
): Effect.Effect<CleanupOutcome, never, DurableFileSystem.Service | Crypto.Crypto> => cleanupClosed(input)
