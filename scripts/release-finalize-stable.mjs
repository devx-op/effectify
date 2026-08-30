#!/usr/bin/env node
import { readFile } from "node:fs/promises"
import { spawn } from "node:child_process"

const records = [
  ["@effectify/hatchet", "packages/hatchet/package.json", "0.1.0"],
  ["@effectify/node-better-auth", "packages/node/better-auth/package.json", "0.5.12"],
  ["@effectify/prisma", "packages/prisma/package.json", "1.1.13"],
  ["@effectify/react-query", "packages/react/query/package.json", "1.0.0"],
  ["@effectify/react-router", "packages/react/router/package.json", "0.6.0"],
  ["@effectify/react-router-better-auth", "packages/react/router-better-auth/package.json", "0.5.12"],
  ["@effectify/solid-query", "packages/solid/query/package.json", "0.5.13"],
]
const expectedSha = process.env.EXPECTED_SHA ?? ""
const artifactSha = process.env.ARTIFACT_SHA || expectedSha
const historicalReplay = artifactSha !== expectedSha
const maxReads = 6
const delayMs = Number(process.env.NPM_READ_DELAY_MS ?? (Number(process.env.NPM_READ_DELAY ?? 10) * 1000))
const commandTimeoutMs = Number(process.env.FINALIZE_COMMAND_TIMEOUT_MS ?? 60_000)
const httpTimeoutMs = Number(process.env.FINALIZE_HTTP_TIMEOUT_MS ?? 30_000)
const outputLimit = Number(process.env.FINALIZE_OUTPUT_LIMIT ?? 1024 * 1024)
const cliArguments = process.argv.slice(2)
const preflight = cliArguments.includes("--preflight")
const jsonOutput = cliArguments.includes("--json")

