import { execFileSync, spawnSync } from "node:child_process"
import { statSync } from "node:fs"
import { pathToFileURL } from "node:url"

const supportedExtension = /\.(?:js|jsx|ts|tsx|json|jsonc|md|mdx|css|scss|html)$/
const unsupportedExtension = /\.eta$/

const normalizedFiles = (files) =>
  [...new Set(files.map((file) => file.trim().replace(/^\.\//, "")))].filter((file) => file.length > 0).sort()

export const selectFormatCandidates = (files) =>
  normalizedFiles(files).filter((file) => supportedExtension.test(file))

export const selectUnsupportedCandidates = (files) =>
  normalizedFiles(files).filter((file) => unsupportedExtension.test(file))

const isFile = (file) => {
  try {
    return statSync(file).isFile()
  } catch {
    return false
  }
}

const gitLines = (args) =>
  execFileSync("git", args, { encoding: "utf8" }).split(/\r?\n/)

const parseArguments = (args) => {
  const getValue = (name) => args.find((argument) => argument.startsWith(`${name}=`))?.slice(name.length + 1)
  return {
    base: getValue("--base"),
    head: getValue("--head") ?? "HEAD",
    write: args.includes("--write"),
  }
}

const changedFiles = ({ base, head }) => {
  if (base) {
    return gitLines(["diff", "--name-only", "--diff-filter=ACMR", `${base}...${head}`])
  }
  return [
    ...gitLines(["diff", "--name-only", "--diff-filter=ACMR", "HEAD"]),
    ...gitLines(["ls-files", "--others", "--exclude-standard"]),
  ]
}

export const run = (args = process.argv.slice(2)) => {
  const options = parseArguments(args)
  const changed = changedFiles(options)
  const unsupportedFiles = selectUnsupportedCandidates(changed).filter(isFile)
  if (unsupportedFiles.length > 0) {
    console.error("Oxfmt 0.60.0 does not support Eta files. Format and review these files manually:")
    for (const file of unsupportedFiles) console.error(`- ${file}`)
    return 1
  }

  const files = selectFormatCandidates(changed).filter(isFile)
  if (files.length === 0) {
    console.log("No changed files require formatting.")
    return 0
  }

  const formatterArgs = ["exec", "oxfmt"]
  if (!options.write) formatterArgs.push("--check")
  formatterArgs.push(...files)

  const result = spawnSync("pnpm", formatterArgs, {
    stdio: "inherit",
  })
  if (result.error) throw result.error
  return result.status ?? 1
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = run()
}
