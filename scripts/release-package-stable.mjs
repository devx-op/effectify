#!/usr/bin/env node
import { spawn } from "node:child_process"
import { createHash } from "node:crypto"
import { realpathSync } from "node:fs"
import { lstat, mkdir, readFile, readdir, writeFile } from "node:fs/promises"
import { basename, isAbsolute, join, resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { isDeepStrictEqual } from "node:util"
import { gunzipSync } from "node:zlib"

const HANDOFF_SCHEMA_VERSION = 1
const MAX_HANDOFF_BYTES = 1024 * 1024
const MAX_TARBALL_BYTES = 128 * 1024 * 1024
const MAX_UNPACKED_BYTES = 256 * 1024 * 1024
const MAX_ENTRY_BYTES = 64 * 1024 * 1024
const MAX_ENTRIES = 20_000
const MAX_COMMAND_OUTPUT = 1024 * 1024
const COMMAND_TIMEOUT_MS = 120_000
const WORKFLOW_PATH = ".github/workflows/release-stable.yml"
const PINNED_ABANDONMENT = Object.freeze({
  artifactSha: "f31390ce66ea157ea8b75f5259c203123e269759",
  project: "@effectify/prisma",
  name: "@effectify/prisma",
  version: "1.1.14",
  reason: "Reviewed exception: 1.1.14 has broken CLI/export paths; publish a reviewed 1.1.15 instead.",
})

function fail(message) {
  throw new Error(message)
}
function object(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}
function exactKeys(value, expected, label) {
  if (!object(value)) fail(`${label} must be an object`)
  const actual = Object.keys(value).sort()
  const required = [...expected].sort()
  if (!isDeepStrictEqual(actual, required)) fail(`${label} has unknown or missing fields`)
}
function parseJson(bytes, label) {
  try {
    return JSON.parse(Buffer.isBuffer(bytes) ? bytes.toString("utf8") : bytes)
  } catch {
    fail(`${label} is malformed JSON`)
  }
}
function safeName(value) {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 214 &&
    /^@[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*$/.test(value)
  )
}
function safeRoot(value) {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 512 &&
    !isAbsolute(value) &&
    !value.includes("\\") &&
    !/[\u0000-\u001f\u007f]/.test(value) &&
    value.split("/").every((part) => part !== "" && part !== "." && part !== "..")
  )
}
function safePackedPath(value) {
  return safeRoot(value) && value.startsWith("package/") && value !== "package/" && !value.includes("//")
}
function safeBasename(value) {
  return (
    typeof value === "string" &&
    value.length > 4 &&
    value.length <= 255 &&
    value === basename(value) &&
    /^[A-Za-z0-9._-]+\.tgz$/.test(value)
  )
}
function semver(value) {
  return (
    typeof value === "string" &&
    /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(?:-(?:0|[1-9][0-9]*|[0-9A-Za-z-]*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9][0-9]*|[0-9A-Za-z-]*[A-Za-z-][0-9A-Za-z-]*))*)?(?:\+(?:[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/.test(
      value,
    )
  )
}
function stableSemver(value) {
  return typeof value === "string" && /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$/.test(value)
}
function fullSha(value) {
  return typeof value === "string" && /^[0-9a-f]{40}$/.test(value)
}
function decimalIdentifier(value) {
  return typeof value === "string" && /^(0|[1-9][0-9]*)$/.test(value)
}
function digest(algorithm, bytes) {
  return createHash(algorithm).update(bytes).digest("hex")
}
function sortedUniqueNames(values, label) {
  if (!Array.isArray(values) || values.length === 0 || values.some((value) => !safeName(value))) {
    fail(`${label} is invalid`)
  }
  const sorted = [...values].sort()
  if (new Set(sorted).size !== sorted.length) fail(`${label} contains duplicates`)
  return sorted
}
function validateMetadata(value) {
  exactKeys(
    value,
    ["repository", "workflowPath", "workflowRef", "workflowSha", "runId", "runAttempt", "expectedSha", "artifactSha"],
    "handoff metadata",
  )
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value.repository)) fail("repository metadata is invalid")
  if (value.workflowPath !== WORKFLOW_PATH) fail("workflow path metadata is invalid")
  if (value.workflowRef !== "refs/heads/master") fail("workflow ref metadata is invalid")
  if (!fullSha(value.workflowSha) || value.workflowSha !== value.expectedSha) fail("workflow SHA metadata is invalid")
  if (!decimalIdentifier(value.runId)) fail("run ID metadata is invalid")
  if (!decimalIdentifier(value.runAttempt) || value.runAttempt === "0") fail("run attempt metadata is invalid")
  if (!fullSha(value.expectedSha)) fail("expected SHA metadata is invalid")
  if (!fullSha(value.artifactSha)) fail("artifact SHA metadata is invalid")
}

