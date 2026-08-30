import assert from "node:assert/strict"
import { spawn } from "node:child_process"
import { chmodSync, mkdtempSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from "node:fs"
import { createServer } from "node:http"
import { tmpdir } from "node:os"
import { join } from "node:path"
import test from "node:test"

const script = new URL("release-finalize-stable.mjs", import.meta.url).pathname
const stableWorkflow = readFileSync(new URL("../.github/workflows/release-stable.yml", import.meta.url), "utf8")
const sha = "1234567890abcdef1234567890abcdef12345678"
const historicalSha = "abcdef1234567890abcdef1234567890abcdef12"
const records = [
  ["@effectify/hatchet", "packages/hatchet/package.json", "0.1.0"],
  ["@effectify/node-better-auth", "packages/node/better-auth/package.json", "0.5.12"],
  ["@effectify/prisma", "packages/prisma/package.json", "1.1.13"],
  ["@effectify/react-query", "packages/react/query/package.json", "1.0.0"],
  ["@effectify/react-router", "packages/react/router/package.json", "0.6.0"],
  ["@effectify/react-router-better-auth", "packages/react/router-better-auth/package.json", "0.5.12"],
  ["@effectify/solid-query", "packages/solid/query/package.json", "0.5.13"],
]
const fake = String.raw`#!/usr/bin/env node
const fs=require('fs'),p=require('path'),cmd=p.basename(process.argv[1]),a=process.argv.slice(2),f=process.env.FAKE_STATE
let s=JSON.parse(fs.readFileSync(f)), out=x=>process.stdout.write(String(x)), save=()=>fs.writeFileSync(f,JSON.stringify(s))
s.log.push([cmd,...a]);
function finish(code=0){save();process.exit(code)}
if(cmd==='git'){
 if(a[0]==='fetch'||a[0]==='config')finish()
 if(a[0]==='rev-parse'){out((a[1]==='HEAD'?s.head:s.origin)+'\n');finish()}
 if(a[0]==='ls-remote'){
  const t=a[3].slice(10),v=s.tags[t]; if(v){if(v.raw)out(v.raw.replaceAll('$TAG',t));else{out((v.direct||'a'.repeat(40))+'\trefs/tags/'+t+'\n');if(v.peeled!==null)out((v.peeled||s.sha)+'\trefs/tags/'+t+'^{}\n')}} finish()
 }
 if(a[0]==='for-each-ref'){const t=a[2].slice(10),v=s.localTags[t];if(v)out((v.type||'tag')+'\t'+(v.peeled||s.sha)+'\n');finish()}
 if(a[0]==='tag'){s.localTags[a[2]]={type:'tag',peeled:a[3]};finish()}
 if(a[0]==='push'){if(s.pushExit)finish(s.pushExit);for(const r of a.slice(3)){const t=r.split(':')[0].slice(10);s.tags[t]={peeled:s.localTags[t].peeled}}finish()}
 finish(127)
}
if(cmd==='npm'){
 const n=a[1],field=a[2],v=s.npm[n],q=v[field==='versions'?'versionsQueue':'latestQueue'];let x=q&&q.length?q.shift():field==='versions'?v.versions:v.latest
 if(q&&q.length===0){if(field==='versions')v.versions=x;else v.latest=x}
 if(x&&typeof x==='object'&&x.exit){process.stderr.write(x.stderr||'failure');finish(x.exit)}
 if(x&&typeof x==='object'&&Object.hasOwn(x,'raw'))out(x.raw);else out(JSON.stringify(x)+(v.pretty?'\n':'\n'));finish()
}
if(cmd==='pnpm'){
 const names=a[3].slice(11).split(','),count=s.publishSubset??names.length;for(const n of names.slice(0,count)){const v=s.expected[n],old=s.npm[n];old.versions=[v];old.latest=v;if(old.delayedVersions){old.versions=[];old.versionsQueue=Array(old.delayedVersions).fill([]).concat([[v]])}if(old.delayedLatest){old.latest='alpha';old.latestQueue=Array(old.delayedLatest).fill('alpha').concat(v)}} finish(s.publishExit||0)
}
finish(127)`

function load(file) { return JSON.parse(readFileSync(file, "utf8")) }
function save(file, value) { writeFileSync(file, JSON.stringify(value)) }
function mutations(state) { return state.log.filter(([c, a]) => c === "pnpm" || (c === "git" && (a === "tag" || a === "push")) || (c === "http" && a === "POST")) }

async function world(mode = "absent") {
  const cwd = mkdtempSync(join(tmpdir(), "stable-finalize-")), bin = join(cwd, "bin"), stateFile = join(cwd, "state.json")
  mkdirSync(bin); writeFileSync(join(bin, "fake.cjs"), fake); chmodSync(join(bin, "fake.cjs"), 0o755)
  for (const command of ["git", "npm", "pnpm"]) symlinkSync("fake.cjs", join(bin, command))
  symlinkSync(process.execPath, join(bin, "node"))
  const expected = {}, npm = {}, tags = {}, releases = {}
  for (const [name, path, version] of records) {
    mkdirSync(join(cwd, path, ".."), { recursive: true }); writeFileSync(join(cwd, path), JSON.stringify({ name, version }))
    expected[name] = version; npm[name] = { versions: mode === "exact" ? [version] : [], latest: mode === "exact" ? version : "alpha", alpha: "alpha-sentinel", beta: "beta-sentinel" }
    if (mode === "exact") { const tag = `${name}@${version}`; tags[tag] = { peeled: sha }; releases[tag] = { tag_name: tag, draft: false, prerelease: false } }
  }
  save(stateFile, { sha, head: sha, origin: sha, expected, npm, tags, releases, localTags: {}, log: [] })
  const server = createServer((request, response) => {
    const state = load(stateFile), method = request.method, path = request.url; state.log.push(["http", method, path])
    const send = (status, body = "") => { save(stateFile, state); response.writeHead(status, { "content-type": "application/json" }); response.end(typeof body === "string" ? body : JSON.stringify(body)) }
    if (method === "GET") {
      const tag = decodeURIComponent(path.split("/releases/tags/")[1] || ""), configured = state.ghReadStatus
      if (configured) return send(configured, { message: "configured" })
      return state.releases[tag] ? send(200, state.releases[tag]) : send(404, { message: "not found" })
    }
    let body = ""; request.on("data", x => body += x); request.on("end", () => {
      const value = JSON.parse(body), tag = value.tag_name, status = state.ghCreateStatus || 201
      if (state.ghCreateMaterializes !== false) state.releases[tag] = { tag_name: tag, draft: false, prerelease: false }
      send(status, status === 422 ? { message: "already exists" } : state.releases[tag])
    })
  })
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve))
  return { cwd, bin, stateFile, server, api: `http://127.0.0.1:${server.address().port}` }
}
async function run(w, args = [], environment = {}) {
  return await new Promise(resolve => {
    const child = spawn(process.execPath, [script, ...args], { cwd: w.cwd, env: { PATH: w.bin, EXPECTED_SHA: sha, ARTIFACT_SHA: "", NPM_READ_DELAY_MS: "0", FINALIZE_COMMAND_TIMEOUT_MS: "5000", GITHUB_API_URL: w.api, GITHUB_REPOSITORY: "owner/repo", GITHUB_TOKEN: "fake", FAKE_STATE: w.stateFile, ...environment } })
    let stdout = "", stderr = ""; child.stdout.on("data", x => stdout += x); child.stderr.on("data", x => stderr += x); child.on("close", status => resolve({ status, stdout, stderr }))
  })
}
async function scenario(t, name, setup, verify, mode = "exact", args = [], environment = {}) {
  await t.test(name, async () => { const w = await world(mode); try { const state = load(w.stateFile); await setup(state, w); save(w.stateFile, state); const result = await run(w, args, environment); await verify(result, load(w.stateFile), w) } finally { await new Promise(resolve => w.server.close(resolve)) } })
}
function exactState(state) { assert.equal(Object.keys(state.tags).length, 7); assert.equal(Object.keys(state.releases).length, 7); for (const [n,,v] of records) { assert.deepEqual(state.npm[n].versions, [v]); assert.equal(state.npm[n].latest, v); assert.equal(state.npm[n].alpha, "alpha-sentinel"); assert.equal(state.npm[n].beta, "beta-sentinel") } }
function historicalTags(state) { for (const [name,,version] of records) state.tags[`${name}@${version}`] = { peeled: historicalSha } }
function workflowPreflightInvocation() {
  const match = stableWorkflow.match(/^[ \t]*- name: 🔎 PREFLIGHT exact stable artifacts\n([\s\S]*?)(?=^[ \t]*- name:)/m)
  assert.ok(match, "stable workflow preflight step")
  const commands = [...match[1].matchAll(/^[ \t]*run:\s*(.+)$/gm)].map((entry) => entry[1].trim())
  assert.deepEqual(commands, ["bash scripts/release-finalize-stable.sh --preflight --json"])
  return { args: commands[0].split(/\s+/).slice(2), source: match[1] }
}

