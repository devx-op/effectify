import assert from "node:assert/strict"
import { spawn } from "node:child_process"
import { chmodSync, existsSync, mkdtempSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from "node:fs"
import { rm } from "node:fs/promises"
import { createServer } from "node:http"
import { tmpdir } from "node:os"
import { join } from "node:path"
import test from "node:test"

const script = new URL("release-finalize-stable.mjs", import.meta.url).pathname
const stableWorkflow = readFileSync(new URL("../.github/workflows/release-stable.yml", import.meta.url), "utf8")
const sha = "1234567890abcdef1234567890abcdef12345678"
const historicalSha = "abcdef1234567890abcdef1234567890abcdef12"
const parentSha = "fedcba0987654321fedcba0987654321fedcba09"
const secondParentSha = "0123456789abcdef0123456789abcdef01234567"
const thirdParentSha = "89abcdef0123456789abcdef0123456789abcdef"
const treeSha = "9999999999999999999999999999999999999999"
const catalog = [
  ["@future/nebula", "packages/future/nebula", "4.7.0-beta.12", "4.7.0"],
  ["@future/orbit", "packages/future/orbit", "8.0.1-beta.3", "8.0.1"],
  ["@future/quasar", "packages/future/quasar", "12.3.5-beta.27", "12.3.5"],
]
const selected = [catalog[0], catalog[2]]
const records = selected.map(([project, root, beta, version]) => [project, `${root}/package.json`, version, beta])
const selectedProjects = records
  .map(([project]) => project)
  .sort()
  .join(",")

const fake = String.raw`#!/usr/bin/env node
const fs=require('fs'),p=require('path'),cmd=p.basename(process.argv[1]),a=process.argv.slice(2),f=process.env.FAKE_STATE
let s=JSON.parse(fs.readFileSync(f)), out=x=>process.stdout.write(String(x)), save=()=>fs.writeFileSync(f,JSON.stringify(s))
s.log.push([cmd,...a]);
function finish(code=0){save();process.exit(code)}
if(cmd==='git'){
 if(a[0]==='fetch'||a[0]==='config')finish()
 if(a[0]==='cat-file'&&a[1]==='-t'){const v=s.gitFiles[a[2]];if(v===undefined)finish(128);out((s.gitTypes?.[a[2]]??'blob')+'\n');finish()}
 if(a[0]==='merge-base'){finish(s.ancestorExit??(s.ancestor===false?1:0))}
 if(a[0]==='rev-list'){out((s.commitLines?.[a.at(-1)]??s.commitLine??(s.artifactSha+' '+s.parentSha))+'\n');finish()}
 if(a[0]==='rev-parse'){
  if(a[1].endsWith('^{tree}')){out((s.generatedTreeSha??s.treeSha)+'\n'+(s.artifactTreeSha??s.treeSha)+'\n');finish()}
  out((a[1]==='HEAD'?s.head:s.origin)+'\n');finish()
 }
 if(a[0]==='status'){out(s.worktreeStatus??'');finish()}
 if(a[0]==='show'){const value=s.gitFiles[a[1]];if(value===undefined)finish(128);out(typeof value==='string'?value:JSON.stringify(value));finish()}
 if(a[0]==='diff'){out(s.changedPaths.join('\n')+(s.changedPaths.length?'\n':''));finish()}
 if(a[0]==='ls-remote'){
  const t=a[3].slice(10),v=s.tags[t]; if(v){if(v.raw)out(v.raw.replaceAll('$TAG',t));else{out((v.direct||'a'.repeat(40))+'\trefs/tags/'+t+'\n');if(v.peeled!==null)out((v.peeled||s.artifactSha)+'\trefs/tags/'+t+'^{}\n')}} finish()
 }
 if(a[0]==='for-each-ref'){const t=a[2].slice(10),v=s.localTags[t];if(v)out((v.type||'tag')+'\t'+(v.peeled||s.artifactSha)+'\n');finish()}
 if(a[0]==='tag'){s.localTags[a[2]]={type:'tag',peeled:a[3]};finish()}
 if(a[0]==='push'){
  const materialize=()=>{for(const r of a.slice(3)){const t=r.split(':')[0].slice(10);s.tags[t]={peeled:s.localTags[t].peeled}}}
  if(s.pushMaterializesOnFailure){materialize();finish(s.pushExit||1)}
  if(s.pushExit)finish(s.pushExit)
  materialize();finish()
 }
 finish(127)
}
if(cmd==='npm'){
 const n=a[1],field=a[2],v=s.npm[n]
 const take=(key,fallback)=>{const q=v[key],x=q&&q.length?q.shift():fallback;if(q&&q.length===0){if(key==='versionsQueue')v.versions=x;if(key==='latestQueue')v.latest=x}return x}
 let x
 if(field==='versions')x=take('versionsQueue',v.versions)
 else if(field==='dist-tags.latest')x=take('latestQueue',v.latest)
 else if(field==='dist-tags'){
  const q=v.distTagsQueue
  if(q&&q.length){x=q.shift();if(q.length===0&&x&&typeof x==='object'&&!x.exit&&!Object.hasOwn(x,'raw')){v.alpha=x.alpha;v.beta=x.beta;v.latest=x.latest}}
  else{const latest=take('latestQueue',v.latest);x={alpha:v.alpha,beta:v.beta};if(latest!==undefined)x.latest=latest}
 }else finish(127)
 if(x&&typeof x==='object'&&x.exit){process.stderr.write(x.stderr||'failure');finish(x.exit)}
 if(x&&typeof x==='object'&&Object.hasOwn(x,'raw'))out(x.raw);else out(JSON.stringify(x)+'\n');finish()
}
if(cmd==='pnpm'){
 s.publishEnvironment={ignoreScripts:process.env.NPM_CONFIG_IGNORE_SCRIPTS,inheritedSentinel:process.env.FINALIZE_ENV_SENTINEL}
 const projects=a[3].slice(11).split(','),count=s.publishSubset??projects.length
 for(const project of projects.slice(0,count)){const n=s.projectPackages[project],v=s.expected[n],old=s.npm[n];old.versions=[v];old.latest=v;if(old.delayedVersions){old.versions=[];old.versionsQueue=Array(old.delayedVersions).fill([]).concat([[v]])}if(old.delayedLatest){old.latest='0.0.1';old.latestQueue=Array(old.delayedLatest).fill('0.0.1').concat(v)}}
 finish(s.publishExit||0)
}
finish(127)`

function load(file) {
  return JSON.parse(readFileSync(file, "utf8"))
}
function save(file, value) {
  writeFileSync(file, JSON.stringify(value))
}
function mutations(state) {
  // Fetch is a local synchronization/read operation: it updates remote-tracking state but cannot publish anything.
  return state.log.filter(
    ([command, operation]) =>
      command === "pnpm" ||
      (command === "git" && (operation === "tag" || operation === "push")) ||
      (command === "http" && operation === "POST"),
  )
}
function addArtifactFiles(gitFiles, commit) {
  gitFiles[`${commit}:CHANGELOG.md`] = "# Changelog\n"
  gitFiles[`${commit}:nx.json`] = { release: { projects: catalog.map(([, root]) => root) } }
  for (const [project, root, beta, version] of catalog) {
    gitFiles[`${commit}:${root}/project.json`] = { name: project }
    gitFiles[`${commit}:${root}/package.json`] = { name: project, version }
    gitFiles[`${commit}^1:${root}/package.json`] = { name: project, version: beta }
  }
}

async function discardWorld({ cwd, server }) {
  try {
    if (server?.listening) await new Promise((resolve) => server.close(resolve))
  } finally {
    await rm(cwd, { recursive: true, force: true })
  }
  assert.equal(existsSync(cwd), false)
}

async function world(mode = "absent") {
  const cwd = mkdtempSync(join(tmpdir(), "stable-finalize-")),
    bin = join(cwd, "bin"),
    stateFile = join(cwd, "state.json")
  let server
  try {
    mkdirSync(bin)
    writeFileSync(join(bin, "fake.cjs"), fake)
    chmodSync(join(bin, "fake.cjs"), 0o755)
    for (const command of ["git", "npm", "pnpm"]) symlinkSync("fake.cjs", join(bin, command))
    symlinkSync(process.execPath, join(bin, "node"))
    const expected = {},
      npm = {},
      tags = {},
      releases = {},
      projectPackages = {},
      gitFiles = {}
    addArtifactFiles(gitFiles, sha)
    addArtifactFiles(gitFiles, historicalSha)
    for (const [project, path, version, betaVersion] of records) {
      mkdirSync(join(cwd, path, ".."), { recursive: true })
      writeFileSync(join(cwd, path), JSON.stringify({ name: project, version }))
      projectPackages[project] = project
      expected[project] = version
      npm[project] = {
        versions: mode === "exact" ? [betaVersion, version] : ["0.0.1", betaVersion],
        latest: mode === "exact" ? version : "0.0.1",
        alpha: "alpha-sentinel",
        beta: betaVersion,
      }
      if (mode === "exact") {
        const tag = `${project}@${version}`
        tags[tag] = { peeled: sha }
        releases[tag] = { tag_name: tag, draft: false, prerelease: false }
      }
    }
    const changedPaths = ["CHANGELOG.md", ...records.map(([, path]) => path)].sort()
    save(stateFile, {
      sha,
      artifactSha: sha,
      parentSha,
      treeSha,
      head: sha,
      origin: sha,
      expected,
      npm,
      tags,
      releases,
      localTags: {},
      projectPackages,
      gitFiles,
      changedPaths,
      log: [],
    })
    server = createServer((request, response) => {
      const state = load(stateFile),
        method = request.method,
        path = request.url
      state.log.push(["http", method, path])
      const send = (status, body = "") => {
        save(stateFile, state)
        response.writeHead(status, { "content-type": "application/json" })
        response.end(typeof body === "string" ? body : JSON.stringify(body))
      }
      if (method === "GET") {
        const tag = decodeURIComponent(path.split("/releases/tags/")[1] || ""),
          configured = state.ghReadStatus
        if (configured) return send(configured, { message: "configured" })
        return state.releases[tag] ? send(200, state.releases[tag]) : send(404, { message: "not found" })
      }
      let body = ""
      request.on("data", (chunk) => (body += chunk))
      request.on("end", () => {
        const value = JSON.parse(body),
          tag = value.tag_name,
          status = state.ghCreateStatus || 201
        if (state.ghCreateMaterializes !== false)
          state.releases[tag] = { tag_name: tag, draft: false, prerelease: false }
        save(stateFile, state)
        if (state.ghCreateResponseLoss) return response.destroy()
        send(status, status === 422 ? { message: "already exists" } : state.releases[tag])
      })
    })
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve))
    return { cwd, bin, stateFile, server, api: `http://127.0.0.1:${server.address().port}` }
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
        EXPECTED_SHA: sha,
        ARTIFACT_SHA: "",
        PROJECTS: selectedProjects,
        GITHUB_ACTIONS: "true",
        NPM_READ_DELAY_MS: "0",
        FINALIZE_COMMAND_TIMEOUT_MS: "5000",
        GITHUB_API_URL: world.api,
        GITHUB_REPOSITORY: "owner/repo",
        GITHUB_TOKEN: "fake",
        FAKE_STATE: world.stateFile,
        ...environment,
      },
    })
    let stdout = "",
      stderr = ""
    child.stdout.on("data", (chunk) => (stdout += chunk))
    child.stderr.on("data", (chunk) => (stderr += chunk))
    child.on("close", (status) => resolve({ status, stdout, stderr }))
  })
}
async function scenario(t, name, setup, verify, mode = "exact", args = [], environment = {}) {
  await t.test(name, async () => {
    const fixture = await world(mode)
    try {
      const state = load(fixture.stateFile)
      await setup(state, fixture)
      save(fixture.stateFile, state)
      const result = await run(fixture, args, environment)
      await verify(result, load(fixture.stateFile), fixture)
    } finally {
      await discardWorld(fixture)
    }
  })
}
function exactState(state) {
  assert.equal(Object.keys(state.tags).length, records.length)
  assert.equal(Object.keys(state.releases).length, records.length)
  for (const [project, , version, betaVersion] of records) {
    assert.ok(state.npm[project].versions.includes(version))
    assert.equal(state.npm[project].latest, version)
    assert.equal(state.npm[project].alpha, "alpha-sentinel")
    assert.equal(state.npm[project].beta, betaVersion)
  }
}
function historicalTags(state) {
  state.artifactSha = historicalSha
  for (const [project, , version] of records) state.tags[`${project}@${version}`] = { peeled: historicalSha }
}
function mergeArtifact(state) {
  state.commitLine = `${sha} ${parentSha} ${secondParentSha}`
  state.commitLines = { [secondParentSha]: `${secondParentSha} ${parentSha}` }
}
function workflowPreflightInvocation() {
  const match = stableWorkflow.match(
    /^[ \t]*- name: 🔎 PREFLIGHT exact stable artifacts\n([\s\S]*?)(?=^[ \t]*- name:)/m,
  )
  assert.ok(match, "stable workflow preflight step")
  assert.match(match[1], /PROJECTS:\s*\$\{\{ needs\.validate\.outputs\.projects \}\}/)
  const commands = [...match[1].matchAll(/^[ \t]*run:\s*(.+)$/gm)].map((entry) => entry[1].trim())
  assert.deepEqual(commands, ["bash scripts/release-finalize-stable.sh --preflight --json"])
  return { args: commands[0].split(/\s+/).slice(2), source: match[1] }
}