async function regularFile(path, label, maximum = Number.POSITIVE_INFINITY) {
  let status
  try {
    status = await lstat(path)
  } catch {
    fail(`${label} is missing`)
  }
  if (status.isSymbolicLink() || !status.isFile()) fail(`${label} must be a regular file, not a symlink`)
  if (status.size <= 0) fail(`${label} is empty`)
  if (status.size > maximum) fail(`${label} exceeds its size bound`)
  return status
}
async function readJsonFile(path, label, maximum = MAX_HANDOFF_BYTES) {
  await regularFile(path, label, maximum)
  return parseJson(await readFile(path), label)
}

export async function loadStableAbandonments(path) {
  const value = await readJsonFile(path, "stable abandonment ledger")
  exactKeys(value, ["schemaVersion", "abandonments"], "stable abandonment ledger")
  if (value.schemaVersion !== 1 || !Array.isArray(value.abandonments))
    fail("stable abandonment ledger schema is invalid")
  if (value.abandonments.length !== 1) fail("stable abandonment ledger must contain exactly one reviewed disposition")
  const record = value.abandonments[0]
  exactKeys(record, ["artifactSha", "project", "name", "version", "reason"], "stable abandonment record")
  if (
    !fullSha(record.artifactSha) ||
    !safeName(record.project) ||
    !safeName(record.name) ||
    !stableSemver(record.version) ||
    typeof record.reason !== "string" ||
    record.reason.length === 0 ||
    record.reason.length > 240 ||
    /[\u0000-\u001f\u007f*?${}]/.test(record.reason) ||
    !isDeepStrictEqual(record, PINNED_ABANDONMENT)
  ) {
    fail("stable abandonment record is not the exact reviewed disposition")
  }
  return structuredClone(value.abandonments)
}

function parseOctal(field, label) {
  const text = field.toString("ascii").replace(/\0.*$/, "").trim()
  if (!/^[0-7]+$/.test(text)) fail(`tar ${label} is malformed`)
  const value = Number.parseInt(text, 8)
  if (!Number.isSafeInteger(value) || value < 0) fail(`tar ${label} exceeds its bound`)
  return value
}
function tarString(field) {
  const zero = field.indexOf(0)
  return field.subarray(0, zero === -1 ? field.length : zero).toString("utf8")
}
function allZero(bytes) {
  return bytes.every((byte) => byte === 0)
}
function collectRuntimeTargets(value, targets, label = "exports") {
  if (typeof value === "string") {
    targets.add(value)
    return
  }
  if (value === null) return
  if (Array.isArray(value)) {
    for (const item of value) collectRuntimeTargets(item, targets, label)
    return
  }
  if (!object(value)) fail(`packed ${label} is invalid`)
  for (const [condition, target] of Object.entries(value)) {
    if (condition === "@effectify/source") continue
    collectRuntimeTargets(target, targets, label)
  }
}
function unresolvedNormalization(value) {
  if (typeof value === "string") return /^(?:catalog|workspace):/.test(value)
  if (Array.isArray(value)) return value.some(unresolvedNormalization)
  return object(value) && Object.values(value).some(unresolvedNormalization)
}

