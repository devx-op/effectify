import assert from "node:assert/strict"
import { spawn } from "node:child_process"
import { createHash } from "node:crypto"
import { chmodSync, existsSync, mkdtempSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from "node:fs"
import { rm } from "node:fs/promises"
import { createServer } from "node:http"
import { tmpdir } from "node:os"
import { basename, join } from "node:path"
import test from "node:test"
import { isDeepStrictEqual } from "node:util"
import { gzipSync } from "node:zlib"

const script = new URL("release-finalize-stable.mjs", import.meta.url).pathname
const artifactSha = "f31390ce66ea157ea8b75f5259c203123e269759"
const advancedSha = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
const parentSha = "fedcba0987654321fedcba0987654321fedcba09"
const secondParentSha = "0123456789abcdef0123456789abcdef01234567"
const treeSha = "9999999999999999999999999999999999999999"
const repository = "devx-op/effectify"
const workflowPath = ".github/workflows/release-stable.yml"
const workflowRef = "refs/heads/master"
const runId = "33399900011"
const runAttempt = "2"
const artifactId = "987654321"
const artifactDigest = `sha256:${"9".repeat(64)}`
const npmRegistry = "https://registry.npmjs.org/"
const catalog = [
  ["@effectify/hatchet", "packages/hatchet", "0.2.0-beta.0", "0.2.0"],
  ["@effectify/node-better-auth", "packages/node/better-auth", "0.5.13-beta.0", "0.5.13"],
  ["@effectify/prisma", "packages/prisma", "1.1.14-beta.0", "1.1.14"],
  ["@effectify/react-query", "packages/react/query", "1.0.1-beta.0", "1.0.1"],
  ["@effectify/react-router-better-auth", "packages/react/router-better-auth", "0.5.13-beta.0", "0.5.13"],
  ["@effectify/react-router", "packages/react/router", "0.6.1-beta.0", "0.6.1"],
  ["@effectify/solid-query", "packages/solid/query", "0.5.14-beta.0", "0.5.14"],
]
const records = catalog.map(([project, root, betaVersion, version]) => ({
  project,
  root,
  manifestPath: `${root}/package.json`,
  betaVersion,
  version,
}))
const projects = records.map(({ project }) => project).sort()
const projectsText = projects.join(",")
const prisma = records.find(({ project }) => project === "@effectify/prisma")
const publishable = records
  .filter(({ project }) => project !== prisma.project)
  .sort((left, right) => left.project.localeCompare(right.project))
const allowedHistoricalPaths = [
  ".github/SETUP.md",
  ".github/workflows/release-stable.yml",
  "scripts/release-finalize-stable.mjs",
  "scripts/release-finalize-stable.test.mjs",
  "scripts/release-package-stable.mjs",
  "scripts/release-package-stable.test.mjs",
  "scripts/release-policy-contract.test.mjs",
  "scripts/release-stable-abandonments.json",
]
const safeNpmrc = `# NPM Configuration for CI/CD
#registry=https://registry.npmjs.org/
#always-auth=true

# JSR Configuration (for Deno packages)
#@jsr:registry=https://npm.jsr.io/

hoist=false
`
const realAttestationUrls = new Map([
  ["@effectify/hatchet", "https://registry.npmjs.org/-/npm/v1/attestations/@effectify%2fhatchet@0.2.0"],
  [
    "@effectify/node-better-auth",
    "https://registry.npmjs.org/-/npm/v1/attestations/@effectify%2fnode-better-auth@0.5.13",
  ],
  ["@effectify/react-query", "https://registry.npmjs.org/-/npm/v1/attestations/@effectify%2freact-query@1.0.1"],
  [
    "@effectify/react-router-better-auth",
    "https://registry.npmjs.org/-/npm/v1/attestations/@effectify%2freact-router-better-auth@0.5.13",
  ],
  ["@effectify/react-router", "https://registry.npmjs.org/-/npm/v1/attestations/@effectify%2freact-router@0.6.1"],
  ["@effectify/solid-query", "https://registry.npmjs.org/-/npm/v1/attestations/@effectify%2fsolid-query@0.5.14"],
])

function digest(algorithm, bytes) {
  return createHash(algorithm).update(bytes).digest("hex")
}
function tarHeader(path, size) {
  const header = Buffer.alloc(512)
  const put = (value, offset, length) => header.write(value, offset, Math.min(length, Buffer.byteLength(value)), "utf8")
  put(path, 0, 100)
  put("0000644\0", 100, 8)
  put("0000000\0", 108, 8)
  put("0000000\0", 116, 8)
  put(`${size.toString(8).padStart(11, "0")}\0`, 124, 12)
  put("00000000000\0", 136, 12)
  header.fill(0x20, 148, 156)
  header[156] = "0".charCodeAt(0)
  put("ustar\0", 257, 6)
  put("00", 263, 2)
  const checksum = [...header].reduce((total, byte) => total + byte, 0)
  put(`${checksum.toString(8).padStart(6, "0")}\0 `, 148, 8)
  return header
}
function tarballBytes(entries) {
  const blocks = []
  for (const [path, value] of [...entries].sort(([left], [right]) => left.localeCompare(right))) {
    const body = Buffer.isBuffer(value) ? value : Buffer.from(value)
    blocks.push(tarHeader(path, body.length), body)
    const padding = (512 - (body.length % 512)) % 512
    if (padding) blocks.push(Buffer.alloc(padding))
  }
  blocks.push(Buffer.alloc(1024))
  return gzipSync(Buffer.concat(blocks), { mtime: 0 })
}
function expectedDist(record, handoffPackage) {
  return {
    integrity: handoffPackage.tarball.integrity,
    shasum: handoffPackage.tarball.sha1,
    attestations: {
      url: realAttestationUrls.get(record.project),
      provenance: { predicateType: "https://slsa.dev/provenance/v1" },
    },
  }
}
function addArtifactFiles(gitFiles) {
  gitFiles[`${artifactSha}:CHANGELOG.md`] = "# Changelog\n"
  gitFiles[`${artifactSha}:nx.json`] = { release: { projects: catalog.map(([, root]) => root) } }
  for (const record of records) {
    gitFiles[`${artifactSha}:${record.root}/project.json`] = { name: record.project }
    gitFiles[`${artifactSha}:${record.manifestPath}`] = { name: record.project, version: record.version }
    gitFiles[`${artifactSha}^1:${record.manifestPath}`] = { name: record.project, version: record.betaVersion }
  }
}
function makeHandoff(directory, expectedSha) {
  mkdirSync(directory)
  const packages = []
  for (const record of publishable) {
    const packedManifest = {
      name: record.project,
      version: record.version,
      type: "module",
      main: "./dist/index.js",
      exports: { ".": "./dist/index.js" },
      files: ["dist"],
    }
    const manifestBody = `${JSON.stringify(packedManifest, null, 2)}\n`
    const distBody = "export const stable = true\n"
    const bytes = tarballBytes([
      ["package/package.json", manifestBody],
      ["package/dist/index.js", distBody],
    ])
    const tarballBasename = `${record.project.slice(1).replace("/", "-")}-${record.version}.tgz`
    writeFileSync(join(directory, tarballBasename), bytes)
    const sha512 = digest("sha512", bytes)
    packages.push({
      project: record.project,
      root: record.root,
      name: record.project,
      version: record.version,
      sourceManifestSha256: digest("sha256", JSON.stringify({ name: record.project, version: record.version })),
      tarball: {
        basename: tarballBasename,
        size: bytes.length,
        sha1: digest("sha1", bytes),
        sha256: digest("sha256", bytes),
        sha512,
        integrity: `sha512-${Buffer.from(sha512, "hex").toString("base64")}`,
      },
      inventory: [
        { path: "package/dist/index.js", size: Buffer.byteLength(distBody), mode: 0o644, type: "file" },
        { path: "package/package.json", size: Buffer.byteLength(manifestBody), mode: 0o644, type: "file" },
      ],
    })
  }
  packages.sort((left, right) => left.project.localeCompare(right.project))
  const handoff = {
    schemaVersion: 1,
    repository,
    workflow: { path: workflowPath, ref: workflowRef, sha: expectedSha },
    run: { id: runId, attempt: runAttempt },
    expectedSha,
    artifactSha,
    selection: projects,
    abandonments: [
      {
        artifactSha,
        project: prisma.project,
        name: prisma.project,
        version: prisma.version,
        reason: "Reviewed exception: 1.1.14 has broken CLI/export paths; publish a reviewed 1.1.15 instead.",
      },
    ],
    packages,
  }
  writeFileSync(join(directory, "handoff.json"), `${JSON.stringify(handoff, null, 2)}\n`)
  return handoff
}

const fake = String.raw`#!/usr/bin/env node
const fs=require("node:fs"),p=require("node:path"),cmd=p.basename(process.argv[1]),raw=process.argv.slice(2),oneShot=cmd==="git"&&raw[0]==="-c",authConfiguration=oneShot?raw[1]:undefined,a=oneShot?raw.slice(2):raw,f=process.env.FAKE_STATE
let s=JSON.parse(fs.readFileSync(f)),out=x=>process.stdout.write(String(x)),save=()=>fs.writeFileSync(f,JSON.stringify(s))
s.log.push([cmd,...a])
function finish(code=0){save();process.exit(code)}
function take(value,key,fallback){const queue=value[key];if(queue&&queue.length){const next=queue.shift();if(queue.length===0)value[key.replace(/Queue$/,"")]=next;return next}return fallback}
function emit(value){if(value&&typeof value==="object"&&value.exit){if(value.stdout)process.stdout.write(value.stdout);if(value.stderr)process.stderr.write(value.stderr);finish(value.exit)}if(value&&typeof value==="object"&&Object.hasOwn(value,"raw"))out(value.raw);else out(JSON.stringify(value)+"\n");finish()}
function materialize(name){const value=s.npm[name],pkg=s.packages[name];if(!value.versions.includes(pkg.version))value.versions.push(pkg.version);value.latest=pkg.version;value.dist=pkg.dist}
if(cmd==="git"){
 if(a[0]==="fetch"||a[0]==="config")finish()
 if(a[0]==="cat-file"&&a[1]==="-t"){const value=s.gitFiles[a[2]];if(value===undefined)finish(128);out((s.gitTypes?.[a[2]]??"blob")+"\n");finish()}
 if(a[0]==="merge-base")finish(s.ancestorExit??(s.ancestor===false?1:0))
 if(a[0]==="rev-list"&&a[1]==="--count"){out(String(s.historicalCount)+"\n");finish()}
 if(a[0]==="rev-list"){out((s.commitLines?.[a.at(-1)]??s.commitLine??(s.artifactSha+" "+s.parentSha))+"\n");finish()}
 if(a[0]==="rev-parse"){
  if(a[1].endsWith("^{tree}")){out((s.generatedTreeSha??s.treeSha)+"\n"+(s.artifactTreeSha??s.treeSha)+"\n");finish()}
  out((a[1]==="HEAD"?s.head:s.origin)+"\n");finish()
 }
 if(a[0]==="status"){out(s.worktreeStatus??"");finish()}
 if(a[0]==="show"){const value=s.gitFiles[a[1]];if(value===undefined)finish(128);out(typeof value==="string"?value:JSON.stringify(value));finish()}
 if(a[0]==="diff"){
  const historical=a.at(-2)===s.artifactSha&&a.at(-1)===s.expectedSha
  const paths=historical?s.historicalPaths:s.changedPaths
  out(paths.join("\n")+(paths.length?"\n":""));finish()
 }
 if(a[0]==="ls-files"){out(s.trackedNpmrc??"");finish()}
 if(a[0]==="ls-remote"){
  const tag=a[3].slice(10),value=s.tags[tag]
  if(value){if(value.raw)out(value.raw.replaceAll("$TAG",tag));else{out((value.direct||"b".repeat(40))+"\trefs/tags/"+tag+"\n");if(value.peeled!==null)out((value.peeled||s.artifactSha)+"\trefs/tags/"+tag+"^{}\n")}}finish()
 }
 if(a[0]==="for-each-ref"){const tag=a[2].slice(10),value=s.localTags[tag];if(value)out((value.type||"tag")+"\t"+(value.peeled||s.artifactSha)+"\n");finish()}
 if(a[0]==="tag"){s.localTags[a[2]]={type:"tag",peeled:a[3]};finish()}
 if(a[0]==="push"){
  const token=process.env.GITHUB_TOKEN||"",basic=Buffer.from("x-access-token:"+token,"utf8").toString("base64")
  s.pushAuthentication={oneShot,matchesToken:authConfiguration==="http.https://github.com/.extraheader=AUTHORIZATION: basic "+basic,tokenLiteral:Boolean(token)&&raw.some(value=>value.includes(token))}
  const materializeTags=()=>{for(const ref of a.slice(3)){const tag=ref.split(":")[0].slice(10);s.tags[tag]={peeled:s.localTags[tag].peeled}}}
  if(s.pushMaterializesOnFailure){materializeTags();finish(s.pushExit||1)}
  if(s.pushExit)finish(s.pushExit)
  materializeTags();finish()
 }
 finish(127)
}
if(cmd==="npm"){
 if(a[0]==="config"&&a[1]==="get"&&a[2]==="userconfig")emit(s.userConfigPath)
 if(a[0]==="config"&&a[1]==="get"&&a[2]==="globalconfig")emit(s.globalConfigPath)
 if(a[0]==="config"&&a[1]==="get"&&a[2]==="registry")emit(s.registry)
 if(a[0]==="view"){
  const spec=a[1],field=a[2]
  if(field==="dist"){
   const at=spec.lastIndexOf("@"),name=spec.slice(0,at),value=s.npm[name]
   emit(take(value,"distQueue",value.dist))
  }
  const name=spec,value=s.npm[name]
  if(field==="versions")emit(take(value,"versionsQueue",value.versions))
  if(field==="dist-tags"){
   const fallback={alpha:value.alpha,beta:value.beta}
   if(value.latest!==undefined)fallback.latest=value.latest
   emit(take(value,"distTagsQueue",fallback))
  }
  finish(127)
 }
 if(a[0]==="publish"){
  const packageEntry=Object.values(s.packages).find(value=>p.basename(a[1])===value.basename)
  if(!packageEntry)finish(91)
  const failure=s.publishFailures?.[packageEntry.name]
  if(failure?.materialize)materialize(packageEntry.name)
  if(failure){if(failure.stdout)process.stdout.write(failure.stdout);if(failure.stderr)process.stderr.write(failure.stderr);finish(failure.exit??1)}
  materialize(packageEntry.name);out(JSON.stringify({id:packageEntry.name+"@"+packageEntry.version})+"\n");finish()
 }
 finish(127)
}
if(cmd==="pnpm")finish(88)
finish(127)`

function load(path) {
  return JSON.parse(readFileSync(path, "utf8"))
}
function save(path, value) {
  writeFileSync(path, JSON.stringify(value))
}
function mutationCalls(state) {
  return state.log.filter(
    ([command, operation]) =>
      command === "pnpm" ||
      (command === "npm" && operation === "publish") ||
      (command === "git" && ["tag", "push"].includes(operation)) ||
      (command === "http" && operation === "POST"),
  )
}
function publishCalls(state) {
  return state.log.filter(([command, operation]) => command === "npm" && operation === "publish")
}
function setNpmExact(state, record) {
  const value = state.npm[record.project]
  if (!value.versions.includes(record.version)) value.versions.push(record.version)
  value.latest = record.version
  if (record.project !== prisma.project) value.dist = state.packages[record.project].dist
}
function setArtifactsExact(state) {
  for (const record of records) {
    const tag = `${record.project}@${record.version}`
    state.tags[tag] = { peeled: artifactSha }
    state.releases[tag] = { tag_name: tag, draft: false, prerelease: false }
  }
}
function assertExact(state) {
  for (const record of records) {
    const tag = `${record.project}@${record.version}`
    assert.equal(state.tags[tag]?.peeled, artifactSha)
    assert.deepEqual(state.releases[tag], { tag_name: tag, draft: false, prerelease: false })
    if (record.project === prisma.project) {
      assert.equal(state.npm[record.project].versions.includes(record.version), false)
      continue
    }
    assert.equal(state.npm[record.project].versions.includes(record.version), true)
    assert.equal(state.npm[record.project].latest, record.version)
    assert.deepEqual(state.npm[record.project].dist, state.packages[record.project].dist)
  }
}
async function discardWorld(world) {
  try {
    if (world.server?.listening) await new Promise((resolve) => world.server.close(resolve))
  } finally {
    await rm(world.cwd, { recursive: true, force: true })
  }
  assert.equal(existsSync(world.cwd), false)
}
async function makeWorld({ historical = false, npmMode = "absent", artifacts = "exact" } = {}) {
  const cwd = mkdtempSync(join(tmpdir(), "stable-finalize-handoff-"))
  const bin = join(cwd, "bin")
  const handoffDirectory = join(cwd, "handoff")
  const stateFile = join(cwd, "state.json")
  const expectedSha = historical ? advancedSha : artifactSha
  let server
  try {
    mkdirSync(bin)
    writeFileSync(join(bin, "fake.cjs"), fake)
    chmodSync(join(bin, "fake.cjs"), 0o755)
    for (const command of ["git", "npm", "pnpm"]) symlinkSync("fake.cjs", join(bin, command))
    symlinkSync(process.execPath, join(bin, "node"))
    const handoff = makeHandoff(handoffDirectory, expectedSha)
    const packages = Object.fromEntries(
      handoff.packages.map((item) => {
        const record = records.find(({ project }) => project === item.project)
        return [
          item.project,
          {
            name: item.project,
            version: item.version,
            basename: item.tarball.basename,
            dist: expectedDist(record, item),
          },
        ]
      }),
    )
    const npm = {}
    for (const record of records) {
      npm[record.project] = {
        versions: ["0.0.1", record.betaVersion],
        latest: "0.0.1",
        alpha: "alpha-sentinel",
        beta: record.betaVersion,
      }
      if (npmMode === "exact" && record.project !== prisma.project) setNpmExact({ npm, packages }, record)
    }
    const gitFiles = {}
    addArtifactFiles(gitFiles)
    for (const record of records) {
      mkdirSync(join(cwd, record.root), { recursive: true })
      writeFileSync(join(cwd, record.manifestPath), JSON.stringify({ name: record.project, version: record.version }))
    }
    const state = {
      artifactSha,
      expectedSha,
      parentSha,
      treeSha,
      head: expectedSha,
      origin: expectedSha,
      commitLine: `${artifactSha} ${parentSha}`,
      historicalCount: 2,
      historicalPaths: ["scripts/release-finalize-stable.mjs", "scripts/release-package-stable.mjs"],
      changedPaths: ["CHANGELOG.md", ...records.map(({ manifestPath }) => manifestPath)].sort(),
      gitFiles,
      packages,
      npm,
      tags: {},
      releases: {},
      localTags: {},
      userConfigPath: join(cwd, "missing-user-npmrc"),
      globalConfigPath: join(cwd, "missing-global-npmrc"),
      registry: npmRegistry,
      log: [],
    }
    if (artifacts === "exact") setArtifactsExact(state)
    save(stateFile, state)
    server = createServer((request, response) => {
      const current = load(stateFile)
      current.log.push(["http", request.method, request.url])
      const send = (status, body = "") => {
        save(stateFile, current)
        response.writeHead(status, { "content-type": "application/json" })
        response.end(typeof body === "string" ? body : JSON.stringify(body))
      }
      if (request.method === "GET") {
        const tag = decodeURIComponent(request.url.split("/releases/tags/")[1] || "")
        if (current.ghReadStatus) return send(current.ghReadStatus, { message: "configured" })
        return current.releases[tag] ? send(200, current.releases[tag]) : send(404, { message: "not found" })
      }
      let body = ""
      request.on("data", (chunk) => (body += chunk))
      request.on("end", () => {
        const value = JSON.parse(body)
        const tag = value.tag_name
        const status = current.ghCreateStatus || 201
        if (current.ghCreateMaterializes !== false) {
          current.releases[tag] = { tag_name: tag, draft: false, prerelease: false }
        }
        save(stateFile, current)
        if (current.ghCreateResponseLoss) return response.destroy()
        send(status, status === 422 ? { message: "already exists" } : current.releases[tag])
      })
    })
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve))
    return {
      cwd,
      bin,
      handoffDirectory,
      handoff,
      stateFile,
      server,
      expectedSha,
      api: `http://127.0.0.1:${server.address().port}`,
    }
  } catch (error) {
    await discardWorld({ cwd, server })
    throw error
  }
}
async function run(world, args = [], environment = {}) {
  return await new Promise((resolve) => {
    const child = spawn(process.execPath, [script, ...args], {
      cwd: world.cwd,
      env: {
        PATH: world.bin,
        EXPECTED_SHA: world.expectedSha,
        ARTIFACT_SHA: artifactSha,
        PROJECTS: projectsText,
        GITHUB_ACTIONS: "true",
        GITHUB_API_URL: world.api,
        GITHUB_REPOSITORY: repository,
        GITHUB_TOKEN: "fake-github-token",
        GITHUB_WORKFLOW_REF: `${repository}/${workflowPath}@${workflowRef}`,
        GITHUB_WORKFLOW_SHA: world.expectedSha,
        GITHUB_RUN_ID: runId,
        GITHUB_RUN_ATTEMPT: runAttempt,
        STABLE_HANDOFF_DIRECTORY: world.handoffDirectory,
        STABLE_HANDOFF_ARTIFACT_ID: artifactId,
        STABLE_HANDOFF_ARTIFACT_DIGEST: artifactDigest,
        NPM_READ_DELAY_MS: "0",
        NPM_CONFIG_IGNORE_SCRIPTS: "true",
        NPM_CONFIG_PROVENANCE: "true",
        FINALIZE_COMMAND_TIMEOUT_MS: "5000",
        FINALIZE_HTTP_TIMEOUT_MS: "5000",
        FAKE_STATE: world.stateFile,
        ...environment,
      },
    })
    let stdout = ""
    let stderr = ""
    child.stdout.on("data", (chunk) => (stdout += chunk))
    child.stderr.on("data", (chunk) => (stderr += chunk))
    child.on("close", (status) => resolve({ status, stdout, stderr }))
  })
}
async function scenario(t, options, body) {
  const world = await makeWorld(options)
  try {
    await body(world)
  } finally {
    await discardWorld(world)
  }
}

