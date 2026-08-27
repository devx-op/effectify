import { execFile } from "node:child_process"
import { access, readFile } from "node:fs/promises"
import { resolve } from "node:path"
import { promisify } from "node:util"

const execFileAsync = promisify(execFile)
const LEDGER = "docs/migrations/react-remix-to-react-router.md"
const FINAL_VERSION_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/
const EXPECTED_SCENARIOS = [
  "shell",
  "navigation",
  "login",
  "signup",
  "auth-api",
  "auth-loader-guard",
  "auth-action-guard",
  "todo-create",
  "todo-update",
  "todo-delete",
  "todo-toggle",
  "todo-validation",
  "test-loader-success",
  "test-blank-validation",
  "test-action-success",
  "demo-loader-success",
  "demo-loader-failure",
  "demo-loader-redirect",
  "demo-action-success",
  "demo-action-failure",
  "demo-action-redirect",
  "api-placeholder",
  "pico-styling",
  "mock-store",
  "rr7-typegen",
  "rr7-route-map",
  "rr7-hydration",
  "rr7-ssr",
  "rr7-build",
]
const VALID_DISPOSITIONS = new Set([
  "pending-review",
  "existing-rr8",
  "transfer-to-rr8",
  "remove-with-justification",
  "pending-migration",
  "retained-until-retirement",
  "deprecate-reference",
  "remove-at-retirement",
])
const SKIPPED_SCAN_PATHS = new Set([
  LEDGER,
  "scripts/verify-react-router-consolidation.mjs",
  "pnpm-lock.yaml",
])

const fail = (failures) => {
  throw new Error(`React Router consolidation ledger failed:\n- ${failures.join("\n- ")}`)
}

const table = (source, heading) => {
  const lines = source.split("\n")
  const start = lines.findIndex((line) => line.trim() === `## ${heading}`)
  if (start === -1) return []
  const rows = []
  for (const line of lines.slice(start + 1)) {
    if (line.startsWith("## ")) break
    if (!line.trim().startsWith("|")) continue
    const cells = line
      .trim()
      .slice(1, -1)
      .split("|")
      .map((cell) => cell.trim())
    if (cells.every((cell) => /^:?-+:?$/.test(cell))) continue
    rows.push(cells)
  }
  if (rows.length < 2) return []
  const [headers, ...values] = rows
  return values.map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""])))
}

const validateRows = (rows, kind, failures) => {
  const required = ["ID", "Surface", "Disposition", "Evidence / justification", "Reviewer", "Complete"]
  for (const field of required) {
    if (!rows.every((row) => row[field])) failures.push(`${kind} rows require ${field}`)
  }
  for (const row of rows) {
    if (!VALID_DISPOSITIONS.has(row.Disposition)) {
      failures.push(`${kind} ${row.ID || "<unknown>"} has invalid disposition ${row.Disposition || "<empty>"}`)
    }
    if (!/^(YES|NO)$/.test(row.Complete)) {
      failures.push(`${kind} ${row.ID || "<unknown>"} completion must be YES or NO`)
    }
    if (/^(?:-|TBD|TODO|N\/A)$/i.test(row["Evidence / justification"])) {
      failures.push(`${kind} ${row.ID || "<unknown>"} lacks concrete evidence or justification`)
    }
  }
}

const expandBraces = (target) => {
  const match = target.match(/\{([^{}]+)\}/)
  if (!match) return [target]
  return match[1]
    .split(",")
    .flatMap((value) => expandBraces(`${target.slice(0, match.index)}${value}${target.slice(match.index + match[0].length)}`))
}

