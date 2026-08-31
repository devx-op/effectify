#!/usr/bin/env node
import { spawn } from "node:child_process"
import { createHash } from "node:crypto"
import { constants, realpathSync } from "node:fs"
import { lstat, open, readFile } from "node:fs/promises"
import { isAbsolute, join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { isDeepStrictEqual } from "node:util"
import { verifyStableHandoff } from "./release-package-stable.mjs"

const WORKFLOW_PATH = ".github/workflows/release-stable.yml"
const WORKFLOW_REF = "refs/heads/master"
const ABANDONMENT_PATH = fileURLToPath(new URL("./release-stable-abandonments.json", import.meta.url))
const ALLOWED_HISTORICAL_PATHS = Object.freeze([
  ".github/SETUP.md",
  ".github/workflows/release-stable.yml",
  "scripts/release-finalize-stable.mjs",
  "scripts/release-finalize-stable.test.mjs",
  "scripts/release-package-stable.mjs",
  "scripts/release-package-stable.test.mjs",
  "scripts/release-policy-contract.test.mjs",
  "scripts/release-stable-abandonments.json",
])
const MAX_HISTORICAL_COMMITS = 8
const MAX_NPM_READS = 6
const MAX_NPM_CONFIG_BYTES = 64 * 1024
const MAX_TRACKED_NPM_CONFIGS = 64
const NPM_REGISTRY = "https://registry.npmjs.org/"
const NPM_ATTESTATION_PATH_PREFIX = "/-/npm/v1/attestations/"

const expectedSha = process.env.EXPECTED_SHA ?? ""
const artifactSha = process.env.ARTIFACT_SHA || expectedSha
const requestedProjectsText = process.env.PROJECTS ?? ""
const historicalReplay = artifactSha !== expectedSha
const delayMs = Number(process.env.NPM_READ_DELAY_MS ?? Number(process.env.NPM_READ_DELAY ?? 10) * 1000)
const commandTimeoutMs = Number(process.env.FINALIZE_COMMAND_TIMEOUT_MS ?? 60_000)
const httpTimeoutMs = Number(process.env.FINALIZE_HTTP_TIMEOUT_MS ?? 30_000)
const outputLimit = Number(process.env.FINALIZE_OUTPUT_LIMIT ?? 1024 * 1024)
const cliArguments = process.argv.slice(2)
const preflight = cliArguments.includes("--preflight")
const jsonOutput = cliArguments.includes("--json")

function fail(message) {
  throw new Error(message)
}
function object(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
function digest(algorithm, bytes) {
  return createHash(algorithm).update(bytes).digest("hex")
}
function validRuntimeBound(value, minimum, maximum) {
  return Number.isSafeInteger(value) && value >= minimum && value <= maximum
}
function validateRuntimeBounds() {
  if (!validRuntimeBound(delayMs, 0, 60_000)) fail("NPM read delay is invalid")
  if (!validRuntimeBound(commandTimeoutMs, 1, 300_000)) fail("FINALIZE command timeout is invalid")
  if (!validRuntimeBound(httpTimeoutMs, 1, 300_000)) fail("FINALIZE HTTP timeout is invalid")
  if (!validRuntimeBound(outputLimit, 1024, 16 * 1024 * 1024)) fail("FINALIZE output limit is invalid")
}
function run(file, args, { ok = [0], env } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(file, args, { shell: false, stdio: ["ignore", "pipe", "pipe"], env })
    let stdout = Buffer.alloc(0)
    let stderr = Buffer.alloc(0)
    let excessive = false
    const append = (current, chunk) => {
      if (current.length + chunk.length > outputLimit) {
        excessive = true
        child.kill("SIGKILL")
        return current
      }
      return Buffer.concat([current, chunk])
    }
    child.stdout.on("data", (chunk) => {
      stdout = append(stdout, chunk)
    })
    child.stderr.on("data", (chunk) => {
      stderr = append(stderr, chunk)
    })
    const timer = setTimeout(() => child.kill("SIGKILL"), commandTimeoutMs)
    child.on("error", (error) => {
      clearTimeout(timer)
      reject(new Error(`${file} execution failed: ${error.message}`))
    })
    child.on("close", (code, signal) => {
      clearTimeout(timer)
      const result = { code, signal, stdout: stdout.toString("utf8"), stderr: stderr.toString("utf8") }
      if (excessive) reject(new Error(`${file} output exceeded bound`))
      else if (signal) reject(new Error(`${file} timed out or terminated (${signal})`))
      else if (!ok.includes(code)) {
        const error = new Error(`${file} failed (${code})`)
        Object.defineProperty(error, "commandResult", { value: result })
        reject(error)
      } else resolve(result)
    })
  })
}
function parseJson(text, label) {
  try {
    return JSON.parse(text)
  } catch {
    fail(`${label} returned malformed JSON`)
  }
}
function safeRoot(value) {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 512 &&
    !isAbsolute(value) &&
    !value.includes("\\") &&
    !/[\u0000-\u001f\u007f]/.test(value) &&
    !value.includes("//") &&
    value.split("/").every((part) => part && part !== "." && part !== "..")
  )
}
function safeName(value) {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 214 &&
    /^@[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*$/.test(value)
  )
}
function fullSha(value) {
  return typeof value === "string" && /^[0-9a-f]{40}$/.test(value)
}
function parseSemver(value) {
  if (typeof value !== "string") return null
  const match = value.match(
    /^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/,
  )
  if (!match) return null
  const prerelease = match[4]?.split(".") ?? []
  if (
    prerelease.some((identifier) => /^[0-9]+$/.test(identifier) && identifier.length > 1 && identifier.startsWith("0"))
  ) {
    return null
  }
  return { major: BigInt(match[1]), minor: BigInt(match[2]), patch: BigInt(match[3]), prerelease }
}
function compareSemver(left, right) {
  for (const part of ["major", "minor", "patch"]) {
    if (left[part] < right[part]) return -1
    if (left[part] > right[part]) return 1
  }
  if (left.prerelease.length === 0 || right.prerelease.length === 0) {
    return left.prerelease.length === right.prerelease.length ? 0 : left.prerelease.length === 0 ? 1 : -1
  }
  const length = Math.max(left.prerelease.length, right.prerelease.length)
  for (let index = 0; index < length; index++) {
    const leftIdentifier = left.prerelease[index]
    const rightIdentifier = right.prerelease[index]
    if (leftIdentifier === undefined || rightIdentifier === undefined) return leftIdentifier === undefined ? -1 : 1
    if (leftIdentifier === rightIdentifier) continue
    const leftNumeric = /^[0-9]+$/.test(leftIdentifier)
    const rightNumeric = /^[0-9]+$/.test(rightIdentifier)
    if (leftNumeric && rightNumeric) return BigInt(leftIdentifier) < BigInt(rightIdentifier) ? -1 : 1
    if (leftNumeric !== rightNumeric) return leftNumeric ? -1 : 1
    return leftIdentifier < rightIdentifier ? -1 : 1
  }
  return 0
}
function parseRequestedProjects() {
  const raw = requestedProjectsText
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
  if (raw.length === 0) fail("stable selection is empty")
  if (raw.some((value) => !safeName(value))) fail("stable selection contains an invalid project")
  const duplicates = raw.filter((value, index) => raw.indexOf(value) !== index)
  if (duplicates.length > 0) fail(`duplicate requested project: ${duplicates[0]}`)
  return raw.sort()
}