await test("stable handoff verification and current-run artifact metadata fail before every public mutation", async (t) => {
  await scenario(t, { npmMode: "absent" }, async (world) => {
    const handoffPath = join(world.handoffDirectory, "handoff.json")
    const handoff = JSON.parse(readFileSync(handoffPath, "utf8"))
    handoff.run.id = "33399900012"
    writeFileSync(handoffPath, JSON.stringify(handoff))
    const result = await run(world)
    const state = load(world.stateFile)
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /handoff run ID does not match the current run/i)
    assert.deepEqual(mutationCalls(state), [])
    assert.equal(
      state.log.some(([command]) => command === "npm" || command === "http"),
      false,
    )
  })
  for (const [name, environment, pattern] of [
    ["missing artifact ID", { STABLE_HANDOFF_ARTIFACT_ID: "" }, /artifact ID/i],
    ["malformed artifact digest", { STABLE_HANDOFF_ARTIFACT_DIGEST: "sha256:nope" }, /artifact digest/i],
    ["relative handoff directory", { STABLE_HANDOFF_DIRECTORY: "handoff" }, /handoff directory/i],
    ["wrong workflow SHA", { GITHUB_WORKFLOW_SHA: advancedSha }, /workflow SHA/i],
  ]) {
    await t.test(name, async () => {
      const world = await makeWorld({ npmMode: "absent" })
      try {
        const result = await run(world, [], environment)
        assert.notEqual(result.status, 0)
        assert.match(result.stderr, pattern)
        assert.deepEqual(mutationCalls(load(world.stateFile)), [])
      } finally {
        await discardWorld(world)
      }
    })
  }
})

