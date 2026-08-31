#!/usr/bin/env node
import { spawn } from "node:child_process"
import { realpathSync } from "node:fs"
import { readFile } from "node:fs/promises"
import { fileURLToPath, pathToFileURL } from "node:url"
import { isDeepStrictEqual } from "node:util"

const expectedSha = process.env.EXPECTED_SHA ?? ""
const artifactSha = process.env.ARTIFACT_SHA || expectedSha
const requestedProjectsText = process.env.PROJECTS ?? ""
const historicalReplay = artifactSha !== expectedSha
const maxReads = 6
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
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
function run(file, args, { ok = [0], env } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(file, args, { shell: false, stdio: ["ignore", "pipe", "pipe"], env })
    let stdout = Buffer.alloc(0),
      stderr = Buffer.alloc(0),
      excessive = false
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
      else if (!ok.includes(code)) reject(new Error(`${file} failed (${code})`))
      else resolve(result)
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
function object(value) {
  return value && typeof value === "object" && !Array.isArray(value)
}
function safeRoot(value) {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 512 &&
    !value.startsWith("/") &&
    !value.includes("\\") &&
    !value.includes("\u0000") &&
    !value.includes("//") &&
    value.split("/").every((part) => part && part !== "." && part !== "..")
  )
}
function safeName(value) {
  return typeof value === "string" && value.length > 0 && value.length <= 214 && !/[\s,\u0000]/.test(value)
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
  )
    return null
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
    const leftIdentifier = left.prerelease[index],
      rightIdentifier = right.prerelease[index]
    if (leftIdentifier === undefined || rightIdentifier === undefined) return leftIdentifier === undefined ? -1 : 1
    if (leftIdentifier === rightIdentifier) continue
    const leftNumeric = /^[0-9]+$/.test(leftIdentifier),
      rightNumeric = /^[0-9]+$/.test(rightIdentifier)
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
  const duplicates = raw.filter((value, index) => raw.indexOf(value) !== index)
  if (duplicates.length > 0) fail(`duplicate requested project: ${duplicates[0]}`)
  return raw.sort()
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
    parts.some((part) => !/^[0-9a-f]{40}$/.test(part)) ||
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
  if (treeIds.length !== 2 || treeIds.some((tree) => !/^[0-9a-f]{40}$/.test(tree)) || treeIds[0] !== treeIds[1]) {
    fail("reviewed merge tree must exactly match its generated second parent")
  }
}
async function verifyHistoricalAncestry() {
  let result
  try {
    result = await run("git", ["merge-base", "--is-ancestor", artifactSha, expectedSha], { ok: [0, 1] })
  } catch {
    fail("historical artifact ancestry is unreadable")
  }
  if (result.code !== 0) fail("historical artifact SHA must be an ancestor of expected SHA")
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
async function artifactJson(path, revision = artifactSha) {
  let result
  try {
    result = await run("git", ["show", `${revision}:${path}`])
  } catch {
    fail(`artifact repository read failed for ${revision}:${path}`)
  }
  return parseJson(result.stdout, `artifact ${revision}:${path}`)
}
async function deriveReviewedRecords(projects) {
  const nx = await artifactJson("nx.json")
  const roots = nx?.release?.projects
  if (!Array.isArray(roots) || roots.length === 0 || roots.some((root) => !safeRoot(root))) {
    fail("artifact nx.json release projects are invalid")
  }
  if (new Set(roots).size !== roots.length) fail("artifact nx.json release projects contain duplicates")

  const catalog = []
  const projectNames = new Set(),
    packageNames = new Set(),
    manifestPaths = new Set()
  for (const root of roots) {
    const projectJson = await artifactJson(`${root}/project.json`)
    const manifestPath = `${root}/package.json`
    const manifest = await artifactJson(manifestPath)
    const project = projectJson?.name,
      name = manifest?.name,
      version = manifest?.version
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
    catalog.push({ project, root, manifestPath, name, version, reviewedManifest: manifest })
  }
  for (const project of projects)
    if (!projectNames.has(project)) fail(`requested project is not in artifact release projects: ${project}`)

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
async function npmState(name, version, betaVersion) {
  try {
    const versionsDoc = (await run("npm", ["view", name, "versions", "--json"])).stdout
    const tagsDoc = (await run("npm", ["view", name, "dist-tags", "--json"])).stdout
    const versionsValue = parseJson(versionsDoc, `${name} versions`),
      tags = parseJson(tagsDoc, `${name} dist-tags`)
    const versions = typeof versionsValue === "string" ? [versionsValue] : versionsValue
    if (!Array.isArray(versions) || versions.some((value) => typeof value !== "string") || !object(tags))
      return { kind: "unknown" }
    if (new Set(versions).size !== versions.length || versions.some((value) => !parseSemver(value)))
      return { kind: "unknown" }
    const target = parseSemver(version),
      beta = parseSemver(betaVersion)
    if (!target || !beta) return { kind: "unknown" }
    const versionSet = new Set(versions),
      targetPresent = versionSet.has(version)
    const hasLatest = Object.hasOwn(tags, "latest")
    let latest
    if (hasLatest) {
      if (typeof tags.latest !== "string" || !(latest = parseSemver(tags.latest))) return { kind: "unknown" }
      if (!versionSet.has(tags.latest)) return { kind: "divergent" }
    }
    if (targetPresent) return hasLatest && tags.latest === version ? { kind: "exact" } : { kind: "divergent" }
    if (tags.beta !== betaVersion || !versionSet.has(betaVersion)) return { kind: "divergent" }
    if (hasLatest && compareSemver(latest, target) >= 0) return { kind: "divergent" }
    return { kind: "absent" }
  } catch {
    return { kind: "unknown" }
  }
}
async function npmBounded(name, version, betaVersion, { acceptAbsent = false } = {}) {
  let state
  for (let attempt = 1; attempt <= maxReads; attempt++) {
    state = await npmState(name, version, betaVersion)
    if (state.kind === "exact" || (acceptAbsent && state.kind === "absent")) return state
    if (attempt < maxReads) await sleep(delayMs)
  }
  if (state.kind === "absent") fail(`npm version remained absent after ${maxReads} attempts for ${name}`)
  fail(
    state.kind === "divergent"
      ? `permanent npm state divergence for ${name}`
      : `npm state unreadable after ${maxReads} attempts for ${name}`,
  )
}
function parseTag(text, tag) {
  const direct = [],
    peeled = [],
    directRef = `refs/tags/${tag}`,
    peeledRef = `${directRef}^{}`
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
async function github(method, path, body) {
  const controller = new AbortController(),
    timer = setTimeout(() => controller.abort(), httpTimeoutMs)
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
async function inspect(records) {
  await run("git", ["fetch", "origin", "master:refs/remotes/origin/master", "--no-tags"])
  const head = (await run("git", ["rev-parse", "HEAD"])).stdout.trim()
  const origin = (await run("git", ["rev-parse", "origin/master"])).stdout.trim()
  if (head !== expectedSha) fail("HEAD does not match expected SHA")
  if (origin !== expectedSha) fail("origin/master does not match expected SHA")
  const states = []
  for (const record of records) {
    const npm = await npmBounded(record.name, record.version, record.betaVersion, { acceptAbsent: true })
    const tag = await tagState(`${record.name}@${record.version}`)
    const release = await releaseState(`${record.name}@${record.version}`)
    for (const [label, state] of [
      ["tag", tag],
      ["GitHub Release", release],
    ]) {
      if (!["exact", "absent"].includes(state.kind))
        fail(
          `${label} state is ${state.kind} for ${record.name}@${record.version}${state.status ? ` (HTTP ${state.status})` : ""}`,
        )
    }
    const state = { ...record, npm: npm.kind, tag: tag.kind, release: release.kind }
    delete state.reviewedManifest
    states.push(state)
  }
  return states
}
async function main() {
  if (cliArguments.some((argument) => !["--preflight", "--json"].includes(argument))) fail("unknown argument")
  if (jsonOutput && !preflight) fail("--json requires --preflight")
  if (!/^[0-9a-f]{40}$/.test(expectedSha)) fail("FINALIZE requires full lowercase expected SHA")
  if (!/^[0-9a-f]{40}$/.test(artifactSha)) fail("FINALIZE requires full lowercase artifact SHA")
  const projects = parseRequestedProjects()
  if (!preflight && process.env.GITHUB_ACTIONS !== "true")
    fail("FINALIZE publication is allowed only in GitHub Actions")
  if (historicalReplay) await verifyHistoricalAncestry()
  await verifyArtifactLineage()
  await verifyArtifactChangelog()
  const records = await deriveReviewedRecords(projects)
  const states = await inspect(records)
  if (historicalReplay) {
    const incomplete = states.find((item) => item.tag !== "exact" || item.release !== "exact" || item.npm !== "exact")
    if (incomplete)
      fail(
        `historical replay requires exact existing tag, GitHub Release, and npm latest for ${incomplete.name}@${incomplete.version}`,
      )
  }
  if (preflight) process.stdout.write(`${JSON.stringify({ ok: true, expectedSha, artifactSha, projects, states })}\n`)
  if (historicalReplay || preflight) return

  await verifyPublicationSource(records)
  const missingTags = states.filter((item) => item.tag === "absent")
  const localTags = []
  for (const item of missingTags) {
    const tag = `${item.name}@${item.version}`,
      local = await localTagState(tag)
    if (!["exact", "absent"].includes(local.kind)) fail(`local tag state is ${local.kind} for ${tag}`)
    localTags.push({ tag, local: local.kind })
  }
  if (localTags.some((item) => item.local === "absent")) {
    await run("git", ["config", "user.name", "github-actions[bot]"])
    await run("git", ["config", "user.email", "github-actions[bot]@users.noreply.github.com"])
  }
  for (const { tag, local } of localTags)
    if (local === "absent") await run("git", ["tag", "-a", tag, artifactSha, "-m", tag])
  if (missingTags.length > 0) {
    const refs = missingTags.map(
      (item) => `refs/tags/${item.name}@${item.version}:refs/tags/${item.name}@${item.version}`,
    )
    try {
      await run("git", ["push", "--atomic", "origin", ...refs])
    } catch {
      /* response loss is reconciled below */
    }
  }
  for (const item of states)
    if ((await tagState(`${item.name}@${item.version}`)).kind !== "exact")
      fail(`remote tag postverification failed for ${item.name}@${item.version}`)

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
      /* response loss is reconciled below */
    }
    if (result && ![201, 422].includes(result.status))
      fail(`GitHub Release creation failed for ${item.name}@${item.version} (HTTP ${result.status})`)
  }
  for (const item of states)
    if ((await releaseState(`${item.name}@${item.version}`)).kind !== "exact")
      fail(`GitHub Release postverification failed for ${item.name}@${item.version}`)

  const missing = []
  for (const item of states.filter((state) => state.npm === "absent")) {
    const current = await npmBounded(item.name, item.version, item.betaVersion, { acceptAbsent: true })
    if (current.kind === "absent") missing.push(item.project)
  }
  if (missing.length > 0) {
    await verifyPublicationSource(records)
    await run("pnpm", ["nx", "release", "publish", `--projects=${missing.join(",")}`], {
      env: { ...process.env, NPM_CONFIG_IGNORE_SCRIPTS: "true" },
    })
  }
  for (const item of states) {
    const state = await npmBounded(item.name, item.version, item.betaVersion)
    if (state.kind !== "exact") fail(`npm did not converge for ${item.name}`)
  }
}
function isMainModule() {
  const entry = process.argv[1]
  if (!entry) return false
  let resolvedEntry, resolvedModule
  try {
    resolvedEntry = realpathSync(entry)
    resolvedModule = realpathSync(fileURLToPath(import.meta.url))
  } catch {
    return false
  }
  return pathToFileURL(resolvedEntry).href === pathToFileURL(resolvedModule).href
}
if (isMainModule())
  main().catch((error) => {
    process.stderr.write(`::error::${error.message}\n`)
    process.exitCode = 1
  })
