import assert from "node:assert/strict"
import { chmodSync, existsSync, mkdtempSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from "node:fs"
import { cp, readFile, rm, writeFile } from "node:fs/promises"
import { gzipSync } from "node:zlib"
import { tmpdir } from "node:os"
import { basename, join } from "node:path"
import test from "node:test"

import { createStableHandoff, verifyStableHandoff } from "./release-package-stable.mjs"

const artifactSha = "f31390ce66ea157ea8b75f5259c203123e269759"
const expectedSha = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
const metadata = {
  repository: "devx-op/effectify",
  workflowPath: ".github/workflows/release-stable.yml",
  workflowRef: "refs/heads/master",
  workflowSha: expectedSha,
  runId: "33399900011",
  runAttempt: "2",
  expectedSha,
  artifactSha,
}
const selection = ["@effectify/hatchet", "@effectify/prisma", "@effectify/react-query"]
const ledger = new URL("release-stable-abandonments.json", import.meta.url).pathname

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

function makeTarball(path, entries) {
  const blocks = []
  for (const [name, value] of [...entries].sort(([left], [right]) => left.localeCompare(right))) {
    const body = Buffer.isBuffer(value) ? value : Buffer.from(value)
    blocks.push(tarHeader(name, body.length), body)
    const padding = (512 - (body.length % 512)) % 512
    if (padding) blocks.push(Buffer.alloc(padding))
  }
  blocks.push(Buffer.alloc(1024))
  writeFileSync(path, gzipSync(Buffer.concat(blocks), { mtime: 0 }))
}

const manifests = {
  "@effectify/react-query": {
    name: "@effectify/react-query",
    version: "1.0.1",
    type: "module",
    main: "./dist/src/index.js",
    types: "./dist/src/index.d.ts",
    exports: {
      ".": {
        "@effectify/source": "./src/index.ts",
        types: "./dist/src/index.d.ts",
        import: "./dist/src/index.js",
        default: "./dist/src/index.js",
      },
    },
    files: ["dist"],
    dependencies: { tslib: "catalog:" },
  },
  "@effectify/prisma": {
    name: "@effectify/prisma",
    version: "1.1.14",
    main: "./src/cli.js",
    exports: { ".": "./dist/src/runtime/index.js", "./cli": "./src/cli.js" },
    files: ["dist"],
  },
  "@effectify/hatchet": {
    name: "@effectify/hatchet",
    version: "0.2.0",
    type: "module",
    main: "./dist/src/index.js",
    types: "./dist/src/index.d.ts",
    exports: {
      ".": {
        "@effectify/source": "./src/index.ts",
        types: "./dist/src/index.d.ts",
        import: "./dist/src/index.js",
        default: "./dist/src/index.js",
      },
      "./testing": {
        "@effectify/source": "./src/testing/index.ts",
        types: "./dist/src/testing/index.d.ts",
        import: "./dist/src/testing/index.js",
      },
    },
    files: ["dist"],
  },
}
const roots = {
  "@effectify/react-query": "packages/react/query",
  "@effectify/prisma": "packages/prisma",
  "@effectify/hatchet": "packages/hatchet",
}

function packedManifest(name) {
  const manifest = structuredClone(manifests[name])
  if (manifest.dependencies?.tslib === "catalog:") manifest.dependencies.tslib = "^2.8.1"
  return manifest
}

function entriesFor(name, override = {}) {
  const entries = new Map([
    ["package/package.json", `${JSON.stringify(packedManifest(name), null, 2)}\n`],
    ["package/dist/src/index.js", "export const value = 1\n"],
    ["package/dist/src/index.d.ts", "export declare const value: number\n"],
  ])
  if (name === "@effectify/hatchet") {
    entries.set("package/dist/src/testing/index.js", "export const testValue = 1\n")
    entries.set("package/dist/src/testing/index.d.ts", "export declare const testValue: number\n")
  }
  for (const [path, value] of Object.entries(override)) {
    if (value === undefined) entries.delete(path)
    else entries.set(path, value)
  }
  return entries
}

async function fixture(t, options = {}) {
  const cwd = mkdtempSync(join(tmpdir(), "stable-package-"))
  t.after(async () => {
    await rm(cwd, { recursive: true, force: true })
    assert.equal(existsSync(cwd), false)
  })
  const sourceRoot = join(cwd, "source")
  const outputDirectory = join(cwd, "handoff")
  const tarballSource = join(cwd, "tarballs")
  mkdirSync(sourceRoot, { recursive: true })
  mkdirSync(tarballSource)
  writeFileSync(join(sourceRoot, "nx.json"), JSON.stringify({ release: { projects: Object.values(roots) } }))
  for (const name of selection) {
    const root = join(sourceRoot, roots[name])
    mkdirSync(root, { recursive: true })
    writeFileSync(join(root, "project.json"), JSON.stringify({ name }))
    writeFileSync(join(root, "package.json"), `${JSON.stringify(manifests[name], null, 2)}\n`)
    if (name !== "@effectify/prisma") {
      const slug = name.slice(1).replace("/", "-")
      makeTarball(
        join(tarballSource, `${slug}-${manifests[name].version}.tgz`),
        entriesFor(name, options.entries?.[name]),
      )
    }
  }
  const log = join(cwd, "pnpm-log.jsonl")
  const fakePnpm = join(cwd, "pnpm")
  writeFileSync(
    fakePnpm,
    String.raw`#!/usr/bin/env node
const fs=require("node:fs"),path=require("node:path")
const args=process.argv.slice(2),destination=args[args.indexOf("--pack-destination")+1]
const manifest=JSON.parse(fs.readFileSync(path.join(process.cwd(),"package.json"),"utf8"))
const slug=manifest.name.slice(1).replace("/","-"),file=slug+"-"+manifest.version+".tgz"
fs.appendFileSync(process.env.PACK_LOG,JSON.stringify({cwd:process.cwd(),args})+"\n")
fs.copyFileSync(path.join(process.env.PACK_SOURCES,file),path.join(destination,file))
process.stdout.write(JSON.stringify([{name:manifest.name,version:manifest.version,filename:file}])+"\n")
`,
  )
  chmodSync(fakePnpm, 0o755)

  const create = () =>
    createStableHandoff({
      sourceRoot,
      outputDirectory,
      abandonmentPath: ledger,
      selection,
      metadata,
      pnpmExecutable: fakePnpm,
      environment: { ...process.env, PACK_LOG: log, PACK_SOURCES: tarballSource },
    })
  const verify = (expected = {}) =>
    verifyStableHandoff({
      directory: outputDirectory,
      abandonmentPath: ledger,
      expected: { ...metadata, selection, ...expected },
    })
  return { cwd, sourceRoot, outputDirectory, log, create, verify }
}

test("the pinned abandonment ledger has one fail-closed Prisma 1.1.14 disposition", () => {
  const value = JSON.parse(readFileSync(ledger, "utf8"))
  assert.deepEqual(Object.keys(value).sort(), ["abandonments", "schemaVersion"])
  assert.equal(value.schemaVersion, 1)
  assert.deepEqual(
    value.abandonments.map(({ artifactSha, project, name, version }) => ({ artifactSha, project, name, version })),
    [{ artifactSha, project: "@effectify/prisma", name: "@effectify/prisma", version: "1.1.14" }],
  )
  assert.match(value.abandonments[0].reason, /broken CLI\/export paths/)
  assert.doesNotMatch(JSON.stringify(value), /wildcard|override|process\.env|\$\{/i)
})

test("create packs only non-abandoned projects and verifies an exact schema-versioned handoff", async (t) => {
  const world = await fixture(t)
  const created = await world.create()
  assert.equal(created.schemaVersion, 1)
  assert.deepEqual(created.selection, [...selection].sort())
  assert.deepEqual(
    created.packages.map((item) => item.project),
    ["@effectify/hatchet", "@effectify/react-query"],
  )
  assert.equal(created.abandonments.length, 1)
  assert.equal(created.abandonments[0].project, "@effectify/prisma")
  assert.deepEqual((await world.verify()).packages, created.packages)

  const files = (await import("node:fs/promises")).readdir(world.outputDirectory)
  assert.deepEqual((await files).sort(), [
    "effectify-hatchet-0.2.0.tgz",
    "effectify-react-query-1.0.1.tgz",
    "handoff.json",
  ])
  const calls = readFileSync(world.log, "utf8").trim().split("\n").map(JSON.parse)
  assert.equal(calls.length, 2)
  assert.equal(
    calls.some((call) => call.cwd.endsWith("/packages/prisma")),
    false,
  )
  for (const call of calls) {
    assert.deepEqual(call.args.slice(0, 2), ["pack", "--json"])
    assert.equal(call.args.includes("--pack-destination"), true)
  }
})

test("create accepts an unselected prerelease release project without packing it", async (t) => {
  const world = await fixture(t)
  const prereleaseName = "@effectify/canary"
  const prereleaseRoot = "packages/canary"
  const nxPath = join(world.sourceRoot, "nx.json")
  const nx = JSON.parse(readFileSync(nxPath, "utf8"))
  nx.release.projects.push(prereleaseRoot)
  writeFileSync(nxPath, JSON.stringify(nx))
  mkdirSync(join(world.sourceRoot, prereleaseRoot), { recursive: true })
  writeFileSync(join(world.sourceRoot, prereleaseRoot, "project.json"), JSON.stringify({ name: prereleaseName }))
  writeFileSync(
    join(world.sourceRoot, prereleaseRoot, "package.json"),
    JSON.stringify({ name: prereleaseName, version: "2.0.0-beta.3" }),
  )

  const created = await world.create()

  assert.deepEqual(created.selection, [...selection].sort())
  assert.equal(
    created.packages.some(({ project }) => project === prereleaseName),
    false,
  )
  const calls = readFileSync(world.log, "utf8").trim().split("\n").map(JSON.parse)
  assert.equal(
    calls.some((call) => call.cwd.endsWith(`/${prereleaseRoot}`)),
    false,
  )
})

test("create rejects selected prereleases and keeps abandonment identity matching exact", async (t) => {
  await t.test("selected prerelease", async (t) => {
    const world = await fixture(t)
    const manifest = { ...manifests["@effectify/hatchet"], version: "0.2.1-beta.1" }
    writeFileSync(join(world.sourceRoot, roots["@effectify/hatchet"], "package.json"), JSON.stringify(manifest))

    await assert.rejects(world.create, /selected source package version must be stable SemVer/i)
  })

  await t.test("abandonment version mismatch", async (t) => {
    const world = await fixture(t)
    const manifest = { ...manifests["@effectify/prisma"], version: "1.1.15" }
    writeFileSync(join(world.sourceRoot, roots["@effectify/prisma"], "package.json"), JSON.stringify(manifest))

    await assert.rejects(world.create, /abandonment identity does not match source package/i)
  })
})

test("handoff binds current-run metadata, selection, source manifests, tarball digests, integrity, and inventory", async (t) => {
  const world = await fixture(t)
  await world.create()
  const handoff = JSON.parse(await readFile(join(world.outputDirectory, "handoff.json"), "utf8"))
  assert.deepEqual(
    {
      repository: handoff.repository,
      workflowPath: handoff.workflow.path,
      workflowRef: handoff.workflow.ref,
      workflowSha: handoff.workflow.sha,
      runId: handoff.run.id,
      runAttempt: handoff.run.attempt,
      expectedSha: handoff.expectedSha,
      artifactSha: handoff.artifactSha,
    },
    metadata,
  )
  for (const item of handoff.packages) {
    assert.match(item.sourceManifestSha256, /^[0-9a-f]{64}$/)
    assert.match(item.tarball.sha1, /^[0-9a-f]{40}$/)
    assert.match(item.tarball.sha256, /^[0-9a-f]{64}$/)
    assert.match(item.tarball.sha512, /^[0-9a-f]{128}$/)
    assert.equal(item.tarball.integrity, `sha512-${Buffer.from(item.tarball.sha512, "hex").toString("base64")}`)
    assert.ok(item.tarball.size > 0)
    assert.ok(item.inventory.some(({ path, size }) => path === "package/package.json" && size > 0))
    assert.ok(item.inventory.some(({ path, size }) => path.startsWith("package/dist/") && size > 0))
  }
})

test("verification rejects wrong current-run metadata, selection, extras, symlinks, and digest changes", async (t) => {
  for (const [name, mutate, pattern] of [
    ["run ID", async (world) => world.verify({ runId: "33399900012" }), /run ID/i],
    ["selection", async (world) => world.verify({ selection: selection.slice(1) }), /selection/i],
    [
      "extra file",
      async (world) => {
        await writeFile(join(world.outputDirectory, "extra.txt"), "extra")
        return world.verify()
      },
      /extra/i,
    ],
    [
      "symlink",
      async (world) => {
        symlinkSync("handoff.json", join(world.outputDirectory, "alias.tgz"))
        return world.verify()
      },
      /symlink|regular file/i,
    ],
    [
      "digest",
      async (world) => {
        const tarball = join(world.outputDirectory, "effectify-hatchet-0.2.0.tgz")
        const value = await readFile(tarball)
        value[value.length - 1] ^= 1
        await writeFile(tarball, value)
        return world.verify()
      },
      /digest|tarball/i,
    ],
  ]) {
    await t.test(name, async (t) => {
      const world = await fixture(t)
      await world.create()
      await assert.rejects(() => mutate(world), pattern)
    })
  }
})

test("create rejects missing or empty dist and runtime entrypoints while ignoring @effectify/source", async (t) => {
  for (const [name, entries, pattern] of [
    [
      "missing dist",
      {
        "package/dist/src/index.js": undefined,
        "package/dist/src/index.d.ts": undefined,
        "package/dist/src/testing/index.js": undefined,
        "package/dist/src/testing/index.d.ts": undefined,
      },
      /dist/i,
    ],
    ["empty runtime", { "package/dist/src/index.js": "" }, /empty runtime entrypoint/i],
    ["missing runtime", { "package/dist/src/index.d.ts": undefined }, /missing runtime entrypoint/i],
  ]) {
    await t.test(name, async (t) => {
      const world = await fixture(t, { entries: { "@effectify/hatchet": entries } })
      await assert.rejects(world.create, pattern)
    })
  }
})

test("verification rejects unsafe packed inventory, malformed identity, and unresolved package normalization", async (t) => {
  for (const [name, project, override, pattern] of [
    ["unsafe path", "@effectify/hatchet", { "package/../escape": "bad" }, /unsafe packed path/i],
    [
      "wrong name",
      "@effectify/hatchet",
      {
        "package/package.json": `${JSON.stringify({ ...packedManifest("@effectify/hatchet"), name: "@effectify/imposter" })}\n`,
      },
      /package identity/i,
    ],
    [
      "unresolved catalog",
      "@effectify/react-query",
      { "package/package.json": `${JSON.stringify(manifests["@effectify/react-query"])}\n` },
      /package normalization/i,
    ],
  ]) {
    await t.test(name, async (t) => {
      const world = await fixture(t, { entries: { [project]: override } })
      await assert.rejects(world.create, pattern)
    })
  }
})