await test("current exact mode keeps atomic authenticated tags and Releases, then publishes six exact handoff tarballs", async (t) => {
  await scenario(t, { npmMode: "absent", artifacts: "absent" }, async (world) => {
    const result = await run(world, [], { GITHUB_TOKEN: "tag-push-secret" })
    const state = load(world.stateFile)
    assert.equal(result.status, 0, result.stderr)
    assertExact(state)
    assert.deepEqual(state.pushAuthentication, { oneShot: true, matchesToken: true, tokenLiteral: false })
    assert.deepEqual(
      state.log.find(([command, operation]) => command === "git" && operation === "push"),
      [
        "git",
        "push",
        "--atomic",
        "origin",
        ...records.map(({ project, version }) => `refs/tags/${project}@${version}:refs/tags/${project}@${version}`),
      ],
    )
    assert.equal(
      state.log.filter(([command, operation]) => command === "http" && operation === "POST").length,
      records.length,
    )
    const calls = publishCalls(state)
    assert.equal(calls.length, publishable.length)
    assert.deepEqual(
      calls,
      publishable.map((record) => [
        "npm",
        "publish",
        join(world.handoffDirectory, state.packages[record.project].basename),
        "--registry",
        npmRegistry,
        "--access",
        "public",
        "--tag",
        "latest",
        "--provenance",
        "--ignore-scripts",
        "--json",
      ]),
    )
    const registryReads = state.log.filter(([command, operation]) => command === "npm" && operation === "view")
    assert.ok(registryReads.length > 0)
    for (const call of registryReads) assert.deepEqual(call.slice(-2), ["--registry", npmRegistry])
    assert.equal(
      calls.some((call) => call.join(" ").includes("prisma")),
      false,
    )
    assert.equal(
      state.log.some(([command]) => command === "pnpm"),
      false,
    )
  })
})