async function verifyCurrentRunHandoff(projects) {
  const directory = process.env.STABLE_HANDOFF_DIRECTORY ?? ""
  const artifactId = process.env.STABLE_HANDOFF_ARTIFACT_ID ?? ""
  const artifactDigest = process.env.STABLE_HANDOFF_ARTIFACT_DIGEST ?? ""
  const repository = process.env.GITHUB_REPOSITORY ?? ""
  const workflowSha = process.env.GITHUB_WORKFLOW_SHA ?? ""
  const runId = process.env.GITHUB_RUN_ID ?? ""
  const runAttempt = process.env.GITHUB_RUN_ATTEMPT ?? ""
  const workflowReference = process.env.GITHUB_WORKFLOW_REF ?? ""

  if (!isAbsolute(directory)) fail("stable handoff directory must be an absolute path")
  if (!/^[1-9][0-9]*$/.test(artifactId)) fail("stable handoff artifact ID is invalid")
  if (!/^sha256:[0-9a-f]{64}$/.test(artifactDigest)) fail("stable handoff artifact digest is invalid")
  if (workflowReference !== `${repository}/${WORKFLOW_PATH}@${WORKFLOW_REF}`) {
    fail("current workflow reference is invalid")
  }
  if (workflowSha !== expectedSha) fail("current workflow SHA does not match expected SHA")

  let handoff
  try {
    handoff = await verifyStableHandoff({
      directory,
      abandonmentPath: ABANDONMENT_PATH,
      expected: {
        repository,
        workflowPath: WORKFLOW_PATH,
        workflowRef: WORKFLOW_REF,
        workflowSha,
        runId,
        runAttempt,
        expectedSha,
        artifactSha,
        selection: projects,
      },
    })
  } catch (error) {
    if (error?.message === "handoff selection does not exactly match the request") {
      fail("requested projects do not exactly match the stable handoff selection")
    }
    throw error
  }
  return { handoff, directory, artifactId, artifactDigest }
}