export function inspectStableTarball(bytes, expectedIdentity) {
  if (!Buffer.isBuffer(bytes) || bytes.length === 0 || bytes.length > MAX_TARBALL_BYTES) {
    fail("tarball is empty or exceeds its size bound")
  }
  let archive
  try {
    archive = gunzipSync(bytes, { maxOutputLength: MAX_UNPACKED_BYTES })
  } catch {
    fail("tarball gzip payload is invalid or oversized")
  }
  const inventory = []
  const bodies = new Map()
  const paths = new Set()
  let offset = 0
  let terminated = false
  while (offset + 512 <= archive.length) {
    const header = archive.subarray(offset, offset + 512)
    if (allZero(header)) {
      if (offset + 1024 > archive.length || !allZero(archive.subarray(offset + 512, offset + 1024))) {
        fail("tar archive lacks two zero terminator blocks")
      }
      if (!allZero(archive.subarray(offset + 1024))) fail("tar archive has data after its terminator")
      terminated = true
      break
    }
    if (inventory.length >= MAX_ENTRIES) fail("tar inventory exceeds its entry bound")
    const storedChecksum = parseOctal(header.subarray(148, 156), "checksum")
    const copy = Buffer.from(header)
    copy.fill(0x20, 148, 156)
    const actualChecksum = [...copy].reduce((total, byte) => total + byte, 0)
    if (storedChecksum !== actualChecksum) fail("tar header checksum mismatch")
    const name = tarString(header.subarray(0, 100))
    const prefix = tarString(header.subarray(345, 500))
    const path = prefix ? `${prefix}/${name}` : name
    if (!safePackedPath(path)) fail(`unsafe packed path: ${JSON.stringify(path)}`)
    if (paths.has(path)) fail(`duplicate packed path: ${path}`)
    paths.add(path)
    const size = parseOctal(header.subarray(124, 136), "entry size")
    if (size > MAX_ENTRY_BYTES) fail(`packed entry exceeds its size bound: ${path}`)
    const mode = parseOctal(header.subarray(100, 108), "mode")
    const rawType = header[156]
    const type = rawType === 0 || rawType === 48 ? "file" : rawType === 53 ? "directory" : "unsafe"
    if (type === "unsafe") fail(`packed links and special entries are forbidden: ${path}`)
    if (type === "directory" && size !== 0) fail(`packed directory has content bytes: ${path}`)
    const bodyStart = offset + 512
    const bodyEnd = bodyStart + size
    if (bodyEnd > archive.length) fail(`packed entry is truncated: ${path}`)
    inventory.push({ path, size, mode, type })
    if (type === "file") bodies.set(path, archive.subarray(bodyStart, bodyEnd))
    offset = bodyStart + Math.ceil(size / 512) * 512
  }
  if (!terminated) fail("tar archive is unterminated")
  inventory.sort((left, right) => left.path.localeCompare(right.path))

  const manifestBytes = bodies.get("package/package.json")
  if (!manifestBytes || manifestBytes.length === 0) fail("packed package.json is missing or empty")
  const manifest = parseJson(manifestBytes, "packed package.json")
  if (!object(manifest) || manifest.name !== expectedIdentity.name || manifest.version !== expectedIdentity.version) {
    fail("packed package identity does not match the reviewed package")
  }
  if (unresolvedNormalization(manifest)) fail("pnpm package normalization left catalog: or workspace: references")
  const nonemptyDist = [...bodies.entries()].some(([path, body]) => path.startsWith("package/dist/") && body.length > 0)
  if (!nonemptyDist) fail("packed package has missing or empty dist output")

  const runtimeTargets = new Set()
  for (const field of ["main", "module", "types"]) {
    if (manifest[field] !== undefined) {
      if (typeof manifest[field] !== "string") fail(`packed ${field} entrypoint is invalid`)
      runtimeTargets.add(manifest[field])
    }
  }
  if (manifest.bin !== undefined) {
    if (typeof manifest.bin === "string") runtimeTargets.add(manifest.bin)
    else if (object(manifest.bin) && Object.values(manifest.bin).every((value) => typeof value === "string")) {
      for (const value of Object.values(manifest.bin)) runtimeTargets.add(value)
    } else fail("packed bin entrypoint is invalid")
  }
  if (manifest.exports !== undefined) collectRuntimeTargets(manifest.exports, runtimeTargets)
  if (runtimeTargets.size === 0) fail("packed package declares no runtime entrypoints")
  for (const target of runtimeTargets) {
    if (typeof target !== "string" || !target.startsWith("./") || target.includes("*") || !safeRoot(target.slice(2))) {
      fail(`packed runtime entrypoint is unsafe: ${JSON.stringify(target)}`)
    }
    const body = bodies.get(`package/${target.slice(2)}`)
    if (!body) fail(`missing runtime entrypoint: ${target}`)
    if (body.length === 0) fail(`empty runtime entrypoint: ${target}`)
  }
  return { inventory, manifest }
}