await test("abandoned Prisma is terminally absent while exact integrity and provenance make replay idempotent", async (t) => {
  await scenario(t, { npmMode: "exact" }, async (world) => {
    const first = await run(world)
    assert.equal(first.status, 0, first.stderr)
    let state = load(world.stateFile)
    assert.deepEqual(mutationCalls(state), [])
    assertExact(state)
    state.log = []
    save(world.stateFile, state)
    const replay = await run(world)
    state = load(world.stateFile)
    assert.equal(replay.status, 0, replay.stderr)
    assert.deepEqual(mutationCalls(state), [])
    assert.equal(state.npm[prisma.project].versions.includes(prisma.version), false)
  })
})

await test("partial npm state publishes only missing tarballs and an interrupted per-package run replays safely", async (t) => {
  await scenario(t, { npmMode: "absent" }, async (world) => {
    let state = load(world.stateFile)
    setNpmExact(state, publishable[0])
    setNpmExact(state, publishable[1])
    state.publishFailures = {
      [publishable[3].project]: {
        exit: 42,
        stderr: JSON.stringify({ error: { code: "E503", summary: "temporary registry failure" } }),
      },
    }
    save(world.stateFile, state)
    const first = await run(world)
    state = load(world.stateFile)
    assert.notEqual(first.status, 0)
    assert.equal(publishCalls(state).length, 2)
    assert.equal(state.npm[publishable[2].project].versions.includes(publishable[2].version), true)
    delete state.publishFailures
    state.log = []
    save(world.stateFile, state)
    const replay = await run(world)
    state = load(world.stateFile)
    assert.equal(replay.status, 0, replay.stderr)
    assert.deepEqual(
      publishCalls(state).map((call) => basename(call[2])),
      publishable.slice(3).map((record) => state.packages[record.project].basename),
    )
    assertExact(state)
  })
})

