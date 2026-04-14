import { accessSync, constants } from "node:fs"
import { delimiter, join } from "node:path"

type ResolveChromeBinOptions = {
  env?: NodeJS.ProcessEnv
  pathEntries?: string[]
  isExecutable?: (candidate: string) => boolean
}

const chromeCandidates = ["chromium", "google-chrome-stable"] as const

export function resolveChromeBin(options: ResolveChromeBinOptions = {}) {
  const env = options.env ?? process.env
  const pathEntries = options.pathEntries ?? env.PATH?.split(delimiter).filter(Boolean) ?? []
  const isExecutable = options.isExecutable ?? defaultIsExecutable

  if (env.CHROME_BIN) {
    return env.CHROME_BIN
  }

  for (const binaryName of chromeCandidates) {
    for (const pathEntry of pathEntries) {
      const candidate = join(pathEntry, binaryName)

      if (isExecutable(candidate)) {
        return candidate
      }
    }
  }

  throw new Error(
    "Unable to find a Chrome/Chromium binary. Set CHROME_BIN or install chromium/google-chrome-stable so browser tests can launch.",
  )
}

function defaultIsExecutable(candidate: string) {
  try {
    accessSync(candidate, constants.X_OK)
    return true
  } catch {
    return false
  }
}