function run(file, args, { cwd, env }) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(file, args, { cwd, env, shell: false, stdio: ["ignore", "pipe", "pipe"] })
    let stdout = Buffer.alloc(0)
    let stderr = Buffer.alloc(0)
    let excessive = false
    const append = (current, chunk) => {
      if (current.length + chunk.length > MAX_COMMAND_OUTPUT) {
        excessive = true
        child.kill("SIGKILL")
        return current
      }
      return Buffer.concat([current, chunk])
    }
    child.stdout.on("data", (chunk) => (stdout = append(stdout, chunk)))
    child.stderr.on("data", (chunk) => (stderr = append(stderr, chunk)))
    const timer = setTimeout(() => child.kill("SIGKILL"), COMMAND_TIMEOUT_MS)
    child.on("error", (error) => {
      clearTimeout(timer)
      reject(new Error(`pnpm pack could not start: ${error.message}`))
    })
    child.on("close", (code, signal) => {
      clearTimeout(timer)
      if (excessive) reject(new Error("pnpm pack output exceeded its bound"))
      else if (signal) reject(new Error("pnpm pack timed out or was terminated"))
      else if (code !== 0) reject(new Error(`pnpm pack failed with exit code ${code}`))
      else resolvePromise({ stdout: stdout.toString("utf8"), stderr: stderr.toString("utf8") })
    })
  })
}

async function sourceCatalog(sourceRoot, selection) {
  const nx = await readJsonFile(join(sourceRoot, "nx.json"), "source nx.json")
  const roots = nx?.release?.projects
  if (!Array.isArray(roots) || roots.length === 0 || roots.some((root) => !safeRoot(root))) {
    fail("source nx.json release projects are invalid")
  }
  if (new Set(roots).size !== roots.length) fail("source nx.json release projects contain duplicates")
  const catalog = new Map()
  const manifestPaths = new Set()
  const selected = new Set(selection)
  for (const root of roots) {
    const project = await readJsonFile(join(sourceRoot, root, "project.json"), `source project ${root}`)
    const manifestPath = `${root}/package.json`
    const manifestFile = join(sourceRoot, manifestPath)
    await regularFile(manifestFile, `source manifest ${manifestPath}`, MAX_HANDOFF_BYTES)
    const manifestBytes = await readFile(manifestFile)
    const manifest = parseJson(manifestBytes, `source manifest ${manifestPath}`)
    if (!object(project) || !safeName(project.name) || !object(manifest) || !safeName(manifest.name)) {
      fail(`source package identity is invalid for ${root}`)
    }
    if (project.name !== manifest.name || !semver(manifest.version)) {
      fail(`source project and manifest identity mismatch for ${root}`)
    }
    if (selected.has(project.name) && !stableSemver(manifest.version)) {
      fail(`selected source package version must be stable SemVer: ${project.name}`)
    }
    if (catalog.has(project.name) || manifestPaths.has(manifestPath))
      fail(`source package identity is duplicated: ${project.name}`)
    manifestPaths.add(manifestPath)
    catalog.set(project.name, {
      project: project.name,
      root,
      name: manifest.name,
      version: manifest.version,
      manifestBytes,
    })
  }
  for (const project of selection)
    if (!catalog.has(project)) fail(`selected project is not in source release projects: ${project}`)
  return catalog
}
function applicableAbandonments(ledger, catalog, selection, artifactSha) {
  const selected = new Set(selection)
  const result = []
  for (const disposition of ledger) {
    if (disposition.artifactSha !== artifactSha || !selected.has(disposition.project)) continue
    const record = catalog?.get(disposition.project)
    if (record && (record.name !== disposition.name || record.version !== disposition.version)) {
      fail(`abandonment identity does not match source package: ${disposition.project}`)
    }
    result.push(structuredClone(disposition))
  }
  return result.sort((left, right) => left.project.localeCompare(right.project))
}
function makePackageRecord(record, tarballBasename, bytes, inspected) {
  const sha512 = digest("sha512", bytes)
  return {
    project: record.project,
    root: record.root,
    name: record.name,
    version: record.version,
    sourceManifestSha256: digest("sha256", record.manifestBytes),
    tarball: {
      basename: tarballBasename,
      size: bytes.length,
      sha1: digest("sha1", bytes),
      sha256: digest("sha256", bytes),
      sha512,
      integrity: `sha512-${Buffer.from(sha512, "hex").toString("base64")}`,
    },
    inventory: inspected.inventory,
  }
}

