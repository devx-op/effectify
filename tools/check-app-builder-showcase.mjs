import { createHash } from "node:crypto"
import { spawnSync } from "node:child_process"
import { mkdtemp, mkdir, readFile, readdir, rm, stat } from "node:fs/promises"
import { basename, dirname, join, relative, resolve } from "node:path"
import { tmpdir } from "node:os"
import { fileURLToPath } from "node:url"

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const packageRoots = ["contracts", "generation", "cli"].map((name) =>
  join(repositoryRoot, "packages/app-builder", name),
)

const option = (name) => {
  const index = process.argv.indexOf(name)
  return index === -1 ? undefined : process.argv[index + 1]
}

const expectedArgument = option("--expected")
const outputArgument = option("--output")

if (expectedArgument === undefined || outputArgument === undefined) {
  throw new Error("Usage: node tools/check-app-builder-showcase.mjs --expected <path> --output <isolated-path>")
}

const expected = resolve(repositoryRoot, expectedArgument)
const output = resolve(outputArgument)
const outputRelativeToExpected = relative(expected, output)
const expectedRelativeToOutput = relative(output, expected)

if (
  expected === output ||
  (!outputRelativeToExpected.startsWith("..") && outputRelativeToExpected.length > 0) ||
  (!expectedRelativeToOutput.startsWith("..") && expectedRelativeToOutput.length > 0)
) {
  throw new Error("The isolated output path must not be the committed showcase or one of its descendants")
}

const run = (command, args, options = {}, allowedStatuses = [0]) => {
  const result = spawnSync(command, args, { encoding: "utf8", maxBuffer: 16 * 1024 * 1024, ...options })
  if (result.error !== undefined) throw result.error
  if (!allowedStatuses.includes(result.status ?? 1)) {
    throw new Error(`${command} ${args.join(" ")} failed: ${result.stderr}${result.stdout}`)
  }
  return result
}

const walk = async (root, current = root) =>
  (
    await Promise.all(
      (await readdir(current, { withFileTypes: true })).map((entry) => {
        const absolute = join(current, entry.name)
        return entry.isDirectory() ? walk(root, absolute) : Promise.resolve([relative(root, absolute)])
      }),
    )
  )
    .flat()
    .sort()

const sha256 = (bytes) => `sha256:${createHash("sha256").update(bytes).digest("hex")}`
const mode = async (path) => (0o100000 | ((await stat(path)).mode & 0o777)).toString(8)

const readTerminal = (stdout) => {
  const event = JSON.parse(stdout.trim().split("\n").at(-1) ?? "null")
  if (event?.terminal?._tag !== "Success" || event.terminal.command !== "generate") {
    throw new Error("Installed public CLI did not return generate success terminal evidence")
  }
  return event.terminal.result
}

const invoke = (cli, parent, request) => {
  const result = run(cli, ["generate", "--events=jsonl"], {
    cwd: parent,
    input: `${JSON.stringify(request)}\n`,
  })
  if (result.stderr !== "") throw new Error(`Installed public CLI wrote unexpected stderr: ${result.stderr}`)
  return readTerminal(result.stdout)
}

const receipt = JSON.parse(await readFile(join(expected, ".effectify/app-builder/showcase.json"), "utf8"))
const identities = receipt?.provenance?.outputIdentities

if (
  receipt?.version !== "effectify.app-builder-showcase/1" ||
  receipt?.command !== "generate" ||
  !Array.isArray(identities) ||
  identities.length === 0
) {
  throw new Error("Committed showcase receipt does not contain canonical output identities")
}

const expectedPaths = identities.map(({ path }) => path).sort()
if (new Set(expectedPaths).size !== expectedPaths.length) throw new Error("Showcase receipt contains duplicate paths")
const authoredPaths = [".effectify/app-builder/showcase.json", "README.md"]
const request = {
  ...receipt.request,
  payload: { ...receipt.request.payload, workspace: basename(output) },
}