async function commitParents(revision, label) {
  let result
  try {
    result = await run("git", ["rev-list", "--parents", "-n", "1", revision])
  } catch {
    fail(`${label} commit shape is unreadable`)
  }
  const parts = result.stdout.trimEnd().split(" ")
  if (
    parts.length < 2 ||
    parts.some((part) => !fullSha(part)) ||
    parts[0] !== revision ||
    new Set(parts).size !== parts.length
  ) {
    fail(`${label} commit shape is invalid`)
  }
  return parts.slice(1)
}
async function verifyArtifactLineage() {
  const parents = await commitParents(artifactSha, "reviewed artifact")
  if (parents.length === 1) return
  if (parents.length !== 2) fail("reviewed artifact must be a single-parent commit or exact two-parent merge")

  const [firstParent, generatedParent] = parents
  const generatedParents = await commitParents(generatedParent, "reviewed merge second parent")
  if (generatedParents.length !== 1 || generatedParents[0] !== firstParent) {
    fail("reviewed merge second parent must be a single commit based directly on first parent")
  }

  let trees
  try {
    trees = await run("git", ["rev-parse", `${generatedParent}^{tree}`, `${artifactSha}^{tree}`])
  } catch {
    fail("reviewed merge trees are unreadable")
  }
  const treeIds = trees.stdout.trimEnd().split("\n")
  if (treeIds.length !== 2 || treeIds.some((tree) => !fullSha(tree)) || treeIds[0] !== treeIds[1]) {
    fail("reviewed merge tree must exactly match its generated second parent")
  }
}
async function verifyHistoricalRecoveryBounds() {
  let ancestry
  try {
    ancestry = await run("git", ["merge-base", "--is-ancestor", artifactSha, expectedSha], { ok: [0, 1] })
  } catch {
    fail("historical artifact ancestry is unreadable")
  }
  if (ancestry.code !== 0) fail("historical artifact SHA must be an ancestor of expected SHA")

  let countResult
  try {
    countResult = await run("git", ["rev-list", "--count", `${artifactSha}..${expectedSha}`])
  } catch {
    fail("historical recovery commit-count bound is unreadable")
  }
  const countText = countResult.stdout.trim()
  if (!/^[0-9]+$/.test(countText)) fail("historical recovery commit-count bound is invalid")
  const count = Number(countText)
  if (!Number.isSafeInteger(count) || count < 1 || count > MAX_HISTORICAL_COMMITS) {
    fail(`historical recovery exceeds the commit-count bound of ${MAX_HISTORICAL_COMMITS}`)
  }

  let pathsResult
  try {
    pathsResult = await run("git", ["diff", "--name-only", "--no-renames", artifactSha, expectedSha])
  } catch {
    fail("historical recovery changed paths are unreadable")
  }
  const paths = pathsResult.stdout.split("\n").filter(Boolean)
  if (new Set(paths).size !== paths.length) fail("historical recovery changed paths contain duplicates")
  const allowed = new Set(ALLOWED_HISTORICAL_PATHS)
  const unexpected = paths.find((path) => !allowed.has(path))
  if (unexpected) fail(`historical recovery changed path is not allowlisted: ${unexpected}`)
}
async function verifyArtifactChangelog() {
  let result
  try {
    result = await run("git", ["cat-file", "-t", `${artifactSha}:CHANGELOG.md`])
  } catch {
    fail("reviewed artifact requires root CHANGELOG.md to exist as a blob")
  }
  if (result.stdout !== "blob\n") fail("reviewed artifact requires root CHANGELOG.md to exist as a blob")
}
async function artifactDocument(path, revision = artifactSha) {
  let result
  try {
    result = await run("git", ["show", `${revision}:${path}`])
  } catch {
    fail(`artifact repository read failed for ${revision}:${path}`)
  }
  return { text: result.stdout, value: parseJson(result.stdout, `artifact ${revision}:${path}`) }
}
async function artifactJson(path, revision = artifactSha) {
  return (await artifactDocument(path, revision)).value
}
async function deriveReviewedRecords(projects) {
  const nx = await artifactJson("nx.json")
  const roots = nx?.release?.projects
  if (!Array.isArray(roots) || roots.length === 0 || roots.some((root) => !safeRoot(root))) {
    fail("artifact nx.json release projects are invalid")
  }
  if (new Set(roots).size !== roots.length) fail("artifact nx.json release projects contain duplicates")

  const catalog = []
  const projectNames = new Set()
  const packageNames = new Set()
  const manifestPaths = new Set()
  for (const [releaseOrder, root] of roots.entries()) {
    const projectJson = await artifactJson(`${root}/project.json`)
    const manifestPath = `${root}/package.json`
    const manifestDocument = await artifactDocument(manifestPath)
    const manifest = manifestDocument.value
    const project = projectJson?.name
    const name = manifest?.name
    const version = manifest?.version
    if (!object(projectJson) || !safeName(project)) fail(`artifact project identity is invalid for ${root}`)
    if (!object(manifest) || !safeName(name) || typeof version !== "string") {
      fail(`artifact manifest identity is invalid for ${manifestPath}`)
    }
    if (project !== name) fail(`artifact project and manifest identity mismatch for ${manifestPath}`)
    if (projectNames.has(project) || packageNames.has(name) || manifestPaths.has(manifestPath)) {
      fail(`artifact release identity is duplicated for ${project}`)
    }
    projectNames.add(project)
    packageNames.add(name)
    manifestPaths.add(manifestPath)
    catalog.push({
      project,
      root,
      manifestPath,
      name,
      version,
      releaseOrder,
      reviewedManifest: manifest,
      sourceManifestSha256: digest("sha256", manifestDocument.text),
    })
  }
  for (const project of projects) {
    if (!projectNames.has(project)) fail(`requested project is not in artifact release projects: ${project}`)
  }

  const changedResult = await run("git", ["diff", "--name-only", "--no-renames", `${artifactSha}^1`, artifactSha])
  const changedPaths = changedResult.stdout.split("\n").filter(Boolean)
  if (new Set(changedPaths).size !== changedPaths.length) fail("reviewed diff contains duplicate paths")
  if (!changedPaths.includes("CHANGELOG.md")) fail("reviewed diff requires root CHANGELOG.md")

  const byManifest = new Map(catalog.map((item) => [item.manifestPath, item]))
  const records = []
  for (const changedPath of changedPaths) {
    if (changedPath === "CHANGELOG.md") continue
    const item = byManifest.get(changedPath)
    if (!item) fail(`unexpected reviewed path: ${changedPath}`)
    const previous = await artifactJson(item.manifestPath, `${artifactSha}^1`)
    if (
      !object(previous) ||
      !safeName(previous.name) ||
      typeof previous.version !== "string" ||
      previous.name !== item.name
    ) {
      fail(`reviewed manifest identity mismatch for ${item.manifestPath}`)
    }
    const match = previous.version.match(/^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)-beta\.(0|[1-9][0-9]*)$/)
    const stableVersion = match ? `${match[1]}.${match[2]}.${match[3]}` : ""
    if (!match || item.version !== stableVersion) {
      fail(`reviewed manifest is not a strict beta-to-stable transition for ${item.project}`)
    }
    records.push({ ...item, version: stableVersion, betaVersion: previous.version })
  }
  if (records.length === 0) fail("reviewed diff contains no release manifest transition")
  records.sort((left, right) => left.project.localeCompare(right.project))
  const reviewedProjects = records.map((item) => item.project)
  if (
    projects.length !== reviewedProjects.length ||
    projects.some((project, index) => project !== reviewedProjects[index])
  ) {
    fail("requested projects do not exactly match reviewed manifest changes")
  }
  return records
}
function bindHandoffToRecords(handoff, records) {
  const byProject = new Map(records.map((record) => [record.project, record]))
  const abandonedProjects = new Set()
  for (const disposition of handoff.abandonments) {
    const record = byProject.get(disposition.project)
    if (!record || record.name !== disposition.name || record.version !== disposition.version) {
      fail(`reviewed abandonment identity does not match artifact record: ${disposition.project}`)
    }
    abandonedProjects.add(disposition.project)
  }

  const packageByProject = new Map()
  for (const item of handoff.packages) {
    const record = byProject.get(item.project)
    if (
      !record ||
      abandonedProjects.has(item.project) ||
      item.root !== record.root ||
      item.name !== record.name ||
      item.version !== record.version ||
      item.sourceManifestSha256 !== record.sourceManifestSha256
    ) {
      fail(`stable handoff package does not exactly match reviewed artifact record: ${item.project}`)
    }
    packageByProject.set(item.project, item)
  }
  for (const record of records) {
    if (!abandonedProjects.has(record.project) && !packageByProject.has(record.project)) {
      fail(`stable handoff package is missing for ${record.project}`)
    }
  }
  return { abandonedProjects, packageByProject }
}