export async function createStableHandoff({
  sourceRoot,
  outputDirectory,
  abandonmentPath,
  selection: requestedSelection,
  metadata,
  pnpmExecutable = "pnpm",
  environment = process.env,
}) {
  validateMetadata(metadata)
  const selection = sortedUniqueNames(requestedSelection, "stable selection")
  const absoluteSource = resolve(sourceRoot)
  const absoluteOutput = resolve(outputDirectory)
  if (absoluteSource === absoluteOutput || absoluteOutput.startsWith(`${absoluteSource}/`)) {
    fail("handoff output must be outside the source checkout")
  }
  const ledger = await loadStableAbandonments(abandonmentPath)
  const catalog = await sourceCatalog(absoluteSource, selection)
  const abandonments = applicableAbandonments(ledger, catalog, selection, metadata.artifactSha)
  const abandonedProjects = new Set(abandonments.map((item) => item.project))
  try {
    await mkdir(absoluteOutput)
  } catch (error) {
    if (error?.code !== "EEXIST") throw error
    const existing = await readdir(absoluteOutput)
    if (existing.length > 0) fail("handoff output directory must be empty")
  }

  const packages = []
  for (const project of selection) {
    if (abandonedProjects.has(project)) continue
    const record = catalog.get(project)
    const before = new Set(await readdir(absoluteOutput))
    await run(pnpmExecutable, ["pack", "--json", "--pack-destination", absoluteOutput], {
      cwd: join(absoluteSource, record.root),
      env: environment,
    })
    const after = await readdir(absoluteOutput)
    const added = after.filter((name) => !before.has(name))
    if (added.length !== 1 || !safeBasename(added[0]))
      fail(`pnpm pack did not create exactly one safe tarball for ${project}`)
    const tarballPath = join(absoluteOutput, added[0])
    await regularFile(tarballPath, `packed tarball for ${project}`, MAX_TARBALL_BYTES)
    const bytes = await readFile(tarballPath)
    const inspected = inspectStableTarball(bytes, record)
    packages.push(makePackageRecord(record, added[0], bytes, inspected))
  }
  packages.sort((left, right) => left.project.localeCompare(right.project))
  const handoff = {
    schemaVersion: HANDOFF_SCHEMA_VERSION,
    repository: metadata.repository,
    workflow: { path: metadata.workflowPath, ref: metadata.workflowRef, sha: metadata.workflowSha },
    run: { id: metadata.runId, attempt: metadata.runAttempt },
    expectedSha: metadata.expectedSha,
    artifactSha: metadata.artifactSha,
    selection,
    abandonments,
    packages,
  }
  await writeFile(join(absoluteOutput, "handoff.json"), `${JSON.stringify(handoff, null, 2)}\n`, {
    flag: "wx",
    mode: 0o600,
  })
  return handoff
}

