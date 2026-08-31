import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import test from "node:test"

const read = (path) => {
  try {
    return readFileSync(new URL(`../${path}`, import.meta.url), "utf8")
  } catch {
    return ""
  }
}

const workflows = {
  alpha: read(".github/workflows/release-alpha.yml"),
  beta: read(".github/workflows/cd.yml"),
  ci: read(".github/workflows/ci.yml"),
  stable: read(".github/workflows/release-stable.yml"),
}
const readme = read("README.md")
const setup = read(".github/SETUP.md")
const stableFinalizeWrapper = read("scripts/release-finalize-stable.sh")
const stableFinalizeScript = read("scripts/release-finalize-stable.mjs")

const releaseProjects = [
  "@effectify/react-router",
  "@effectify/react-query",
  "@effectify/node-better-auth",
  "@effectify/solid-query",
  "@effectify/react-router-better-auth",
  "@effectify/prisma",
  "@effectify/hatchet",
]

const indentation = (line) => line.match(/^\s*/)[0].length
const stripComment = (line) => {
  let singleQuoted = false
  let doubleQuoted = false
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]
    if (character === "'" && !doubleQuoted) singleQuoted = !singleQuoted
    if (character === '"' && !singleQuoted && line[index - 1] !== "\\") doubleQuoted = !doubleQuoted
    if (character === "#" && !singleQuoted && !doubleQuoted && (index === 0 || /\s/.test(line[index - 1]))) {
      return line.slice(0, index).trimEnd()
    }
  }
  return line
}
const withoutComments = (source) => source.split("\n").map(stripComment).join("\n")

const extractJob = (source, jobName) => {
  const lines = source.split("\n")
  const start = lines.findIndex((line) => new RegExp(`^(\\s*)${jobName}:\\s*$`).test(line))
  if (start === -1) return ""

  const jobIndent = indentation(lines[start])
  let end = start + 1
  while (end < lines.length && (!lines[end].trim() || indentation(lines[end]) > jobIndent)) end += 1
  return lines.slice(start, end).join("\n")
}

const extractSteps = (source) => {
  const lines = source.split("\n")
  const steps = []

  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^(\s*)- name:\s*(.+?)\s*$/)
    if (!match || /^\s*#/.test(lines[index])) continue

    const stepIndent = match[1].length
    const step = {
      name: match[2],
      condition: "",
      commands: [],
      uses: "",
      packageManagerCache: "",
      source: "",
    }
    for (index += 1; index < lines.length; index += 1) {
      const line = lines[index]
      if (line.trim() && indentation(line) <= stepIndent) {
        index -= 1
        break
      }
      step.source += `${line}\n`
      if (/^\s*#/.test(line)) continue

      const condition = line.match(/^\s*if:\s*(.+?)\s*$/)
      if (condition) step.condition = condition[1]

      const uses = line.match(/^\s*uses:\s*(.+?)\s*$/)
      if (uses) step.uses = uses[1]

      const packageManagerCache = line.match(/^\s*package-manager-cache:\s*(.+?)\s*$/)
      if (packageManagerCache) step.packageManagerCache = packageManagerCache[1]

      const run = line.match(/^(\s*)run:\s*(.*)$/)
      if (!run) continue

      const runIndent = run[1].length
      if (run[2] && !/^[|>]$/.test(run[2])) {
        step.commands.push(run[2].trim())
        continue
      }

      for (index += 1; index < lines.length; index += 1) {
        const command = lines[index]
        if (command.trim() && indentation(command) <= runIndent) {
          index -= 1
          break
        }
        step.source += `${command}\n`
        const trimmed = command.trim()
        if (trimmed && !trimmed.startsWith("#")) step.commands.push(trimmed)
      }
    }
    steps.push(step)
  }

  return steps
}

const commandEntries = (source) =>
  extractSteps(source).flatMap((step, stepIndex) =>
    step.commands.map((command, commandIndex) => ({
      command,
      commandIndex,
      step,
      stepIndex,
    })),
  )

const commandPosition = (source, pattern) => {
  const entry = commandEntries(source).find(({ command }) => pattern.test(command))
  return entry ? entry.stepIndex * 1000 + entry.commandIndex : -1
}

const requireCommand = (violations, source, pattern, violation) => {
  if (commandPosition(source, pattern) === -1) violations.push(violation)
}

const requireCommandOrder = (violations, source, patterns, violation) => {
  const positions = patterns.map((pattern) => commandPosition(source, pattern))
  if (positions.some((position) => position === -1)) {
    violations.push(`${violation} (missing command)`)
    return
  }
  if (positions.some((position, index) => index > 0 && position <= positions[index - 1])) {
    violations.push(`${violation} (wrong order)`)
  }
}

const hasCommandSequence = (commands, patterns) =>
  commands.some((_, start) => patterns.every((pattern, offset) => pattern.test(commands[start + offset] ?? "")))