const scenarioNames = []
test("hermetic arbitrary-subset Node CLI matrix", { timeout: 120_000 }, async (t) => {
  const add = async (...args) => {
    scenarioNames.push(args[0])
    await scenario(t, ...args)
  }
  await add(
    "single-parent squash or single-commit rebase future subset exact replay locally synchronizes then performs zero tag, Release, or npm mutation",
    async () => {},
    (result, state) => {
      assert.equal(result.status, 0, result.stderr)
      assert.deepEqual(mutations(state), [])
      assert.ok(
        state.log.some(
          (call) => call[0] === "git" && call[1] === "rev-list" && call.includes("--parents") && call.at(-1) === sha,
        ),
      )
      assert.ok(
        state.log.some(
          (call) => call[0] === "git" && call[1] === "diff" && call.includes(`${sha}^1`) && call.at(-1) === sha,
        ),
      )
    },
  )
  await add(
    "same-SHA future subset publishes only normalized reviewed projects",
    async () => {},
    (result, state) => {
      assert.equal(result.status, 0, result.stderr)
      exactState(state)
      const status = state.log.find((call) => call[0] === "git" && call[1] === "status")
      assert.deepEqual(status, ["git", "status", "--porcelain=v1", "--untracked-files=all"])
      const publish = state.log.find((call) => call[0] === "pnpm")
      assert.equal(publish[4], `--projects=${selectedProjects}`)
    },
    "absent",
  )
  await add(
    "publish child disables lifecycle scripts while preserving inherited environment",
    async () => {},
    (result, state) => {
      assert.equal(result.status, 0, result.stderr)
      assert.deepEqual(state.publishEnvironment, {
        ignoreScripts: "true",
        inheritedSentinel: "preserved",
      })
      exactState(state)
    },
    "absent",
    [],
    { NPM_CONFIG_IGNORE_SCRIPTS: "false", FINALIZE_ENV_SENTINEL: "preserved" },
  )
  await add(
    "exact stable replay does not require beta version or beta tag",
    async (state) => {
      for (const [project, , version] of records) {
        state.npm[project].versions = [version]
        delete state.npm[project].beta
      }
    },
    (result, state) => {
      assert.equal(result.status, 0, result.stderr)
      assert.deepEqual(mutations(state), [])
    },
  )
  await add(
    "stable absence with exact reviewed beta provenance publishes",
    async () => {},
    (result, state) => {
      assert.equal(result.status, 0, result.stderr)
      exactState(state)
    },
    "absent",
  )
  await add(
    "stable absence with no latest publishes",
    async (state) => {
      for (const [project] of records) delete state.npm[project].latest
    },
    (result, state) => {
      assert.equal(result.status, 0, result.stderr)
      exactState(state)
    },
    "absent",
  )
  await add(
    "prerelease latest strictly below stable target publishes",
    async (state) => {
      state.npm[records[0][0]].latest = records[0][3]
    },
    (result, state) => {
      assert.equal(result.status, 0, result.stderr)
      exactState(state)
    },
    "absent",
  )
  await add(
    "historical all-existing artifacts perform zero tag, Release, or npm mutation",
    async (state) => historicalTags(state),
    (result, state) => {
      assert.equal(result.status, 0, result.stderr)
      assert.deepEqual(mutations(state), [])
    },
    "exact",
    [],
    { ARTIFACT_SHA: historicalSha },
  )
  await add(
    "historical all-exact replay returns before checking an advanced current master manifest",
    async (state, fixture) => {
      historicalTags(state)
      for (const [project, path] of records) {
        const currentManifest = { name: project, version: "99.0.0", scripts: { build: "current-only" } }
        state.gitFiles[`${sha}:${path}`] = currentManifest
        writeFileSync(join(fixture.cwd, path), JSON.stringify(currentManifest))
      }
    },
    (result, state) => {
      assert.equal(result.status, 0, result.stderr)
      assert.deepEqual(mutations(state), [])
      assert.equal(
        state.log.some((call) => call[0] === "git" && call[1] === "status"),
        false,
      )
    },
    "exact",
    [],
    { ARTIFACT_SHA: historicalSha },
  )
  await add(
    "historical ancestor PREFLIGHT checks ancestry before artifact and registry reads",
    async (state) => historicalTags(state),
    (result, state) => {
      assert.equal(result.status, 0, result.stderr)
      assert.deepEqual(mutations(state), [])
      const ancestry = state.log.findIndex((call) => call[0] === "git" && call[1] === "merge-base")
      const artifactRead = state.log.findIndex((call) => call[0] === "git" && call[1] === "show")
      const registryRead = state.log.findIndex((call) => call[0] === "npm")
      assert.ok(ancestry >= 0 && ancestry < artifactRead && ancestry < registryRead)
    },
    "exact",
    ["--preflight"],
    { ARTIFACT_SHA: historicalSha },
  )
  await add(
    "historical rebased non-ancestor fails before PREFLIGHT verification",
    async (state) => {
      historicalTags(state)
      state.ancestor = false
    },
    (result, state) => {
      assert.notEqual(result.status, 0)
      assert.match(result.stderr, /ancestor/)
      assert.deepEqual(mutations(state), [])
      assert.equal(
        state.log.some((call) => call[0] === "git" && call[1] === "show"),
        false,
      )
      assert.equal(
        state.log.some((call) => call[0] === "npm" || call[0] === "http"),
        false,
      )
    },
    "exact",
    ["--preflight"],
    { ARTIFACT_SHA: historicalSha },
  )
  await add(
    "historical ancestry command ambiguity fails closed",
    async (state) => {
      historicalTags(state)
      state.ancestorExit = 128
    },
    (result, state) => {
      assert.notEqual(result.status, 0)
      assert.deepEqual(mutations(state), [])
      assert.equal(
        state.log.some((call) => call[0] === "git" && call[1] === "show"),
        false,
      )
    },
    "exact",
    ["--preflight"],
    { ARTIFACT_SHA: historicalSha },
  )
  await add(
    "valid two-parent merge with a single generated release commit based on its first parent succeeds",
    async (state) => mergeArtifact(state),
    (result, state) => {
      assert.equal(result.status, 0, result.stderr)
      assert.deepEqual(mutations(state), [])
    },
  )
  await add(
    "octopus reviewed artifact fails closed",
    async (state) => {
      state.commitLine = `${sha} ${parentSha} ${secondParentSha} ${thirdParentSha}`
    },
    (result, state) => {
      assert.notEqual(result.status, 0)
      assert.match(result.stderr, /single-parent commit or exact two-parent merge/)
      assert.deepEqual(mutations(state), [])
    },
  )
  await add(
    "merge second parent not based directly on first parent fails closed",
    async (state) => {
      mergeArtifact(state)
      state.commitLines[secondParentSha] = `${secondParentSha} ${thirdParentSha}`
    },
    (result, state) => {
      assert.notEqual(result.status, 0)
      assert.match(result.stderr, /based directly on first parent/)
      assert.deepEqual(mutations(state), [])
    },
  )
  await add(
    "merge second parent with multiple commits fails closed",
    async (state) => {
      mergeArtifact(state)
      state.commitLines[secondParentSha] = `${secondParentSha} ${parentSha} ${thirdParentSha}`
    },
    (result, state) => {
      assert.notEqual(result.status, 0)
      assert.match(result.stderr, /single commit based directly on first parent/)
      assert.deepEqual(mutations(state), [])
    },
  )
  await add(
    "merge tree differing from generated second parent fails closed",
    async (state) => {
      mergeArtifact(state)
      state.artifactTreeSha = "8888888888888888888888888888888888888888"
    },
    (result, state) => {
      assert.notEqual(result.status, 0)
      assert.match(result.stderr, /merge tree must exactly match/)
      assert.deepEqual(mutations(state), [])
    },
  )
  await add(
    "merge aggregate first-parent diff rejects an extra path",
    async (state) => {
      mergeArtifact(state)
      state.changedPaths.push("README.md")
    },
    (result, state) => {
      assert.notEqual(result.status, 0)
      assert.match(result.stderr, /unexpected reviewed path/)
      assert.deepEqual(mutations(state), [])
    },
  )
  await add(
    "merge aggregate first-parent diff rejects an invalid manifest transition",
    async (state) => {
      mergeArtifact(state)
      state.gitFiles[`${sha}:${records[0][1]}`].version = "4.7.1"
    },
    (result, state) => {
      assert.notEqual(result.status, 0)
      assert.match(result.stderr, /beta-to-stable transition/)
      assert.deepEqual(mutations(state), [])
    },
  )
  await add(
    "malformed reviewed commit shape fails closed",
    async (state) => {
      state.commitLine = "malformed history"
    },
    (result, state) => {
      assert.notEqual(result.status, 0)
      assert.match(result.stderr, /commit shape is invalid/)
      assert.deepEqual(mutations(state), [])
    },
  )
  await add(
    "historical split release commits are not reconstructed by history search",
    async (state) => {
      historicalTags(state)
      state.changedPaths = ["CHANGELOG.md", records[0][1]]
    },
    (result, state) => {
      assert.notEqual(result.status, 0)
      assert.match(result.stderr, /requested projects do not exactly match/)
      assert.deepEqual(mutations(state), [])
      assert.equal(
        state.log.some((call) => call[0] === "git" && call[1] === "log"),
        false,
      )
    },
    "exact",
    ["--preflight"],
    { ARTIFACT_SHA: historicalSha },
  )
  await add(
    "historical missing tag fails before mutation",
    async (state) => {
      historicalTags(state)
      delete state.tags[`${records[0][0]}@${records[0][2]}`]
    },
    (result, state) => {
      assert.notEqual(result.status, 0)
      assert.match(result.stderr, /historical replay requires exact existing/)
      assert.deepEqual(mutations(state), [])
    },
    "exact",
    [],
    { ARTIFACT_SHA: historicalSha },
  )
  for (const [index] of records.entries())
    await add(
      `tag partial subset ${index + 1} replays`,
      async (state) => {
        for (const [project, , version] of records.slice(0, index + 1))
          state.tags[`${project}@${version}`] = { peeled: sha }
      },
      (result, state) => {
        assert.equal(result.status, 0, result.stderr)
        exactState(state)
      },
      "absent",
    )
  for (const [index] of records.entries())
    await add(
      `release partial subset ${index + 1} replays`,
      async (state) => {
        for (const [project, , version] of records) state.tags[`${project}@${version}`] = { peeled: sha }
        for (const [project, , version] of records.slice(0, index + 1))
          state.releases[`${project}@${version}`] = {
            tag_name: `${project}@${version}`,
            draft: false,
            prerelease: false,
          }
      },
      (result, state) => {
        assert.equal(result.status, 0, result.stderr)
        exactState(state)
      },
      "absent",
    )
  for (const [index] of records.entries())
    await add(
      `npm partial subset ${index + 1} replays`,
      async (state) => {
        for (const [project, , version] of records) {
          state.tags[`${project}@${version}`] = { peeled: sha }
          state.releases[`${project}@${version}`] = {
            tag_name: `${project}@${version}`,
            draft: false,
            prerelease: false,
          }
        }
        for (const [project, , version] of records.slice(0, index + 1)) {
          state.npm[project].versions = [version]
          state.npm[project].latest = version
        }
      },
      (result, state) => {
        assert.equal(result.status, 0, result.stderr)
        exactState(state)
      },
      "absent",
    )
  await add(
    "publish nonzero after subset then replay",
    async (state) => {
      state.publishSubset = 1
      state.publishExit = 42
    },
    async (result, state, fixture) => {
      assert.notEqual(result.status, 0)
      delete state.publishExit
      delete state.publishSubset
      save(fixture.stateFile, state)
      const replay = await run(fixture)
      assert.equal(replay.status, 0, replay.stderr)
      exactState(load(fixture.stateFile))
    },
    "absent",
  )
  await add(
    "atomic push response loss reconciles exact remote refs",
    async (state) => {
      state.pushExit = 1
      state.pushMaterializesOnFailure = true
    },
    (result, state) => {
      assert.equal(result.status, 0, result.stderr)
      exactState(state)
    },
    "absent",
  )
  await add(
    "failed atomic push materializes no refs and replay reuses local tags",
    async (state) => {
      state.pushExit = 1
    },
    async (result, state, fixture) => {
      assert.notEqual(result.status, 0)
      assert.equal(Object.keys(state.tags).length, 0)
      assert.equal(Object.keys(state.localTags).length, records.length)
      delete state.pushExit
      save(fixture.stateFile, state)
      const replay = await run(fixture)
      assert.equal(replay.status, 0, replay.stderr)
      exactState(load(fixture.stateFile))
    },
    "absent",
  )
  await add(
    "GitHub create response loss reconciles exact Release",
    async (state) => {
      state.ghCreateResponseLoss = true
    },
    (result, state) => {
      assert.equal(result.status, 0, result.stderr)
      exactState(state)
    },
    "absent",
  )
  await add(
    "GitHub 422 create reconciles materialized exact release",
    async (state) => {
      state.ghCreateStatus = 422
    },
    (result, state) => {
      assert.equal(result.status, 0, result.stderr)
      exactState(state)
    },
    "absent",
  )
  await add(
    "GitHub 422 without exact state fails",
    async (state) => {
      state.ghCreateStatus = 422
      state.ghCreateMaterializes = false
    },
    (result) => assert.notEqual(result.status, 0),
    "absent",
  )
  for (const [format, value] of [
    ["array", [records[0][2]]],
    ["scalar", records[0][2]],
  ])
    await add(
      `npm ${format} versions JSON`,
      async (state) => {
        state.npm[records[0][0]].versionsQueue = [value]
      },
      (result) => assert.equal(result.status, 0, result.stderr),
    )
  await add(
    "npm delayed latest converges",
    async (state) => {
      state.npm[records[0][0]].latestQueue = [records[0][3], records[0][3], records[0][2]]
    },
    (result) => assert.equal(result.status, 0, result.stderr),
  )
  await add(
    "missing reviewed beta version blocks stable publication",
    async (state) => {
      const [project, , , betaVersion] = records[0]
      state.npm[project].versions = state.npm[project].versions.filter((version) => version !== betaVersion)
    },
    (result, state) => {
      assert.notEqual(result.status, 0)
      assert.equal(mutations(state).length, 0)
    },
    "absent",
  )
  await add(
    "missing beta dist-tag blocks stable publication",
    async (state) => {
      delete state.npm[records[0][0]].beta
    },
    (result, state) => {
      assert.notEqual(result.status, 0)
      assert.equal(mutations(state).length, 0)
    },
    "absent",
  )
  await add(
    "different beta dist-tag blocks stable publication",
    async (state) => {
      const project = records[0][0],
        other = "4.7.0-beta.11"
      state.npm[project].versions.push(other)
      state.npm[project].beta = other
    },
    (result, state) => {
      assert.notEqual(result.status, 0)
      assert.equal(mutations(state).length, 0)
    },
    "absent",
  )
  await add(
    "beta provenance loss before npm publish blocks pnpm mutation",
    async (state) => {
      const [project, , , betaVersion] = records[0]
      const good = { alpha: "alpha-sentinel", beta: betaVersion, latest: "0.0.1" }
      const bad = { alpha: "alpha-sentinel", beta: "4.7.0-beta.11", latest: "0.0.1" }
      state.npm[project].distTagsQueue = [good, ...Array(6).fill(bad)]
    },
    (result, state) => {
      assert.notEqual(result.status, 0)
      assert.equal(
        state.log.some((call) => call[0] === "pnpm"),
        false,
      )
    },
    "absent",
  )
  await add(
    "concurrent exact stable appearance is omitted from missing-only publish",
    async (state) => {
      const [project, , version, betaVersion] = records[0]
      state.npm[project].versionsQueue = [
        ["0.0.1", betaVersion],
        [betaVersion, version],
      ]
      state.npm[project].distTagsQueue = [
        { alpha: "alpha-sentinel", beta: betaVersion, latest: "0.0.1" },
        { alpha: "alpha-sentinel", beta: betaVersion, latest: version },
      ]
    },
    (result, state) => {
      assert.equal(result.status, 0, result.stderr)
      const publish = state.log.find((call) => call[0] === "pnpm")
      assert.equal(publish[4], `--projects=${records[1][0]}`)
      exactState(state)
    },
    "absent",
  )
  await add(
    "equal latest with absent stable target blocks publication",
    async (state) => {
      state.npm[records[0][0]].latest = records[0][2]
    },
    (result, state) => {
      assert.notEqual(result.status, 0)
      assert.equal(mutations(state).length, 0)
    },
    "absent",
  )
  await add(
    "higher latest blocks publication from moving latest backward",
    async (state) => {
      const project = records[0][0],
        higher = "4.7.1"
      state.npm[project].versions.push(higher)
      state.npm[project].latest = higher
    },
    (result, state) => {
      assert.notEqual(result.status, 0)
      assert.equal(mutations(state).length, 0)
    },
    "absent",
  )
  await add(
    "latest not present in versions is inconsistent",
    async (state) => {
      state.npm[records[0][0]].latest = "1.0.0"
    },
    (result, state) => {
      assert.notEqual(result.status, 0)
      assert.equal(mutations(state).length, 0)
    },
    "absent",
  )
  await add(
    "latest SemVer with a leading zero fails closed",
    async (state) => {
      const project = records[0][0],
        malformed = "01.0.0"
      state.npm[project].versions.push(malformed)
      state.npm[project].latest = malformed
    },
    (result, state) => {
      assert.notEqual(result.status, 0)
      assert.equal(mutations(state).length, 0)
    },
    "absent",
  )
  await add(
    "malformed historical version list entry fails closed",
    async (state) => {
      state.npm[records[0][0]].versions.push("1.02.3")
    },
    (result, state) => {
      assert.notEqual(result.status, 0)
      assert.equal(mutations(state).length, 0)
    },
    "absent",
  )
  await add(
    "duplicate npm versions fail closed",
    async (state) => {
      state.npm[records[0][0]].versions.push(records[0][3])
    },
    (result, state) => {
      assert.notEqual(result.status, 0)
      assert.equal(mutations(state).length, 0)
    },
    "absent",
  )
  await add(
    "malformed dist-tags JSON fails closed",
    async (state) => {
      state.npm[records[0][0]].distTagsQueue = Array(6).fill({ raw: "{" })
    },
    (result, state) => {
      assert.notEqual(result.status, 0)
      assert.equal(mutations(state).length, 0)
    },
    "absent",
  )
  await add(
    "post-publish delayed version visibility converges",
    async (state) => {
      state.npm[records[0][0]].delayedVersions = 2
    },
    (result, state) => {
      assert.equal(result.status, 0, result.stderr)
      exactState(state)
    },
    "absent",
  )
  await add(
    "post-publish delayed latest converges",
    async (state) => {
      state.npm[records[0][0]].delayedLatest = 2
    },
    (result, state) => {
      assert.equal(result.status, 0, result.stderr)
      exactState(state)
    },
    "absent",
  )
  for (const [name, spec] of [
    ["null", null],
    ["empty", { raw: "" }],
    ["truncated", { raw: '["1.0' }],
    ["object", {}],
    ["mixed", [records[0][2], 3]],
    ["execution error", { exit: 1, stderr: "E503" }],
  ])
    await add(
      `npm ${name} is unknown and never publishes`,
      async (state) => {
        state.npm[records[0][0]].versionsQueue = Array(6).fill(spec)
      },
      (result, state) => {
        assert.notEqual(result.status, 0)
        assert.equal(mutations(state).length, 0)
      },
    )
  await add(
    "GitHub non-200 read is unknown",
    async (state) => {
      state.ghReadStatus = 503
    },
    (result, state) => {
      assert.notEqual(result.status, 0)
      assert.equal(mutations(state).length, 0)
    },
  )
  for (const [name, raw] of [
    ["lightweight", `${"a".repeat(40)}\trefs/tags/$TAG\n`],
    ["malformed", "garbage\n"],
    ["wrong SHA", `${"a".repeat(40)}\trefs/tags/$TAG\n${"f".repeat(40)}\trefs/tags/$TAG^{}\n`],
    ["duplicate", `${"a".repeat(40)}\trefs/tags/$TAG\n${"b".repeat(40)}\trefs/tags/$TAG\n${sha}\trefs/tags/$TAG^{}\n`],
  ])
    await add(
      `tag ${name} fails closed`,
      async (state) => {
        state.tags[`${records[0][0]}@${records[0][2]}`] = { raw }
      },
      (result, state) => {
        assert.notEqual(result.status, 0)
        assert.equal(mutations(state).length, 0)
      },
      "absent",
    )
  for (const [name, value] of [
    ["lightweight", { type: "commit", peeled: sha }],
    ["wrong SHA", { type: "tag", peeled: "f".repeat(40) }],
  ])
    await add(
      `local tag ${name} fails before mutation`,
      async (state) => {
        state.localTags[`${records[0][0]}@${records[0][2]}`] = value
      },
      (result, state) => {
        assert.notEqual(result.status, 0)
        assert.equal(mutations(state).length, 0)
      },
      "absent",
    )
  for (const [name, status] of [
    ["dirty tracked source", " M packages/future/nebula/src/index.ts\n"],
    ["staged changes", "M  packages/future/nebula/src/index.ts\n"],
    ["untracked package file", "?? packages/future/nebula/src/generated.js\n"],
  ])
    await add(
      `${name} fails before mutation`,
      async (state) => {
        state.worktreeStatus = status
      },
      (result, state) => {
        assert.notEqual(result.status, 0)
        assert.match(result.stderr, /clean index and worktree/)
        assert.equal(mutations(state).length, 0)
      },
      "absent",
    )
  for (const [name, manifest] of [
    ["altered on-disk selected manifest name", { name: "@future/imposter", version: records[0][2] }],
    ["altered on-disk selected manifest version", { name: records[0][0], version: "99.0.0" }],
  ])
    await add(
      `${name} fails before mutation`,
      async (state, fixture) => {
        writeFileSync(join(fixture.cwd, records[0][1]), JSON.stringify(manifest))
      },
      (result, state) => {
        assert.notEqual(result.status, 0)
        assert.match(result.stderr, /on-disk manifest/)
        assert.equal(mutations(state).length, 0)
      },
      "absent",
    )
  await add(
    "altered on-disk selected manifest dependency fails before mutation",
    async (state, fixture) => {
      const path = records[0][1],
        reviewed = state.gitFiles[`${sha}:${path}`]
      reviewed.dependencies = { "reviewed-dependency": "1.0.0" }
      writeFileSync(
        join(fixture.cwd, path),
        JSON.stringify({ ...reviewed, dependencies: { "reviewed-dependency": "2.0.0" } }),
      )
    },
    (result, state) => {
      assert.notEqual(result.status, 0)
      assert.match(result.stderr, /on-disk manifest/)
      assert.equal(mutations(state).length, 0)
    },
    "absent",
  )
  await add(
    "EXPECTED_SHA controls HEAD",
    async (state) => {
      state.head = "f".repeat(40)
    },
    (result, state) => {
      assert.notEqual(result.status, 0)
      assert.equal(mutations(state).length, 0)
    },
  )
  await add(
    "EXPECTED_SHA controls origin",
    async (state) => {
      state.origin = "f".repeat(40)
    },
    (result, state) => {
      assert.notEqual(result.status, 0)
      assert.equal(mutations(state).length, 0)
    },
  )

  for (const [name, setup, environment, pattern] of [
    [
      "requested projects must include every reviewed manifest",
      async () => {},
      { PROJECTS: records[0][0] },
      /requested projects do not exactly match reviewed manifest changes/,
    ],
    [
      "requested projects cannot include an unreviewed allowlisted project",
      async () => {},
      { PROJECTS: [records[0][0], catalog[1][0], records[1][0]].sort().join(",") },
      /requested projects do not exactly match reviewed manifest changes/,
    ],
    [
      "duplicate requested projects fail closed",
      async () => {},
      { PROJECTS: `${records[0][0]},${records[0][0]}` },
      /duplicate requested project/,
    ],
    [
      "non-release requested project fails closed",
      async () => {},
      { PROJECTS: "@future/not-release" },
      /not in artifact release projects/,
    ],
    [
      "reviewed diff requires root changelog",
      async (state) => {
        state.changedPaths = state.changedPaths.filter((path) => path !== "CHANGELOG.md")
      },
      {},
      /root CHANGELOG/,
    ],
    [
      "reviewed diff rejects extra path",
      async (state) => {
        state.changedPaths.push("README.md")
      },
      {},
      /unexpected reviewed path/,
    ],
    [
      "reviewed diff rejects stable source",
      async (state) => {
        state.gitFiles[`${sha}^1:${records[0][1]}`].version = records[0][2]
      },
      {},
      /beta-to-stable transition/,
    ],
    [
      "reviewed diff rejects a target other than beta base",
      async (state) => {
        state.gitFiles[`${sha}:${records[0][1]}`].version = "4.7.1"
      },
      {},
      /beta-to-stable transition/,
    ],
    [
      "reviewed diff rejects package rename",
      async (state) => {
        state.gitFiles[`${sha}:${records[0][1]}`].name = "@future/renamed"
      },
      {},
      /manifest identity/,
    ],
  ])
    await add(
      name,
      setup,
      (result, state) => {
        assert.notEqual(result.status, 0)
        assert.match(result.stderr, pattern)
        assert.deepEqual(mutations(state), [])
      },
      "exact",
      [],
      environment,
    )

  await add(
    "a changed-path changelog entry cannot substitute for an artifact changelog blob",
    async (state) => {
      assert.ok(state.changedPaths.includes("CHANGELOG.md"))
      delete state.gitFiles[`${sha}:CHANGELOG.md`]
    },
    (result, state) => {
      assert.notEqual(result.status, 0)
      assert.match(result.stderr, /root CHANGELOG\.md to exist as a blob/)
      assert.deepEqual(mutations(state), [])
      assert.equal(
        state.log.some((call) => call[0] === "npm" || call[0] === "http"),
        false,
      )
    },
  )

  await add(
    "FINALIZE refuses to run outside GitHub Actions",
    async () => {},
    (result, state) => {
      assert.notEqual(result.status, 0)
      assert.match(result.stderr, /GitHub Actions/)
      assert.deepEqual(mutations(state), [])
    },
    "absent",
    [],
    { GITHUB_ACTIONS: "" },
  )
  const preflight = workflowPreflightInvocation()
  assert.doesNotMatch(
    preflight.source,
    /NODE_AUTH_TOKEN|NPM_CONFIG_PROVENANCE|npm whoami|nx release publish|git (?:tag|push)|gh release (?:create|delete)/,
  )
  await add(
    "PREFLIGHT locally synchronizes before SHA authorization and performs zero tag, Release, or npm mutation",
    async () => {},
    (result, state) => {
      assert.equal(result.status, 0, result.stderr)
      const output = JSON.parse(result.stdout)
      assert.deepEqual(output.projects, selectedProjects.split(","))
      assert.equal(output.expectedSha, sha)
      assert.equal(output.artifactSha, sha)
      const fetch = state.log.findIndex(
        (call) =>
          call[0] === "git" && call.slice(1).join(" ") === "fetch origin master:refs/remotes/origin/master --no-tags",
      )
      const authorization = state.log.findIndex(
        (call) => call[0] === "git" && call[1] === "rev-parse" && call[2] === "origin/master",
      )
      assert.ok(fetch >= 0 && fetch < authorization)
      assert.deepEqual(mutations(state), [])
    },
    "exact",
    preflight.args,
    { GITHUB_ACTIONS: "" },
  )
  assert.equal(new Set(scenarioNames).size, scenarioNames.length)
})

