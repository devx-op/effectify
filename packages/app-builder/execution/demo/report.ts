import { createHash } from "node:crypto"
import type * as ExecutableEvidence from "../src/internal/executable-evidence.js"

export interface SuccessEvidence {
  readonly preparation: ReadonlyArray<ExecutableEvidence.Entry>
  readonly executor: ReadonlyArray<ExecutableEvidence.Entry>
  readonly outputDigest: string
  readonly payload: string
}

export const digest = (value: string): string => createHash("sha256").update(value).digest("hex")

const line = (entry: ExecutableEvidence.Entry): string => `r${entry.revision}=${entry.state}:${entry.digest}`

/** Stable, path-free, LF-delimited report retained outside the executor-owned run tree. */
export const report = (evidence: SuccessEvidence): string => {
  const executing = evidence.executor.find((entry) => entry.revision === 4)
  const terminal = evidence.executor.find((entry) => entry.revision >= 5)
  if (executing === undefined || terminal === undefined) throw new Error("Incomplete executor evidence")
  return (
    [
      "effectify-executable/1",
      ...evidence.preparation.map(line),
      line(executing),
      `terminal=r${terminal.revision}:${terminal.state}:${terminal.digest}`,
      `generated=${evidence.outputDigest}`,
      `payload=${evidence.payload.trim()}`,
    ].join("\n") + "\n"
  )
}

export const failureReport = (stage: string): string => `effectify-executable/1\nstatus=failure\nstage=${stage}\n`