function exactAttestationUrl(value, record) {
  if (typeof value !== "string") return false
  let url
  try {
    url = new URL(value)
  } catch {
    return false
  }
  if (
    url.protocol !== "https:" ||
    url.host !== "registry.npmjs.org" ||
    url.username !== "" ||
    url.password !== "" ||
    url.search !== "" ||
    url.hash !== "" ||
    !url.pathname.startsWith(NPM_ATTESTATION_PATH_PREFIX)
  ) {
    return false
  }
  let specification
  try {
    specification = decodeURIComponent(url.pathname.slice(NPM_ATTESTATION_PATH_PREFIX.length))
  } catch {
    return false
  }
  return specification === `${record.name}@${record.version}`
}
function distDivergence(dist, record, handoffPackage) {
  if (!object(dist)) return "dist"
  if (dist.integrity !== handoffPackage.tarball.integrity) return "integrity"
  if (dist.shasum !== handoffPackage.tarball.sha1) return "shasum"
  if (!object(dist.attestations)) return "attestation"
  if (!exactAttestationUrl(dist.attestations.url, record)) return "attestation URL"
  if (
    !object(dist.attestations.provenance) ||
    dist.attestations.provenance.predicateType !== "https://slsa.dev/provenance/v1"
  ) {
    return "provenance"
  }
  return ""
}
async function npmState(record, handoffPackage) {
  try {
    const versionsDocument = (await run("npm", ["view", record.name, "versions", "--json", "--registry", NPM_REGISTRY]))
      .stdout
    const tagsDocument = (await run("npm", ["view", record.name, "dist-tags", "--json", "--registry", NPM_REGISTRY]))
      .stdout
    const versionsValue = parseJson(versionsDocument, `${record.name} versions`)
    const tags = parseJson(tagsDocument, `${record.name} dist-tags`)
    const versions = typeof versionsValue === "string" ? [versionsValue] : versionsValue
    if (!Array.isArray(versions) || versions.some((value) => typeof value !== "string") || !object(tags)) {
      return { kind: "unknown" }
    }
    if (new Set(versions).size !== versions.length || versions.some((value) => !parseSemver(value))) {
      return { kind: "unknown" }
    }
    const target = parseSemver(record.version)
    const beta = parseSemver(record.betaVersion)
    if (!target || !beta) return { kind: "unknown" }
    const versionSet = new Set(versions)
    const targetPresent = versionSet.has(record.version)
    const hasLatest = Object.hasOwn(tags, "latest")
    let latest
    if (hasLatest) {
      if (typeof tags.latest !== "string" || !(latest = parseSemver(tags.latest))) return { kind: "unknown" }
      if (!versionSet.has(tags.latest)) return { kind: "divergent", reason: "latest" }
    }
    if (targetPresent) {
      if (!handoffPackage) return { kind: "present" }
      if (!hasLatest || tags.latest !== record.version) return { kind: "divergent", reason: "latest" }
      const distDocument = (
        await run("npm", ["view", `${record.name}@${record.version}`, "dist", "--json", "--registry", NPM_REGISTRY])
      ).stdout
      const dist = parseJson(distDocument, `${record.name}@${record.version} dist`)
      const reason = distDivergence(dist, record, handoffPackage)
      return reason ? { kind: "divergent", reason } : { kind: "exact" }
    }
    if (tags.beta !== record.betaVersion || !versionSet.has(record.betaVersion)) {
      return { kind: "divergent", reason: "beta baseline" }
    }
    if (hasLatest && compareSemver(latest, target) >= 0) return { kind: "divergent", reason: "latest" }
    return { kind: "absent" }
  } catch {
    return { kind: "unknown" }
  }
}
async function npmBounded(record, handoffPackage, { acceptAbsent = false } = {}) {
  let state
  for (let attempt = 1; attempt <= MAX_NPM_READS; attempt++) {
    state = await npmState(record, handoffPackage)
    if (state.kind === "exact" || (acceptAbsent && state.kind === "absent")) return state
    if (attempt < MAX_NPM_READS) await sleep(delayMs)
  }
  if (state.kind === "absent") fail(`npm version remained absent after ${MAX_NPM_READS} attempts for ${record.name}`)
  if (state.kind === "divergent") {
    fail(`permanent npm state divergence (${state.reason ?? "unknown"}) for ${record.name}@${record.version}`)
  }
  fail(`npm state unreadable after ${MAX_NPM_READS} attempts for ${record.name}`)
}
async function npmAbandonmentState(record) {
  let state
  for (let attempt = 1; attempt <= MAX_NPM_READS; attempt++) {
    state = await npmState(record, null)
    if (state.kind === "present") {
      fail(`abandoned package ${record.name}@${record.version} must remain absent from npm`)
    }
    if (state.kind === "absent") return { kind: "absent-abandoned" }
    if (attempt < MAX_NPM_READS) await sleep(delayMs)
  }
  if (state.kind === "divergent") {
    fail(`permanent npm state divergence (${state.reason ?? "unknown"}) for abandoned ${record.name}@${record.version}`)
  }
  fail(`npm state unreadable after ${MAX_NPM_READS} attempts for abandoned ${record.name}`)
}

