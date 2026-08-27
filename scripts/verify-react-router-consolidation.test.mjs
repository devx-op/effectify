import assert from "node:assert/strict"
import { execFile } from "node:child_process"
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { promisify } from "node:util"
import test from "node:test"

const execFileAsync = promisify(execFile)
const repositoryRoot = resolve(import.meta.dirname, "..")
const verifier = resolve(import.meta.dirname, "verify-react-router-consolidation.mjs")
const ledgerPath = resolve(repositoryRoot, "docs/migrations/react-remix-to-react-router.md")
const bridgeManifestPath = resolve(repositoryRoot, "packages/react/remix/package.json")

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
  const [ledger, manifest] = await Promise.all([
    readFile(ledgerPath, "utf8"),
    readFile(bridgeManifestPath, "utf8"),
  ])
  await writeFile(join(root, "docs/migrations/react-remix-to-react-router.md"), mutate(openLedger(ledger)))
  await writeFile(join(root, "packages/react/remix/package.json"), manifest)
  await execFileAsync("git", ["init", "--quiet"], { cwd: root })
  await execFileAsync("git", ["add", "."], { cwd: root })
  return root
}

const verify = async (root) => {
  try {
    const { stdout } = await execFileAsync(process.execPath, [verifier, "--expect=open"], {
      cwd: root,
      env: { ...process.env, CONSOLIDATION_EVIDENCE_ROOT: repositoryRoot },
    })
    return { exitCode: 0, output: stdout }
  } catch (error) {
    return { exitCode: error.code, output: `${error.stdout ?? ""}${error.stderr ?? ""}` }
  }
}

test("the complete OPEN fixture passes", async (context) => {
  const root = await fixture()
  context.after(() => rm(root, { recursive: true, force: true }))

  const result = await verify(root)

  assert.equal(result.exitCode, 0, result.output)
})

for (const [name, mutate] of Object.entries(mutations)) {
  test(`${name} fails closed with a nonzero exit`, async (context) => {
    const root = await fixture(mutate)
    context.after(() => rm(root, { recursive: true, force: true }))

    const result = await verify(root)

    assert.notEqual(result.exitCode, 0, result.output)
  })
}
