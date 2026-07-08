#!/usr/bin/env node

import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import path from "node:path"

const cliPath = fileURLToPath(new URL("../src/cli.ts", import.meta.url))

const result = spawnSync(
  process.execPath,
  ["--import", "tsx", cliPath, ...process.argv.slice(2)],
  {
    cwd: path.resolve(path.dirname(cliPath), ".."),
    stdio: "inherit",
  },
)

if (result.error) {
  throw result.error
}

process.exit(result.status ?? 1)
