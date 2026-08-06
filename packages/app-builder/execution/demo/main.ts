import { realpath, stat } from "node:fs/promises"
import { pathToFileURL } from "node:url"
import * as Effect from "effect/Effect"
import * as DurableFileSystem from "../src/durable-file-system.js"
import { report, run } from "./operation.js"

export interface Arguments {
  readonly workspace: string
  readonly approve: boolean
}

export const parseArguments = (arguments_: ReadonlyArray<string>): Arguments | undefined => {
  const workspaceIndex = arguments_.indexOf("--workspace")
  const workspace = workspaceIndex === -1 ? undefined : arguments_[workspaceIndex + 1]
  return workspace === undefined || workspace.startsWith("-")
    ? undefined
    : { workspace, approve: arguments_.includes("--approve") }
}

const main = async (): Promise<number> => {
  const arguments_ = parseArguments(process.argv.slice(2))
  if (arguments_ === undefined) {
    console.error("Usage: executable --workspace <dedicated-directory> --approve")
    return 64
  }
  if (!arguments_.approve) {
    console.error("--approve is required; no workspace mutation was attempted")
    return 64
  }
  const workspace = await realpath(arguments_.workspace)
  if (!(await stat(workspace)).isDirectory()) {
    console.error("--workspace must name a dedicated directory")
    return 64
  }
  const result = await Effect.runPromise(run({ workspace, approve: true, fileSystem: DurableFileSystem.makeLive() }))
  process.stdout.write(report(result))
  return 0
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().then(
    (code) => {
      process.exitCode = code
    },
    (error: unknown) => {
      console.error(error)
      process.exitCode = 1
    },
  )
}
