import * as Effect from "effect/Effect"
import * as Ownership from "./ownership.js"
import * as Recovery from "./recovery.js"

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
    | "ReleaseRequired"
    | "EvidenceChanged"
    | "InvalidTicket"
    | "TailMismatch"
    | "UnsupportedDurability"
}

export type CleanupOutcome = Cleaned | CleanupPreserved

const preserved = (reason: CleanupPreserved["reason"]): CleanupPreserved =>
  Object.freeze({ _tag: "CleanupPreserved", reason })

/** Public cleanup preserves evidence; only the executor owns private release-aware finalization. */
export const cleanup = (_input: CleanupInput): Effect.Effect<CleanupOutcome> =>
  Effect.succeed(preserved("ReleaseRequired"))
