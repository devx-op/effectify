import assert from "node:assert/strict"
import { execFile } from "node:child_process"
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { promisify } from "node:util"
import test from "node:test"

const execFileAsync = promisify(execFile)
const repositoryRoot = resolve(import.meta.dirname, "..")
const verifier = resolve(import.meta.dirname, "verify-react-router-consolidation.mjs")
const manifestVerifier = resolve(import.meta.dirname, "verify-react-router-manifests.mjs")
const ledgerPath = resolve(repositoryRoot, "docs/migrations/react-remix-to-react-router.md")
const bridgeManifest = JSON.stringify({ name: "@effectify/react-remix", version: "0.5.12-alpha.1" })

const openLedger = (source) => {
  const [beforeConsumers, consumerAndScenarios] = source.split("## Repository consumer inventory")
  const [consumers, afterConsumers] = consumerAndScenarios.split("## Behavior scenario inventory")
  const completedConsumers = consumers
    .replaceAll("pending-migration", "remove-at-retirement")
    .replaceAll("| PENDING  | NO       |", "| kattsushi | YES      |")

  return `${beforeConsumers.replace("Retirement gate: **CLOSED**", "Retirement gate: **OPEN**")}## Repository consumer inventory${completedConsumers}## Behavior scenario inventory${afterConsumers}`
}

const mutations = {
  "missing consumer": (ledger) => ledger.replace(/^\| C19 \|.*\n/m, ""),
  "incomplete scenario": (ledger) =>
    ledger.replace(/^(\| shell\s+\|.*\| kattsushi \|) YES(\s+\|)$/m, "$1 NO $2"),
  "reviewer-empty row": (ledger) =>
    ledger.replace(/^(\| shell\s+\|.*\|) kattsushi (\| YES\s+\|)$/m, "$1           $2"),
  "missing evidence target": (ledger) =>
    ledger.replace(
      "apps/react-router-example/tests/routes/login.test.tsx",
      "apps/react-router-example/tests/routes/missing-login.test.tsx",
    ),
  "absent rollback version": (ledger) =>
    ledger.replace(/^Final supported bridge rollback version:.*\n/m, ""),
}

const fixture = async (mutate = (ledger) => ledger) => {
  const root = await mkdtemp(join(tmpdir(), "react-router-consolidation-"))
  await mkdir(join(root, "docs/migrations"), { recursive: true })
  await mkdir(join(root, "packages/react/remix"), { recursive: true })
  const ledger = await readFile(ledgerPath, "utf8")
  await writeFile(join(root, "docs/migrations/react-remix-to-react-router.md"), mutate(openLedger(ledger)))
  await writeFile(join(root, "packages/react/remix/package.json"), bridgeManifest)
  await execFileAsync("git", ["init", "--quiet"], { cwd: root })
  await execFileAsync("git", ["add", "."], { cwd: root })
  return root
}

const writeFixtureFile = async (root, file, source) => {
  const target = join(root, file)
  await mkdir(dirname(target), { recursive: true })
  await writeFile(target, source)
  await execFileAsync("git", ["add", file], { cwd: root })
}

const retireFixture = async (root) => {
  await rm(join(root, "packages"), { recursive: true })
}

const verify = async (root, expected = "open") => {
  try {
    const { stdout } = await execFileAsync(process.execPath, [verifier, `--expect=${expected}`], {
      cwd: root,
      env: { ...process.env, CONSOLIDATION_EVIDENCE_ROOT: repositoryRoot },
    })
    return { exitCode: 0, output: stdout }
  } catch (error) {
    return { exitCode: error.code, output: `${error.stdout ?? ""}${error.stderr ?? ""}` }
  }
}

test("the protected manifest verifier is RR8-only", async () => {
  const { stdout } = await execFileAsync(process.execPath, [manifestVerifier], { cwd: repositoryRoot })
  const result = JSON.parse(stdout)

  assert.equal(result.stage, "protected-rr8")
  assert.equal(result.version, "8.3.0")
  assert.equal(result.packagePeer, "^8.3.0")
  assert.deepEqual(result.family, {
    "react-router": "8.3.0",
    "@react-router/dev": "8.3.0",
    "@react-router/node": "8.3.0",
    "@react-router/serve": "8.3.0",
  })
})

test("the app consolidation target requires retired state", async () => {
  const project = JSON.parse(await readFile(join(repositoryRoot, "apps/react-router-example/project.json"), "utf8"))
  assert.equal(
    project.targets["consolidation:verify"].options.command,
    "node scripts/verify-react-router-consolidation.mjs --expect=retired",
  )
})

test("the retained ledger records completed retirement and historical path semantics", async () => {
  const ledger = await readFile(ledgerPath, "utf8")

  assert.match(ledger, /Retirement completed:/)
  assert.match(ledger, /kattsushi/)
  assert.match(ledger, /no release occurred between the serial cleanup heads/i)
  assert.match(ledger, /0\.5\.12-alpha\.1/)
  assert.match(ledger, /React Router 8\.3\.0/)
  assert.match(ledger, /historical paths?[^\n]*do not assert current filesystem presence/i)
})