const scenarioNames = []
test("hermetic Node CLI matrix", { timeout: 120_000 }, async t => {
  const add = async (...args) => { scenarioNames.push(args[0]); await scenario(t, ...args) }
  await add("all exact replay has zero mutation", async()=>{}, (r,s)=>{assert.equal(r.status,0,r.stderr);assert.deepEqual(mutations(s),[])})
  await add("same-SHA all absent publishes normally", async()=>{}, (r,s)=>{assert.equal(r.status,0,r.stderr);exactState(s);const push=s.log.find(x=>x[0]==="git"&&x[1]==="push");assert.deepEqual(push.slice(1,4),["push","--atomic","origin"]);assert.equal(s.log.find(x=>x[0]==="pnpm")[4],`--projects=${records.map(x=>x[0]).join(",")}`)}, "absent")
  await add("historical all-existing artifacts succeed with zero mutation", async s=>historicalTags(s), (r,s)=>{assert.equal(r.status,0,r.stderr);assert.deepEqual(mutations(s),[])}, "exact", [], {ARTIFACT_SHA:historicalSha})
  await add("historical missing tag fails before mutation", async s=>{historicalTags(s);delete s.tags[`${records[0][0]}@${records[0][2]}`]}, (r,s)=>{assert.notEqual(r.status,0);assert.match(r.stderr,/historical replay requires exact existing/);assert.deepEqual(mutations(s),[])}, "exact", [], {ARTIFACT_SHA:historicalSha})
  await add("historical missing Release fails before mutation", async s=>{historicalTags(s);delete s.releases[`${records[0][0]}@${records[0][2]}`]}, (r,s)=>{assert.notEqual(r.status,0);assert.match(r.stderr,/historical replay requires exact existing/);assert.deepEqual(mutations(s),[])}, "exact", [], {ARTIFACT_SHA:historicalSha})
  await add("historical missing npm version fails before mutation", async s=>{historicalTags(s);s.npm[records[0][0]].versions=[]}, (r,s)=>{assert.notEqual(r.status,0);assert.match(r.stderr,/historical replay requires exact existing/);assert.deepEqual(mutations(s),[])}, "exact", [], {ARTIFACT_SHA:historicalSha})
  await add("historical latest mismatch fails before mutation", async s=>{historicalTags(s);s.npm[records[0][0]].latest="alpha"}, (r,s)=>{assert.notEqual(r.status,0);assert.match(r.stderr,/permanent latest divergence/);assert.deepEqual(mutations(s),[])}, "exact", [], {ARTIFACT_SHA:historicalSha})
  await add("wrong artifact SHA fails before mutation", async s=>historicalTags(s), (r,s)=>{assert.notEqual(r.status,0);assert.match(r.stderr,/tag state is divergent/);assert.deepEqual(mutations(s),[])}, "exact", [], {ARTIFACT_SHA:"f".repeat(40)})
  await add("malformed artifact SHA fails closed independently", async()=>{}, (r,s)=>{assert.notEqual(r.status,0);assert.match(r.stderr,/full lowercase artifact SHA/);assert.deepEqual(mutations(s),[])}, "exact", [], {ARTIFACT_SHA:"not-a-sha"})
  await add("malformed expected SHA fails closed independently", async s=>historicalTags(s), (r,s)=>{assert.notEqual(r.status,0);assert.match(r.stderr,/full lowercase expected SHA/);assert.deepEqual(mutations(s),[])}, "exact", [], {EXPECTED_SHA:"not-a-sha",ARTIFACT_SHA:historicalSha})
  for (const [index] of records.entries()) await add(`tag partial subset ${index+1} replays`, async s=>{for(const [n,,v] of records.slice(0,index+1))s.tags[`${n}@${v}`]={peeled:sha}}, (r,s)=>{assert.equal(r.status,0,r.stderr);exactState(s)}, "absent")
  for (const [index] of records.entries()) await add(`release partial subset ${index+1} replays`, async s=>{for(const [n,,v] of records)s.tags[`${n}@${v}`]={peeled:sha};for(const [n,,v] of records.slice(0,index+1))s.releases[`${n}@${v}`]={tag_name:`${n}@${v}`,draft:false,prerelease:false}}, (r,s)=>{assert.equal(r.status,0,r.stderr);exactState(s)}, "absent")
  for (const [index] of records.entries()) await add(`npm partial subset ${index+1} replays`, async s=>{for(const [n,,v] of records){s.tags[`${n}@${v}`]={peeled:sha};s.releases[`${n}@${v}`]={tag_name:`${n}@${v}`,draft:false,prerelease:false}}for(const [n,,v] of records.slice(0,index+1)){s.npm[n].versions=[v];s.npm[n].latest=v}}, (r,s)=>{assert.equal(r.status,0,r.stderr);exactState(s)}, "absent")
  for (const subset of [1,3,6]) await add(`publish nonzero after subset ${subset} then replay`, async s=>{s.publishSubset=subset;s.publishExit=42}, async(r,s,w)=>{assert.notEqual(r.status,0);delete s.publishExit;delete s.publishSubset;save(w.stateFile,s);const replay=await run(w);assert.equal(replay.status,0,replay.stderr);exactState(load(w.stateFile))}, "absent")
  for (const [format,value] of [["compact",[records[0][2]]],["pretty",{raw:`[\n  "${records[0][2]}"\n]\n`}],["scalar",records[0][2]]]) await add(`npm ${format} versions JSON`, async s=>{s.npm[records[0][0]].versionsQueue=[value]}, (r)=>assert.equal(r.status,0,r.stderr))
  await add("npm delayed latest converges", async s=>{s.npm[records[0][0]].latestQueue=["beta","beta",records[0][2]]}, r=>assert.equal(r.status,0,r.stderr))
  await add("post-publish delayed version visibility converges", async s=>{s.npm[records[0][0]].delayedVersions=2}, (r,s)=>{assert.equal(r.status,0,r.stderr);exactState(s)}, "absent")
  await add("post-publish delayed latest converges", async s=>{s.npm[records[0][0]].delayedLatest=2}, (r,s)=>{assert.equal(r.status,0,r.stderr);exactState(s)}, "absent")
  await add("failed atomic push materializes no refs and replay reuses local tags", async s=>{s.pushExit=1}, async(r,s,w)=>{assert.notEqual(r.status,0);assert.equal(Object.keys(s.tags).length,0);assert.equal(Object.keys(s.localTags).length,7);delete s.pushExit;save(w.stateFile,s);const replay=await run(w);assert.equal(replay.status,0,replay.stderr);exactState(load(w.stateFile))}, "absent")
  for (const [name,spec] of [["null",null],["empty",{raw:""}],["truncated",{raw:"[\"1.0"}],["object",{}],["mixed",[records[0][2],3]],["DNS",{exit:1,stderr:"ENOTFOUND"}],["auth",{exit:1,stderr:"E401"}],["rate",{exit:1,stderr:"E429"}],["5xx",{exit:1,stderr:"E503"}],["E404",{exit:1,stderr:"E404"}]]) await add(`npm ${name} is unknown and never publishes`, async s=>{s.npm[records[0][0]].versionsQueue=Array(6).fill(spec)}, (r,s)=>{assert.notEqual(r.status,0);assert.equal(mutations(s).length,0)})
  for (const status of [401,403,429,500,503]) await add(`GitHub ${status} read is unknown`, async s=>{s.ghReadStatus=status}, (r,s)=>{assert.notEqual(r.status,0);assert.equal(mutations(s).length,0)})
  await add("GitHub 404 is proven absent", async s=>{delete s.releases[`${records[0][0]}@${records[0][2]}`]}, (r,s)=>{assert.equal(r.status,0,r.stderr);exactState(s)})
  await add("GitHub 422 create reconciles materialized exact release", async s=>{s.ghCreateStatus=422}, (r,s)=>{assert.equal(r.status,0,r.stderr);exactState(s)}, "absent")
  await add("GitHub 422 without exact state fails", async s=>{s.ghCreateStatus=422;s.ghCreateMaterializes=false}, (r)=>assert.notEqual(r.status,0), "absent")
  for (const [name,raw] of [["lightweight",`${"a".repeat(40)}\trefs/tags/$TAG\n`],["malformed","garbage\n"],["wrong SHA",`${"a".repeat(40)}\trefs/tags/$TAG\n${"f".repeat(40)}\trefs/tags/$TAG^{}\n`],["duplicate",`${"a".repeat(40)}\trefs/tags/$TAG\n${"b".repeat(40)}\trefs/tags/$TAG\n${sha}\trefs/tags/$TAG^{}\n`]]) await add(`tag ${name} fails closed`, async s=>{s.tags[`${records[0][0]}@${records[0][2]}`]={raw}}, (r,s)=>{assert.notEqual(r.status,0);assert.equal(mutations(s).length,0)}, "absent")
  for (const [name,value] of [["lightweight",{type:"commit",peeled:sha}],["wrong SHA",{type:"tag",peeled:"f".repeat(40)}]]) await add(`local tag ${name} fails before mutation`, async s=>{s.localTags[`${records[0][0]}@${records[0][2]}`]=value}, (r,s)=>{assert.notEqual(r.status,0);assert.equal(mutations(s).length,0)}, "absent")
  await add("manifest name mismatch fails before mutation", async(s,w)=>writeFileSync(join(w.cwd,records[0][1]),JSON.stringify({name:"wrong",version:records[0][2]})), (r,s)=>{assert.notEqual(r.status,0);assert.equal(mutations(s).length,0)})
  await add("manifest version mismatch fails before mutation", async(s,w)=>writeFileSync(join(w.cwd,records[0][1]),JSON.stringify({name:records[0][0],version:"9.9.9"})), (r,s)=>{assert.notEqual(r.status,0);assert.equal(mutations(s).length,0)})
  await add("EXPECTED_SHA controls HEAD", async s=>{s.head="f".repeat(40)}, (r,s)=>{assert.notEqual(r.status,0);assert.equal(mutations(s).length,0)})
  await add("EXPECTED_SHA controls origin", async s=>{s.origin="f".repeat(40)}, (r,s)=>{assert.notEqual(r.status,0);assert.equal(mutations(s).length,0)})
  const preflight = workflowPreflightInvocation()
  assert.doesNotMatch(preflight.source, /NODE_AUTH_TOKEN|NPM_CONFIG_PROVENANCE|npm whoami|nx release publish|git (?:tag|push)|gh release (?:create|delete)/)
  await add("workflow historical preflight JSON includes both SHAs and reads only", async s=>historicalTags(s), (r,s)=>{assert.equal(r.status,0,r.stderr);const output=JSON.parse(r.stdout);assert.equal(output.expectedSha,sha);assert.equal(output.artifactSha,historicalSha);assert.equal(mutations(s).length,0)}, "exact", preflight.args, {ARTIFACT_SHA:historicalSha})
  assert.equal(new Set(scenarioNames).size, scenarioNames.length)
})

test("static command boundary keeps shell and destructive repairs out", () => {
  const source = readFileSync(script, "utf8")
  assert.match(source, /spawn\(file, args, \{ shell: false/)
  assert.doesNotMatch(source, /execSync|spawnSync|shell: true|npm dist-tag|npm unpublish|release delete|tag", "-f/)
})