function fail(message) { throw new Error(message) }
function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)) }
function run(file, args, { ok = [0] } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(file, args, { shell: false, stdio: ["ignore", "pipe", "pipe"] })
    let stdout = Buffer.alloc(0), stderr = Buffer.alloc(0), excessive = false
    const append = (current, chunk) => {
      if (current.length + chunk.length > outputLimit) { excessive = true; child.kill("SIGKILL"); return current }
      return Buffer.concat([current, chunk])
    }
    child.stdout.on("data", (x) => { stdout = append(stdout, x) })
    child.stderr.on("data", (x) => { stderr = append(stderr, x) })
    const timer = setTimeout(() => child.kill("SIGKILL"), commandTimeoutMs)
    child.on("error", (error) => { clearTimeout(timer); reject(new Error(`${file} execution failed: ${error.message}`)) })
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
function parseJson(text, label) { try { return JSON.parse(text) } catch { fail(`${label} returned malformed JSON`) } }
async function manifest(name, path, version) {
  let value
  try { value = parseJson(await readFile(path, "utf8"), `manifest ${name}`) } catch (error) { fail(`merged manifest execution or parse failed for ${name}: ${error.message}`) }
  const valid = value && typeof value === "object" && !Array.isArray(value) && typeof value.name === "string" && typeof value.version === "string"
  if (!valid || value.name !== name || value.version !== version) fail(`merged manifest identity mismatch for ${name}: actual=${JSON.stringify({ name: valid ? value.name : null, version: valid ? value.version : null })} expected=${JSON.stringify({ name, version })}`)
}
async function npmState(name, version) {
  try {
    const versionsDoc = (await run("npm", ["view", name, "versions", "--json"])).stdout
    const latestDoc = (await run("npm", ["view", name, "dist-tags.latest", "--json"])).stdout
    const versions = parseJson(versionsDoc, `${name} versions`), latest = parseJson(latestDoc, `${name} latest`)
    if (!((typeof versions === "string") || (Array.isArray(versions) && versions.every((x) => typeof x === "string"))) || typeof latest !== "string") return { kind: "unknown" }
    const present = Array.isArray(versions) ? versions.includes(version) : versions === version
    return !present ? { kind: "absent" } : latest === version ? { kind: "exact" } : { kind: "divergent" }
  } catch { return { kind: "unknown" } }
}
async function npmBounded(name, version, { acceptAbsent = false } = {}) {
  let state
  for (let attempt = 1; attempt <= maxReads; attempt++) {
    state = await npmState(name, version)
    if (state.kind === "exact" || (acceptAbsent && state.kind === "absent")) return state
    if (attempt < maxReads) await sleep(delayMs)
  }
  if (state.kind === "absent") fail(`npm version remained absent after ${maxReads} attempts for ${name}`)
  fail(state.kind === "divergent" ? `permanent latest divergence for ${name}` : `npm state unreadable after ${maxReads} attempts for ${name}`)
}
function parseTag(text, tag) {
  const direct = [], peeled = [], directRef = `refs/tags/${tag}`, peeledRef = `${directRef}^{}`
  if (text === "") return { kind: "absent" }
  for (const line of text.split("\n")) {
    if (!line) continue
    const match = line.match(/^([0-9a-f]{40})\t([^\s]+)$/)
    if (!match) return { kind: "unknown" }
    if (match[2] === directRef) direct.push(match[1]); else if (match[2] === peeledRef) peeled.push(match[1]); else return { kind: "unknown" }
  }
  return direct.length === 1 && peeled.length === 1 && peeled[0] === artifactSha ? { kind: "exact" } : { kind: "divergent" }
}
async function tagState(tag) {
  let result
  try { result = await run("git", ["ls-remote", "--tags", "origin", `refs/tags/${tag}`, `refs/tags/${tag}^{}`]) } catch { return { kind: "unknown" } }
  return parseTag(result.stdout, tag)
}
async function localTagState(tag) {
  let result
  try { result = await run("git", ["for-each-ref", "--format=%(objecttype)%09%(*objectname)", `refs/tags/${tag}`]) } catch { return { kind: "unknown" } }
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
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), httpTimeoutMs)
  try {
    const options = {
      method, signal: controller.signal,
      headers: { accept: "application/vnd.github+json", authorization: `Bearer ${process.env.GITHUB_TOKEN ?? ""}`, "content-type": "application/json", "user-agent": "effectify-release-finalizer", "x-github-api-version": "2022-11-28" },
    }
    if (body !== undefined) options.body = JSON.stringify(body)
    const response = await fetch(`${process.env.GITHUB_API_URL ?? "https://api.github.com"}/repos/${repository()}${path}`, options)
    const text = await response.text()
    return { status: response.status, text }
  } catch (error) { fail(`GitHub transport failure: ${error.message}`) } finally { clearTimeout(timer) }
}
async function releaseState(tag) {
  const result = await github("GET", `/releases/tags/${encodeURIComponent(tag)}`)
  if (result.status === 404) return { kind: "absent" }
  if (result.status !== 200) return { kind: "unknown", status: result.status }
  const value = parseJson(result.text, `GitHub Release ${tag}`)
  return value && typeof value === "object" && !Array.isArray(value) && value.tag_name === tag && value.draft === false && value.prerelease === false ? { kind: "exact" } : { kind: "divergent" }
}
async function inspect() {
  await run("git", ["fetch", "origin", "master:refs/remotes/origin/master", "--no-tags"])
  const head = (await run("git", ["rev-parse", "HEAD"])).stdout.trim(), origin = (await run("git", ["rev-parse", "origin/master"])).stdout.trim()
  if (head !== expectedSha) fail("HEAD does not match expected SHA")
  if (origin !== expectedSha) fail("origin/master does not match expected SHA")
  const states = []
  for (const [name, path, version] of records) {
    await manifest(name, path, version)
    const npm = await npmBounded(name, version, { acceptAbsent: true }), tag = await tagState(`${name}@${version}`), release = await releaseState(`${name}@${version}`)
    for (const [label, state] of [["tag", tag], ["GitHub Release", release]]) if (!['exact','absent'].includes(state.kind)) fail(`${label} state is ${state.kind} for ${name}@${version}${state.status ? ` (HTTP ${state.status})` : ""}`)
    states.push({ name, version, npm: npm.kind, tag: tag.kind, release: release.kind })
  }
  return states
}
async function main() {
  if (cliArguments.some((x) => !["--preflight", "--json"].includes(x))) fail("unknown argument")
  if (jsonOutput && !preflight) fail("--json requires --preflight")
  if (!/^[0-9a-f]{40}$/.test(expectedSha)) fail("FINALIZE requires full lowercase expected SHA")
  if (!/^[0-9a-f]{40}$/.test(artifactSha)) fail("FINALIZE requires full lowercase artifact SHA")
  const states = await inspect()
  if (historicalReplay) {
    const incomplete = states.find((item) => item.tag !== "exact" || item.release !== "exact" || item.npm !== "exact")
    if (incomplete) fail(`historical replay requires exact existing tag, GitHub Release, and npm latest for ${incomplete.name}@${incomplete.version}`)
  }
  if (preflight) { process.stdout.write(`${JSON.stringify({ ok: true, expectedSha, artifactSha, states })}\n`); return }
  const missingTags = states.filter((x) => x.tag === "absent")
  const localTags = []
  for (const item of missingTags) {
    const tag = `${item.name}@${item.version}`, local = await localTagState(tag)
    if (!['exact','absent'].includes(local.kind)) fail(`local tag state is ${local.kind} for ${tag}`)
    localTags.push({ item, tag, local: local.kind })
  }
  if (localTags.some((x) => x.local === "absent")) {
    await run("git", ["config", "user.name", "github-actions[bot]"])
    await run("git", ["config", "user.email", "github-actions[bot]@users.noreply.github.com"])
  }
  for (const { tag, local } of localTags) if (local === "absent") await run("git", ["tag", "-a", tag, artifactSha, "-m", tag])
  if (missingTags.length) {
    const refs = missingTags.map((x) => `refs/tags/${x.name}@${x.version}:refs/tags/${x.name}@${x.version}`)
    try { await run("git", ["push", "--atomic", "origin", ...refs]) } catch { /* response loss is reconciled below */ }
  }
  for (const item of states) if ((await tagState(`${item.name}@${item.version}`)).kind !== "exact") fail(`remote tag postverification failed for ${item.name}@${item.version}`)
  for (const item of states.filter((x) => x.release === "absent")) {
    const result = await github("POST", "/releases", { tag_name: `${item.name}@${item.version}`, generate_release_notes: true, draft: false, prerelease: false })
    if (![201, 422].includes(result.status)) fail(`GitHub Release creation failed for ${item.name}@${item.version} (HTTP ${result.status})`)
  }
  for (const item of states) if ((await releaseState(`${item.name}@${item.version}`)).kind !== "exact") fail(`GitHub Release postverification failed for ${item.name}@${item.version}`)
  const missing = states.filter((x) => x.npm === "absent").map((x) => x.name)
  if (missing.length) await run("pnpm", ["nx", "release", "publish", `--projects=${missing.join(",")}`])
  for (const item of states) { const state = await npmBounded(item.name, item.version); if (state.kind !== "exact") fail(`npm did not converge for ${item.name}`) }
}
const isMain = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href
if (isMain) main().catch((error) => { process.stderr.write(`::error::${error.message}\n`); process.exitCode = 1 })

export { parseJson, parseTag }