await test("preexisting exact versions are accepted only with handoff integrity, shasum, and provenance", async (t) => {
  for (const [name, mutate, pattern] of [
    ["integrity", (dist) => (dist.integrity = "sha512-wrong"), /integrity|npm state divergence/i],
    ["shasum", (dist) => (dist.shasum = "0".repeat(40)), /shasum|npm state divergence/i],
    ["provenance", (dist) => delete dist.attestations.provenance, /provenance|npm state divergence/i],
    [
      "attestation URL",
      (dist) => (dist.attestations.url = "https://example.com/attestation"),
      /attestation|npm state divergence/i,
    ],
  ]) {
    await t.test(name, async () => {
      const world = await makeWorld({ npmMode: "exact" })
      try {
        const state = load(world.stateFile)
        mutate(state.npm[publishable[0].project].dist)
        save(world.stateFile, state)
        const result = await run(world)
        assert.notEqual(result.status, 0)
        assert.match(result.stderr, pattern)
        assert.deepEqual(mutationCalls(load(world.stateFile)), [])
      } finally {
        await discardWorld(world)
      }
    })
  }
})

await test("npm attestation URLs match real scoped metadata semantically and reject boundary changes", async (t) => {
  await scenario(t, { npmMode: "exact" }, async (world) => {
    const target = publishable[0]
    let state = load(world.stateFile)
    assert.equal(
      state.npm[target.project].dist.attestations.url,
      "https://registry.npmjs.org/-/npm/v1/attestations/@effectify%2fhatchet@0.2.0",
    )
    state.npm[target.project].dist.attestations.url =
      "https://registry.npmjs.org/-/npm/v1/attestations/@effectify%2Fhatchet@0.2.0"
    save(world.stateFile, state)
    const uppercaseHex = await run(world)
    assert.equal(uppercaseHex.status, 0, uppercaseHex.stderr)

    for (const invalidUrl of [
      "http://registry.npmjs.org/-/npm/v1/attestations/@effectify%2fhatchet@0.2.0",
      "https://registry.npmjs.org.evil.example/-/npm/v1/attestations/@effectify%2fhatchet@0.2.0",
      "https://registry.npmjs.org/npm/v1/attestations/@effectify%2fhatchet@0.2.0",
      "https://registry.npmjs.org/-/npm/v1/attestations/@effectify%2fhatchet@^0.2.0",
      "https://user@registry.npmjs.org/-/npm/v1/attestations/@effectify%2fhatchet@0.2.0",
      "https://registry.npmjs.org/-/npm/v1/attestations/@effectify%2fhatchet@0.2.0?download=true",
      "https://registry.npmjs.org/-/npm/v1/attestations/@effectify%2fhatchet@0.2.0#fragment",
    ]) {
      state = load(world.stateFile)
      state.npm[target.project].dist.attestations.url = invalidUrl
      save(world.stateFile, state)
      const result = await run(world)
      assert.notEqual(result.status, 0, invalidUrl)
      assert.match(result.stderr, /attestation URL|npm state divergence/i)
      assert.deepEqual(mutationCalls(load(world.stateFile)), [])
    }
  })
})

await test("npm publish response loss and delayed registry visibility reconcile before retrying", async (t) => {
  await scenario(t, { npmMode: "absent" }, async (world) => {
    const state = load(world.stateFile)
    state.publishFailures = {
      [publishable[0].project]: {
        exit: 1,
        stderr: "ECONNRESET after request upload",
        materialize: true,
      },
    }
    save(world.stateFile, state)
    const result = await run(world)
    const final = load(world.stateFile)
    assert.equal(result.status, 0, result.stderr)
    assert.equal(
      publishCalls(final).filter((call) => call[2].endsWith(state.packages[publishable[0].project].basename)).length,
      1,
    )
    assertExact(final)
  })

  await scenario(t, { npmMode: "absent" }, async (world) => {
    const target = publishable[0]
    const state = load(world.stateFile)
    const npm = state.npm[target.project]
    const baselineVersions = [...npm.versions]
    const baselineTags = { alpha: npm.alpha, beta: npm.beta, latest: npm.latest }
    setNpmExact(state, target)
    const targetVersions = [...npm.versions]
    const targetTags = { alpha: npm.alpha, beta: npm.beta, latest: npm.latest }
    const exactDist = state.packages[target.project].dist
    npm.versionsQueue = [baselineVersions, baselineVersions, targetVersions, targetVersions, targetVersions]
    npm.distTagsQueue = [baselineTags, baselineTags, baselineTags, targetTags, targetTags]
    npm.distQueue = [
      {
        integrity: exactDist.integrity,
        shasum: exactDist.shasum,
        attestations: { url: exactDist.attestations.url },
      },
      exactDist,
    ]
    state.publishFailures = {
      [target.project]: { exit: 1, stderr: "ECONNRESET after request upload" },
    }
    save(world.stateFile, state)

    const result = await run(world)
    const final = load(world.stateFile)
    assert.equal(result.status, 0, result.stderr)
    assert.equal(
      publishCalls(final).filter((call) => call[2].endsWith(state.packages[target.project].basename)).length,
      1,
    )
    assertExact(final)
  })

  await scenario(t, { npmMode: "absent" }, async (world) => {
    const target = publishable[0]
    const state = load(world.stateFile)
    const npm = state.npm[target.project]
    const baselineVersions = [...npm.versions]
    const baselineTags = { alpha: npm.alpha, beta: npm.beta, latest: npm.latest }
    setNpmExact(state, target)
    const targetVersions = [...npm.versions]
    npm.latest = baselineTags.latest
    npm.versionsQueue = [baselineVersions, baselineVersions, ...Array.from({ length: 6 }, () => targetVersions)]
    npm.distTagsQueue = [baselineTags, baselineTags, ...Array.from({ length: 6 }, () => baselineTags)]
    state.publishFailures = {
      [target.project]: { exit: 1, stderr: "ECONNRESET after request upload" },
    }
    save(world.stateFile, state)

    const result = await run(world)
    const final = load(world.stateFile)
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /permanent npm state divergence \(latest\)/i)
    const publishIndex = final.log.findIndex(([command, operation]) => command === "npm" && operation === "publish")
    const reconciliationReads = final.log
      .slice(publishIndex + 1)
      .filter(
        ([command, operation, name, field]) =>
          command === "npm" && operation === "view" && name === target.project && field === "versions",
      )
    assert.equal(reconciliationReads.length, 6)
  })
})