const sensitiveShellViolations = (step, label) => {
  const violations = []
  if (step.commands.some((command) => /<<-?\s*['"]?[A-Za-z_][A-Za-z0-9_]*['"]?/.test(command))) {
    violations.push(`${label} heredoc ambiguity`)
  }
  if (step.commands.some((command) => /^if\s+(?:false|!\s+true)\s*;?\s*then$/.test(command))) {
    violations.push(`${label} statically dead wrapper`)
  }

  const functions = []
  for (let index = 0; index < step.commands.length; index += 1) {
    const declaration = step.commands[index].match(/^([A-Za-z_][A-Za-z0-9_]*)\(\)\s*\{$/)
    if (!declaration) continue
    let depth = 1
    let end = index
    while (++end < step.commands.length && depth > 0) {
      if (/(?:\|\||&&)\s*\{\s*$/.test(step.commands[end])) depth += 1
      if (step.commands[end] === "}") depth -= 1
    }
    functions.push({ name: declaration[1], start: index, end })
    index = end - 1
  }
  for (const fn of functions) {
    const invoked = step.commands.some(
      (command, index) =>
        (index < fn.start || index >= fn.end) && new RegExp(`(?:^|\\$\\()${fn.name}(?:\\s|\\)|$)`).test(command),
    )
    if (!invoked) violations.push(`${label} unused shell function ${fn.name}`)
  }
  return violations
}

const channelVersionCommand = (channel) =>
  new RegExp(`^pnpm nx release "--projects=\\$PROJECTS" --preid=${channel} --skip-publish$`)
const channelPublishCommand = (channel) =>
  new RegExp(`^pnpm nx release publish "--projects=\\$PROJECTS" --tag=${channel}$`)
const betaVersionCommand =
  /^pnpm nx release version(?: \$VERSION_SPECIFIER)? "--projects=\$PROJECTS" --preid=beta --git-commit=false --git-tag=false --git-push=false --stage-changes=false$/
const betaGitIdentityCondition =
  "${{ (steps.release.outputs.mode == 'prepare' || steps.release.outputs.mode == 'finalize') && steps.release.outputs.has_projects == 'true' }}"
const gitIdentityCommands = [
  'git config user.name "github-actions[bot]"',
  'git config user.email "github-actions[bot]@users.noreply.github.com"',
]
const betaGitIdentityRuns = (source, mode, hasProjects) => {
  const step = extractSteps(source).find((candidate) =>
    gitIdentityCommands.every((command) => candidate.commands.includes(command)),
  )
  if (!step || !step.condition.includes("steps.release.outputs.has_projects == 'true'")) return false

  const configuredModes = [
    ...step.condition.matchAll(/steps\.release\.outputs\.mode == '(prepare|finalize|suppress)'/g),
  ].map(([, configuredMode]) => configuredMode)
  return hasProjects && configuredModes.includes(mode)
}
const terminalGates = [
  {
    command: 'git commit -m "chore(release): prepare beta from $SOURCE_SHA [skip release]"',
    annotation: "PREPARE local commit failed",
  },
  {
    command: 'test -z "$(git status --porcelain)"',
    annotation: "PREPARE post-commit tree dirty",
  },
  {
    command: 'git push origin "HEAD:refs/heads/release/beta-$SHA_PREFIX"',
    annotation: "PREPARE release-branch push failed",
  },
]
const exactCommand = (value) => new RegExp(`^${value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`)
const buildCommand = /^pnpm nx run-many -t build "--projects=\$PROJECTS" --parallel=3$/
const testCommand = /^pnpm nx run-many -t test "--projects=\$PROJECTS" --parallel=3 --passWithNoTests$/
const contractCommand = /^node --test scripts\/release-policy-contract\.test\.mjs$/
const releaseSubjectGuard =
  'if [[ "$HEAD_SUBJECT" == *"chore(release):"* || "$HEAD_SUBJECT" == *"[skip release]"* ]]; then'
const releaseManifestGuard =
  'if [ "$HAS_CHANGELOG" = "true" ] || [ "$INVALID_MANIFESTS" -gt 0 ] || [ "$BETA_TRANSITIONS" -gt 0 ] || [ "$MANIFEST_CHANGES" -ne "$BENIGN_MANIFEST_CHANGES" ]; then'
const exactBetaSuppressionGuard =
  'if [ "$HAS_CHANGELOG" = "true" ] && [ "$UNEXPECTED" = "false" ] && [ "$INVALID_MANIFESTS" = "0" ] && [ "$BETA_TRANSITIONS" -gt 0 ] && [ "$BETA_TRANSITIONS" -eq "$MANIFEST_CHANGES" ]; then'
const ordinaryPrepareClassifierResult = "printf '%s\\n' prepare"
const classifierDecisionOrderViolation =
  "beta exact suppression before release-subject rejection before ordinary PREPARE"
const classificationFailClosedGuard = 'if [ "$CLASSIFICATION" != "prepare" ]; then'
const oldManifestCardinalityGuard =
  "if ! printf '%s' \"$OLD_DOCUMENT\" | jq -e -s 'length == 1 and (.[0] | type == \"object\")' >/dev/null 2>&1 ||"
const newManifestCardinalityGuard =
  "! printf '%s' \"$NEW_DOCUMENT\" | jq -e -s 'length == 1 and (.[0] | type == \"object\")' >/dev/null 2>&1; then"
const betaFinalizeExpectedShaGuard = '[[ "$EXPECTED_SHA" =~ ^[0-9a-f]{40}$ ]] || {'
const stableFinalizeExpectedShaGuard =
  "[[ \"$EXPECTED_SHA\" =~ ^[0-9a-f]{40}$ ]] || { echo '::error::FINALIZE requires full lowercase expected_sha'; exit 1; }"
const stableTransitionVersionPattern = "^(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)-beta\\.(0|[1-9][0-9]*)$"

const permissionEntries = (job) => {
  const block = job.match(/^\s{4}permissions:\s*\n((?:\s{6}[A-Za-z-]+:\s*[^\n]+\n?)+)/m)?.[1] ?? ""
  return [...block.matchAll(/^\s{6}([A-Za-z-]+):\s*([^\s#]+)\s*$/gm)].map(([, name, access]) => [name, access])
}

const hasExactPermissions = (job, expected) => {
  const entries = permissionEntries(job)
  return (
    entries.length === Object.keys(expected).length &&
    new Set(entries.map(([name]) => name)).size === entries.length &&
    entries.every(([name, access]) => expected[name] === access)
  )
}

const checkoutPersistsCredentials = (job) =>
  extractSteps(job).some(
    (step) => step.uses.startsWith("actions/checkout@") && !/persist-credentials:\s*false/.test(step.source),
  )

const stableCapabilityViolations = (source) => {
  const violations = []
  const jobs = Object.fromEntries(
    ["validate", "prepare", "preflight", "finalize"].map((name) => [name, extractJob(source, name)]),
  )
  for (const [name, job] of Object.entries(jobs)) if (!job) violations.push(`stable ${name} job`)
  if (violations.length > 0) return violations

  for (const [name, expected] of [
    ["validate", { contents: "read" }],
    ["prepare", { contents: "write" }],
    ["preflight", { contents: "read" }],
    ["finalize", { contents: "write", "id-token": "write" }],
  ]) {
    if (!hasExactPermissions(jobs[name], expected)) {
      violations.push(`stable ${name} least privilege`)
    }
    if (checkoutPersistsCredentials(jobs[name])) violations.push(`stable ${name} persisted checkout credentials`)
  }

  const validateSteps = extractSteps(jobs.validate)
  for (const required of [contractCommand, buildCommand, testCommand]) {
    if (!validateSteps.some((step) => step.commands.some((command) => required.test(command)))) {
      violations.push(`stable validation ${String(required)}`)
    }
  }
  if (/id-token:\s*write|contents:\s*write|NPM_TOKEN|NODE_AUTH_TOKEN|RELEASE_TOKEN/.test(jobs.validate)) {
    violations.push("stable validation credential isolation")
  }
  for (const output of ["mode", "projects", "validated_sha", "expected_sha", "artifact_sha"]) {
    if (!new RegExp(`^\\s{6}${output}:`, "m").test(jobs.validate)) violations.push(`stable validation ${output} output`)
  }

  const prepareSteps = extractSteps(jobs.prepare)
  const prepareCredentialSteps = prepareSteps.filter((step) =>
    /secrets\.|github\.token|GITHUB_TOKEN:|GH_TOKEN:|NODE_AUTH_TOKEN:/.test(step.source),
  )
  if (
    prepareCredentialSteps.length !== 1 ||
    !prepareCredentialSteps[0].name.includes("Push protected stable branch") ||
    !prepareCredentialSteps[0].commands.some((command) => /^git .*push\b/.test(command))
  ) {
    violations.push("stable PREPARE push-only credentials")
  }
  if (
    /id-token:\s*write|NODE_AUTH_TOKEN|NPM_CONFIG_PROVENANCE|nx release publish|npm publish|gh release/.test(
      jobs.prepare,
    )
  ) {
    violations.push("stable PREPARE publication isolation")
  }
  requireCommandOrder(
    violations,
    jobs.prepare,
    [
      /^git commit -m /,
      /^RELEASE_SHA=\$\(git rev-parse HEAD\)$/,
      /^PARENTS=\$\(git rev-list --parents -n 1 "\$RELEASE_SHA"\)$/,
      /^if ! RELEASE_CHANGELOG_TYPE=\$\(git cat-file -t "\$RELEASE_SHA:CHANGELOG\.md" 2>\/dev\/null\)/,
      /^git diff --name-only --no-renames "\$SOURCE_SHA" "\$RELEASE_SHA"/,
      /^COMMITTED_DOCUMENT=\$\(git show "\$RELEASE_SHA:\$MANIFEST_PATH"\)$/,
      /^test -z "\$\(git status --porcelain\)" \|\| \{ echo '::error::post-commit tree dirty'/,
      /^test "\$\(git rev-parse origin\/master\)" = "\$SOURCE_SHA" \|\| \{ echo '::error::master moved before stable branch push'/,
      /^git .*push origin "HEAD:refs\/heads\/\$BRANCH"/,
    ],
    "stable PREPARE post-commit revalidation before push",
  )

  if (
    /contents:\s*write|id-token:\s*write|NPM_TOKEN|NODE_AUTH_TOKEN|RELEASE_TOKEN|NPM_CONFIG_PROVENANCE/.test(
      jobs.preflight,
    )
  ) {
    violations.push("stable PREFLIGHT read-only credentials")
  }
  const preflightSetupNode = extractSteps(jobs.preflight).find((step) => step.uses.startsWith("actions/setup-node@"))
  if (preflightSetupNode?.packageManagerCache !== "false") {
    violations.push("stable PREFLIGHT setup-node package-manager cache")
  }

  const finalizeSteps = extractSteps(jobs.finalize)
  const finalizeCredentialSteps = finalizeSteps.filter((step) =>
    /secrets\.|github\.token|GITHUB_TOKEN:|GH_TOKEN:|NODE_AUTH_TOKEN:|NPM_CONFIG_PROVENANCE/.test(step.source),
  )
  if (
    finalizeCredentialSteps.length !== 1 ||
    !finalizeCredentialSteps[0].name.includes("FINALIZE exact stable artifacts")
  ) {
    violations.push("stable FINALIZE step-only credentials")
  }
  if (!/^\s{4}environment:\s*stable-release\s*$/m.test(jobs.finalize)) {
    violations.push("stable FINALIZE protected environment")
  }
  if (
    !finalizeSteps.some(
      (step) =>
        step.name.includes("FINALIZE exact stable artifacts") && /NPM_CONFIG_IGNORE_SCRIPTS:\s*true/.test(step.source),
    )
  ) {
    violations.push("stable FINALIZE lifecycle-script environment")
  }
  if (
    finalizeSteps.some((step) =>
      step.commands.some(
        (command) =>
          /(?:^|\s)(?:build|test)(?:\s|$)|nx (?:run|test)|npm whoami|nx release version/.test(command) ||
          (/^pnpm install\b/.test(command) && !/--ignore-scripts/.test(command)),
      ),
    )
  ) {
    violations.push("stable FINALIZE lifecycle isolation")
  }
  return violations
}

const classifierStartMarker = "# release-policy-classifier:start"
const classifierEndMarker = "# release-policy-classifier:end"
const classifierInvocation = "CLASSIFICATION=$(classify_push_shape)"

const classifierStructureViolations = (source) => {
  const violations = []
  const lines = source.split("\n")
  const startIndexes = lines.flatMap((line, index) => (line.trim() === classifierStartMarker ? [index] : []))
  const endIndexes = lines.flatMap((line, index) => (line.trim() === classifierEndMarker ? [index] : []))
  const executable = commandEntries(source).map(({ command }) => command)
  const declarations = executable.filter((command) => command === "classify_push_shape() {")
  const invocations = executable.filter(
    (command) => command !== "classify_push_shape() {" && /\bclassify_push_shape\b/.test(command),
  )

  if (startIndexes.length !== 1) violations.push("beta exactly one classifier start marker")
  if (endIndexes.length !== 1) violations.push("beta exactly one classifier end marker")
  if (declarations.length !== 1) violations.push("beta exactly one classifier declaration")
  if (invocations.length !== 1 || invocations[0] !== classifierInvocation) {
    violations.push("beta exactly one classifier invocation")
  }
  if (startIndexes.length === 1 && endIndexes.length === 1) {
    const [start] = startIndexes
    const [end] = endIndexes
    if (end <= start) {
      violations.push("beta classifier marker order")
    } else {
      const firstExecutable = lines
        .slice(end + 1)
        .map((line) => line.trim())
        .find((line) => line !== "" && !line.startsWith("#"))
      if (firstExecutable !== classifierInvocation) {
        violations.push("beta classifier invocation immediately follows end marker")
      }
    }
  }
  return violations
}

const extractBetaPushClassifier = (source) => {
  if (classifierStructureViolations(source).length > 0) return ""
  const lines = source.split("\n")
  const start = lines.findIndex((line) => line.trim() === classifierStartMarker)
  const end = lines.findIndex((line) => line.trim() === classifierEndMarker)
  return lines.slice(start + 1, end).join("\n")
}

const classifierDecisionOrderViolations = (source) => {
  const classifier = extractBetaPushClassifier(source)
  if (!classifier) return []

  const positions = [exactBetaSuppressionGuard, releaseSubjectGuard, ordinaryPrepareClassifierResult].map((command) =>
    classifier.indexOf(command),
  )
  if (positions.some((position) => position === -1)) return []
  return positions[0] < positions[1] && positions[1] < positions[2] ? [] : [classifierDecisionOrderViolation]
}

const extractRunScript = (step) => {
  const lines = step?.source.split("\n") ?? []
  const runIndex = lines.findIndex((line) => /^\s*run:\s*\|\s*$/.test(line))
  if (runIndex === -1) return ""
  const body = lines.slice(runIndex + 1)
  const bodyIndent = Math.min(...body.filter((line) => line.trim() !== "").map((line) => indentation(line)))
  return body.map((line) => (line.trim() === "" ? "" : line.slice(bodyIndent))).join("\n")
}

const shellQuote = (value) => `'${value.replaceAll("'", `'"'"'`)}'`

const runBetaPushClassifier = ({
  changedPaths,
  catalog,
  before = {},
  after = {},
  headSubject = "",
  changelogType = "blob",
}) => {
  const classifier = extractBetaPushClassifier(workflows.beta)
  assert.notEqual(classifier, "", "beta workflow classifier block")

  const directory = mkdtempSync(join(tmpdir(), "effectify-beta-classifier-"))
  try {
    const changedFile = join(directory, "changed-paths")
    const catalogFile = join(directory, "release-manifests")
    const uniqueChangedPaths = [...new Set(changedPaths)].sort()
    const catalogEntries = Object.entries(catalog).sort(([left], [right]) => left.localeCompare(right))
    writeFileSync(changedFile, uniqueChangedPaths.length > 0 ? `${uniqueChangedPaths.join("\n")}\n` : "")
    writeFileSync(
      catalogFile,
      catalogEntries.length > 0 ? `${catalogEntries.map(([path, name]) => `${name}\t${path}`).join("\n")}\n` : "",
    )

    const environment = {
      ...process.env,
      BASE: "base",
      HEAD: "head",
      HEAD_SUBJECT: headSubject,
      CHANGELOG_TYPE: changelogType,
      CHANGED: changedFile,
      RELEASE_MANIFESTS: catalogFile,
    }
    const cases = []
    for (const [index, path] of Object.keys(catalog).entries()) {
      for (const [revision, documents, prefix] of [
        ["base", before, "BEFORE"],
        ["head", after, "AFTER"],
      ]) {
        const value = documents[path]
        environment[`${prefix}_PRESENT_${index}`] = String(value !== undefined)
        environment[`${prefix}_DOCUMENT_${index}`] =
          value === undefined ? "" : typeof value === "string" ? value : JSON.stringify(value)
        cases.push(
          `    ${shellQuote(`${revision}:${path}`)}) [ "$${prefix}_PRESENT_${index}" = "true" ] || return 128; printf '%s' "$${prefix}_DOCUMENT_${index}" ;;`,
        )
      }
    }

    const result = spawnSync(
      "bash",
      [
        "-c",
        `set -euo pipefail\ngit() {\n  if [ "$1" = "cat-file" ] && [ "$2" = "-t" ] && [ "$3" = "head:CHANGELOG.md" ]; then\n    [ "$CHANGELOG_TYPE" != "missing" ] || return 128\n    printf '%s\\n' "$CHANGELOG_TYPE"\n    return\n  fi\n  [ "$1" = "show" ] || return 127\n  case "$2" in\n${cases.join("\n")}\n    *) return 128 ;;\n  esac\n}\n${classifier}\nclassify_push_shape`,
      ],
      { cwd: directory, encoding: "utf8", env: environment },
    )
    assert.equal(result.status, 0, result.stderr)
    return result.stdout.trim()
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
}

const betaBeforeSha = "1111111111111111111111111111111111111111"
const betaHeadSha = "2222222222222222222222222222222222222222"
const betaMergedReleaseSubject = `chore(release): prepare beta from ${betaBeforeSha} [skip release]`
const betaManifestPath = "packages/future/nebula/package.json"
const betaProject = "@future/nebula"

const runBetaPushResolver = ({
  beforeSha = betaBeforeSha,
  headSha = betaHeadSha,
  checkedOutHead = headSha,
  beforeType = "commit",
  headType = "commit",
  changedPaths = ["packages/future/nebula/src/index.ts"],
  beforeDocument = { name: betaProject, version: "4.7.0-beta.12" },
  afterDocument = beforeDocument,
  changelogType = "blob",
  headMessage = "ordinary source push",
  affectedOutput = "[]",
  affectedExit = 0,
} = {}) => {
  const resolve = extractSteps(workflows.beta).find((step) => step.name.includes("Resolve beta mode and projects"))
  const script = extractRunScript(resolve)
  assert.notEqual(script, "", "beta resolver shell body")

  const directory = mkdtempSync(join(tmpdir(), "effectify-beta-resolver-"))
  try {
    const outputFile = join(directory, "github-output")
    writeFileSync(join(directory, "nx.json"), JSON.stringify({ release: { projects: ["packages/future/nebula"] } }))
    writeFileSync(outputFile, "")
    const environment = {
      ...process.env,
      EVENT_NAME: "push",
      PUBLISH_ONLY: "false",
      REQUESTED_PROJECTS: "",
      EXPECTED_SHA: "",
      BEFORE_SHA: beforeSha,
      HEAD_SHA: headSha,
      HEAD_MESSAGE: headMessage,
      CHECKED_OUT_HEAD: checkedOutHead,
      BEFORE_TYPE: beforeType,
      HEAD_TYPE: headType,
      CHANGED_PATHS: changedPaths.join("\n"),
      MANIFEST_PATH: betaManifestPath,
      BEFORE_DOCUMENT: typeof beforeDocument === "string" ? beforeDocument : JSON.stringify(beforeDocument),
      AFTER_DOCUMENT: typeof afterDocument === "string" ? afterDocument : JSON.stringify(afterDocument),
      CHANGELOG_TYPE: changelogType,
      NX_AFFECTED_OUTPUT: affectedOutput,
      NX_AFFECTED_EXIT: String(affectedExit),
      GITHUB_OUTPUT: outputFile,
      TMPDIR: directory,
    }
    const stubs = `pnpm() {
  [ "$1" = nx ] || return 127
  if [ "$2" = show ] && [ "$3" = project ] && [ "$4" = packages/future/nebula ]; then
    printf '%s\\n' '{"name":"@future/nebula","root":"packages/future/nebula"}'
    return
  fi
  if [ "$2" = show ] && [ "$3" = projects ]; then
    [ "$NX_AFFECTED_EXIT" = 0 ] || return "$NX_AFFECTED_EXIT"
    printf '%s' "$NX_AFFECTED_OUTPUT"
    return
  fi
  return 127
}
git() {
  if [ "$1" = cat-file ] && [ "$2" = -t ]; then
    case "$3" in
      "$BEFORE_SHA") [ "$BEFORE_TYPE" != missing ] || return 128; printf '%s\\n' "$BEFORE_TYPE" ;;
      "$HEAD_SHA") [ "$HEAD_TYPE" != missing ] || return 128; printf '%s\\n' "$HEAD_TYPE" ;;
      "$HEAD_SHA:CHANGELOG.md") [ "$CHANGELOG_TYPE" != missing ] || return 128; printf '%s\\n' "$CHANGELOG_TYPE" ;;
      *) return 128 ;;
    esac
    return
  fi
  if [ "$1" = rev-parse ] && [ "$2" = HEAD ]; then printf '%s\\n' "$CHECKED_OUT_HEAD"; return; fi
  if [ "$1" = diff ]; then [ -z "$CHANGED_PATHS" ] || printf '%s\\n' "$CHANGED_PATHS"; return; fi
  if [ "$1" = show ]; then
    case "$2" in
      "$BEFORE_SHA:$MANIFEST_PATH") printf '%s' "$BEFORE_DOCUMENT" ;;
      "$HEAD_SHA:$MANIFEST_PATH") printf '%s' "$AFTER_DOCUMENT" ;;
      *) return 128 ;;
    esac
    return
  fi
  return 127
}`
    const result = spawnSync("bash", ["-c", `${stubs}\n${script}`], {
      cwd: directory,
      encoding: "utf8",
      env: environment,
    })
    const outputText = readFileSync(outputFile, "utf8")
    const output = Object.fromEntries(
      outputText
        .split("\n")
        .filter(Boolean)
        .map((line) => {
          const separator = line.indexOf("=")
          return [line.slice(0, separator), line.slice(separator + 1)]
        }),
    )
    return { ...result, output, outputText }
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
}

const channelViolations = (channel, source) => {
  const violations = []
  const active = withoutComments(source)
  const branch = channel === "alpha" ? "dev" : "master"

  if (!new RegExp(`push:\\s*\\n\\s*branches: \\[${branch}\\]`).test(active)) {
    violations.push(`${channel} trigger`)
  }
  requireCommand(violations, source, channelVersionCommand(channel), `${channel} version mapping`)
  requireCommand(violations, source, channelPublishCommand(channel), `${channel} publish mapping`)
  requireCommand(violations, source, contractCommand, `${channel} policy contract`)
  requireCommandOrder(
    violations,
    source,
    [contractCommand, buildCommand, testCommand, channelVersionCommand(channel), channelPublishCommand(channel)],
    `${channel} release ordering`,
  )

  if (!/BEFORE_SHA:\s*\$\{\{ github\.event\.before \}\}/.test(active)) {
    violations.push(`${channel} push base input`)
  }
  if (!/HEAD_SHA:\s*\$\{\{ github\.sha \}\}/.test(active)) {
    violations.push(`${channel} push head input`)
  }

  for (const [pattern, name] of [
    [/^ZERO_SHA="0{40}"$/, "zero SHA fallback"],
    [/^BEFORE="\$BEFORE_SHA"$/, "before assignment"],
    [/^HEAD="\$HEAD_SHA"$/, "head assignment"],
    [/git cat-file -e "\$\{BEFORE\}\^\{commit\}"/, "before validation"],
    [/git cat-file -e "\$\{HEAD\}\^\{commit\}"/, "head validation"],
    [/^BASE="HEAD\^"$/, "manual fallback"],
    [/--base="\$BASE" --head="\$HEAD" --json/, "exact affected range"],
    [/grep -Fx -- "\$project"/, "exact recovery membership"],
    [/\$release \| index\(\$project\)/, "exact affected membership"],
  ]) {
    requireCommand(violations, source, pattern, `${channel} ${name}`)
  }

  if (
    commandEntries(source).some(
      ({ command }) => /nx release publish/.test(command) && !new RegExp(`--tag=${channel}$`).test(command),
    )
  ) {
    violations.push(`${channel} default publication`)
  }
  return violations
}

const betaViolations = (source) => {
  const violations = [...classifierStructureViolations(source), ...classifierDecisionOrderViolations(source)]
  const active = withoutComments(source)
  const steps = extractSteps(source)
  const resolve = steps.find((step) => step.commands.some((command) => /mode=prepare/.test(command)))
  const gitIdentity = steps.find((step) => gitIdentityCommands.every((command) => step.commands.includes(command)))
  const prepare = steps.find((step) => step.commands.some((command) => betaVersionCommand.test(command)))
  const finalize = steps.find((step) => step.commands.some((command) => channelPublishCommand("beta").test(command)))

  if (!/push:\s*\n\s*branches: \[master\]/.test(active)) violations.push("beta trigger")
  if (!gitIdentity || gitIdentity.condition !== betaGitIdentityCondition) {
    violations.push("beta PREPARE and FINALIZE Git identity")
  }
  if (!/expected_sha:\s*\n\s*description:[^\n]*\n\s*required: false/.test(active)) {
    violations.push("beta expected SHA input")
  }
  if (!resolve) {
    violations.push("beta mode resolver")
  } else {
    const commands = resolve.commands.join("\n")
    if (!resolve.commands.includes(betaFinalizeExpectedShaGuard)) {
      violations.push("beta FINALIZE full expected SHA")
    }
    if (!resolve.commands.includes("HEAD_SUBJECT=${HEAD_MESSAGE%%$'\\n'*}")) {
      violations.push("beta first-line release subject")
    }
    if (!resolve.commands.includes(releaseSubjectGuard)) {
      violations.push("beta release-subject fail-closed defense")
    }
    if (!resolve.commands.includes(releaseManifestGuard)) {
      violations.push("beta non-benign manifest fail-closed defense")
    }
    if (!resolve.commands.includes(exactBetaSuppressionGuard)) {
      violations.push("beta exact suppression guard")
    }
    if (!resolve.commands.includes(classificationFailClosedGuard)) {
      violations.push("beta classifier result fail-closed guard")
    }
    if (extractBetaPushClassifier(source) === "") {
      violations.push("beta executable push classifier")
    }
    for (const command of [
      '[[ "$BEFORE_SHA" =~ ^[0-9a-f]{40}$ ]] && [ "$BEFORE_SHA" != "$ZERO_SHA" ] || {',
      '[[ "$HEAD_SHA" =~ ^[0-9a-f]{40}$ ]] && [ "$HEAD_SHA" != "$ZERO_SHA" ] || {',
      'BEFORE="$BEFORE_SHA"',
      'HEAD="$HEAD_SHA"',
      'test "$(git cat-file -t "$BEFORE" 2>/dev/null)" = "commit" || {',
      'test "$(git cat-file -t "$HEAD" 2>/dev/null)" = "commit" || {',
      'test "$(git rev-parse HEAD)" = "$HEAD" || {',
      'BASE="$BEFORE"',
      oldManifestCardinalityGuard,
      newManifestCardinalityGuard,
      'AFFECTED_RAW=$(pnpm nx show projects --affected --base="$BASE" --head="$HEAD" --json)',
      'printf \'%s\' "$AFFECTED_RAW" | jq -e -s \'length == 1 and (.[0] | type == "array" and all(.[]; type == "string"))\' >/dev/null',
      'AFFECTED_RELEASE_PROJECTS=$(printf \'%s\' "$AFFECTED_RAW" | jq -r --argjson release "$RELEASE_PROJECTS" \'[.[] | select(. as $project | $release | index($project))] | unique | join(",")\')',
    ]) {
      if (!resolve.commands.includes(command)) violations.push(`beta push resolver command ${command}`)
    }
    if (/AFFECTED_(?:RAW|RELEASE_PROJECTS)=.*\|\|\s*echo/.test(commands)) {
      violations.push("beta affected project fail-open fallback")
    }
    if (/BASE="HEAD\^"|HEAD=\$\(git rev-parse HEAD\)/.test(commands)) {
      violations.push("beta event range fallback")
    }
    for (const [pattern, name] of [
      [/mode=prepare/, "prepare mode"],
      [/mode=finalize/, "finalize mode"],
      [/mode=suppress/, "suppress mode"],
      [/git diff --name-only --no-renames/, "structural changed paths"],
      [/CHANGELOG\.md/, "root changelog shape"],
      [/-beta\\\.\[0-9\]/, "beta manifest transition"],
      [/chore\(release\):/, "release message defense"],
      [/\[skip release\]/, "skip message defense"],
      [/grep -Fx -- "\$project"/, "exact allowlist membership"],
      [/sort \| uniq -d/, "duplicate selection rejection"],
    ]) {
      if (name !== "beta manifest transition" && !pattern.test(commands)) violations.push(`beta ${name}`)
    }
    if (
      /CORRECTIVE_|corrective solid-query|corrective beta|EXPECTED_MATRIX|version_specifier=prepatch|manual PREPARE requires all seven/.test(
        active,
      )
    ) {
      violations.push("beta completed corrective policy")
    }
  }

  if (!prepare) {
    violations.push("beta PREPARE step")
  } else {
    const commands = prepare.commands.join("\n")
    const pushes = prepare.commands.filter((command) => /^(?:if ! )?git push\b/.test(command))
    if (pushes.length !== 1 || !exactCommand(`if ! ${terminalGates[2].command}; then`).test(pushes[0])) {
      violations.push("beta PREPARE sole branch push")
    }
    for (const [pattern, name] of [
      [betaVersionCommand, "side-effect-free versioning"],
      [/^git switch --create "\$RELEASE_BRANCH"$/, "release branch creation"],
      [/^REFS_BEFORE=/, "ref snapshot"],
      [/verify_prepared_tree/, "prepared tree verification"],
      [/cmp -s \/tmp\/expected-release-paths "\$ACTUAL_PATHS"/, "exact path equality"],
      [/test "\$REFS_BEFORE" = "\$\(git for-each-ref/, "unchanged refs"],
      [/git diff --cached --name-only --no-renames/, "exact index"],
      [/git diff --quiet/, "clean tracked tree"],
      [/git ls-files --others --exclude-standard/, "clean untracked tree"],
      [/^git add --pathspec-from-file=\/tmp\/expected-release-paths$/, "pathspec-file staging"],
      [/^if ! cmp -s \/tmp\/expected-release-paths \/tmp\/staged-release-paths; then$/, "bytewise staged paths"],
      [
        /^echo "::error::expected=\$\(paste -sd, \/tmp\/expected-release-paths\); actual=\$\(paste -sd, \/tmp\/staged-release-paths\)"$/,
        "safe staged-path annotation",
      ],
      [exactCommand(`if ! ${terminalGates[0].command}; then`), "release commit"],
    ]) {
      if (!prepare.commands.some((command) => pattern.test(command))) violations.push(`beta PREPARE ${name}`)
    }
    if ((commands.match(/verify_prepared_tree/g) ?? []).length < 3)
      violations.push("beta PREPARE repeated verification")
    for (const gate of terminalGates) {
      const sequence = [
        exactCommand(`if ! ${gate.command}; then`),
        exactCommand(`echo "::error::${gate.annotation}"`),
        /^exit 1$/,
        /^fi$/,
      ]
      if (!hasCommandSequence(prepare.commands, sequence)) violations.push(`beta PREPARE ${gate.annotation}`)
    }
    if (/\bmapfile\b|^git add -- "\$\{RELEASE_PATHS\[@\]\}"$/m.test(commands)) {
      violations.push("beta PREPARE array staging")
    }
    if (
      /nx release publish|npm (?:publish|whoami)|gh (?:release|issue|pr)|git tag|workflow run|release-stable|refs\/heads\/master|NODE_AUTH_TOKEN|NPM_CONFIG_PROVENANCE/.test(
        prepare.source,
      )
    ) {
      violations.push("beta PREPARE mutation isolation")
    }
    violations.push(...sensitiveShellViolations(prepare, "beta PREPARE"))
  }

  if (!finalize) {
    violations.push("beta FINALIZE step")
  } else {
    const commands = finalize.commands.join("\n")
    const requiredOrder = [
      /^git fetch origin master:refs\/remotes\/origin\/master --no-tags$/,
      /^test "\$HEAD_SHA" = "\$EXPECTED_SHA"$/,
      /^test "\$REMOTE_SHA" = "\$EXPECTED_SHA"$/,
      /test "\$VERSION"/,
      /npm view "\$NAME" versions --json/,
      /^verify_tags collect$/,
      /^git tag -a "\$TAG" "\$EXPECTED_SHA" -m "\$TAG"$/,
      /^git push --atomic origin "\$\{TAG_REFS\[@\]\}"$/,
      /^verify_tags verify$/,
      /gh release view "\$TAG" --json tagName,isDraft,isPrerelease/,
      /^gh release create "\$TAG" --verify-tag --prerelease --generate-notes$/,
      /^verify_releases verify$/,
      channelPublishCommand("beta"),
      /post-verify npm beta state/,
    ]
    for (const pattern of requiredOrder) {
      if (!finalize.commands.some((command) => pattern.test(command))) {
        violations.push(`beta FINALIZE ${String(pattern)}`)
      }
    }
    requireCommandOrder(violations, source, requiredOrder, "beta FINALIZE mutation ordering")
    const pushes = finalize.commands.filter((command) => /^git push\b/.test(command))
    if (
      !/refs\/tags\/\$TAG:refs\/tags\/\$TAG/.test(commands) ||
      pushes.length !== 1 ||
      !/^git push --atomic origin "\$\{TAG_REFS\[@\]\}"$/.test(pushes[0]) ||
      /refs\/heads\/|--tags|--follow-tags/.test(pushes[0])
    ) {
      violations.push("beta FINALIZE explicit tag refspecs")
    }
    if (!/PROJECTS="\$MISSING_PROJECTS"/.test(commands) || (commands.match(/dist-tags\.beta/g) ?? []).length < 2) {
      violations.push("beta FINALIZE exact retry subset")
    }
    for (const [pattern, name] of [
      [/DIRECT_COUNT/, "tag identity"],
      [/PEELED_COUNT/, "annotated tag type"],
      [/PEELED_SHA/, "tag target"],
      [
        /test "\$DIRECT_COUNT" = "1" && test "\$PEELED_COUNT" = "1" && test "\$PEELED_SHA" = "\$EXPECTED_SHA"/,
        "annotated exact-target acceptance",
      ],
      [/unknown remote tag state/, "unknown tag failure"],
      [/conflicting npm beta state/, "npm conflict failure"],
      [/unknown GitHub Release state/, "unknown release failure"],
    ]) {
      if (!pattern.test(commands)) violations.push(`beta FINALIZE ${name}`)
    }
    for (const [patterns, name] of [
      [
        [
          /^REMOTE_TAGS=\$\(git ls-remote --tags origin "refs\/tags\/\$TAG" "refs\/tags\/\$TAG\^\{}"\) \|\| \{$/,
          /^echo "unknown remote tag state for \$TAG" >&2$/,
          /^exit 1$/,
          /^\}$/,
        ],
        "unknown tag fail-closed block",
      ],
      [
        [/^test "\$BETA_TAG" = "\$VERSION" \|\| \{ echo "conflicting npm beta state for \$NAME" >&2; exit 1; \}$/],
        "conflicting npm fail-closed block",
      ],
      [
        [/^else$/, /^echo "unknown GitHub Release state for \$TAG" >&2$/, /^exit 1$/, /^fi$/],
        "unknown Release fail-closed block",
      ],
    ]) {
      if (!hasCommandSequence(finalize.commands, patterns)) violations.push(`beta FINALIZE ${name}`)
    }
    violations.push(...sensitiveShellViolations(finalize, "beta FINALIZE"))
    if (!/NODE_AUTH_TOKEN/.test(active) || !/NPM_CONFIG_PROVENANCE:\s*true/.test(active)) {
      violations.push("beta FINALIZE publication credentials")
    }
  }

  if (/STABLE_TRANSITIONS|@effectify\/hatchet=0\.1\.0-beta|@effectify\/solid-query=0\.5\.13-beta/.test(active)) {
    violations.push("beta historical stable matrix")
  }
  if (/\bread\s+-r\s+[^\n;]*\bPATH\b/.test(resolve?.source ?? ""))
    violations.push("beta stable reserved PATH shadowing")
  for (const [pattern, name] of [
    [/jq -r ['"]?\.release\.projects\[\]['"]? nx\.json/, "release roots from nx"],
    [/pnpm nx show project "\$RELEASE_ROOT" --json/, "release project metadata"],
    [/git show "\$BASE:\$MANIFEST_PATH"/, "old reviewed manifest"],
    [/git show "\$HEAD:\$MANIFEST_PATH"/, "new reviewed manifest"],
    [/HAS_CHANGELOG=true/, "required root changelog"],
    [/git cat-file -t "\$HEAD:CHANGELOG\.md"/, "root changelog artifact blob"],
    [/\[ "\$CHANGELOG_TYPE" != "blob" \]/, "non-blob changelog rejection"],
    [/UNEXPECTED=true/, "unexpected path rejection"],
    [/INVALID_MANIFESTS=0/, "invalid manifest rejection"],
    [/BENIGN_MANIFEST_CHANGES=0/, "benign manifest tracking"],
    [/\[ "\$OLD_NAME" != "\$NAME" \] \|\| \[ "\$NEW_NAME" != "\$NAME" \]/, "allowlisted manifest names"],
    [/\[ "\$OLD_VERSION" = "\$NEW_VERSION" \]/, "unchanged benign manifest version"],
    [
      /STABLE_VERSION="\$\{BASH_REMATCH\[1\]\}\.\$\{BASH_REMATCH\[2\]\}\.\$\{BASH_REMATCH\[3\]\}"/,
      "derived stable target",
    ],
    [/\[ "\$NEW_VERSION" = "\$STABLE_VERSION" \]/, "exact beta-to-stable target"],
  ])
    if (!pattern.test(active)) violations.push(`beta stable structural check ${name}`)
  if (!active.includes(stableTransitionVersionPattern)) {
    violations.push("beta stable structural check no-leading-zero beta source")
  }
  if (!resolve?.commands.includes(exactBetaSuppressionGuard)) {
    violations.push("beta exact suppression shape")
  }
  if (!/echo "suspicious release-shaped master push; refusing preparation" >&2\s*\n\s*exit 1/.test(active)) {
    violations.push("beta suspicious shape rejection")
  }
  if (/workflow run[^\n]*stable|release-stable/.test(active)) violations.push("beta stable dispatch")
  if (
    !/echo "versions=\$VERSIONS" >> "\$GITHUB_OUTPUT"/.test(active) ||
    !/echo "changed_paths=\$CHANGED_PATHS" >> "\$GITHUB_OUTPUT"/.test(active) ||
    !/\*\*Selected versions:\*\* \$SELECTED_VERSIONS/.test(active) ||
    !/\*\*Changed paths:\*\* \$CHANGED_PATHS/.test(active)
  ) {
    violations.push("beta PREPARE summary versions and paths")
  }
  if (!/sole `type:\*` label is `type:chore`/.test(active)) violations.push("beta sole type label summary")
  if (
    commandEntries(source).some(({ command }) => /nx release publish/.test(command) && !command.endsWith("--tag=beta"))
  ) {
    violations.push("beta default publication")
  }
  return violations
}

const stableViolations = (source, finalizeScript = stableFinalizeScript) => {
  const violations = [...stableCapabilityViolations(source)]
  const active = withoutComments(source)
  const activeFinalize = withoutComments(finalizeScript)
  {
    const steps = extractSteps(source)
    const resolve = steps.find((step) => step.name.includes("Resolve exact stable mode"))
    const freshAuthorization = resolve
    const prepare = steps.find((step) => step.name.includes("PREPARE protected stable"))
    const preflight = steps.find((step) => step.name.includes("PREFLIGHT exact stable artifacts"))
    const finalize = steps.find((step) => step.name.includes("FINALIZE exact stable artifacts"))
    const finalizeBody = finalize?.source ?? ""
    const required = [
      ["wrapper exec", /exec node .*release-finalize-stable\.mjs/, withoutComments(stableFinalizeWrapper)],
      [
        "preflight boolean input",
        /preflight_only:\s*\n\s*description: ["']Read-only exact-state verification[^\n]*\n\s*required: true\s*\n\s*type: boolean\s*\n\s*default: false/,
        active,
      ],
      ["expected SHA input", /expected_sha:\s*\n\s*description:[^\n]*\n\s*required: false\s*\n\s*type: string/, active],
      ["artifact SHA input", /artifact_sha:\s*\n\s*description:[^\n]*\n\s*required: false\s*\n\s*type: string/, active],
      [
        "expected SHA finalizer env",
        /EXPECTED_SHA:\s*\$\{\{ needs\.validate\.outputs\.expected_sha \}\}/,
        finalizeBody,
      ],
      [
        "artifact SHA finalizer env",
        /ARTIFACT_SHA:\s*\$\{\{ needs\.validate\.outputs\.artifact_sha \}\}/,
        finalizeBody,
      ],
      ["FINALIZE normalized selection", /PROJECTS:\s*\$\{\{ needs\.validate\.outputs\.projects \}\}/, finalizeBody],
      ["expected SHA environment", /const expectedSha = process\.env\.EXPECTED_SHA \?\? ""/, activeFinalize],
      ["artifact SHA fallback", /const artifactSha = process\.env\.ARTIFACT_SHA \|\| expectedSha/, activeFinalize],
      ["historical SHA distinction", /const historicalReplay = artifactSha !== expectedSha/, activeFinalize],
      [
        "import-safe URL-aware main-module guard",
        /function isMainModule\(\) \{[\s\S]*const entry = process\.argv\[1\][\s\S]*if \(!entry\) return false[\s\S]*resolvedEntry = realpathSync\(entry\)[\s\S]*resolvedModule = realpathSync\(fileURLToPath\(import\.meta\.url\)\)[\s\S]*catch \{[\s\S]*return false[\s\S]*pathToFileURL\(resolvedEntry\)\.href === pathToFileURL\(resolvedModule\)\.href/,
        activeFinalize,
      ],
      [
        "strict expected SHA",
        /if \(!\/\^\[0-9a-f\]\{40\}\$\/\.test\(expectedSha\)\) fail\("FINALIZE requires full lowercase expected SHA"\)/,
        activeFinalize,
      ],
      [
        "strict artifact SHA",
        /if \(!\/\^\[0-9a-f\]\{40\}\$\/\.test\(artifactSha\)\) fail\("FINALIZE requires full lowercase artifact SHA"\)/,
        activeFinalize,
      ],
      ["fresh master", /master:refs\/remotes\/origin\/master/, activeFinalize],
      [
        "HEAD execution authorization",
        /if \(head !== expectedSha\) fail\("HEAD does not match expected SHA"\)/,
        activeFinalize,
      ],
      [
        "origin execution authorization",
        /if \(origin !== expectedSha\) fail\("origin\/master does not match expected SHA"\)/,
        activeFinalize,
      ],
      [
        "requested projects environment",
        /const requestedProjectsText = process\.env\.PROJECTS \?\? ""/,
        activeFinalize,
      ],
      [
        "artifact changelog blob before publication inspection",
        /await verifyArtifactChangelog\(\)[\s\S]*const records = await deriveReviewedRecords\(projects\)[\s\S]*const states = await inspect\(records\)/,
        activeFinalize,
      ],
      [
        "bounded artifact changelog type inspection",
        /run\("git", \["cat-file", "-t", `\$\{artifactSha\}:CHANGELOG\.md`\]\)/,
        activeFinalize,
      ],
      ["artifact nx release roots", /artifactJson\("nx\.json"/, activeFinalize],
      ["artifact project identity", /artifactJson\(`\$\{root\}\/project\.json`/, activeFinalize],
      ["artifact manifest identity", /artifactJson\(manifestPath/, activeFinalize],
      [
        "single-parent or exact two-parent artifact",
        /if \(parents\.length === 1\) return[\s\S]*if \(parents\.length !== 2\) fail\("reviewed artifact must be a single-parent commit or exact two-parent merge"\)/,
        activeFinalize,
      ],
      [
        "merge second parent based directly on first parent",
        /generatedParents\.length !== 1 \|\| generatedParents\[0\] !== firstParent/,
        activeFinalize,
      ],
      [
        "merge tree equals generated second parent",
        /\["rev-parse", `\$\{generatedParent\}\^\{tree\}`, `\$\{artifactSha\}\^\{tree\}`\][\s\S]*treeIds\[0\] !== treeIds\[1\]/,
        activeFinalize,
      ],
      [
        "first-parent reviewed diff",
        /\["diff", "--name-only", "--no-renames", `\$\{artifactSha\}\^1`, artifactSha\]/,
        activeFinalize,
      ],
      ["strict beta source", /previous\.version\.match\(\/\^.*-beta\\\./, activeFinalize],
      [
        "derived stable target",
        /const stableVersion = match \? `\$\{match\[1\]\}\.\$\{match\[2\]\}\.\$\{match\[3\]\}`/,
        activeFinalize,
      ],
      [
        "reviewed selection equality",
        /requested projects do not exactly match reviewed manifest changes/,
        activeFinalize,
      ],
      ["GitHub Actions FINALIZE boundary", /process\.env\.GITHUB_ACTIONS !== "true"/, activeFinalize],
      ["bounded npm reads", /const maxReads = 6\b/, activeFinalize],
      ["post-publish absence retries", /acceptAbsent && state\.kind === "absent"/, activeFinalize],
      [
        "local annotated tag inspection",
        /async function localTagState[\s\S]*objecttype[\s\S]*\^tag\\t/,
        activeFinalize,
      ],
      ["independent npm documents", /const versionsDoc[\s\S]*const tagsDoc/, activeFinalize],
      [
        "strict tag parse",
        /direct\.length === 1 && peeled\.length === 1 && peeled\[0\] === artifactSha/,
        activeFinalize,
      ],
      ["local artifact tag target", /match && match\[1\] === artifactSha/, activeFinalize],
      ["HTTP 404 absence", /result\.status === 404/, activeFinalize],
      ["unknown Release fail closed", /result\.status !== 200/, activeFinalize],
      ["annotated artifact tag", /\["tag", "-a", tag, artifactSha, "-m", tag\]/, activeFinalize],
      ["atomic explicit push", /\["push", "--atomic", "origin", \.\.\.refs\]/, activeFinalize],
      [
        "release exact postverification",
        /releaseState\(`\$\{item\.name\}@\$\{item\.version\}`\)\)\.kind !== "exact"/,
        activeFinalize,
      ],
      [
        "missing npm subset",
        /states\.filter\(\((?:state|item)\) => (?:state|item)\.npm === "absent"\)/,
        activeFinalize,
      ],
      [
        "default publication",
        /\["nx", "release", "publish", `--projects=\$\{missing\.join\(","\)\}`\]/,
        activeFinalize,
      ],
      [
        "publish lifecycle-script environment",
        /env:\s*\{\s*\.\.\.process\.env,\s*NPM_CONFIG_IGNORE_SCRIPTS:\s*"true"\s*\}/,
        activeFinalize,
      ],
      [
        "historical all-existing guard",
        /if \(historicalReplay\) \{[\s\S]*item\.tag !== "exact" \|\| item\.release !== "exact" \|\| item\.npm !== "exact"[\s\S]*historical replay requires exact existing tag, GitHub Release, and npm latest/,
        activeFinalize,
      ],
      [
        "preflight reviewed selection",
        /JSON\.stringify\(\{ ok: true, expectedSha, artifactSha, projects, states \}\)/,
        activeFinalize,
      ],
      ["preflight return", /if \(historicalReplay \|\| preflight\) return/, activeFinalize],
      ["selection release roots from nx", /jq -r ['"]?\.release\.projects\[\]['"]? nx\.json/, active],
      ["selection project metadata", /pnpm nx show project "\$RELEASE_ROOT" --json/, active],
      ["selection exact allowlist", /grep -Fx -- "\$project"/, active],
      ["selection duplicate rejection", /sort \| uniq -d/, active],
      ["PREPARE derived manifest", /MANIFEST_PATH="\$ROOT\/package\.json"/, active],
      ["PREPARE strict beta source", /-beta\\\.\(0\|\[1-9\]\[0-9\]\*\)\$/, active],
      [
        "PREPARE derived stable target",
        /NEW="\$\{BASH_REMATCH\[1\]\}\.\$\{BASH_REMATCH\[2\]\}\.\$\{BASH_REMATCH\[3\]\}"/,
        active,
      ],
      ["PREPARE Nx flags", /--git-commit=false --git-tag=false --git-push=false --stage-changes=false/, active],
      ["PREPARE expected path equality", /cmp -s "\$EXPECTED_PATHS" "\$ACTUAL"/, active],
      ["PREPARE exact staging", /git add --pathspec-from-file="\$EXPECTED_PATHS"/, active],
      ["PREPARE staged path equality", /cmp -s "\$EXPECTED_PATHS" "\$STAGED_PATHS"/, active],
      [
        "PREPARE committed changelog blob",
        /git cat-file -t "\$RELEASE_SHA:CHANGELOG\.md"[\s\S]*\[ "\$RELEASE_CHANGELOG_TYPE" != "blob" \]/,
        active,
      ],
      [
        "validate reviewed artifact changelog blob",
        /git cat-file -t "\$RESOLVED_ARTIFACT_SHA:CHANGELOG\.md"[\s\S]*\[ "\$ARTIFACT_CHANGELOG_TYPE" != "blob" \]/,
        active,
      ],
      ["PREPARE release branch", /BRANCH="release\/stable-\$SHA_PREFIX"/, active],
      [
        "read-only PREFLIGHT summary",
        /PREFLIGHT is read-only exact-state verification; it does not tag, push, create Releases, or publish\./,
        active,
      ],
    ]
    for (const [name, pattern, body] of required) if (!pattern.test(body)) violations.push(`stable ${name}`)
    if (!active.includes(stableTransitionVersionPattern)) {
      violations.push("stable PREPARE no-leading-zero beta source")
    }
    if (!activeFinalize.includes(stableTransitionVersionPattern)) {
      violations.push("stable FINALIZE no-leading-zero beta source")
    }

    if (!resolve) {
      violations.push("stable mode resolver")
    } else {
      const exclusivity = [
        /^if \[ "\$PREFLIGHT_ONLY" = true \] && \[ "\$PUBLISH_ONLY" = true \]; then$/,
        /^echo '::error::preflight_only and publish_only are mutually exclusive'$/,
        /^exit 1$/,
        /^elif \[ "\$PREFLIGHT_ONLY" = true \]; then$/,
      ]
      if (!hasCommandSequence(resolve.commands, exclusivity)) violations.push("stable PREFLIGHT/FINALIZE exclusivity")
      if (!/PREFLIGHT_ONLY:\s*\$\{\{ inputs\.preflight_only \}\}/.test(resolve.source)) {
        violations.push("stable PREFLIGHT boolean environment")
      }
      const preflightBranch = resolve.source.match(
        /elif \[ "\$PREFLIGHT_ONLY" = true \]; then([\s\S]*?)elif \[ "\$PUBLISH_ONLY" = true \]; then/,
      )?.[1]
      if (!preflightBranch) {
        violations.push("stable PREFLIGHT mode branch")
      } else {
        if (
          !/\[\[ "\$EXPECTED_SHA" =~ \^\[0-9a-f\]\{40\}\$ \]\] \|\| \{ echo '::error::PREFLIGHT requires full lowercase expected_sha'; exit 1; \}/.test(
            preflightBranch,
          )
        ) {
          violations.push("stable PREFLIGHT full expected SHA")
        }
        if (
          !/if \[ -n "\$ARTIFACT_SHA" \]; then \[\[ "\$ARTIFACT_SHA" =~ \^\[0-9a-f\]\{40\}\$ \]\] \|\| \{ echo '::error::PREFLIGHT requires full lowercase artifact_sha'; exit 1; \}; fi/.test(
            preflightBranch,
          )
        ) {
          violations.push("stable PREFLIGHT optional full artifact SHA")
        }
        if (!/MODE=preflight/.test(preflightBranch)) violations.push("stable PREFLIGHT mode output")
      }
      if (!resolve.commands.includes(stableFinalizeExpectedShaGuard)) {
        violations.push("stable FINALIZE full expected SHA guard")
      }
    }

    const freshSequence = [
      /^if \[ "\$MODE" = preflight \] \|\| \[ "\$MODE" = finalize \]; then$/,
      /^test "\$HEAD_SHA" = "\$EXPECTED_SHA" \|\| \{ echo '::error::PREFLIGHT\/FINALIZE SHA mismatch'; exit 1; \}$/,
      /^if ! ARTIFACT_CHANGELOG_TYPE=\$\(git cat-file -t "\$RESOLVED_ARTIFACT_SHA:CHANGELOG\.md" 2>\/dev\/null\) \|\| \[ "\$ARTIFACT_CHANGELOG_TYPE" != "blob" \]; then$/,
      /^echo '::error::reviewed stable artifact requires root CHANGELOG\.md to exist as a blob'$/,
      /^exit 1$/,
      /^fi$/,
      /^fi$/,
    ]
    if (!freshAuthorization || !hasCommandSequence(freshAuthorization.commands, freshSequence)) {
      violations.push("stable fresh PREFLIGHT and FINALIZE expected SHA authorization")
    }

    if (
      !prepare ||
      !/^\s{4}if:\s*\$\{\{ needs\.validate\.outputs\.mode == 'prepare' \}\}\s*$/m.test(extractJob(source, "prepare"))
    ) {
      violations.push("stable PREPARE-only step")
    }
    if (
      !finalize ||
      !/^\s{4}if:\s*\$\{\{ needs\.validate\.outputs\.mode == 'finalize' \}\}\s*$/m.test(extractJob(source, "finalize"))
    ) {
      violations.push("stable FINALIZE-only step")
    }
    if (!preflight) {
      violations.push("stable PREFLIGHT step")
    } else {
      if (
        !/^\s{4}if:\s*\$\{\{ needs\.validate\.outputs\.mode == 'preflight' \}\}\s*$/m.test(
          extractJob(source, "preflight"),
        )
      ) {
        violations.push("stable PREFLIGHT-only step")
      }
      if (!/EXPECTED_SHA:\s*\$\{\{ needs\.validate\.outputs\.expected_sha \}\}/.test(preflight.source)) {
        violations.push("stable PREFLIGHT expected SHA environment")
      }
      if (!/ARTIFACT_SHA:\s*\$\{\{ needs\.validate\.outputs\.artifact_sha \}\}/.test(preflight.source)) {
        violations.push("stable PREFLIGHT artifact SHA environment")
      }
      if (!/PROJECTS:\s*\$\{\{ needs\.validate\.outputs\.projects \}\}/.test(preflight.source)) {
        violations.push("stable PREFLIGHT normalized selection")
      }
      if (!/GITHUB_TOKEN:\s*\$\{\{ github\.token \}\}/.test(preflight.source)) {
        violations.push("stable PREFLIGHT GitHub token")
      }
      if (
        preflight.commands.length !== 1 ||
        preflight.commands[0] !== "bash scripts/release-finalize-stable.sh --preflight --json"
      ) {
        violations.push("stable PREFLIGHT exact read-only invocation")
      }
      if (
        /NODE_AUTH_TOKEN|NPM_CONFIG_PROVENANCE|npm (?:whoami|publish|dist-tag|unpublish)|nx release publish|git (?:tag|push|commit)|gh release (?:create|delete|edit|upload)/.test(
          preflight.source,
        )
      ) {
        violations.push("stable PREFLIGHT mutation isolation")
      }
    }

    const prepareBody = prepare?.source ?? ""
    if (/\bread\s+-r\s+[^\n;]*\bPATH\b/.test(prepareBody)) violations.push("stable PREPARE reserved PATH shadowing")
    if (/printf '%s\\n' '@effectify\/|0\.1\.0-beta\.0|0\.5\.13-beta\.0/.test(prepareBody)) {
      violations.push("stable PREPARE historical records")
    }
    if (/npm dist-tag|npm unpublish|gh release delete|git tag -f|--tag=(?:alpha|beta)/.test(activeFinalize))
      violations.push("stable destructive or channel repair")
    const order = [
      "const states = await inspect(records)",
      '["tag", "-a"',
      '["push", "--atomic"',
      'github("POST"',
      "releaseState(`${item.name}",
      '["nx", "release", "publish"',
      "const state = await npmBounded(item.name",
    ].map((token) => activeFinalize.indexOf(token))
    if (
      order.some((position) => position < 0) ||
      order.some((position, index) => index > 0 && position <= order[index - 1])
    )
      violations.push("stable ordering")
    return violations
  }
}

const releasePolicyBootstrapViolations = (source) => {
  const steps = extractSteps(extractJob(source, "release-policy"))
  const setupNodeIndex = steps.findIndex((step) => step.uses.startsWith("actions/setup-node@"))
  if (setupNodeIndex === -1) return ["release-policy setup-node"]

  const pnpmIndex = steps.findIndex((step) => step.uses.startsWith("pnpm/action-setup@"))
  const cacheDisabled = steps[setupNodeIndex].packageManagerCache === "false"
  return pnpmIndex !== -1 && pnpmIndex < setupNodeIndex ? [] : cacheDisabled ? [] : ["release-policy setup-node cache"]
}

const stableReleasePrGuardViolations = (source) => {
  const violations = []
  const job = extractJob(source, "release-policy")
  const steps = extractSteps(job)
  const condition =
    "github.event_name == 'pull_request' && startsWith(github.event.pull_request.head.ref, 'release/stable-')"
  const checkout = steps.find((step) => step.name.includes("Checkout stable release PR head"))
  const guard = steps.find((step) => step.name.includes("Require one stable release source commit"))
  const ordinaryCheckout = steps.find((step) => step.name === "📥 Checkout")

  if (!hasExactPermissions(job, { contents: "read" })) {
    violations.push("stable release PR read-only permissions")
  }
  if (!checkout || checkout.condition !== condition || !checkout.uses.startsWith("actions/checkout@")) {
    violations.push("stable release PR head checkout")
  } else {
    for (const [pattern, name] of [
      [/ref:\s*\$\{\{ github\.event\.pull_request\.head\.sha \}\}/, "exact head SHA checkout"],
      [/fetch-depth:\s*0/, "full head history"],
      [/persist-credentials:\s*false/, "non-persisted checkout credentials"],
    ])
      if (!pattern.test(checkout.source)) violations.push(`stable release PR ${name}`)
  }

  if (!guard || guard.condition !== condition) {
    violations.push("stable release PR conditional guard")
    return violations
  }
  if (!ordinaryCheckout || ordinaryCheckout.condition || !ordinaryCheckout.uses.startsWith("actions/checkout@")) {
    violations.push("ordinary CI checkout remains unconditional")
  } else if (
    steps.indexOf(checkout) >= steps.indexOf(guard) ||
    steps.indexOf(guard) >= steps.indexOf(ordinaryCheckout)
  ) {
    violations.push("stable release PR guard ordering")
  }
  for (const [pattern, name] of [
    [/PR_HEAD_REF:\s*\$\{\{ github\.event\.pull_request\.head\.ref \}\}/, "head ref environment"],
    [/PR_HEAD_SHA:\s*\$\{\{ github\.event\.pull_request\.head\.sha \}\}/, "head SHA environment"],
    [/PR_BASE_SHA:\s*\$\{\{ github\.event\.pull_request\.base\.sha \}\}/, "base SHA environment"],
  ])
    if (!pattern.test(guard.source)) violations.push(`stable release PR ${name}`)

  if (guard.commands.some((command) => command.includes("${{"))) {
    violations.push("stable release PR shell expression interpolation")
  }
  const commands = guard.commands.join("\n")
  for (const [pattern, name] of [
    [/^\[\[ "\$PR_HEAD_REF" == release\/stable-\* \]\] \|\| /m, "head branch prefix validation"],
    [/^\[\[ "\$PR_HEAD_SHA" =~ \^\[0-9a-f\]\{40\}\$ \]\] \|\| /m, "full head SHA validation"],
    [/^\[\[ "\$PR_BASE_SHA" =~ \^\[0-9a-f\]\{40\}\$ \]\] \|\| /m, "full base SHA validation"],
    [/^git fetch --no-tags --no-write-fetch-head origin "\$PR_BASE_SHA"$/m, "exact base fetch"],
    [/^test "\$\(git rev-parse HEAD\)" = "\$PR_HEAD_SHA" \|\| /m, "checked-out head equality"],
    [/^git cat-file -e "\$\{PR_HEAD_SHA\}\^\{commit\}"$/m, "head commit existence"],
    [/^git cat-file -e "\$\{PR_BASE_SHA\}\^\{commit\}"$/m, "base commit existence"],
    [/^SOURCE_COMMIT_COUNT=\$\(git rev-list --count "\$PR_BASE_SHA\.\.\$PR_HEAD_SHA"\)$/m, "base-to-head count"],
    [/^if \[ "\$SOURCE_COMMIT_COUNT" != 1 \]; then$/m, "exactly one source commit"],
  ])
    if (!pattern.test(commands)) violations.push(`stable release PR ${name}`)

  return violations
}

const policyViolations = ({ alpha, beta, stable, stableFinalize = stableFinalizeScript, docs }) => {
  const violations = [
    ...channelViolations("alpha", alpha),
    ...betaViolations(beta),
    ...stableViolations(stable, stableFinalize),
  ]
  if (!/\|\s*Beta\s*\|[^\n]*`master`[^\n]*`beta`/.test(withoutComments(docs))) {
    violations.push("documented mapping")
  }
  return violations
}

const mutate = (source, before, after) => {
  const mutated = source.replace(before, after)
  assert.notEqual(mutated, source, `mutation fixture not found: ${String(before)}`)
  return mutated
}

const assertMutationFails = (name, policy, mutation) => {
  const changed = mutation(policy)
  assert.notDeepEqual(policyViolations(changed), [], name)
}

const mutateStep = (source, stepName, before, after) => {
  const step = extractSteps(source).find((candidate) => candidate.name.includes(stepName))
  assert.ok(step, `step fixture not found: ${stepName}`)
  return source.replace(step.source, mutate(step.source, before, after))
}

test("release policy baseline has zero violations", () => {
  assert.deepEqual(policyViolations({ ...workflows, docs: readme }), [])
  assert.deepEqual(stableCapabilityViolations(workflows.stable), [])
})

test("the executable beta resolver classifier enforces the manifest truth table", () => {
  const nebula = "packages/future/nebula/package.json"
  const orbit = "packages/future/orbit/package.json"
  const catalog = {
    [nebula]: "@future/nebula",
    [orbit]: "@future/orbit",
  }
  const nebulaBeta = { name: "@future/nebula", version: "4.7.0-beta.12" }
  const nebulaStable = { name: "@future/nebula", version: "4.7.0" }
  const orbitBeta = { name: "@future/orbit", version: "8.0.1-beta.3" }
  const orbitStable = { name: "@future/orbit", version: "8.0.1" }
  const benignBefore = { ...nebulaBeta, license: "MIT" }
  const benignAfter = { ...nebulaBeta, license: "Apache-2.0" }

  const exactPromotion = {
    changedPaths: ["CHANGELOG.md", nebula, orbit],
    catalog,
    before: { [nebula]: nebulaBeta, [orbit]: orbitBeta },
    after: { [nebula]: nebulaStable, [orbit]: orbitStable },
  }
  for (const [name, candidate, expected] of [
    [
      "benign metadata with unchanged allowlisted name and version prepares",
      { changedPaths: [nebula], catalog, before: { [nebula]: benignBefore }, after: { [nebula]: benignAfter } },
      "prepare",
    ],
    [
      "a source edit plus a benign manifest edit prepares",
      {
        changedPaths: ["packages/future/nebula/src/index.ts", nebula],
        catalog,
        before: { [nebula]: benignBefore },
        after: { [nebula]: benignAfter },
      },
      "prepare",
    ],
    [
      "formatting-only benign manifest JSON prepares",
      {
        changedPaths: [nebula],
        catalog,
        before: { [nebula]: '{"name":"@future/nebula","version":"4.7.0-beta.12"}' },
        after: { [nebula]: '{\n  "name": "@future/nebula",\n  "version": "4.7.0-beta.12"\n}' },
      },
      "prepare",
    ],
    ["exact changelog plus all beta-to-stable manifests suppresses", exactPromotion, "suppress"],
    [
      "exact promotion with the merged generated release subject suppresses",
      { ...exactPromotion, headSubject: betaMergedReleaseSubject },
      "suppress",
    ],
    [
      "a deleted changelog rejects an otherwise exact promotion",
      { ...exactPromotion, changelogType: "missing" },
      "reject",
    ],
    [
      "a tree at the changelog path rejects an otherwise exact promotion",
      { ...exactPromotion, changelogType: "tree" },
      "reject",
    ],
    [
      "malformed old reviewed manifest rejects",
      { changedPaths: [nebula], catalog, before: { [nebula]: '{"name":' }, after: { [nebula]: nebulaBeta } },
      "reject",
    ],
    [
      "malformed new reviewed manifest rejects",
      { changedPaths: [nebula], catalog, before: { [nebula]: nebulaBeta }, after: { [nebula]: '{"name":' } },
      "reject",
    ],
    [
      "multiple old reviewed JSON documents reject",
      {
        changedPaths: [nebula],
        catalog,
        before: { [nebula]: `${JSON.stringify(nebulaBeta)}\n${JSON.stringify(nebulaBeta)}` },
        after: { [nebula]: nebulaBeta },
      },
      "reject",
    ],
    [
      "multiple new reviewed JSON documents reject",
      {
        changedPaths: [nebula],
        catalog,
        before: { [nebula]: nebulaBeta },
        after: { [nebula]: `${JSON.stringify(nebulaBeta)}\n${JSON.stringify(nebulaBeta)}` },
      },
      "reject",
    ],
    [
      "an old reviewed JSON array rejects",
      { changedPaths: [nebula], catalog, before: { [nebula]: [nebulaBeta] }, after: { [nebula]: nebulaBeta } },
      "reject",
    ],
    [
      "a new reviewed JSON array rejects",
      { changedPaths: [nebula], catalog, before: { [nebula]: nebulaBeta }, after: { [nebula]: [nebulaBeta] } },
      "reject",
    ],
    [
      "an old reviewed JSON scalar rejects",
      { changedPaths: [nebula], catalog, before: { [nebula]: "false" }, after: { [nebula]: nebulaBeta } },
      "reject",
    ],
    [
      "a new reviewed JSON scalar rejects",
      { changedPaths: [nebula], catalog, before: { [nebula]: nebulaBeta }, after: { [nebula]: "null" } },
      "reject",
    ],
    [
      "an empty old reviewed document rejects",
      { changedPaths: [nebula], catalog, before: { [nebula]: "" }, after: { [nebula]: nebulaBeta } },
      "reject",
    ],
    [
      "an empty new reviewed document rejects",
      { changedPaths: [nebula], catalog, before: { [nebula]: nebulaBeta }, after: { [nebula]: "" } },
      "reject",
    ],
    [
      "deleted reviewed manifest rejects",
      { changedPaths: [nebula], catalog, before: { [nebula]: nebulaBeta }, after: {} },
      "reject",
    ],
    [
      "renamed manifest path rejects",
      {
        changedPaths: [nebula, "packages/future/renamed/package.json"],
        catalog,
        before: { [nebula]: nebulaBeta },
        after: {},
      },
      "reject",
    ],
    [
      "package rename rejects",
      {
        changedPaths: [nebula],
        catalog,
        before: { [nebula]: nebulaBeta },
        after: { [nebula]: { ...nebulaBeta, name: "@future/renamed" } },
      },
      "reject",
    ],
    [
      "arbitrary version bump rejects",
      {
        changedPaths: [nebula],
        catalog,
        before: { [nebula]: nebulaBeta },
        after: { [nebula]: { ...nebulaBeta, version: "4.7.0-beta.13" } },
      },
      "reject",
    ],
    [
      "manifest-only beta-to-stable transition rejects",
      { changedPaths: [nebula], catalog, before: { [nebula]: nebulaBeta }, after: { [nebula]: nebulaStable } },
      "reject",
    ],
    [
      "partial promotion mixed with benign metadata rejects",
      {
        changedPaths: ["CHANGELOG.md", nebula, orbit],
        catalog,
        before: { [nebula]: nebulaBeta, [orbit]: { ...orbitBeta, license: "MIT" } },
        after: { [nebula]: nebulaStable, [orbit]: { ...orbitBeta, license: "Apache-2.0" } },
      },
      "reject",
    ],
    [
      "mixed promotion with an arbitrary version rejects",
      {
        changedPaths: ["CHANGELOG.md", nebula, orbit],
        catalog,
        before: { [nebula]: nebulaBeta, [orbit]: orbitBeta },
        after: { [nebula]: nebulaStable, [orbit]: { ...orbitBeta, version: "8.0.2" } },
      },
      "reject",
    ],
    [
      "changelog-bearing non-promotion rejects",
      {
        changedPaths: ["CHANGELOG.md", nebula],
        catalog,
        before: { [nebula]: benignBefore },
        after: { [nebula]: benignAfter },
      },
      "reject",
    ],
    [
      "extra changed path prevents exact promotion suppression",
      { ...exactPromotion, changedPaths: [...exactPromotion.changedPaths, "README.md"] },
      "reject",
    ],
    [
      "a release subject rejects benign manifest metadata",
      {
        changedPaths: [nebula],
        catalog,
        before: { [nebula]: benignBefore },
        after: { [nebula]: benignAfter },
        headSubject: "chore(release): update package metadata",
      },
      "reject",
    ],
    [
      "a skip-release subject rejects an ordinary source push",
      {
        changedPaths: ["packages/future/nebula/src/index.ts"],
        catalog,
        headSubject: "fix: update source [skip release]",
      },
      "reject",
    ],
  ]) {
    assert.equal(runBetaPushClassifier(candidate), expected, name)
  }

  assert.doesNotMatch(withoutComments(workflows.beta), /CORRECTIVE_|corrective solid-query|corrective beta/)
})

test("the actual beta push resolver fails closed on manifests, event SHAs, and Nx output", () => {
  const benignBefore = { name: betaProject, version: "4.7.0-beta.12", license: "MIT" }
  const benignAfter = { ...benignBefore, license: "Apache-2.0" }
  for (const [name, candidate] of [
    [
      "source plus benign manifest",
      {
        changedPaths: ["packages/future/nebula/src/index.ts", betaManifestPath],
        beforeDocument: benignBefore,
        afterDocument: benignAfter,
        affectedOutput: JSON.stringify([betaProject]),
      },
    ],
    [
      "formatting-only benign manifest",
      {
        changedPaths: [betaManifestPath],
        beforeDocument: '{"name":"@future/nebula","version":"4.7.0-beta.12"}',
        afterDocument: '{\n  "name": "@future/nebula",\n  "version": "4.7.0-beta.12"\n}',
        affectedOutput: JSON.stringify([betaProject]),
      },
    ],
  ]) {
    const result = runBetaPushResolver(candidate)
    assert.equal(result.status, 0, `${name}: ${result.stderr}`)
    assert.deepEqual(result.output, { mode: "prepare", has_projects: "true", projects: betaProject })
  }

  const exactReleasePromotion = runBetaPushResolver({
    changedPaths: ["CHANGELOG.md", betaManifestPath],
    beforeDocument: { name: betaProject, version: "4.7.0-beta.12" },
    afterDocument: { name: betaProject, version: "4.7.0" },
    headMessage: betaMergedReleaseSubject,
  })
  assert.equal(exactReleasePromotion.status, 0, exactReleasePromotion.stderr)
  assert.deepEqual(exactReleasePromotion.output, { mode: "suppress", has_projects: "false", projects: "" })

  for (const [name, candidate] of [
    [
      "release subject on benign manifest metadata",
      {
        changedPaths: [betaManifestPath],
        beforeDocument: benignBefore,
        afterDocument: benignAfter,
        headMessage: "chore(release): update package metadata",
      },
    ],
    [
      "skip-release subject on an ordinary source push",
      {
        changedPaths: ["packages/future/nebula/src/index.ts"],
        headMessage: "fix: update source [skip release]",
      },
    ],
  ]) {
    const result = runBetaPushResolver(candidate)
    assert.notEqual(result.status, 0, name)
    assert.deepEqual(result.output, {}, name)
  }

  const validDocument = { name: betaProject, version: "4.7.0-beta.12" }
  const serializedDocument = JSON.stringify(validDocument)
  for (const [name, candidate] of [
    ["malformed old manifest", { beforeDocument: '{"name":' }],
    ["malformed new manifest", { afterDocument: '{"name":' }],
    ["multiple old manifest documents", { beforeDocument: `${serializedDocument}\n${serializedDocument}` }],
    ["multiple new manifest documents", { afterDocument: `${serializedDocument}\n${serializedDocument}` }],
    ["old manifest array", { beforeDocument: [validDocument] }],
    ["new manifest array", { afterDocument: [validDocument] }],
    ["old manifest scalar", { beforeDocument: "false" }],
    ["new manifest scalar", { afterDocument: "null" }],
    ["empty old manifest document", { beforeDocument: "" }],
    ["empty new manifest document", { afterDocument: "" }],
  ]) {
    const result = runBetaPushResolver({
      changedPaths: [betaManifestPath],
      beforeDocument: validDocument,
      afterDocument: validDocument,
      affectedOutput: JSON.stringify([betaProject]),
      ...candidate,
    })
    assert.notEqual(result.status, 0, name)
    assert.deepEqual(result.output, {}, name)
  }

  const deletedChangelog = runBetaPushResolver({
    changedPaths: ["CHANGELOG.md", betaManifestPath],
    beforeDocument: { name: betaProject, version: "4.7.0-beta.12" },
    afterDocument: { name: betaProject, version: "4.7.0" },
    changelogType: "missing",
  })
  assert.notEqual(deletedChangelog.status, 0)
  assert.deepEqual(deletedChangelog.output, {})

  for (const [name, candidate] of [
    ["missing before SHA", { beforeSha: "" }],
    ["uppercase head SHA", { headSha: "A".repeat(40) }],
    ["zero before SHA", { beforeSha: "0".repeat(40) }],
    ["unresolvable before SHA", { beforeType: "missing" }],
    ["non-commit head object", { headType: "tree" }],
    ["checked-out HEAD mismatch", { checkedOutHead: "3".repeat(40) }],
  ]) {
    const result = runBetaPushResolver(candidate)
    assert.notEqual(result.status, 0, name)
    assert.deepEqual(result.output, {}, name)
  }

  const empty = runBetaPushResolver({ affectedOutput: "[]" })
  assert.equal(empty.status, 0, empty.stderr)
  assert.deepEqual(empty.output, { mode: "prepare", has_projects: "false", projects: "" })

  for (const [name, candidate] of [
    ["Nx exits nonzero", { affectedExit: 42 }],
    ["Nx returns malformed JSON", { affectedOutput: "{" }],
    ["Nx returns an object", { affectedOutput: "{}" }],
    ["Nx returns multiple JSON values", { affectedOutput: "[]\n[]" }],
    ["Nx returns a mixed array", { affectedOutput: JSON.stringify([betaProject, 3]) }],
  ]) {
    const result = runBetaPushResolver(candidate)
    assert.notEqual(result.status, 0, name)
    assert.deepEqual(result.output, {}, name)
  }
})

test("dev pushes retain exact-range conditional alpha publication", () => {
  assert.deepEqual(channelViolations("alpha", workflows.alpha), [])
})

test("beta release message guards classify only the first-line subject", () => {
  const hasReleaseSubjectToken = (message) => {
    const subject = message.split("\n", 1)[0]
    return subject.includes("chore(release):") || subject.includes("[skip release]")
  }
  const mergeMessage =
    "Merge pull request #232 from devx-op/dev\n\nchore(release): promote protected beta orchestration"

  assert.equal(hasReleaseSubjectToken(mergeMessage), false)
  assert.equal(hasReleaseSubjectToken("chore(release): prepare beta\nordinary body"), true)
  assert.equal(hasReleaseSubjectToken("ordinary subject\n[skip release] in body"), false)
  assert.equal(hasReleaseSubjectToken("ordinary subject [skip release]\nbody"), true)
})

test("beta Git identity covers project PREPARE and FINALIZE but skips suppression and empty selections", () => {
  for (const [mode, hasProjects, expected] of [
    ["prepare", true, true],
    ["finalize", true, true],
    ["suppress", true, false],
    ["prepare", false, false],
    ["finalize", false, false],
  ]) {
    assert.equal(betaGitIdentityRuns(workflows.beta, mode, hasProjects), expected, `${mode}/${hasProjects}`)
  }
})

test("the release policy contract runs in PR CI", () => {
  assert.match(withoutComments(workflows.ci), /pull_request:/)
  requireCommand([], workflows.ci, contractCommand, "CI policy contract")
  assert.notEqual(commandPosition(workflows.ci, contractCommand), -1)
})

test("stable release PRs require exactly one source commit from actual GitHub PR SHAs", () => {
  assert.deepEqual(stableReleasePrGuardViolations(workflows.ci), [])
})

test("the stable release PR guard rejects injection and commit-count policy drift", () => {
  for (const [name, before, after] of [
    ["write-capable token", "contents: read", "contents: write"],
    [
      "extra release-policy OIDC permission",
      "    permissions:\n      contents: read",
      "    permissions:\n      contents: read\n      id-token: write",
    ],
    [
      "broadened branch condition",
      "startsWith(github.event.pull_request.head.ref, 'release/stable-')",
      "startsWith(github.event.pull_request.head.ref, 'release/')",
    ],
    [
      "merge-ref checkout",
      "ref: ${{ github.event.pull_request.head.sha }}",
      "ref: ${{ github.event.pull_request.merge_commit_sha }}",
    ],
    ["shallow head checkout", "fetch-depth: 0", "fetch-depth: 1"],
    ["persisted checkout credentials", "persist-credentials: false", "persist-credentials: true"],
    [
      "shell expression interpolation",
      'SOURCE_COMMIT_COUNT=$(git rev-list --count "$PR_BASE_SHA..$PR_HEAD_SHA")',
      'SOURCE_COMMIT_COUNT=$(git rev-list --count "${{ github.event.pull_request.base.sha }}..$PR_HEAD_SHA")',
    ],
    ["short head SHA", '"$PR_HEAD_SHA" =~ ^[0-9a-f]{40}$', '"$PR_HEAD_SHA" =~ ^[0-9a-f]{7,40}$'],
    [
      "unvalidated branch fetch",
      'git fetch --no-tags --no-write-fetch-head origin "$PR_BASE_SHA"',
      'git fetch --no-tags --no-write-fetch-head origin "$PR_HEAD_REF"',
    ],
    ["three-dot comparison", '"$PR_BASE_SHA..$PR_HEAD_SHA"', '"$PR_BASE_SHA...$PR_HEAD_SHA"'],
    ["accept multiple source commits", '"$SOURCE_COMMIT_COUNT" != 1', '"$SOURCE_COMMIT_COUNT" -lt 1'],
  ]) {
    const changed = mutate(workflows.ci, before, after)
    assert.notDeepEqual(stableReleasePrGuardViolations(changed), [], name)
  }
})

test("the Node-only release policy job can bootstrap setup-node without pnpm", () => {
  assert.deepEqual(releasePolicyBootstrapViolations(workflows.ci), [])

  const cacheEnabled = mutate(workflows.ci, "package-manager-cache: false", "package-manager-cache: true")
  assert.notDeepEqual(releasePolicyBootstrapViolations(cacheEnabled), [])

  const pnpmFirst = mutate(
    cacheEnabled,
    "      - name: 🏗️ Setup Node.js",
    "      - name: 📦 Install pnpm\n        uses: pnpm/action-setup@v6\n\n      - name: 🏗️ Setup Node.js",
  )
  assert.deepEqual(releasePolicyBootstrapViolations(pnpmFirst), [])
})

test("stable PREFLIGHT can bootstrap setup-node without pnpm", () => {
  assert.deepEqual(stableCapabilityViolations(workflows.stable), [])

  const cacheEnabled = mutate(workflows.stable, "package-manager-cache: false", "package-manager-cache: true")
  assert.ok(
    stableCapabilityViolations(cacheEnabled).includes("stable PREFLIGHT setup-node package-manager cache"),
  )
})

test("release documentation leads with the three-channel mapping", () => {
  for (const document of [readme, setup]) {
    const active = withoutComments(document)
    assert.match(active, /\|\s*Channel\s*\|\s*Trigger\s*\|\s*npm tag\s*\|/)
    assert.match(active, /\|\s*Alpha\s*\|[^\n]*`dev`[^\n]*`alpha`[^\n]*\|/)
    assert.match(active, /\|\s*Beta\s*\|[^\n]*`master`[^\n]*`beta`[^\n]*\|/)
    assert.match(active, /\|\s*Stable\s*\|[^\n]*[Mm]anual[^\n]*(?:default|latest)[^\n]*\|/)
  }

  assert.match(setup, /Node\.js 24\.19\.0/)
  assert.match(setup, /publish-only recovery/i)
  assert.doesNotMatch(setup, /JSR|develop branch|release\.yml/)
})

test("README describes every release package and links a real router-auth reference", () => {
  for (const project of releaseProjects) {
    assert.match(readme, new RegExp(project.replaceAll("/", "\\/")))
    assert.match(
      readme,
      new RegExp(`(?:npm install|pnpm add|yarn add) ${project.replaceAll("/", "\\/")}@alpha`),
      `missing alpha install for ${project}`,
    )
  }

  assert.match(readme, /packages\/react\/router-better-auth\/tests\/auth-guard\.test\.ts/)
  assert.match(readme, /Effect v4 RC/)
  assert.match(readme, /React Router 8/)
  assert.match(readme, /pnpm nx dev @effectify\/solid-example/)
  assert.doesNotMatch(readme, /Effect v4 beta|React Remix|@effectify\/react-remix/)
})

test("setup lists all seven Nx release projects", () => {
  for (const project of releaseProjects) {
    assert.match(setup, new RegExp(project.replaceAll("/", "\\/")))
  }
  assert.match(setup, /sole `type:\*` label is `type:chore`/)
})

test("beta PREPARE terminal gates and annotations fail closed under mutation", () => {
  const policy = { ...workflows, docs: readme }
  for (const gate of terminalGates) {
    const block = `if ! ${gate.command}; then\n            echo "::error::${gate.annotation}"\n            exit 1\n          fi`
    assertMutationFails(`remove ${gate.annotation} guard`, policy, (candidate) => ({
      ...candidate,
      beta: mutate(candidate.beta, block, `          ${gate.command}`),
    }))
    assertMutationFails(`remove ${gate.annotation} annotation`, policy, (candidate) => ({
      ...candidate,
      beta: mutate(candidate.beta, `::error::${gate.annotation}`, "::error::removed"),
    }))
  }
})

test("beta PREPARE terminal gates emit only fixed diagnostics and stop later commands", () => {
  const prepare = extractSteps(workflows.beta).find((step) =>
    step.commands.some((command) => betaVersionCommand.test(command)),
  )
  assert.ok(prepare)
  const start = prepare.commands.indexOf(`if ! ${terminalGates[0].command}; then`)
  const last = prepare.commands.indexOf(`if ! ${terminalGates.at(-1).command}; then`)
  const end = prepare.commands.indexOf("fi", last)
  assert.ok(start >= 0 && last > start && end > last)
  const block = prepare.commands.slice(start, end + 1).join("\n")
  const run = (failure) =>
    spawnSync(
      "bash",
      [
        "-c",
        `SOURCE_SHA=abc SHA_PREFIX=abc\ngit() {\n  case "$1" in\n    commit) [ "$FAILURE" != commit ] || return 1 ;;\n    status) [ "$FAILURE" != commit ] || echo "LATE status"; [ "$FAILURE" != status ] || printf dirty ;;\n    push) [ "$FAILURE" != commit ] || echo "LATE push"; [ "$FAILURE" != status ] || echo "LATE push"; [ "$FAILURE" != push ] || return 1 ;;\n  esac\n}\n${block}\necho SENTINEL`,
      ],
      { encoding: "utf8", env: { FAILURE: failure } },
    )

  for (const [index, gate] of terminalGates.entries()) {
    const result = run(["commit", "status", "push"][index])
    assert.equal(result.status, 1)
    assert.equal(result.stdout, `::error::${gate.annotation}\n`)
    assert.equal(result.stderr, "")
  }
  const success = run("none")
  assert.equal(success.status, 0)
  assert.equal(success.stdout, "SENTINEL\n")
  assert.equal(success.stderr, "")
})

test("beta FINALIZE conflict and ordering mutations fail closed", () => {
  const policy = { ...workflows, docs: readme }

  for (const [name, before, after] of [
    [
      "skip Git identity in FINALIZE",
      "(steps.release.outputs.mode == 'prepare' || steps.release.outputs.mode == 'finalize')",
      "steps.release.outputs.mode == 'prepare'",
    ],
    ["accept short expected SHA", betaFinalizeExpectedShaGuard, betaFinalizeExpectedShaGuard.replace("{40}", "{7,40}")],
    ["weaken checkout equality", 'test "$HEAD_SHA" = "$EXPECTED_SHA"', 'test "$HEAD_SHA" != "$EXPECTED_SHA"'],
    ["weaken remote equality", 'test "$REMOTE_SHA" = "$EXPECTED_SHA"', 'test "$REMOTE_SHA" != "$EXPECTED_SHA"'],
    ["create lightweight tags", 'git tag -a "$TAG" "$EXPECTED_SHA" -m "$TAG"', 'git tag "$TAG" "$EXPECTED_SHA"'],
    ["target tags at moving HEAD", 'git tag -a "$TAG" "$EXPECTED_SHA" -m "$TAG"', 'git tag -a "$TAG" HEAD -m "$TAG"'],
    ["remove atomic tag push", 'git push --atomic origin "${TAG_REFS[@]}"', 'git push origin "${TAG_REFS[@]}"'],
    ["push wildcard tags", 'TAG_REFS+=("refs/tags/$TAG:refs/tags/$TAG")', 'TAG_REFS+=("refs/tags/*:refs/tags/*")'],
    ["accept lightweight remote tags", 'test "$PEELED_COUNT" = "1"', 'test "$DIRECT_COUNT" = "1"'],
    [
      "drop GitHub prerelease identity",
      'gh release create "$TAG" --verify-tag --prerelease --generate-notes',
      'gh release create "$TAG" --generate-notes',
    ],
    [
      "publish every project on retry",
      'PROJECTS="$MISSING_PROJECTS"',
      'PROJECTS="${{ steps.release.outputs.projects }}"',
    ],
    ["drop exact npm beta tag reads", "dist-tags.beta", "dist-tags.latest"],
    [
      "accept unknown tag reads",
      'echo "unknown remote tag state for $TAG" >&2\n                exit 1',
      'echo "unknown remote tag state for $TAG" >&2\n                :',
    ],
    [
      "accept conflicting npm state",
      'test "$BETA_TAG" = "$VERSION" || { echo "conflicting npm beta state for $NAME" >&2; exit 1; }',
      'test "$BETA_TAG" = "$VERSION" || { echo "conflicting npm beta state for $NAME" >&2; true; }',
    ],
    [
      "accept unknown Release reads",
      'echo "unknown GitHub Release state for $TAG" >&2\n                exit 1',
      'echo "unknown GitHub Release state for $TAG" >&2\n                :',
    ],
  ]) {
    assertMutationFails(name, policy, (candidate) => ({
      ...candidate,
      beta: mutate(candidate.beta, before, after),
    }))
  }

  assertMutationFails("publish before every prerelease is verified", policy, (candidate) => ({
    ...candidate,
    beta: mutate(
      candidate.beta,
      "          verify_releases verify\n\n          MISSING_PROJECTS=",
      '          pnpm nx release publish "--projects=$PROJECTS" --tag=beta\n          verify_releases verify\n\n          MISSING_PROJECTS=',
    ),
  }))
})

test("protected stable PREFLIGHT rejects authorization and mutation-boundary drift", () => {
  const stable = workflows.stable
  assert.deepEqual(stableViolations(stable), [])

  for (const [name, changed] of [
    [
      "remove PREFLIGHT and FINALIZE exclusivity",
      mutateStep(
        stable,
        "Resolve exact stable mode",
        'if [ "$PREFLIGHT_ONLY" = true ] && [ "$PUBLISH_ONLY" = true ]; then',
        "if false; then",
      ),
    ],
    [
      "allow PREFLIGHT without expected SHA",
      mutateStep(
        stable,
        "Resolve exact stable mode",
        "[[ \"$EXPECTED_SHA\" =~ ^[0-9a-f]{40}$ ]] || { echo '::error::PREFLIGHT requires full lowercase expected_sha'; exit 1; }",
        ":",
      ),
    ],
    [
      "route PREFLIGHT to FINALIZE command",
      mutateStep(
        stable,
        "PREFLIGHT exact stable artifacts",
        "bash scripts/release-finalize-stable.sh --preflight --json",
        "bash scripts/release-finalize-stable.sh",
      ),
    ],
    [
      "add a mutation command to PREFLIGHT",
      mutateStep(
        stable,
        "PREFLIGHT exact stable artifacts",
        "run: bash scripts/release-finalize-stable.sh --preflight --json",
        "run: |\n          bash scripts/release-finalize-stable.sh --preflight --json\n          git push origin master",
      ),
    ],
    [
      "add a publication token to PREFLIGHT",
      mutateStep(
        stable,
        "PREFLIGHT exact stable artifacts",
        "GITHUB_TOKEN: ${{ github.token }}",
        "GITHUB_TOKEN: ${{ github.token }}\n          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}",
      ),
    ],
    [
      "skip fresh authorization for PREFLIGHT",
      mutateStep(
        stable,
        "Resolve exact stable mode",
        'if [ "$MODE" = preflight ] || [ "$MODE" = finalize ]; then',
        'if [ "$MODE" = finalize ]; then',
      ),
    ],
  ]) {
    assert.notDeepEqual(stableViolations(changed), [], name)
  }
})

test("protected stable PREPARE and FINALIZE reject independent safety mutations", () => {
  const policy = { ...workflows, docs: readme }
  assert.deepEqual(stableViolations(policy.stable), [])
  for (const [name, before, after] of [
    ["weaken expected SHA", "if (!/^[0-9a-f]{40}$/.test(expectedSha))", "if (!/^[0-9a-f]{7,40}$/.test(expectedSha))"],
    ["weaken artifact SHA", "if (!/^[0-9a-f]{40}$/.test(artifactSha))", "if (!/^[0-9a-f]{7,40}$/.test(artifactSha))"],
    ["remove entry realpath resolution", "resolvedEntry = realpathSync(entry)", "resolvedEntry = entry"],
    [
      "remove module URL realpath resolution",
      "resolvedModule = realpathSync(fileURLToPath(import.meta.url))",
      "resolvedModule = fileURLToPath(import.meta.url)",
    ],
    [
      "remove main-module URL normalization",
      "return pathToFileURL(resolvedEntry).href === pathToFileURL(resolvedModule).href",
      "return resolvedEntry === resolvedModule",
    ],
    ["remove expected SHA environment", 'const expectedSha = process.env.EXPECTED_SHA ?? ""', 'const expectedSha = ""'],
    [
      "remove artifact SHA environment",
      "const artifactSha = process.env.ARTIFACT_SHA || expectedSha",
      "const artifactSha = expectedSha",
    ],
    [
      "swap expected SHA validation",
      '.test(expectedSha)) fail("FINALIZE requires full lowercase expected SHA")',
      '.test(artifactSha)) fail("FINALIZE requires full lowercase expected SHA")',
    ],
    [
      "swap artifact SHA validation",
      '.test(artifactSha)) fail("FINALIZE requires full lowercase artifact SHA")',
      '.test(expectedSha)) fail("FINALIZE requires full lowercase artifact SHA")',
    ],
    ["authorize HEAD with artifact SHA", "head !== expectedSha", "head !== artifactSha"],
    ["authorize origin with artifact SHA", "origin !== expectedSha", "origin !== artifactSha"],
    ["verify remote tags with expected SHA", "peeled[0] === artifactSha", "peeled[0] === expectedSha"],
    ["verify local tags with expected SHA", "match[1] === artifactSha", "match[1] === expectedSha"],
    [
      "target annotated tags at expected SHA",
      '["tag", "-a", tag, artifactSha, "-m", tag]',
      '["tag", "-a", tag, expectedSha, "-m", tag]',
    ],
    ["remove historical all-existing guard", "if (historicalReplay) {", "if (false) {"],
    ["weaken historical npm exactness", 'item.npm !== "exact"', 'item.npm === "unknown"'],
    ["skip artifact changelog blob verification", "await verifyArtifactChangelog()", ""],
    ["accept octopus artifacts", "parents.length !== 2", "parents.length < 2"],
    [
      "accept merge second parent not based on first parent",
      "generatedParents[0] !== firstParent",
      "generatedParents[0] === firstParent",
    ],
    ["accept a differing merge tree", "treeIds[0] !== treeIds[1]", "treeIds[0] === treeIds[1]"],
    ["unbound retries", "const maxReads = 6", "const maxReads = 60"],
    [
      "remove publish lifecycle-script environment",
      'env: { ...process.env, NPM_CONFIG_IGNORE_SCRIPTS: "true" }',
      "env: process.env",
    ],

    [
      "accept duplicate tag refs",
      "direct.length === 1 && peeled.length === 1",
      "direct.length > 0 && peeled.length > 0",
    ],
    ["accept auth as absence", "result.status === 404", "result.status >= 400"],
    ["lightweight tags", '["tag", "-a",', '["tag",'],
    ["non-atomic push", '["push", "--atomic", "origin", ...refs]', '["push", "origin", ...refs]'],
    ["publish all projects", 'states.filter((state) => state.npm === "absent")', "states"],
  ]) {
    const changed = mutate(stableFinalizeScript, before, after)
    assert.notDeepEqual(stableViolations(policy.stable, changed), [], name)
  }

  for (const [name, before, after] of [
    ["remove expected SHA input", "expected_sha:", "execution_sha:"],
    ["remove artifact SHA input", "artifact_sha:", "publication_sha:"],
  ]) {
    const changed = mutate(policy.stable, before, after)
    assert.notDeepEqual(stableViolations(changed), [], name)
  }

  for (const [name, before, after] of [
    [
      "swap FINALIZE expected SHA env",
      "EXPECTED_SHA: ${{ needs.validate.outputs.expected_sha }}",
      "EXPECTED_SHA: ${{ needs.validate.outputs.artifact_sha }}",
    ],
    [
      "swap FINALIZE artifact SHA env",
      "ARTIFACT_SHA: ${{ needs.validate.outputs.artifact_sha }}",
      "ARTIFACT_SHA: ${{ needs.validate.outputs.expected_sha }}",
    ],
  ]) {
    const changed = mutateStep(policy.stable, "FINALIZE exact stable artifacts", before, after)
    assert.notDeepEqual(stableViolations(changed), [], name)
  }

  const shortSha = mutateStep(
    policy.stable,
    "Resolve exact stable mode",
    stableFinalizeExpectedShaGuard,
    stableFinalizeExpectedShaGuard.replace("{40}", "{7,40}"),
  )
  assert.notDeepEqual(stableViolations(shortSha), [], "allow abbreviated FINALIZE SHA")

  for (const [name, before, after] of [
    ["enable Nx commits", "--git-commit=false", "--git-commit=true"],
    ["enable Nx tags", "--git-tag=false", "--git-tag=true"],
    ["enable Nx pushes", "--git-push=false", "--git-push=true"],
    ["enable Nx staging", "--stage-changes=false", "--stage-changes=true"],
    ["weaken path comparison", 'cmp -s "$EXPECTED_PATHS" "$ACTUAL"', 'test -s "$ACTUAL"'],
    ["stage broad tree", 'git add --pathspec-from-file="$EXPECTED_PATHS"', "git add -A"],
    ["weaken staged paths", 'cmp -s "$EXPECTED_PATHS" "$STAGED_PATHS"', 'test -s "$STAGED_PATHS"'],
    [
      "accept a non-blob prepared changelog",
      '[ "$RELEASE_CHANGELOG_TYPE" != "blob" ]',
      '[ -z "$RELEASE_CHANGELOG_TYPE" ]',
    ],
  ]) {
    const changed = mutateStep(policy.stable, "PREPARE protected stable", before, after)
    assert.notDeepEqual(stableViolations(changed), [], name)
  }

  const uncheckedArtifactChangelog = mutateStep(
    policy.stable,
    "Resolve exact stable mode",
    'git cat-file -t "$RESOLVED_ARTIFACT_SHA:CHANGELOG.md"',
    'git cat-file -t "$HEAD_SHA:CHANGELOG.md"',
  )
  assert.notDeepEqual(stableViolations(uncheckedArtifactChangelog), [], "validate a different changelog artifact")

  const pushMaster = mutateStep(
    policy.stable,
    "Push protected stable branch",
    'push origin "HEAD:refs/heads/$BRANCH"',
    'push origin "HEAD:refs/heads/master"',
  )
  assert.notDeepEqual(stableViolations(pushMaster), [], "push master")
})

test("stable mode jobs compare exact permissions independent of mapping order", () => {
  const reversedFinalizePermissions = mutate(
    workflows.stable,
    "    permissions:\n      contents: write\n      id-token: write",
    "    permissions:\n      id-token: write\n      contents: write",
  )
  assert.deepEqual(stableCapabilityViolations(reversedFinalizePermissions), [])

  const extraFinalizePermission = mutate(
    workflows.stable,
    "    permissions:\n      contents: write\n      id-token: write",
    "    permissions:\n      contents: write\n      id-token: write\n      issues: read",
  )
  assert.ok(stableCapabilityViolations(extraFinalizePermission).includes("stable finalize least privilege"))
})

test("stable mode jobs reject capability and credential drift", () => {
  for (const [name, before, after] of [
    [
      "validation write permission",
      "  validate:\n    name: 🔎 Validate stable request\n    runs-on: ubuntu-latest\n    permissions:\n      contents: read",
      "  validate:\n    name: 🔎 Validate stable request\n    runs-on: ubuntu-latest\n    permissions:\n      contents: write",
    ],
    ["persist checkout credentials", "persist-credentials: false", "persist-credentials: true"],
    ["remove protected environment", "environment: stable-release", "environment: unprotected"],
    [
      "enable FINALIZE lifecycle scripts",
      "      - name: 📦 Install publication tooling without lifecycle scripts\n        run: pnpm install --frozen-lockfile --ignore-scripts",
      "      - name: 📦 Install publication tooling without lifecycle scripts\n        run: pnpm install --frozen-lockfile",
    ],
    ["remove FINALIZE lifecycle-script environment", "          NPM_CONFIG_IGNORE_SCRIPTS: true\n", ""],
    [
      "give PREFLIGHT OIDC",
      "  preflight:\n    name: 🔎 PREFLIGHT exact stable artifacts\n    needs: validate\n    if: ${{ needs.validate.outputs.mode == 'preflight' }}\n    runs-on: ubuntu-latest\n    permissions:\n      contents: read",
      "  preflight:\n    name: 🔎 PREFLIGHT exact stable artifacts\n    needs: validate\n    if: ${{ needs.validate.outputs.mode == 'preflight' }}\n    runs-on: ubuntu-latest\n    permissions:\n      contents: read\n      id-token: write",
    ],
  ]) {
    assert.notDeepEqual(stableViolations(mutate(workflows.stable, before, after)), [], name)
  }
})

test("stable transition SemVer rejects leading-zero identifiers", () => {
  const pattern = new RegExp(stableTransitionVersionPattern)
  for (const version of ["0.0.0-beta.0", "1.2.3-beta.4", "10.20.30-beta.40"]) {
    assert.equal(pattern.test(version), true, version)
  }
  for (const version of ["01.2.3-beta.4", "1.02.3-beta.4", "1.2.03-beta.4", "1.2.3-beta.04"]) {
    assert.equal(pattern.test(version), false, version)
  }
})

test("the beta classifier contract rejects a post-marker function redefinition", () => {
  assert.deepEqual(classifierStructureViolations(workflows.beta), [])
  const redefined = mutate(
    workflows.beta,
    classifierInvocation,
    `classify_push_shape() {\n            printf '%s\\n' prepare\n          }\n          ${classifierInvocation}`,
  )
  const violations = classifierStructureViolations(redefined)
  assert.ok(violations.includes("beta exactly one classifier declaration"))
  assert.ok(violations.includes("beta classifier invocation immediately follows end marker"))
  assert.notDeepEqual(betaViolations(redefined), [])
})

test("the beta classifier decision order rejects subject-first mutations", () => {
  assert.deepEqual(classifierDecisionOrderViolations(workflows.beta), [])
  const exactSuppressionBlock = `${exactBetaSuppressionGuard}
              printf '%s\\n' suppress
              return
            fi`
  const releaseSubjectBlock = `${releaseSubjectGuard}
              printf '%s\\n' reject
              return
            fi`
  const subjectFirst = mutate(
    workflows.beta,
    `${exactSuppressionBlock}\n            ${releaseSubjectBlock}`,
    `${releaseSubjectBlock}\n            ${exactSuppressionBlock}`,
  )

  assert.deepEqual(classifierDecisionOrderViolations(subjectFirst), [classifierDecisionOrderViolation])
  assert.ok(betaViolations(subjectFirst).includes(classifierDecisionOrderViolation))
})

test("generic stable suppression rejects path, transition, and message-only mutations", () => {
  const policy = { ...workflows, docs: readme }
  const versionViolation = "beta stable structural check no-leading-zero beta source"
  assert.equal(betaViolations(policy.beta).includes(versionViolation), false)
  const leadingZeroMutation = mutate(
    policy.beta,
    stableTransitionVersionPattern,
    "^([0-9]+)\\.([0-9]+)\\.([0-9]+)-beta\\.([0-9]+)$",
  )
  assert.equal(betaViolations(leadingZeroMutation).includes(versionViolation), true)

  for (const [name, before, after] of [
    ["ignore root changelog", "HAS_CHANGELOG=true", "HAS_CHANGELOG=false"],
    ["accept extra path", "UNEXPECTED=true", "UNEXPECTED=false"],
    ["ignore old reviewed JSON", 'git show "$BASE:$MANIFEST_PATH"', 'git show "$HEAD:$MANIFEST_PATH"'],
    ["ignore new reviewed JSON", 'git show "$HEAD:$MANIFEST_PATH"', 'git show "$BASE:$MANIFEST_PATH"'],
    ["remove old manifest JSON cardinality", oldManifestCardinalityGuard, "if false ||"],
    ["remove new manifest JSON cardinality", newManifestCardinalityGuard, "false; then"],
    [
      "allow package rename",
      '[ "$OLD_NAME" != "$NAME" ] || [ "$NEW_NAME" != "$NAME" ]',
      '[ -z "$OLD_NAME" ] && [ -z "$NEW_NAME" ]',
    ],
    ["allow arbitrary metadata version", '[ "$OLD_VERSION" = "$NEW_VERSION" ]', '[ -n "$NEW_VERSION" ]'],
    ["allow unrelated stable target", '[ "$NEW_VERSION" = "$STABLE_VERSION" ]', '[ -n "$NEW_VERSION" ]'],
    ["remove non-benign manifest guard", releaseManifestGuard, "if false; then"],
    ["accept an unknown classifier result", classificationFailClosedGuard, 'if [ "$CLASSIFICATION" = "reject" ]; then'],
    [
      "message authorizes suppression",
      exactBetaSuppressionGuard,
      'if [[ "$HEAD_MESSAGE" == *"[skip release]"* ]]; then',
    ],
  ])
    assertMutationFails(name, policy, (candidate) => ({
      ...candidate,
      beta: mutate(candidate.beta, before, after),
    }))
})

test("protected stable documentation exposes authorization and recovery boundaries", () => {
  for (const required of [
    "second reviewed release PR",
    "manually open its linked PR",
    "Required checks, review, and branch protection authorize merge",
    "Alpha remains prerelease-only with `--tag=alpha`; beta remains prerelease-only",
    "Retry only the same exact SHAs and selected subset",
    "FINALIZE is refused outside GitHub Actions",
    "PREPARE creates exactly one local commit",
    "read-only release-policy CI guard",
    "Extra source commits cannot pass this release PR gate",
    "FINALIZE supports merge commits and squashes",
    "Rebase merge is supported only for the single PREPARE commit",
    "squash or single-commit rebase produces a one-parent artifact",
    "exactly two parents",
    "single generated release commit based directly on that first parent",
    "merge tree exactly matches the second-parent tree",
    "aggregate first-parent diff",
    "strict one-parent and exact two-parent graph validation",
    "cannot distinguish a squash from the last commit produced by a rebase",
    "does not infer whether preceding source commits existed",
    "octopus merges",
    "**Stop immediately**",
    "never delete, retarget, unpublish, deprecate, or rewrite it",
  ])
    assert.match(setup, new RegExp(required.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&")))

  assert.match(
    setup,
    /Declared job permissions, including `contents` and `id-token`, are available job-wide; when `id-token: write` is declared, OIDC is not step-scoped\./,
  )
  assert.match(
    setup,
    /The only step-scoped credential controls are explicit secret or token environment variables on their listed API or mutation steps\./,
  )
  assert.match(setup, /Every checkout sets `persist-credentials: false`, so checkout credentials are not persisted\./)
  assert.match(
    setup,
    /The real stable publication boundary is protected `stable-release` environment review, authorization of the reviewed SHA, and npm trusted publishing bound to the repository, workflow, environment, and OIDC claims\./,
  )
  assert.match(
    setup,
    /Action references currently use reviewed moving major tags and are not immutable; this remains a supply-chain risk unless and until repository-wide commit-SHA pinning is adopted\./,
  )
  assert.doesNotMatch(setup, /immutable action versions as referenced/i)
  assert.match(setup, /`GITHUB_ACTIONS` is checked only as an accidental-use guard/)
  assert.equal(setup.match(/GITHUB_ACTIONS/g)?.length, 1)

  assert.match(
    setup,
    /gh pr create --base master --head "\$STABLE_BRANCH" --title "chore\(release\): promote stable" --body "Closes #\$ISSUE" --label "type:chore"/,
  )
  assert.match(
    setup,
    /EXPECTED_SHA=\$\(gh api repos\/\{owner\}\/\{repo\}\/git\/ref\/heads\/master --jq '\.object\.sha'\)/,
  )
  assert.match(setup, /ARTIFACT_SHA=\$\(gh pr view "\$STABLE_PR" --json mergeCommit --jq '\.mergeCommit\.oid'\)/)
  assert.match(
    setup,
    /gh workflow run release-stable\.yml --ref master[\s\S]*-f preflight_only=true[\s\S]*-f expected_sha="\$EXPECTED_SHA"[\s\S]*-f artifact_sha="\$ARTIFACT_SHA"/,
  )
  assert.match(
    setup,
    /gh workflow run release-stable\.yml --ref master[\s\S]*-f publish_only=true[\s\S]*-f preflight_only=false[\s\S]*-f expected_sha="\$EXPECTED_SHA"[\s\S]*-f artifact_sha="\$ARTIFACT_SHA"/,
  )
})

test("protected stable promotion exposes exact PREPARE and FINALIZE contracts", () => {
  const active = withoutComments(`${workflows.stable}\n${stableFinalizeScript}`)
  assert.match(active, /expected_sha:/)
  assert.match(active, /artifact_sha:/)
  assert.match(active, /ARTIFACT_SHA:\s*\$\{\{ inputs\.artifact_sha \}\}/)
  assert.match(active, /const artifactSha = process\.env\.ARTIFACT_SHA \|\| expectedSha/)
  assert.match(active, /const historicalReplay = artifactSha !== expectedSha/)
  assert.match(active, /historical replay requires exact existing tag, GitHub Release, and npm latest/)
  assert.match(active, /MODE=prepare/)
  assert.match(active, /MODE=finalize/)
  assert.match(active, /jq -r ['"]?\.release\.projects\[\]['"]? nx\.json/)
  assert.match(active, /pnpm nx show project "\$RELEASE_ROOT" --json/)
  assert.match(
    active,
    /pnpm nx release version "\$NEW" "--projects=\$PROJECT" --git-commit=false --git-tag=false --git-push=false --stage-changes=false/,
  )
  assert.match(active, /push origin "HEAD:refs\/heads\/\$BRANCH"/)
  assert.match(active, /run\("git", \["push", "--atomic", "origin", \.\.\.refs\]\)/)
  assert.match(active, /github\("POST", "\/releases"/)
  assert.match(active, /run\("pnpm", \["nx", "release", "publish"/)
  assert.doesNotMatch(active, /--tag=(?:alpha|beta)/)
  assert.match(active, /const maxReads = 6/)
  assert.match(active, /NPM_READ_DELAY_MS/)
  assert.match(active, /await sleep\(delayMs\)/)
})

test("beta structurally separates benign metadata from exact reviewed beta-to-stable subsets", () => {
  const active = withoutComments(workflows.beta)
  assert.match(active, /jq -r ['"]?\.release\.projects\[\]['"]? nx\.json/)
  assert.match(active, /git show "\$BASE:\$MANIFEST_PATH"/)
  assert.match(active, /git show "\$HEAD:\$MANIFEST_PATH"/)
  assert.match(active, /BETA_TRANSITIONS/)
  assert.match(active, /BENIGN_MANIFEST_CHANGES/)
  assert.match(active, /INVALID_MANIFESTS/)
  assert.match(active, /MANIFEST_CHANGES/)
  assert.match(active, /stable promotion shape is partial, mixed, or malformed/)
  assert.doesNotMatch(active, /STABLE_TRANSITIONS|@effectify\/hatchet=0\.1\.0-beta\.0=0\.1\.0/)
})

test("beta manual PREPARE remains dynamic without a completed corrective matrix", () => {
  const beta = withoutComments(workflows.beta)
  assert.match(beta, /echo "version_specifier=" >> "\$GITHUB_OUTPUT"/)
  assert.match(
    beta,
    /pnpm nx release version \$VERSION_SPECIFIER "--projects=\$PROJECTS" --preid=beta --git-commit=false --git-tag=false --git-push=false --stage-changes=false/,
  )
  assert.doesNotMatch(beta, /CORRECTIVE_|EXPECTED_MATRIX|version_specifier=prepatch|manual PREPARE requires all seven/)
  assert.doesNotMatch(beta, /printf '%s\\n' '@effectify\/[^']+=\d+\.\d+\.\d+-beta/)
})

test("alpha and beta exact-range and membership mutations fail closed", () => {
  const policy = { ...workflows, docs: readme }

  for (const channel of ["alpha"]) {
    assertMutationFails(`${channel} ignores push before SHA`, policy, (candidate) => ({
      ...candidate,
      [channel]: mutate(candidate[channel], 'BEFORE="$BEFORE_SHA"', 'BEFORE="origin/branch~1"'),
    }))
    assertMutationFails(`${channel} keeps before SHA only in an inline comment`, policy, (candidate) => ({
      ...candidate,
      [channel]: mutate(
        candidate[channel],
        "BEFORE_SHA: ${{ github.event.before }}",
        "UNUSED_BEFORE: true # BEFORE_SHA: ${{ github.event.before }}",
      ),
    }))
    assertMutationFails(`${channel} ignores github.sha`, policy, (candidate) => ({
      ...candidate,
      [channel]: mutate(candidate[channel], 'HEAD="$HEAD_SHA"', 'HEAD="HEAD"'),
    }))
    assertMutationFails(`${channel} uses substring membership`, policy, (candidate) => ({
      ...candidate,
      [channel]: mutate(candidate[channel], "$release | index($project)", "$release | contains($project)"),
    }))
    assertMutationFails(`${channel} weakens recovery allowlist`, policy, (candidate) => ({
      ...candidate,
      [channel]: mutate(candidate[channel], "grep -Fx --", "grep -F --"),
    }))
    assertMutationFails(`${channel} comments out exact affected range`, policy, (candidate) => ({
      ...candidate,
      [channel]: mutate(
        candidate[channel],
        'AFFECTED_RAW=$(pnpm nx show projects --affected --base="$BASE" --head="$HEAD" --json 2>/dev/null || echo "[]")',
        'AFFECTED_RAW="[]"\n          # AFFECTED_RAW=$(pnpm nx show projects --affected --base="$BASE" --head="$HEAD" --json)',
      ),
    }))
  }

  for (const [name, before, after] of [
    ["weakens the before SHA", '[[ "$BEFORE_SHA" =~ ^[0-9a-f]{40}$ ]]', '[[ "$BEFORE_SHA" =~ ^[0-9a-f]{7,40}$ ]]'],
    ["ignores the event before SHA", 'BEFORE="$BEFORE_SHA"', 'BEFORE="HEAD^"'],
    ["ignores the event head SHA", 'HEAD="$HEAD_SHA"', 'HEAD="HEAD"'],
    [
      "restores an Nx nonzero fallback",
      'AFFECTED_RAW=$(pnpm nx show projects --affected --base="$BASE" --head="$HEAD" --json)',
      'AFFECTED_RAW=$(pnpm nx show projects --affected --base="$BASE" --head="$HEAD" --json || echo "[]")',
    ],
    [
      "removes the affected JSON string-array contract",
      'printf \'%s\' "$AFFECTED_RAW" | jq -e -s \'length == 1 and (.[0] | type == "array" and all(.[]; type == "string"))\' >/dev/null',
      ":",
    ],
  ]) {
    assertMutationFails(`beta ${name}`, policy, (candidate) => ({
      ...candidate,
      beta: mutate(candidate.beta, before, after),
    }))
  }
})