test("importing with a nonexistent argv entry is inert", async () => {
  const cwd = mkdtempSync(join(tmpdir(), "stable-finalize-import-"))
  const previousEntry = process.argv[1]
  const previousExitCode = process.exitCode
  const previousStderrWrite = process.stderr.write
  const stderr = []
  try {
    process.argv[1] = join(cwd, "guaranteed-missing-entry.mjs")
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

test("a URL-significant executable path still enters the finalizer main module", async () => {
  const cwd = mkdtempSync(join(tmpdir(), "stable-finalize-entry-"))
  let result
  try {
    const entry = join(cwd, "release # %.mjs")
    writeFileSync(entry, readFileSync(script))
    result = await new Promise((resolve) => {
      const child = spawn(process.execPath, [entry], {
        cwd,
        env: {
          ...process.env,
          EXPECTED_SHA: "",
          ARTIFACT_SHA: "",
          PROJECTS: "",
        },
      })
      let stdout = "",
        stderr = ""
      child.stdout.on("data", (chunk) => (stdout += chunk))
      child.stderr.on("data", (chunk) => (stderr += chunk))
      child.on("close", (status) => resolve({ status, stdout, stderr }))
    })
  } finally {
    await rm(cwd, { recursive: true, force: true })
  }

  assert.equal(existsSync(cwd), false)
  assert.notEqual(result.status, 0)
  assert.equal(result.stdout, "")
  assert.match(result.stderr, /FINALIZE requires full lowercase expected SHA/)
})

test("a URL-significant symlink enters the finalizer main module with preserved symlink identity", async () => {
  const cwd = mkdtempSync(join(tmpdir(), "stable-finalize-symlink-entry-"))
  let result
  try {
    const entry = join(cwd, "release # %.mjs")
    symlinkSync(script, entry)
    result = await new Promise((resolve) => {
      const child = spawn(process.execPath, ["--preserve-symlinks-main", entry], {
        cwd,
        env: {
          ...process.env,
          EXPECTED_SHA: "",
          ARTIFACT_SHA: "",
          PROJECTS: "",
        },
      })
      let stdout = "",
        stderr = ""
      child.stdout.on("data", (chunk) => (stdout += chunk))
      child.stderr.on("data", (chunk) => (stderr += chunk))
      child.on("close", (status) => resolve({ status, stdout, stderr }))
    })
  } finally {
    await rm(cwd, { recursive: true, force: true })
  }

  assert.equal(existsSync(cwd), false)
  assert.notEqual(result.status, 0)
  assert.equal(result.stdout, "")
  assert.match(result.stderr, /FINALIZE requires full lowercase expected SHA/)
})

test("workflow FINALIZE step disables publication lifecycle scripts", () => {
  const finalizeJob = stableWorkflow.match(/^  finalize:\n([\s\S]*?)(?=^  summary:)/m)
  assert.ok(finalizeJob, "stable FINALIZE job")
  const finalizeStep = finalizeJob[1].match(/^      - name: 🚀 FINALIZE exact stable artifacts\n([\s\S]*)$/m)
  assert.ok(finalizeStep, "stable FINALIZE step")
  assert.match(finalizeStep[1], /NPM_CONFIG_IGNORE_SCRIPTS:\s*true/)
})

test("static command and publication boundary removes historical truth", () => {
  const source = readFileSync(script, "utf8")
  assert.match(source, /spawn\(file, args, \{ shell: false/)
  assert.match(source, /process\.env\.GITHUB_ACTIONS/)
  assert.match(source, /function isMainModule\(\)/)
  assert.match(source, /resolvedEntry = realpathSync\(entry\)/)
  assert.match(source, /resolvedModule = realpathSync\(fileURLToPath\(import\.meta\.url\)\)/)
  assert.match(source, /pathToFileURL\(resolvedEntry\)\.href === pathToFileURL\(resolvedModule\)\.href/)
  assert.match(source, /run\("git", \["cat-file", "-t", `\$\{artifactSha\}:CHANGELOG\.md`\]\)/)
  assert.equal(source.match(/\\u0000/g)?.length, 2)
  assert.match(source, /artifactSha.*nx\.json|nx\.json.*artifactSha/s)
  assert.doesNotMatch(source, /^const records\s*=\s*\[/m)
  assert.doesNotMatch(source, /@effectify\/(?:hatchet|react-query|solid-query)|0\.5\.13|1\.1\.13/)
  assert.doesNotMatch(source, /execSync|spawnSync|shell: true|npm dist-tag|npm unpublish|release delete|tag", "-f/)
})