const verify = async (root, allowedExtraPaths = []) => {
  const actualPaths = (await walk(root)).sort()
  const unexpected = actualPaths.filter((path) => !expectedPaths.includes(path) && !allowedExtraPaths.includes(path))
  const missing = expectedPaths.filter((path) => !actualPaths.includes(path))
  const failures = [...unexpected.map((path) => `unexpected output: ${path}`), ...missing.map((path) => `missing output: ${path}`)]

  for (const identity of identities) {
    if (missing.includes(identity.path)) continue
    const target = join(root, identity.path)
    const bytes = await readFile(target)
    if (sha256(bytes) !== identity.sourceDigest) failures.push(`digest mismatch: ${identity.path}`)
    if ((await mode(target)) !== identity.mode) failures.push(`mode mismatch: ${identity.path}`)
  }

  return failures
}

const temporaryRoot = await mkdtemp(join(tmpdir(), "effectify-app-builder-showcase-"))
try {
  const distribution = join(temporaryRoot, "distribution")
  const driver = join(temporaryRoot, "driver")
  await mkdir(distribution, { recursive: true })
  await mkdir(driver, { recursive: true })

  for (const packageRoot of packageRoots) {
    run("pnpm", ["pack", "--pack-destination", distribution], { cwd: packageRoot })
  }

  const tarballs = (await readdir(distribution))
    .filter((path) => path.endsWith(".tgz"))
    .sort()
    .map((path) => join(distribution, path))
  if (tarballs.length !== packageRoots.length) throw new Error("Public package packing did not produce three tarballs")

  const workspaceCatalog = await readFile(join(expected, "pnpm-workspace.yaml"), "utf8")
  const effectVersion = /^\s*effect:\s*([^\s]+)$/m.exec(workspaceCatalog)?.[1]
  if (effectVersion === undefined) throw new Error("Generated workspace does not pin Effect in its catalog")

  run("npm", ["install", "--no-audit", "--no-fund", ...tarballs, `effect@${effectVersion}`], { cwd: driver })
  const cli = join(driver, "node_modules/.bin/effectify-app-builder")

  await rm(output, { force: true, recursive: true })
  await mkdir(dirname(output), { recursive: true })
  const generated = invoke(cli, dirname(output), request)
  const writtenPaths = [...generated.writtenPaths].sort()
  if (JSON.stringify(writtenPaths) !== JSON.stringify(expectedPaths)) {
    throw new Error(`Installed public CLI wrote an unexpected path set: ${JSON.stringify(writtenPaths)}`)
  }

  const generatedFailures = await verify(output)
  const expectedFailures = await verify(expected, authoredPaths)
  const byteFailures = []
  for (const path of expectedPaths) {
    const expectedBytes = await readFile(join(expected, path))
    const generatedBytes = await readFile(join(output, path))
    if (!expectedBytes.equals(generatedBytes)) byteFailures.push(path)
  }

  const replay = invoke(cli, dirname(output), request)
  if (replay.writtenPaths.length !== 0) {
    throw new Error(`Installed public replay wrote paths: ${JSON.stringify(replay.writtenPaths)}`)
  }
  const replayFailures = await verify(output)
  const failures = [...generatedFailures, ...expectedFailures, ...replayFailures]

  if (failures.length > 0 || byteFailures.length > 0) {
    process.stderr.write("App Builder showcase drift detected; committed files were not modified.\n")
    for (const failure of failures) process.stderr.write(`${failure}\n`)
    for (const path of byteFailures) {
      const diff = run(
        "git",
        ["diff", "--no-index", "--no-ext-diff", "--", join(expected, path), join(output, path)],
        {},
        [0, 1],
      )
      process.stderr.write(diff.stdout)
      process.stderr.write(diff.stderr)
    }
    process.exitCode = 1
  } else {
    process.stdout.write(
      `App Builder showcase matches ${expectedPaths.length} installed-public-CLI output identities and replays with zero writes.\n`,
    )
  }
} finally {
  await rm(temporaryRoot, { force: true, recursive: true })
}