const evidenceTargets = (row) =>
  [...row["Evidence / justification"].matchAll(/`([^`]+)`/g)]
    .map((match) => match[1])
    .filter((target) => !/[\s:]/.test(target) && /\.(?:[cm]?[jt]sx?|json)$/.test(target))
    .flatMap(expandBraces)
    .map((target) => {
      if (target.startsWith("tests/")) return `apps/react-router-example/${target}`
      if (target === "project.json") return "apps/react-router-example/project.json"
      if (!target.includes("/")) return `apps/react-router-example/tests/unit/config/${target}`
      return target
    })

const validateEvidenceTargets = async (rows, failures) => {
  const evidenceRoot = process.env.CONSOLIDATION_EVIDENCE_ROOT ?? "."
  for (const row of rows.filter((candidate) => candidate.Disposition !== "remove-with-justification")) {
    const targets = evidenceTargets(row)
    if (targets.length === 0) {
      failures.push(`scenario ${row.ID || "<unknown>"} lacks a concrete evidence target`)
      continue
    }
    for (const target of targets) {
      try {
        await access(resolve(evidenceRoot, target))
      } catch {
        failures.push(`scenario ${row.ID || "<unknown>"} evidence target does not exist: ${target}`)
      }
    }
  }
}

const trackedConsumerSurfaces = async () => {
  const { stdout } = await execFileAsync("git", ["ls-files", "-co", "--exclude-standard"])
  const candidates = stdout
    .trim()
    .split("\n")
    .filter(Boolean)
    .filter((file) => !file.startsWith("openspec/"))
    .filter((file) => !SKIPPED_SCAN_PATHS.has(file))
    .filter((file) => /(?:^|\/)(?:[^/]+\.(?:[cm]?[jt]sx?|json|md|ya?ml)|nx\.json)$/.test(file))
  const surfaces = []
  for (const file of candidates) {
    const source = await readFile(file, "utf8")
    if (source.includes("@effectify/react-remix") || source.includes("react-remix-example")) {
      surfaces.push(file)
    }
  }
  surfaces.push("pnpm-lock.yaml")
  return [...new Set(surfaces)].sort()
}

const expected = process.argv.find((argument) => argument.startsWith("--expect="))?.slice(9) ?? "closed"
if (!["closed", "open"].includes(expected)) {
  throw new Error("Expected --expect=closed or --expect=open")
}

let ledger
try {
  ledger = await readFile(LEDGER, "utf8")
} catch {
  fail([`missing ${LEDGER}`])
}

const failures = []
const gate = ledger.match(/^Retirement gate:\s*\*\*(CLOSED|OPEN)\*\*$/m)?.[1]
const finalBridgeVersion = ledger.match(/^Final supported bridge rollback version:\s*`([^`]+)`$/m)?.[1]
if (!gate) failures.push("missing explicit Retirement gate: **CLOSED|OPEN**")
if (!finalBridgeVersion || !FINAL_VERSION_PATTERN.test(finalBridgeVersion)) {
  failures.push("missing concrete final supported bridge rollback version")
}

const bridgeManifest = JSON.parse(await readFile("packages/react/remix/package.json", "utf8"))
if (finalBridgeVersion && finalBridgeVersion !== bridgeManifest.version) {
  failures.push(`rollback version ${finalBridgeVersion} must match bridge package ${bridgeManifest.version}`)
}

const consumers = table(ledger, "Repository consumer inventory")
const scenarios = table(ledger, "Behavior scenario inventory")
if (consumers.length === 0) failures.push("missing repository consumer rows")
if (scenarios.length === 0) failures.push("missing behavior scenario rows")
validateRows(consumers, "consumer", failures)
validateRows(scenarios, "scenario", failures)
await validateEvidenceTargets(scenarios, failures)

const consumerSurfaces = new Set(consumers.map((row) => row.Surface))
for (const surface of await trackedConsumerSurfaces()) {
  if (!consumerSurfaces.has(`\`${surface}\``)) failures.push(`unmapped repository consumer ${surface}`)
}
const scenarioIds = new Set(scenarios.map((row) => row.ID))
for (const scenario of EXPECTED_SCENARIOS) {
  if (!scenarioIds.has(scenario)) failures.push(`missing behavior scenario ${scenario}`)
}

const pendingRows = [...consumers, ...scenarios].filter(
  (row) => row.Complete !== "YES" || row.Reviewer === "PENDING" || row.Disposition.startsWith("pending-"),
)
if (gate === "OPEN" && pendingRows.length > 0) {
  failures.push(`OPEN gate has ${pendingRows.length} pending reviewer/disposition/completion rows`)
}
if (expected.toUpperCase() !== gate) failures.push(`expected ${expected.toUpperCase()} gate but ledger declares ${gate ?? "missing"}`)
if (failures.length > 0) fail(failures)

console.log(
  JSON.stringify(
    {
      retirementGate: gate,
      finalBridgeVersion,
      consumerRows: consumers.length,
      scenarioRows: scenarios.length,
      pendingRows: pendingRows.length,
      status: gate === "CLOSED" ? "inventory-complete-retirement-blocked" : "retirement-eligible",
    },
    null,
    2,
  ),
)