function parseTag(text, tag) {
  const direct = []
  const peeled = []
  const directRef = `refs/tags/${tag}`
  const peeledRef = `${directRef}^{}`
  if (text === "") return { kind: "absent" }
  for (const line of text.split("\n")) {
    if (!line) continue
    const match = line.match(/^([0-9a-f]{40})\t([^\s]+)$/)
    if (!match) return { kind: "unknown" }
    if (match[2] === directRef) direct.push(match[1])
    else if (match[2] === peeledRef) peeled.push(match[1])
    else return { kind: "unknown" }
  }
  return direct.length === 1 && peeled.length === 1 && peeled[0] === artifactSha
    ? { kind: "exact" }
    : { kind: "divergent" }
}
async function tagState(tag) {
  let result
  try {
    result = await run("git", ["ls-remote", "--tags", "origin", `refs/tags/${tag}`, `refs/tags/${tag}^{}`])
  } catch {
    return { kind: "unknown" }
  }
  return parseTag(result.stdout, tag)
}
async function localTagState(tag) {
  let result
  try {
    result = await run("git", ["for-each-ref", "--format=%(objecttype)%09%(*objectname)", `refs/tags/${tag}`])
  } catch {
    return { kind: "unknown" }
  }
  if (result.stdout === "") return { kind: "absent" }
  const lines = result.stdout.trimEnd().split("\n")
  if (lines.length !== 1) return { kind: "divergent" }
  const match = lines[0].match(/^tag\t([0-9a-f]{40})$/)
  return match && match[1] === artifactSha ? { kind: "exact" } : { kind: "divergent" }
}
function repository() {
  if (process.env.GITHUB_REPOSITORY) return process.env.GITHUB_REPOSITORY
  fail("GITHUB_REPOSITORY is required")
}
function tagPushConfiguration() {
  const token = process.env.GITHUB_TOKEN
  if (typeof token !== "string" || !/^[\x21-\x7e]{1,4096}$/.test(token)) {
    fail("FINALIZE tag push requires a safe non-empty GITHUB_TOKEN")
  }
  const basicAuth = Buffer.from(`x-access-token:${token}`, "utf8").toString("base64")
  return `http.https://github.com/.extraheader=AUTHORIZATION: basic ${basicAuth}`
}
async function github(method, path, body) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), httpTimeoutMs)
  try {
    const options = {
      method,
      signal: controller.signal,
      headers: {
        accept: "application/vnd.github+json",
        authorization: `Bearer ${process.env.GITHUB_TOKEN ?? ""}`,
        "content-type": "application/json",
        "user-agent": "effectify-release-finalizer",
        "x-github-api-version": "2022-11-28",
      },
    }
    if (body !== undefined) options.body = JSON.stringify(body)
    const response = await fetch(
      `${process.env.GITHUB_API_URL ?? "https://api.github.com"}/repos/${repository()}${path}`,
      options,
    )
    const text = await response.text()
    if (Buffer.byteLength(text) > outputLimit) fail("GitHub response exceeded bound")
    return { status: response.status, text }
  } catch (error) {
    fail(`GitHub transport failure: ${error.message}`)
  } finally {
    clearTimeout(timer)
  }
}
async function releaseState(tag) {
  const result = await github("GET", `/releases/tags/${encodeURIComponent(tag)}`)
  if (result.status === 404) return { kind: "absent" }
  if (result.status !== 200) return { kind: "unknown", status: result.status }
  const value = parseJson(result.text, `GitHub Release ${tag}`)
  return object(value) && value.tag_name === tag && value.draft === false && value.prerelease === false
    ? { kind: "exact" }
    : { kind: "divergent" }
}
async function inspect(records, packageByProject, abandonedProjects) {
  await run("git", ["fetch", "origin", "master:refs/remotes/origin/master", "--no-tags"])
  const head = (await run("git", ["rev-parse", "HEAD"])).stdout.trim()
  const origin = (await run("git", ["rev-parse", "origin/master"])).stdout.trim()
  if (head !== expectedSha) fail("HEAD does not match expected SHA")
  if (origin !== expectedSha) fail("origin/master does not match expected SHA")

  const states = []
  for (const record of records) {
    const npm = abandonedProjects.has(record.project)
      ? await npmAbandonmentState(record)
      : await npmBounded(record, packageByProject.get(record.project), { acceptAbsent: true })
    const tag = await tagState(`${record.name}@${record.version}`)
    const release = await releaseState(`${record.name}@${record.version}`)
    for (const [label, state] of [
      ["tag", tag],
      ["GitHub Release", release],
    ]) {
      if (!["exact", "absent"].includes(state.kind)) {
        fail(
          `${label} state is ${state.kind} for ${record.name}@${record.version}${state.status ? ` (HTTP ${state.status})` : ""}`,
        )
      }
    }
    states.push({
      project: record.project,
      root: record.root,
      manifestPath: record.manifestPath,
      name: record.name,
      version: record.version,
      betaVersion: record.betaVersion,
      releaseOrder: record.releaseOrder,
      npm: npm.kind,
      tag: tag.kind,
      release: release.kind,
    })
  }
  return states
}