function validateDispositionArray(value, expected) {
  if (!Array.isArray(value)) fail("handoff abandonments are invalid")
  for (const item of value)
    exactKeys(item, ["artifactSha", "project", "name", "version", "reason"], "handoff abandonment")
  if (!isDeepStrictEqual(value, expected)) fail("handoff abandonments do not match the reviewed ledger")
}
function validateInventory(value) {
  if (!Array.isArray(value) || value.length === 0) fail("handoff packed inventory is invalid")
  let previous = ""
  const seen = new Set()
  for (const item of value) {
    exactKeys(item, ["path", "size", "mode", "type"], "handoff inventory entry")
    if (
      !safePackedPath(item.path) ||
      !Number.isSafeInteger(item.size) ||
      item.size < 0 ||
      !Number.isSafeInteger(item.mode) ||
      item.mode < 0 ||
      !["file", "directory"].includes(item.type)
    ) {
      fail("handoff packed inventory entry is invalid")
    }
    if (seen.has(item.path)) fail("handoff packed inventory contains duplicates")
    if (previous && previous.localeCompare(item.path) >= 0) fail("handoff packed inventory is not exactly sorted")
    seen.add(item.path)
    previous = item.path
  }
}
function validatePackageSchema(item) {
  exactKeys(
    item,
    ["project", "root", "name", "version", "sourceManifestSha256", "tarball", "inventory"],
    "handoff package",
  )
  if (!safeName(item.project) || !safeName(item.name) || item.project !== item.name || !safeRoot(item.root)) {
    fail("handoff package identity is invalid")
  }
  if (!stableSemver(item.version) || !/^[0-9a-f]{64}$/.test(item.sourceManifestSha256)) {
    fail("handoff package version or source-manifest digest is invalid")
  }
  exactKeys(item.tarball, ["basename", "size", "sha1", "sha256", "sha512", "integrity"], "handoff tarball")
  if (
    !safeBasename(item.tarball.basename) ||
    !Number.isSafeInteger(item.tarball.size) ||
    item.tarball.size <= 0 ||
    !/^[0-9a-f]{40}$/.test(item.tarball.sha1) ||
    !/^[0-9a-f]{64}$/.test(item.tarball.sha256) ||
    !/^[0-9a-f]{128}$/.test(item.tarball.sha512) ||
    item.tarball.integrity !== `sha512-${Buffer.from(item.tarball.sha512, "hex").toString("base64")}`
  ) {
    fail("handoff tarball identity or digest is invalid")
  }
  validateInventory(item.inventory)
}

export async function verifyStableHandoff({ directory, abandonmentPath, expected }) {
  if (!object(expected)) fail("expected handoff metadata is invalid")
  const { selection: expectedSelectionInput, ...expectedMetadata } = expected
  validateMetadata(expectedMetadata)
  const expectedSelection = sortedUniqueNames(expectedSelectionInput, "expected stable selection")
  const ledger = await loadStableAbandonments(abandonmentPath)
  const absoluteDirectory = resolve(directory)
  const handoffPath = join(absoluteDirectory, "handoff.json")
  const handoff = await readJsonFile(handoffPath, "stable handoff", MAX_HANDOFF_BYTES)
  exactKeys(
    handoff,
    [
      "schemaVersion",
      "repository",
      "workflow",
      "run",
      "expectedSha",
      "artifactSha",
      "selection",
      "abandonments",
      "packages",
    ],
    "stable handoff",
  )
  if (handoff.schemaVersion !== HANDOFF_SCHEMA_VERSION) fail("stable handoff schema version is unsupported")
  exactKeys(handoff.workflow, ["path", "ref", "sha"], "handoff workflow")
  exactKeys(handoff.run, ["id", "attempt"], "handoff run")
  for (const [label, actual, wanted] of [
    ["repository", handoff.repository, expected.repository],
    ["workflow path", handoff.workflow.path, expected.workflowPath],
    ["workflow ref", handoff.workflow.ref, expected.workflowRef],
    ["workflow SHA", handoff.workflow.sha, expected.workflowSha],
    ["run ID", handoff.run.id, expected.runId],
    ["run attempt", handoff.run.attempt, expected.runAttempt],
    ["expected SHA", handoff.expectedSha, expected.expectedSha],
    ["artifact SHA", handoff.artifactSha, expected.artifactSha],
  ]) {
    if (actual !== wanted) fail(`handoff ${label} does not match the current run`)
  }
  if (!isDeepStrictEqual(handoff.selection, expectedSelection))
    fail("handoff selection does not exactly match the request")
  const expectedAbandonments = applicableAbandonments(ledger, null, expectedSelection, expected.artifactSha)
  validateDispositionArray(handoff.abandonments, expectedAbandonments)
  if (!Array.isArray(handoff.packages)) fail("handoff packages are invalid")
  const expectedProjects = expectedSelection.filter(
    (project) => !expectedAbandonments.some((disposition) => disposition.project === project),
  )
  const packageProjects = handoff.packages.map((item) => item?.project)
  if (!isDeepStrictEqual(packageProjects, expectedProjects)) fail("handoff package selection is wrong or unsorted")
  const basenames = new Set()
  for (const item of handoff.packages) {
    validatePackageSchema(item)
    if (basenames.has(item.tarball.basename)) fail("handoff tarball basename is duplicated")
    basenames.add(item.tarball.basename)
    const tarballPath = join(absoluteDirectory, item.tarball.basename)
    const status = await regularFile(tarballPath, `handoff tarball ${item.tarball.basename}`, MAX_TARBALL_BYTES)
    if (status.size !== item.tarball.size) fail(`handoff tarball size mismatch: ${item.tarball.basename}`)
    const bytes = await readFile(tarballPath)
    for (const [algorithm, wanted] of [
      ["sha1", item.tarball.sha1],
      ["sha256", item.tarball.sha256],
      ["sha512", item.tarball.sha512],
    ]) {
      if (digest(algorithm, bytes) !== wanted) fail(`handoff tarball digest mismatch: ${item.tarball.basename}`)
    }
    const inspected = inspectStableTarball(bytes, item)
    if (!isDeepStrictEqual(inspected.inventory, item.inventory)) {
      fail(`handoff tarball inventory mismatch: ${item.tarball.basename}`)
    }
  }
  const entries = await readdir(absoluteDirectory, { withFileTypes: true })
  const expectedFiles = new Set(["handoff.json", ...basenames])
  for (const entry of entries) {
    if (!entry.isFile()) fail(`handoff contains a symlink or non-file extra: ${entry.name}`)
    if (!expectedFiles.has(entry.name)) fail(`handoff contains an extra file: ${entry.name}`)
  }
  if (entries.length !== expectedFiles.size) fail("handoff file set is incomplete")
  return handoff
}