test("the complete OPEN fixture passes", async (context) => {
  const root = await fixture()
  context.after(() => rm(root, { recursive: true, force: true }))

  const result = await verify(root)

  assert.equal(result.exitCode, 0, result.output)
})

test("the complete retired fixture passes only with --expect=retired", async (context) => {
  const root = await fixture()
  context.after(() => rm(root, { recursive: true, force: true }))
  await retireFixture(root)

  const result = await verify(root, "retired")

  assert.equal(result.exitCode, 0, result.output)
  assert.match(result.output, /"status": "retired"/)
})

test("retired verification allows only the migration ledger, change history, validator fixtures, and RR8 transitive metadata", async (context) => {
  const root = await fixture()
  context.after(() => rm(root, { recursive: true, force: true }))
  await retireFixture(root)
  await writeFixtureFile(
    root,
    "openspec/changes/consolidate-react-remix-into-router/history.md",
    "Historical @effectify/react-remix 7.18.2 evidence\n",
  )
  await writeFixtureFile(
    root,
    "scripts/fixtures/react-router-consolidation/retired-history.txt",
    "Historical packages/react/remix and react-remix-example validator input\n",
  )
  await writeFixtureFile(
    root,
    "pnpm-lock.yaml",
    "react-router@8.3.0:\n  '@remix-run/node-fetch-server@0.13.3': {}\n",
  )

  const result = await verify(root, "retired")

  assert.equal(result.exitCode, 0, result.output)
})

test("retired verification allows the dated consolidation archive and canonical consolidation spec", async (context) => {
  const root = await fixture()
  context.after(() => rm(root, { recursive: true, force: true }))
  await retireFixture(root)
  await writeFixtureFile(
    root,
    "openspec/changes/archive/2026-08-26-consolidate-react-remix-into-router/evidence.md",
    "Historical @effectify/react-remix 7.18.2 evidence\n",
  )
  await writeFixtureFile(
    root,
    "openspec/specs/react-router-major-consolidation/spec.md",
    "Canonical packages/react/remix and react-remix-example history\n",
  )

  const result = await verify(root, "retired")

  assert.equal(result.exitCode, 0, result.output)
})

const unrelatedHistoricalPaths = {
  "similarly named archive":
    "openspec/changes/archive/2026-08-26-consolidate-react-remix-into-router-followup/evidence.md",
  "similarly named spec": "openspec/specs/react-router-major-consolidation-followup/spec.md",
}

for (const [name, file] of Object.entries(unrelatedHistoricalPaths)) {
  test(`retired verification rejects a ${name}`, async (context) => {
    const root = await fixture()
    context.after(() => rm(root, { recursive: true, force: true }))
    await retireFixture(root)
    await writeFixtureFile(root, file, "Historical @effectify/react-remix 7.18.2 evidence\n")

    const result = await verify(root, "retired")

    assert.notEqual(result.exitCode, 0, result.output)
    assert.match(result.output, new RegExp(file.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
  })
}

test("the retired expectation reports retained transitional surfaces", async (context) => {
  const root = await fixture()
  context.after(() => rm(root, { recursive: true, force: true }))
  await mkdir(join(root, "apps/react-remix-example/app/lib"), { recursive: true })
  await writeFile(join(root, "apps/react-remix-example/app/lib/react-router7-better-auth.server.ts"), "export {}\n")
  await execFileAsync("git", ["add", "."], { cwd: root })

  const result = await verify(root, "retired")

  assert.notEqual(result.exitCode, 0, result.output)
  assert.match(result.output, /retirement path still exists: packages\/react\/remix/)
  assert.match(result.output, /retirement path still exists: apps\/react-remix-example/)
})

const retiredResidue = {
  "bridge package": ["packages/react/remix/package.json", bridgeManifest],
  "retired app": ["apps/react-remix-example/package.json", "{}\n"],
  "Nx release graph": ["nx.json", '{"release":{"projects":["packages/react/remix"]}}\n'],
  "release setup": [".github/SETUP.md", "Build @effectify/react-remix\n"],
  "root install docs": ["README.md", "pnpm add @effectify/react-remix\n"],
  "root release status": ["CHANGELOG.md", "@effectify/react-remix 0.5.12-alpha.1\n"],
  "workspace RR7 pin": ["pnpm-workspace.yaml", "catalog:\n  react-router: 7.18.2\n"],
  "lock importer": ["pnpm-lock.yaml", "packages/react/remix:\n  react-router@7.18.2: {}\n"],
}

for (const [name, [file, source]] of Object.entries(retiredResidue)) {
  test(`retired verification rejects ${name} residue`, async (context) => {
    const root = await fixture()
    context.after(() => rm(root, { recursive: true, force: true }))
    await retireFixture(root)
    await writeFixtureFile(root, file, source)

    const result = await verify(root, "retired")

    assert.notEqual(result.exitCode, 0, result.output)
    assert.match(result.output, new RegExp(file.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
  })
}

for (const [name, mutate] of Object.entries(mutations)) {
  test(`${name} fails closed with a nonzero exit`, async (context) => {
    const root = await fixture(mutate)
    context.after(() => rm(root, { recursive: true, force: true }))

    const result = await verify(root)

    assert.notEqual(result.exitCode, 0, result.output)
  })
}