async function verifyPublicationSource(records) {
  const status = await run("git", ["status", "--porcelain=v1", "--untracked-files=all"])
  if (status.stdout !== "") fail("stable publication requires a clean index and worktree")
  for (const record of records) {
    let text
    try {
      text = await readFile(record.manifestPath, "utf8")
    } catch {
      fail(`on-disk manifest is unreadable for ${record.manifestPath}`)
    }
    const manifest = parseJson(text, `on-disk manifest ${record.manifestPath}`)
    if (!object(manifest) || !isDeepStrictEqual(manifest, record.reviewedManifest)) {
      fail(`on-disk manifest does not exactly match reviewed artifact for ${record.manifestPath}`)
    }
  }
}
function npmConfigFailure() {
  fail("npm auth configuration could not be safely verified at the publication boundary")
}
function stableFileIdentity(left, right) {
  return ["dev", "ino", "mode", "nlink", "size", "mtimeNs", "ctimeNs"].every((key) => left[key] === right[key])
}
function authBearingNpmConfig(text) {
  if (
    /[\u0000-\u0009\u000b\u000c\u000e-\u001f\u007f-\u009f]/u.test(text) ||
    text.replaceAll("\r\n", "").includes("\r")
  ) {
    return true
  }

  for (const line of text.split("\n")) {
    const active = line.trimStart()
    if (active === "" || active.startsWith("#") || active.startsWith(";")) continue

    const separator = active.indexOf("=")
    const key = (separator === -1 ? active : active.slice(0, separator)).trim().toLowerCase()
    const value = separator === -1 ? "" : active.slice(separator + 1).trim()
    if (key === "") return true

    const leaf = key.split(/[:/]/u).at(-1).replace(/^_+/u, "").replace(/[-_]/gu, "")
    if (
      new Set([
        "auth",
        "authtoken",
        "token",
        "accesstoken",
        "password",
        "passwd",
        "pass",
        "username",
        "user",
        "alwaysauth",
        "otp",
        "cert",
        "certfile",
        "key",
        "keyfile",
      ]).has(leaf)
    ) {
      return true
    }
    if (/[a-z][a-z0-9+.-]*:\/\/[^/\s]*@/iu.test(value)) return true
    for (const interpolation of active.matchAll(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/gu)) {
      if (/(?:auth|token|passw|passwd|credential|secret)/iu.test(interpolation[1])) return true
    }
  }
  return false
}
async function inspectNpmConfig(path, { allowMissing = false } = {}) {
  let listed
  try {
    listed = await lstat(path, { bigint: true })
  } catch (error) {
    if (allowMissing && error?.code === "ENOENT") return
    npmConfigFailure()
  }
  if (!listed.isFile() || listed.isSymbolicLink() || listed.size > BigInt(MAX_NPM_CONFIG_BYTES)) npmConfigFailure()

  let handle
  try {
    handle = await open(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0))
    const before = await handle.stat({ bigint: true })
    if (!before.isFile() || !stableFileIdentity(listed, before) || before.size > BigInt(MAX_NPM_CONFIG_BYTES)) {
      npmConfigFailure()
    }

    const buffer = Buffer.alloc(MAX_NPM_CONFIG_BYTES + 1)
    let length = 0
    while (length < buffer.length) {
      const { bytesRead } = await handle.read(buffer, length, buffer.length - length, length)
      if (bytesRead === 0) break
      length += bytesRead
    }
    const after = await handle.stat({ bigint: true })
    if (length > MAX_NPM_CONFIG_BYTES || BigInt(length) !== before.size || !stableFileIdentity(before, after)) {
      npmConfigFailure()
    }

    let text
    try {
      text = new TextDecoder("utf-8", { fatal: true }).decode(buffer.subarray(0, length))
    } catch {
      npmConfigFailure()
    }
    if (authBearingNpmConfig(text)) npmConfigFailure()
  } catch {
    npmConfigFailure()
  } finally {
    if (handle) {
      try {
        await handle.close()
      } catch {
        npmConfigFailure()
      }
    }
  }
}
function trackedNpmConfigPaths(text) {
  if (text === "") return []
  if (!text.endsWith("\u0000")) npmConfigFailure()
  const paths = text.slice(0, -1).split("\u0000")
  if (paths.length > MAX_TRACKED_NPM_CONFIGS || new Set(paths).size !== paths.length) npmConfigFailure()
  for (const path of paths) {
    if (
      path === "" ||
      Buffer.byteLength(path) > 4096 ||
      isAbsolute(path) ||
      path.includes("\\") ||
      /[\u0000-\u001f\u007f\ufffd]/u.test(path) ||
      !(path === ".npmrc" || path.endsWith("/.npmrc")) ||
      path.split("/").some((part) => part === "" || part === "." || part === "..")
    ) {
      npmConfigFailure()
    }
  }
  return paths
}
function verifyNpmEnvironment() {
  const allowedConfiguration = new Map([
    ["NPM_CONFIG_IGNORE_SCRIPTS", "true"],
    ["NPM_CONFIG_PROVENANCE", "true"],
  ])
  const staticCredentialNames = new Set(["NODE_AUTH_TOKEN", "NPM_AUTH_TOKEN", "NPM_TOKEN"])
  for (const [name, value] of Object.entries(process.env)) {
    const normalizedName = name.toUpperCase()
    if (staticCredentialNames.has(normalizedName)) {
      fail("static npm credentials are forbidden at the publication boundary")
    }
    if (
      normalizedName.startsWith("NPM_CONFIG_") &&
      (name !== normalizedName || allowedConfiguration.get(name) !== value)
    ) {
      fail("npm configuration environment is not allowlisted at the publication boundary")
    }
  }
}
async function configuredNpmPath(key) {
  let configured
  try {
    configured = await run("npm", ["config", "get", key, "--json"])
  } catch {
    npmConfigFailure()
  }
  const path = parseJson(configured.stdout, `npm ${key} configuration`)
  if (
    typeof path !== "string" ||
    path.length === 0 ||
    Buffer.byteLength(path) > 4096 ||
    !isAbsolute(path) ||
    /[\u0000-\u001f\u007f\ufffd]/u.test(path)
  ) {
    npmConfigFailure()
  }
  return path
}
async function verifyTrustedPublishingBoundary() {
  verifyNpmEnvironment()

  let tracked
  try {
    tracked = await run("git", ["ls-files", "-z", "--", ".npmrc", ":(glob)**/.npmrc"])
  } catch {
    npmConfigFailure()
  }
  for (const path of trackedNpmConfigPaths(tracked.stdout)) await inspectNpmConfig(path)

  let registry
  try {
    registry = await run("npm", ["config", "get", "registry", "--json"])
  } catch {
    npmConfigFailure()
  }
  if (parseJson(registry.stdout, "effective npm registry") !== NPM_REGISTRY) {
    fail("effective npm registry is not the trusted npmjs registry at the publication boundary")
  }

  const userConfigPath = await configuredNpmPath("userconfig")
  const globalConfigPath = await configuredNpmPath("globalconfig")
  await inspectNpmConfig(userConfigPath, { allowMissing: true })
  await inspectNpmConfig(globalConfigPath, { allowMissing: true })
}

