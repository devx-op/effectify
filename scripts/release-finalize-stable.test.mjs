import assert from "node:assert/strict"
import { chmodSync, existsSync, mkdtempSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { spawn } from "node:child_process"
import nodeTest from "node:test"

const finalize = new URL("release-finalize-stable.sh", import.meta.url).pathname
const sha = "1234567890abcdef1234567890abcdef12345678"
const records = [
  ["@effectify/hatchet", "packages/hatchet/package.json", "0.1.0"],
  ["@effectify/node-better-auth", "packages/node/better-auth/package.json", "0.5.12"],
  ["@effectify/prisma", "packages/prisma/package.json", "1.1.13"],
  ["@effectify/react-query", "packages/react/query/package.json", "1.0.0"],
  ["@effectify/react-router", "packages/react/router/package.json", "0.6.0"],
  ["@effectify/react-router-better-auth", "packages/react/router-better-auth/package.json", "0.5.12"],
  ["@effectify/solid-query", "packages/solid/query/package.json", "0.5.13"],
]
const dispatcher = String.raw`#!/usr/bin/env node
const fs=require('fs'),p=require('path'),cmd=p.basename(process.argv[1]),a=process.argv.slice(2),file=process.env.FAKE_STATE;
let s=JSON.parse(fs.readFileSync(file)); s.log.push([cmd,...a]); const save=()=>fs.writeFileSync(file,JSON.stringify(s));
const mut=/^(tag|push)$/.test(a[0])&&cmd==='git'||cmd==='pnpm'||cmd==='gh'&&a[0]==='release'&&a[1]==='create';
if(mut){s.ordinal=(s.ordinal||0)+1;if(+process.env.FAIL_ORDINAL===s.ordinal&&process.env.FAIL_WHEN==='before'){save();process.exit(42)}}
const tag=x=>{s.tags[x]={direct:'object-'+x,peeled:process.env.RETARGET_SHA||s.sha,annotated:true}}
if(cmd==='git'){
 if(a[0]==='fetch'||a[0]==='config'){save();process.exit(0)}
 if(a[0]==='rev-parse'){console.log(a[1]==='HEAD'?(s.head||s.sha):(s.origin||s.sha));save();process.exit(0)}
 if(a[0]==='ls-remote'){let t=a[3].slice(10),v=s.tags[t];if(v){console.log(v.direct+'\trefs/tags/'+t);if(v.duplicate)console.log(v.direct+'\trefs/tags/'+t);if(v.annotated!==false&&v.peeled)console.log(v.peeled+'\trefs/tags/'+t+'^{}')}save();process.exit(0)}
 if(a[0]==='show-ref'){process.exit(s.local?.[a[3].slice(10)]?0:1)}
 if(a[0]==='tag'){let t=a[2];(s.local??={})[t]=true;save()}
 if(a[0]==='push'){for(const r of a.slice(3)){let t=r.split(':')[0].slice(10);tag(t)}save()}
}else if(cmd==='gh'){
 let t=a[2]; if(a[1]==='view'){let v=s.releases[t];if(!v){console.error(s.ghError||'release not found');save();process.exit(s.ghStatus||1)}console.log(JSON.stringify(v));save()}
 else {s.releases[t]={tagName:t,isDraft:false,isPrerelease:false};save()}
}else if(cmd==='npm'){
 let n=a[1],v=s.npm[n]||{versions:[],latest:'alpha',alpha:'alpha-sentinel',beta:'beta-sentinel'}; if((v.unknown||0)>0){v.unknown--;s.npm[n]=v;save();process.exit(1)}
 let value=a[2]==='versions'?v.versions:v.latest;if(a[2]!=='versions'&&(v.staleReads||0)>0){v.staleReads--;value=v.staleLatest||'beta';s.npm[n]=v}console.log(JSON.stringify(value));save()
}else if(cmd==='pnpm'){
 let names=a[3].replace('--projects=','').split(',');for(const n of names){let rec=s.expected[n],prior=s.npm[n]||{},next={...prior,versions:[rec],latest:rec};if(prior.postPublishStale)next.staleReads=prior.postPublishStale;s.npm[n]=next}save()
}else if(cmd==='sleep'){save()}else process.exit(127)
if(mut&&+process.env.FAIL_ORDINAL===s.ordinal&&process.env.FAIL_WHEN==='after'){save();process.exit(43)}save()`

function world(mode="missing") {
  const cwd=mkdtempSync(join(tmpdir(),"finalize-runtime-")), bin=join(cwd,"bin"), state=join(cwd,"state.json")
  mkdirSync(bin); writeFileSync(join(bin,"fake"),dispatcher); chmodSync(join(bin,"fake"),0o755)
  for(const c of ["git","gh","npm","pnpm"]) symlinkSync("fake",join(bin,c))
  writeFileSync(join(bin,"sleep"),"#!/bin/bash\nexit 0\n"); chmodSync(join(bin,"sleep"),0o755)
  const utilities=["bash","env","mktemp","sort","uniq","grep","awk","paste","seq","cat","rm","mkdir","dirname","basename","date","chmod","cp","mv","printf"]
  for(const utility of utilities){const source=utility==='bash'?'/bin/bash':[join('/usr/bin',utility),join('/bin',utility)].find(existsSync);assert.ok(source,`required host utility unavailable: ${utility}`);symlinkSync(source,join(bin,utility))}
  symlinkSync(process.execPath,join(bin,"node"))
  const expected={}, npm={}, tags={}, releases={}
  for(const [name,path,version] of records){mkdirSync(join(cwd,path,".."),{recursive:true});writeFileSync(join(cwd,path),JSON.stringify({name,version}));expected[name]=version;npm[name]={versions:mode==='exact'?[version]:[],latest:mode==='exact'?version:'alpha',alpha:'alpha-sentinel',beta:'beta-sentinel'};if(mode==='exact'){const t=`${name}@${version}`;tags[t]={direct:`object-${t}`,peeled:sha,annotated:true};releases[t]={tagName:t,isDraft:false,isPrerelease:false}}}
  writeFileSync(state,JSON.stringify({sha,expected,npm,tags,releases,log:[]}))
  return {cwd,state,bin}
}
function run(w,extra={}) { return new Promise(resolve=>{const child=spawn("bash",[finalize],{cwd:w.cwd,env:{...process.env,PATH:w.bin,EXPECTED_SHA:sha,NPM_READ_DELAY:"0",FAKE_STATE:w.state,...extra}});let stdout="",stderr="";child.stdout.setEncoding("utf8").on("data",x=>stdout+=x);child.stderr.setEncoding("utf8").on("data",x=>stderr+=x);child.on("close",(status,signal)=>resolve({status,signal,stdout,stderr}))}) }
function runUnknown(w) { return new Promise(resolve=>{const child=spawn("finalize-harness-unknown-command",[],{cwd:w.cwd,env:{PATH:w.bin}});child.on("error",error=>resolve(error));child.on("close",status=>resolve(status))}) }
const state=w=>JSON.parse(readFileSync(w.state))
const mutations=s=>s.log.filter(([c,...a])=>c==='pnpm'||c==='gh'&&a[0]==='release'&&a[1]==='create'||c==='git'&&['tag','push'].includes(a[0]))

const options={timeout:60_000}
const scenarios=[]
const test=(name,_options,fn)=>scenarios.push({name,fn})

test("harness PATH is hermetic and unknown commands fail",options,async()=>{const w=world();assert.equal(w.bin.includes(process.env.PATH||"\0"),false);const result=await runUnknown(w);assert.equal(result.code,"ENOENT")})

test("all missing converges through real script, with exact atomic refs, releases, projects, and latest",options,async()=>{
 const w=world(),r=await run(w),s=state(w);assert.equal(r.status,0,JSON.stringify({stdout:r.stdout,stderr:r.stderr,log:s.log.slice(-8)}));assert.equal(Object.keys(s.tags).length,7);assert.ok(Object.values(s.tags).every(x=>x.peeled===sha&&x.annotated));assert.equal(Object.keys(s.releases).length,7);assert.deepEqual(Object.keys(s.npm).sort(),records.map(x=>x[0]).sort());for(const [n,,v] of records)assert.deepEqual(s.npm[n],{versions:[v],latest:v,alpha:'alpha-sentinel',beta:'beta-sentinel'});
 const push=s.log.find(x=>x[0]==='git'&&x[1]==='push');assert.deepEqual(push.slice(1,4),['push','--atomic','origin']);assert.deepEqual(push.slice(4),records.map(([n,,v])=>`refs/tags/${n}@${v}:refs/tags/${n}@${v}`));const pub=s.log.find(x=>x[0]==='pnpm');assert.equal(pub[4],`--projects=${records.map(x=>x[0]).join(',')}`)
})
test("exact replay is mutation-free and preserves alpha/beta",options,async()=>{const w=world('exact'),r=await run(w),s=state(w);assert.equal(r.status,0,r.stderr);assert.deepEqual(mutations(s),[]);for(const value of Object.values(s.npm)){assert.equal(value.alpha,'alpha-sentinel');assert.equal(value.beta,'beta-sentinel')}})
    test("partial npm converges without changing alpha/beta",options,async()=>{const w=world('exact'),s=state(w),[name,,version]=records[0];s.npm[name].versions=[];s.npm[name].latest='alpha';writeFileSync(w.state,JSON.stringify(s));const r=await run(w),done=state(w);assert.equal(r.status,0,r.stderr);assert.deepEqual(done.npm[name],{versions:[version],latest:version,alpha:'alpha-sentinel',beta:'beta-sentinel'})})
    test("partial tags converge exactly",options,async()=>{const w=world('exact'),s=state(w),[name,,version]=records[0],tag=`${name}@${version}`;delete s.tags[tag];writeFileSync(w.state,JSON.stringify(s));const r=await run(w),done=state(w);assert.equal(r.status,0,r.stderr);assert.deepEqual(done.tags[tag],{direct:`object-${tag}`,peeled:sha,annotated:true})})
    test("partial releases converge exactly",options,async()=>{const w=world('exact'),s=state(w),[name,,version]=records[0],tag=`${name}@${version}`;delete s.releases[tag];writeFileSync(w.state,JSON.stringify(s));const r=await run(w),done=state(w);assert.equal(r.status,0,r.stderr);assert.deepEqual(done.releases[tag],{tagName:tag,isDraft:false,isPrerelease:false})})
for(const kind of ['identity','head','origin']) test(`${kind} mismatch fails before remote mutation`,options,async()=>{const w=world();let s=state(w);if(kind==='identity'){writeFileSync(join(w.cwd,records[0][1]),JSON.stringify({name:'wrong',version:'0.1.0'}))}else{s[kind]='f'.repeat(40);writeFileSync(w.state,JSON.stringify(s))}const r=await run(w);assert.notEqual(r.status,0);assert.deepEqual(mutations(state(w)),[]);assert.match(r.stderr,/mismatch|does not match/)})
for(const when of ['before','after']) for(let ordinal=1;ordinal<=16;ordinal++) {
     if(when==='after'&&ordinal===8)continue
     test(`mutable command ${ordinal} interrupted ${when} is forward-only and replay converges`,options,async()=>{const w=world();const first=await run(w,{FAIL_ORDINAL:String(ordinal),FAIL_WHEN:when});assert.notEqual(first.status,0,`${when} ${ordinal}`);let s=state(w);s.ordinal=0;s.local={};writeFileSync(w.state,JSON.stringify(s));const replay=await run(w);s=state(w);assert.equal(replay.status,0,JSON.stringify({when,ordinal,stdout:replay.stdout,stderr:replay.stderr}));assert.equal(Object.keys(s.tags).length,7);assert.ok(Object.values(s.tags).every(x=>x.peeled===sha&&x.annotated));assert.equal(Object.keys(s.releases).length,7);for(const [n,,v] of records)assert.deepEqual(s.npm[n],{versions:[v],latest:v,alpha:'alpha-sentinel',beta:'beta-sentinel'})})
    }
    test("atomic tag push response-loss-converged only after exact postcondition",options,async()=>{const w=world();const result=await run(w,{FAIL_ORDINAL:'8',FAIL_WHEN:'after'}),s=state(w);assert.equal(result.status,0,result.stderr);assert.equal(Object.keys(s.tags).length,7);assert.ok(Object.values(s.tags).every(x=>x.peeled===sha&&x.annotated))})
for(const kind of ['lightweight','duplicate','tag-sha','draft','prerelease','wrong-tag','latest','gh-auth']) test(`${kind} state fails closed without mutation`,options,async()=>{const w=world('exact'),s=state(w),[n,,v]=records[0],t=`${n}@${v}`;if(kind==='lightweight')s.tags[t].annotated=false;if(kind==='duplicate')s.tags[t].duplicate=true;if(kind==='tag-sha')s.tags[t].peeled='f'.repeat(40);if(kind==='draft')s.releases[t].isDraft=true;if(kind==='prerelease')s.releases[t].isPrerelease=true;if(kind==='wrong-tag')s.releases[t].tagName='wrong';if(kind==='latest')s.npm[n].latest='beta';if(kind==='gh-auth'){delete s.releases[t];s.ghError='authentication required';s.ghStatus=1}writeFileSync(w.state,JSON.stringify(s));const r=await run(w);assert.notEqual(r.status,0,kind);assert.deepEqual(mutations(state(w)),[])})
test("npm eventual visibility succeeds",options,async()=>{const w=world('exact'),s=state(w);s.npm[records[0][0]].unknown=2;writeFileSync(w.state,JSON.stringify(s));assert.equal((await run(w)).status,0)})
for(const boundary of ["preflight","postpublish"]) test(`stale latest converges at ${boundary} visibility boundary`,options,async()=>{const w=world(boundary==="preflight"?"exact":"missing"),s=state(w),[name]=records[0];if(boundary==="preflight")s.npm[name].staleReads=2;else s.npm[name].postPublishStale=2;writeFileSync(w.state,JSON.stringify(s));const r=await run(w);assert.equal(r.status,0,r.stderr)})
for(const boundary of ["preflight","postpublish"]) test(`persistent latest divergence exhausts exactly six reads at ${boundary}`,options,async()=>{const w=world(boundary==="preflight"?"exact":"missing"),s=state(w),[name]=records[0];if(boundary==="preflight")s.npm[name].staleReads=99;else s.npm[name].postPublishStale=99;writeFileSync(w.state,JSON.stringify(s));const r=await run(w),done=state(w);assert.notEqual(r.status,0);assert.match(r.stderr,/permanent latest divergence/);const boundaryLog=boundary==="postpublish"?done.log.slice(done.log.findIndex(([c])=>c==="pnpm")+1):done.log;assert.equal(boundaryLog.filter(([c,command,n,field])=>c==="npm"&&command==="view"&&n===name&&field==="versions").length,6);assert.deepEqual(boundary==="preflight"?mutations(done):mutations({...done,log:boundaryLog}),[])})
test("npm unreadable exhaustion diagnoses",options,async()=>{const w=world('exact'),s=state(w);s.npm[records[0][0]].unknown=99;writeFileSync(w.state,JSON.stringify(s));const r=await run(w);assert.notEqual(r.status,0);assert.match(r.stdout+r.stderr,/unreadable after 6 attempts/)})

nodeTest("release finalize stable scenarios",{concurrency:4,timeout:180_000},async t=>{
 await Promise.all(scenarios.map(({name,fn})=>t.test(name,options,fn)))
})