function cliOptions(arguments_) {
  const options = {}
  for (let index = 0; index < arguments_.length; index += 2) {
    const name = arguments_[index]
    const value = arguments_[index + 1]
    if (!name?.startsWith("--") || value === undefined || value.startsWith("--"))
      fail("malformed packaging helper arguments")
    if (Object.hasOwn(options, name)) fail(`duplicate packaging helper argument: ${name}`)
    options[name] = value
  }
  return options
}
function envMetadata() {
  return {
    repository: process.env.GITHUB_REPOSITORY ?? "",
    workflowPath: process.env.WORKFLOW_PATH ?? "",
    workflowRef: process.env.WORKFLOW_REF ?? "",
    workflowSha: process.env.WORKFLOW_SHA ?? "",
    runId: process.env.GITHUB_RUN_ID ?? "",
    runAttempt: process.env.GITHUB_RUN_ATTEMPT ?? "",
    expectedSha: process.env.EXPECTED_SHA ?? "",
    artifactSha: process.env.ARTIFACT_SHA ?? "",
  }
}
function envSelection() {
  return (process.env.PROJECTS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
}
async function main() {
  const [command, ...arguments_] = process.argv.slice(2)
  const options = cliOptions(arguments_)
  if (command === "create") {
    const allowed = ["--source-root", "--output", "--abandonments"]
    if (Object.keys(options).some((name) => !allowed.includes(name)) || allowed.some((name) => !options[name])) {
      fail("create requires --source-root, --output, and --abandonments")
    }
    const handoff = await createStableHandoff({
      sourceRoot: options["--source-root"],
      outputDirectory: options["--output"],
      abandonmentPath: options["--abandonments"],
      selection: envSelection(),
      metadata: envMetadata(),
    })
    process.stdout.write(
      `${JSON.stringify({ ok: true, packages: handoff.packages.length, abandonments: handoff.abandonments.length })}\n`,
    )
    return
  }
  if (command === "verify") {
    const allowed = ["--directory", "--abandonments"]
    if (Object.keys(options).some((name) => !allowed.includes(name)) || allowed.some((name) => !options[name])) {
      fail("verify requires --directory and --abandonments")
    }
    const handoff = await verifyStableHandoff({
      directory: options["--directory"],
      abandonmentPath: options["--abandonments"],
      expected: { ...envMetadata(), selection: envSelection() },
    })
    process.stdout.write(
      `${JSON.stringify({ ok: true, packages: handoff.packages.length, abandonments: handoff.abandonments.length })}\n`,
    )
    return
  }
  fail("packaging helper command must be create or verify")
}
function isMainModule() {
  const entry = process.argv[1]
  if (!entry) return false
  try {
    return pathToFileURL(realpathSync(entry)).href === pathToFileURL(realpathSync(fileURLToPath(import.meta.url))).href
  } catch {
    return false
  }
}
if (isMainModule())
  main().catch((error) => {
    process.stderr.write(`::error::${error.message}\n`)
    process.exitCode = 1
  })