async function createCurrentArtifacts(states) {
  const missingTags = states
    .filter((item) => item.tag === "absent")
    .sort((left, right) => left.releaseOrder - right.releaseOrder)
  const pushConfiguration = missingTags.length > 0 ? tagPushConfiguration() : ""
  const localTags = []
  for (const item of missingTags) {
    const tag = `${item.name}@${item.version}`
    const local = await localTagState(tag)
    if (!["exact", "absent"].includes(local.kind)) fail(`local tag state is ${local.kind} for ${tag}`)
    localTags.push({ tag, local: local.kind })
  }
  if (localTags.some((item) => item.local === "absent")) {
    await run("git", ["config", "user.name", "github-actions[bot]"])
    await run("git", ["config", "user.email", "github-actions[bot]@users.noreply.github.com"])
  }
  for (const { tag, local } of localTags) {
    if (local === "absent") await run("git", ["tag", "-a", tag, artifactSha, "-m", tag])
  }
  if (missingTags.length > 0) {
    const refs = missingTags.map(
      (item) => `refs/tags/${item.name}@${item.version}:refs/tags/${item.name}@${item.version}`,
    )
    try {
      await run("git", ["-c", pushConfiguration, "push", "--atomic", "origin", ...refs])
    } catch {
      // A lost response is accepted only if every remote tag reconciles exactly below.
    }
  }
  for (const item of states) {
    if ((await tagState(`${item.name}@${item.version}`)).kind !== "exact") {
      fail(`remote tag postverification failed for ${item.name}@${item.version}`)
    }
  }

  for (const item of states.filter((state) => state.release === "absent")) {
    let result
    try {
      result = await github("POST", "/releases", {
        tag_name: `${item.name}@${item.version}`,
        generate_release_notes: true,
        draft: false,
        prerelease: false,
      })
    } catch {
      // A lost response is accepted only if the Release reconciles exactly below.
    }
    if (result && ![201, 422].includes(result.status)) {
      fail(`GitHub Release creation failed for ${item.name}@${item.version} (HTTP ${result.status})`)
    }
  }
  for (const item of states) {
    if ((await releaseState(`${item.name}@${item.version}`)).kind !== "exact") {
      fail(`GitHub Release postverification failed for ${item.name}@${item.version}`)
    }
  }
}