await test("npm failures are reconciled and reported with bounded sanitized fixed guidance", async (t) => {
  await scenario(t, { npmMode: "absent" }, async (world) => {
    const target = publishable[0]
    const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJzZWNyZXQifQ.signaturevalue"
    const secretValues = [
      "bearer-secret",
      jwt,
      "npm_ABCDEFGHIJKLMNOPQRSTUVWXYZ123456",
      "ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ123456",
      "auth-token-secret",
      "url-password",
      "query-secret",
    ]
    const noisy = `\u001b[31mBearer bearer-secret\u001b[0m ${jwt} npm_ABCDEFGHIJKLMNOPQRSTUVWXYZ123456 ghp_ABCDEFGHIJKLMNOPQRSTUVWXYZ123456 _authToken=auth-token-secret https://user:url-password@example.test/path?token=query-secret ${"detail ".repeat(2000)}`
    const state = load(world.stateFile)
    state.publishFailures = {
      [target.project]: {
        exit: 1,
        stderr: JSON.stringify({ error: { code: "E401", summary: noisy, detail: noisy } }),
      },
    }
    save(world.stateFile, state)
    const result = await run(world)
    const final = load(world.stateFile)
    assert.notEqual(result.status, 0)
    assert.ok(result.stderr.length < 5000, `diagnostic length: ${result.stderr.length}`)
    for (const secret of secretValues)
      assert.doesNotMatch(result.stderr, new RegExp(secret.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
    assert.doesNotMatch(result.stderr, /\u001b|\x1b|\[31m/)
    assert.match(result.stderr, /trusted publishing authentication failed/i)
    assert.match(result.stderr, /E401/)
    const publishIndex = final.log.findIndex(([command, operation]) => command === "npm" && operation === "publish")
    const laterRegistryRead = final.log.findIndex(
      ([command, operation], index) => index > publishIndex && command === "npm" && operation === "view",
    )
    assert.ok(publishIndex >= 0 && laterRegistryRead > publishIndex)
  })
})

await test("safe tracked npm configuration is accepted at the trusted-publishing boundary", async (t) => {
  await scenario(t, { npmMode: "absent" }, async (world) => {
    const state = load(world.stateFile)
    state.trackedNpmrc = ".npmrc\0"
    writeFileSync(join(world.cwd, ".npmrc"), safeNpmrc)
    save(world.stateFile, state)

    const result = await run(world)
    assert.equal(result.status, 0, result.stderr)
    assert.equal(publishCalls(load(world.stateFile)).length, publishable.length)
  })
})

await test("trusted npmjs boundary accepts safe global config and rejects registry or npm config overrides", async (t) => {
  await scenario(t, { npmMode: "absent" }, async (world) => {
    const state = load(world.stateFile)
    state.globalConfigPath = join(world.cwd, "global.npmrc")
    writeFileSync(state.globalConfigPath, safeNpmrc)
    save(world.stateFile, state)

    const result = await run(world)
    const final = load(world.stateFile)
    assert.equal(result.status, 0, result.stderr)
    for (const expectedCall of [
      ["npm", "config", "get", "registry", "--json"],
      ["npm", "config", "get", "userconfig", "--json"],
      ["npm", "config", "get", "globalconfig", "--json"],
    ]) {
      assert.ok(
        final.log.some((call) => isDeepStrictEqual(call, expectedCall)),
        JSON.stringify(expectedCall),
      )
    }
    assert.equal(publishCalls(final).length, publishable.length)
  })

  for (const [name, environment, forbiddenValue] of [
    ["registry override", { NPM_CONFIG_REGISTRY: "https://registry.example.test/" }, "registry.example.test"],
    ["lowercase userconfig override", { npm_config_userconfig: "/tmp/alternate-userconfig" }, "alternate-userconfig"],
    ["unexpected npm config override", { NPM_CONFIG_CACHE: "/tmp/npm-cache-override" }, "npm-cache-override"],
    ["wrong provenance value", { NPM_CONFIG_PROVENANCE: "false" }, "false"],
  ]) {
    await t.test(name, async () => {
      const world = await makeWorld({ npmMode: "absent" })
      try {
        const result = await run(world, [], environment)
        const final = load(world.stateFile)
        assert.notEqual(result.status, 0)
        assert.match(result.stderr, /npm.*configuration|publication boundary/i)
        assert.equal(publishCalls(final).length, 0)
        assert.doesNotMatch(result.stderr, new RegExp(forbiddenValue))
      } finally {
        await discardWorld(world)
      }
    })
  }

  await scenario(t, { npmMode: "absent" }, async (world) => {
    const state = load(world.stateFile)
    state.registry = "https://registry.example.test/"
    save(world.stateFile, state)
    const result = await run(world)
    const final = load(world.stateFile)
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /npm registry|publication boundary/i)
    assert.equal(publishCalls(final).length, 0)
    assert.doesNotMatch(result.stderr, /registry\.example\.test/)
  })
})

await test("static credentials and auth-bearing tracked, user, or global npm configuration are rejected and redacted", async (t) => {
  for (const [name, setup, environment, secret] of [
    ["NODE_AUTH_TOKEN", async () => {}, { NODE_AUTH_TOKEN: "static-secret" }, "static-secret"],
    ["NPM_TOKEN", async () => {}, { NPM_TOKEN: "static-secret" }, "static-secret"],
    [
      "tracked scoped registry auth token",
      async (state, world) => {
        state.trackedNpmrc = ".npmrc\0"
        writeFileSync(join(world.cwd, ".npmrc"), "//registry.npmjs.org/:_authToken=tracked-token-secret\n")
      },
      {},
      "tracked-token-secret",
    ],
    [
      "tracked base64 auth",
      async (state, world) => {
        state.trackedNpmrc = ".npmrc\0"
        writeFileSync(join(world.cwd, ".npmrc"), "_auth=tracked-auth-secret\n")
      },
      {},
      "tracked-auth-secret",
    ],
    [
      "user password",
      async (state, world) => {
        state.userConfigPath = join(world.cwd, "user.npmrc")
        writeFileSync(state.userConfigPath, "//registry.npmjs.org/:_password=user-password-secret\n")
      },
      {},
      "user-password-secret",
    ],
    [
      "global auth token",
      async (state, world) => {
        state.globalConfigPath = join(world.cwd, "global.npmrc")
        writeFileSync(state.globalConfigPath, "//registry.npmjs.org/:_authToken=global-token-secret\n")
      },
      {},
      "global-token-secret",
    ],
    [
      "user username",
      async (state, world) => {
        state.userConfigPath = join(world.cwd, "user.npmrc")
        writeFileSync(state.userConfigPath, "//registry.npmjs.org/:username=user-name-secret\n")
      },
      {},
      "user-name-secret",
    ],
    [
      "user token form",
      async (state, world) => {
        state.userConfigPath = join(world.cwd, "user.npmrc")
        writeFileSync(state.userConfigPath, "token=user-token-secret\n")
      },
      {},
      "user-token-secret",
    ],
    [
      "environment token interpolation",
      async (state, world) => {
        state.userConfigPath = join(world.cwd, "user.npmrc")
        writeFileSync(state.userConfigPath, "cache=/tmp/${NPM_TOKEN_INTERPOLATION_SECRET}\n")
      },
      {},
      "NPM_TOKEN_INTERPOLATION_SECRET",
    ],
  ]) {
    await t.test(name, async () => {
      const world = await makeWorld({ npmMode: "absent" })
      try {
        const state = load(world.stateFile)
        await setup(state, world)
        save(world.stateFile, state)
        const result = await run(world, [], environment)
        const final = load(world.stateFile)
        assert.notEqual(result.status, 0)
        assert.match(result.stderr, /static npm credential|npm auth configuration/i)
        assert.equal(publishCalls(final).length, 0)
        assert.doesNotMatch(result.stderr, new RegExp(secret))
      } finally {
        await discardWorld(world)
      }
    })
  }
})

await test("npm configuration inspection rejects unsafe files and ambiguous state without echoing content", async (t) => {
  for (const [name, setup, secret] of [
    [
      "control character",
      async (state, world) => {
        state.trackedNpmrc = ".npmrc\0"
        writeFileSync(join(world.cwd, ".npmrc"), "hoist=false\0control-secret\n")
      },
      "control-secret",
    ],
    [
      "oversized file",
      async (state, world) => {
        state.userConfigPath = join(world.cwd, "user.npmrc")
        writeFileSync(state.userConfigPath, `hoist=false\n# ${"oversized-secret".repeat(5000)}\n`)
      },
      "oversized-secret",
    ],
    [
      "symlink",
      async (state, world) => {
        const target = join(world.cwd, "symlink-target.npmrc")
        state.userConfigPath = join(world.cwd, "user.npmrc")
        writeFileSync(target, "_authToken=symlink-secret\n")
        symlinkSync(target, state.userConfigPath)
      },
      "symlink-secret",
    ],
    [
      "nonregular file",
      async (state, world) => {
        state.userConfigPath = join(world.cwd, "user.npmrc")
        mkdirSync(state.userConfigPath)
      },
      "not-present",
    ],
    [
      "unreadable path state",
      async (state) => {
        state.userConfigPath = "/dev/null/user.npmrc"
      },
      "not-present",
    ],
    [
      "ambiguous tracked path list",
      async (state, world) => {
        state.trackedNpmrc = ".npmrc"
        writeFileSync(join(world.cwd, ".npmrc"), safeNpmrc)
      },
      "not-present",
    ],
  ]) {
    await t.test(name, async () => {
      const world = await makeWorld({ npmMode: "absent" })
      try {
        const state = load(world.stateFile)
        await setup(state, world)
        save(world.stateFile, state)
        const result = await run(world)
        const final = load(world.stateFile)
        assert.notEqual(result.status, 0)
        assert.match(result.stderr, /npm auth configuration/i)
        assert.equal(publishCalls(final).length, 0)
        assert.doesNotMatch(result.stderr, new RegExp(secret))
      } finally {
        await discardWorld(world)
      }
    })
  }
})

await test("historical recovery is bounded, allowlisted, npm-only, and reports abandonment in read-only PREFLIGHT", async (t) => {
  await scenario(t, { historical: true, npmMode: "absent" }, async (world) => {
    const preflight = await run(world, ["--preflight", "--json"], { GITHUB_ACTIONS: "" })
    let state = load(world.stateFile)
    assert.equal(preflight.status, 0, preflight.stderr)
    const report = JSON.parse(preflight.stdout)
    assert.equal(report.mode, "historical-npm-only")
    assert.equal(report.historicalNpmOnly, true)
    assert.deepEqual(
      report.abandonments.map(({ project, version }) => ({ project, version })),
      [{ project: prisma.project, version: prisma.version }],
    )
    assert.equal(report.states.find(({ project }) => project === prisma.project).npm, "absent-abandoned")
    assert.deepEqual(mutationCalls(state), [])
    state.log = []
    save(world.stateFile, state)
    const result = await run(world)
    state = load(world.stateFile)
    assert.equal(result.status, 0, result.stderr)
    assert.equal(publishCalls(state).length, publishable.length)
    assert.equal(
      mutationCalls(state).some(([command, operation]) => command === "git" && ["tag", "push"].includes(operation)),
      false,
    )
    assert.equal(
      mutationCalls(state).some(([command, operation]) => command === "http" && operation === "POST"),
      false,
    )
    assertExact(state)
  })
})

await test("historical recovery rejects excessive commits and every changed path outside the exact control-file allowlist", async (t) => {
  for (const [name, setup, pattern] of [
    ["too many commits", (state) => (state.historicalCount = 9), /commit-count bound/i],
    ["application path", (state) => state.historicalPaths.push("packages/hatchet/src/index.ts"), /changed path/i],
    ["rename-like unexpected path", (state) => state.historicalPaths.push("README.md"), /changed path/i],
  ]) {
    await t.test(name, async () => {
      const world = await makeWorld({ historical: true, npmMode: "absent" })
      try {
        const state = load(world.stateFile)
        setup(state)
        save(world.stateFile, state)
        const result = await run(world)
        const final = load(world.stateFile)
        assert.notEqual(result.status, 0)
        assert.match(result.stderr, pattern)
        assert.deepEqual(mutationCalls(final), [])
        assert.equal(
          final.log.some(([command]) => command === "npm" || command === "http"),
          false,
        )
      } finally {
        await discardWorld(world)
      }
    })
  }
  assert.deepEqual([...allowedHistoricalPaths].sort(), allowedHistoricalPaths)
})

await test("historical PREFLIGHT requires exact existing tags and Releases without mutation", async (t) => {
  for (const [name, setup, pattern] of [
    [
      "missing tag",
      (state) => delete state.tags[`${publishable[0].project}@${publishable[0].version}`],
      /historical.*tag/i,
    ],
    [
      "missing Release",
      (state) => delete state.releases[`${publishable[0].project}@${publishable[0].version}`],
      /historical.*GitHub Release/i,
    ],
  ]) {
    await t.test(name, async () => {
      const world = await makeWorld({ historical: true, npmMode: "absent" })
      try {
        const state = load(world.stateFile)
        setup(state)
        save(world.stateFile, state)
        const result = await run(world, ["--preflight", "--json"], { GITHUB_ACTIONS: "" })
        const final = load(world.stateFile)
        assert.notEqual(result.status, 0)
        assert.match(result.stderr, pattern)
        assert.deepEqual(mutationCalls(final), [])
      } finally {
        await discardWorld(world)
      }
    })
  }
})

await test("historical recovery requires all tags and Releases exact and abandoned Prisma absent", async (t) => {
  for (const [name, setup, pattern] of [
    [
      "missing tag",
      (state) => delete state.tags[`${publishable[0].project}@${publishable[0].version}`],
      /historical.*tag/i,
    ],
    [
      "missing Release",
      (state) => delete state.releases[`${publishable[0].project}@${publishable[0].version}`],
      /historical.*GitHub Release/i,
    ],
    [
      "published abandoned Prisma",
      (state) => {
        state.npm[prisma.project].versions.push(prisma.version)
        state.npm[prisma.project].latest = prisma.version
      },
      /abandoned.*remain absent/i,
    ],
  ]) {
    await t.test(name, async () => {
      const world = await makeWorld({ historical: true, npmMode: "absent" })
      try {
        const state = load(world.stateFile)
        setup(state)
        save(world.stateFile, state)
        const result = await run(world)
        const final = load(world.stateFile)
        assert.notEqual(result.status, 0)
        assert.match(result.stderr, pattern)
        assert.deepEqual(mutationCalls(final), [])
      } finally {
        await discardWorld(world)
      }
    })
  }
})

await test("current tag and Release response loss still reconcile exact authenticated state", async (t) => {
  await scenario(t, { npmMode: "absent", artifacts: "absent" }, async (world) => {
    const state = load(world.stateFile)
    state.pushExit = 1
    state.pushMaterializesOnFailure = true
    state.ghCreateResponseLoss = true
    save(world.stateFile, state)
    const result = await run(world)
    assert.equal(result.status, 0, result.stderr)
    assertExact(load(world.stateFile))
  })
})

await test("reviewed artifact lineage and exact project derivation remain fail closed before mutation", async (t) => {
  for (const [name, setup, pattern, environment = {}] of [
    ["unexpected reviewed path", (state) => state.changedPaths.push("README.md"), /unexpected reviewed path/i],
    [
      "project mismatch",
      () => {},
      /requested projects do not exactly match/i,
      { PROJECTS: projects.slice(1).join(",") },
    ],
    [
      "invalid merge shape",
      (state) => (state.commitLine = `${artifactSha} ${parentSha} ${secondParentSha} ${"8".repeat(40)}`),
      /single-parent commit or exact two-parent merge/i,
    ],
  ]) {
    await t.test(name, async () => {
      const world = await makeWorld({ npmMode: "exact" })
      try {
        const state = load(world.stateFile)
        setup(state)
        save(world.stateFile, state)
        const result = await run(world, [], environment)
        assert.notEqual(result.status, 0)
        assert.match(result.stderr, pattern)
        assert.deepEqual(mutationCalls(load(world.stateFile)), [])
      } finally {
        await discardWorld(world)
      }
    })
  }
})

await test("FINALIZE retains the GitHub Actions-only publication guard while PREFLIGHT is read-only", async (t) => {
  await scenario(t, { npmMode: "absent" }, async (world) => {
    const result = await run(world, [], { GITHUB_ACTIONS: "" })
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /GitHub Actions/i)
    assert.deepEqual(mutationCalls(load(world.stateFile)), [])
  })
  await scenario(t, { npmMode: "absent" }, async (world) => {
    const result = await run(world, ["--preflight", "--json"], { GITHUB_ACTIONS: "" })
    assert.equal(result.status, 0, result.stderr)
    const output = JSON.parse(result.stdout)
    assert.equal(output.mode, "current-exact")
    assert.equal(output.historicalNpmOnly, false)
    assert.equal(output.artifactId, artifactId)
    assert.equal(output.artifactDigest, artifactDigest)
    assert.deepEqual(mutationCalls(load(world.stateFile)), [])
  })
})

await test("importing with a nonexistent argv entry is inert", async () => {
  const cwd = mkdtempSync(join(tmpdir(), "stable-finalize-import-"))
  const previousEntry = process.argv[1]
  const previousExitCode = process.exitCode
  const previousStderrWrite = process.stderr.write
  const stderr = []
  try {
    process.argv[1] = join(cwd, "missing-entry.mjs")
    process.stderr.write = (chunk) => {
      stderr.push(String(chunk))
      return true
    }
    await import(`${new URL("release-finalize-stable.mjs", import.meta.url).href}?import-only=${Date.now()}`)
    await new Promise((resolve) => setImmediate(resolve))
    assert.deepEqual(stderr, [])
    assert.equal(process.exitCode, previousExitCode)
  } finally {
    process.argv[1] = previousEntry
    process.exitCode = previousExitCode
    process.stderr.write = previousStderrWrite
    await rm(cwd, { recursive: true, force: true })
  }
  assert.equal(existsSync(cwd), false)
})

await test("static publication boundary is per-tarball, provenance-bearing, and never Nx batch publication", () => {
  const source = readFileSync(script, "utf8")
  assert.match(source, /verifyStableHandoff/)
  assert.match(source, /release-stable-abandonments\.json/)
  assert.match(source, /"npm",\s*\[\s*"publish"/s)
  assert.match(
    source,
    /"--access",\s*"public",\s*"--tag",\s*"latest",\s*"--provenance",\s*"--ignore-scripts",\s*"--json"/s,
  )
  assert.doesNotMatch(source, /nx",\s*"release",\s*"publish"|npm dist-tag|npm unpublish|shell:\s*true/)
})