function npmFailureCode(error) {
  const result = error?.commandResult
  for (const text of [result?.stderr, result?.stdout]) {
    if (typeof text !== "string") continue
    try {
      const value = JSON.parse(text)
      const candidate = value?.error?.code ?? value?.code
      if (typeof candidate === "string" && /^[A-Z][A-Z0-9_-]{1,31}$/.test(candidate)) return candidate
    } catch {
      // Only a bounded, allowlisted code is extracted from non-JSON output.
    }
    const match = text.match(/\b(E(?:401|403|404|409|422|429|5[0-9]{2}|OTP|AUTH|ACCESS))\b/i)
    if (match) return match[1].toUpperCase()
  }
  return "UNKNOWN"
}
function npmFailureDiagnostic(error, record) {
  const code = npmFailureCode(error)
  const descriptions = {
    E401: "trusted publishing authentication failed",
    E403: "trusted publishing authorization was denied",
    E404: "npm package or registry endpoint was not found",
    E409: "npm reported a publication conflict",
    E422: "npm rejected the publication payload",
    E429: "npm rate-limited the publication",
    E500: "npm registry service failed",
    E501: "npm registry service failed",
    E502: "npm registry service failed",
    E503: "npm registry service failed",
    E504: "npm registry service failed",
    EOTP: "interactive npm authentication is forbidden",
    EAUTH: "trusted publishing authentication failed",
    EACCESS: "trusted publishing authorization was denied",
  }
  const description = descriptions[code] ?? "npm publication failed without a recognized safe error code"
  const exitCode = Number.isInteger(error?.commandResult?.code) ? `; exit ${error.commandResult.code}` : ""
  return `npm publish failed for ${record.name}@${record.version}: ${description} (${code}${exitCode}). Registry state remained absent after ${MAX_NPM_READS} bounded reconciliation reads. Verify npm trusted publishing configuration and GitHub OIDC permissions.`
}
async function reconcileAfterFailedPublish(record, handoffPackage) {
  let state
  for (let attempt = 1; attempt <= MAX_NPM_READS; attempt++) {
    state = await npmState(record, handoffPackage)
    if (state.kind === "exact") return true
    if (attempt < MAX_NPM_READS) await sleep(delayMs)
  }
  if (state.kind === "divergent") {
    fail(`permanent npm state divergence (${state.reason ?? "unknown"}) for ${record.name}@${record.version}`)
  }
  if (state.kind === "unknown") {
    fail(`npm state unreadable after ${MAX_NPM_READS} attempts for ${record.name}`)
  }
  return false
}
async function publishMissingPackages(states, records, packageByProject, handoffDirectory) {
  const byProject = new Map(records.map((record) => [record.project, record]))
  for (const item of states) {
    if (item.npm === "absent-abandoned") continue
    const record = byProject.get(item.project)
    const handoffPackage = packageByProject.get(item.project)
    const current = await npmBounded(record, handoffPackage, { acceptAbsent: true })
    if (current.kind === "exact") continue

    const tarballPath = join(handoffDirectory, handoffPackage.tarball.basename)
    let publishFailure
    try {
      await run("npm", [
        "publish",
        tarballPath,
        "--registry",
        NPM_REGISTRY,
        "--access",
        "public",
        "--tag",
        "latest",
        "--provenance",
        "--ignore-scripts",
        "--json",
      ])
    } catch (error) {
      publishFailure = error
    }
    if (publishFailure) {
      if (await reconcileAfterFailedPublish(record, handoffPackage)) continue
      fail(npmFailureDiagnostic(publishFailure, record))
    }
    await npmBounded(record, handoffPackage)
  }
}

async function main() {
  if (cliArguments.some((argument) => !["--preflight", "--json"].includes(argument))) fail("unknown argument")
  if (new Set(cliArguments).size !== cliArguments.length) fail("duplicate argument")
  if (jsonOutput && !preflight) fail("--json requires --preflight")
  validateRuntimeBounds()
  if (!fullSha(expectedSha)) fail("FINALIZE requires full lowercase expected SHA")
  if (!fullSha(artifactSha)) fail("FINALIZE requires full lowercase artifact SHA")
  const projects = parseRequestedProjects()
  if (!preflight && process.env.GITHUB_ACTIONS !== "true") {
    fail("FINALIZE publication is allowed only in GitHub Actions")
  }

  const handoffContext = await verifyCurrentRunHandoff(projects)
  if (historicalReplay) await verifyHistoricalRecoveryBounds()
  await verifyArtifactLineage()
  await verifyArtifactChangelog()
  const records = await deriveReviewedRecords(projects)
  const { abandonedProjects, packageByProject } = bindHandoffToRecords(handoffContext.handoff, records)
  const states = await inspect(records, packageByProject, abandonedProjects)

  if (historicalReplay) {
    for (const state of states) {
      if (state.tag !== "exact")
        fail(`historical recovery requires exact existing tag for ${state.name}@${state.version}`)
      if (state.release !== "exact") {
        fail(`historical recovery requires exact existing GitHub Release for ${state.name}@${state.version}`)
      }
      if (state.npm === "absent-abandoned") continue
      if (!["exact", "absent"].includes(state.npm)) {
        fail(`historical recovery npm state is invalid for ${state.name}@${state.version}`)
      }
    }
  }

  const report = {
    ok: true,
    mode: historicalReplay ? "historical-npm-only" : "current-exact",
    historicalNpmOnly: historicalReplay,
    expectedSha,
    artifactSha,
    artifactId: handoffContext.artifactId,
    artifactDigest: handoffContext.artifactDigest,
    projects,
    abandonments: handoffContext.handoff.abandonments,
    states,
  }
  if (preflight) {
    process.stdout.write(`${JSON.stringify(report)}\n`)
    return
  }

  if (states.some((state) => state.npm === "absent")) await verifyTrustedPublishingBoundary()

  if (!historicalReplay) {
    await verifyPublicationSource(records)
    await createCurrentArtifacts(states)
  }
  await publishMissingPackages(states, records, packageByProject, handoffContext.directory)

  for (const record of records) {
    if (abandonedProjects.has(record.project)) {
      await npmAbandonmentState(record)
    } else {
      await npmBounded(record, packageByProject.get(record.project))
    }
  }
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
if (isMainModule()) {
  main().catch((error) => {
    process.stderr.write(`::error::${error.message}\n`)
    process.exitCode = 1
  })
}
