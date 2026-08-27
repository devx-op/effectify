import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
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
    const step = { name: match[2], condition: "", commands: [], uses: "", packageManagerCache: "" }
    for (index += 1; index < lines.length; index += 1) {
      const line = lines[index]
      if (line.trim() && indentation(line) <= stepIndent) {
        index -= 1
        break
      }
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
    step.commands.map((command, commandIndex) => ({ command, commandIndex, step, stepIndex })),
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

const channelVersionCommand = (channel) =>
  new RegExp(`^pnpm nx release "--projects=\\$PROJECTS" --preid=${channel} --skip-publish$`)
const channelPublishCommand = (channel) =>
  new RegExp(`^pnpm nx release publish "--projects=\\$PROJECTS" --tag=${channel}$`)
const buildCommand = /^pnpm nx run-many -t build "--projects=\$PROJECTS" --parallel=3$/
const testCommand = /^pnpm nx run-many -t test "--projects=\$PROJECTS" --parallel=3 --passWithNoTests$/
const contractCommand = /^node --test scripts\/release-policy-contract\.test\.mjs$/
const rr8Commands = [
  /^pnpm nx test @effectify\/react-router$/,
  /^pnpm nx run @effectify\/react-router-example:migration:test$/,
  /^pnpm nx run @effectify\/react-router-example:migration:verify$/,
  /^pnpm nx run @effectify\/react-router-example:migration:manifest$/,
  /^pnpm nx run @effectify\/react-router-example:consolidation:verify$/,
]

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

const stableViolations = (source) => {
  const violations = []
  const active = withoutComments(source)
  if (/^\s*push:/m.test(active) || !/^\s*workflow_dispatch:/m.test(active)) {
    violations.push("stable trigger")
  }
  if (!/projects:\s*\n\s*description:[^\n]*\n\s*required: true/.test(active) || !/ref: master/.test(active)) {
    violations.push("stable selection")
  }

  const stableVersion = /^pnpm nx release patch "--projects=\$PROJECTS" --skip-publish$/
  const stablePublish = /^pnpm nx release publish "--projects=\$PROJECTS"$/
  const requiredOrder = [
    /^git fetch origin master --no-tags$/,
    /^test "\$\(git rev-parse HEAD\)" = "\$\(git rev-parse origin\/master\)" \|\| \{$/,
    contractCommand,
    /grep -Fx -- "\$project"/,
    buildCommand,
    testCommand,
    ...rr8Commands,
    stableVersion,
    stablePublish,
  ]

  requireCommandOrder(violations, source, requiredOrder, "stable release safety ordering")
  requireCommand(violations, source, stableVersion, "stable relative patch")
  requireCommand(violations, source, stablePublish, "stable publish")
  requireCommand(violations, source, /grep -Fx -- "\$project"/, "stable exact allowlist membership")
  requireCommand(violations, source, /^if \[\[ "\$VERSION" == \*-\* \]\]; then$/, "stable recovery version guard")

  const stableSteps = extractSteps(source)
  const versionStep = stableSteps.find((step) => step.commands.some((command) => stableVersion.test(command)))
  if (!versionStep || !/inputs\.publish_only != true/.test(versionStep.condition)) {
    violations.push("stable publish-only version isolation")
  }
  for (const [pattern, name] of [
    [buildCommand, "build"],
    [testCommand, "test"],
  ]) {
    const step = stableSteps.find((candidate) => candidate.commands.some((command) => pattern.test(command)))
    if (!step || /publish_only != true/.test(step.condition)) {
      violations.push(`stable publish-only ${name}`)
    }
  }
  for (const step of stableSteps.filter((candidate) =>
    candidate.commands.some((command) => /^git (?:commit|tag|push)\b/.test(command)),
  )) {
    if (!/inputs\.publish_only != true/.test(step.condition)) {
      violations.push("stable publish-only git mutation isolation")
    }
  }
  if (commandEntries(source).some(({ command }) => /--preid=|--tag=(?:alpha|beta|latest|stable)/.test(command))) {
    violations.push("stable prerelease mapping")
  }
  return violations
}

const releasePolicyBootstrapViolations = (source) => {
  const steps = extractSteps(extractJob(source, "release-policy"))
  const setupNodeIndex = steps.findIndex((step) => /^actions\/setup-node@/.test(step.uses))
  if (setupNodeIndex === -1) return ["release-policy setup-node"]

  const pnpmIndex = steps.findIndex((step) => /^pnpm\/action-setup@/.test(step.uses))
  const cacheDisabled = steps[setupNodeIndex].packageManagerCache === "false"
  return pnpmIndex !== -1 && pnpmIndex < setupNodeIndex ? [] : cacheDisabled ? [] : ["release-policy setup-node cache"]
}

const policyViolations = ({ alpha, beta, stable, docs }) => {
  const violations = [
    ...channelViolations("alpha", alpha),
    ...channelViolations("beta", beta),
    ...stableViolations(stable),
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

test("dev pushes retain exact-range conditional alpha publication", () => {
  assert.deepEqual(channelViolations("alpha", workflows.alpha), [])
})

test("master pushes publish beta only across the exact pushed range", () => {
  assert.deepEqual(channelViolations("beta", workflows.beta), [])
  assert.match(withoutComments(workflows.beta), /!contains\(github\.event\.head_commit\.message, 'chore\(release\):'\)/)
  assert.doesNotMatch(withoutComments(workflows.beta), /--tag=(?:latest|stable)/)
})

test("stable validates current master and selected projects before every release mutation", () => {
  assert.deepEqual(stableViolations(workflows.stable), [])
})

test("the release policy contract runs in PR CI", () => {
  assert.match(withoutComments(workflows.ci), /pull_request:/)
  requireCommand([], workflows.ci, contractCommand, "CI policy contract")
  assert.notEqual(commandPosition(workflows.ci, contractCommand), -1)
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
})

test("stable safety mutations fail closed, including commented-out policy text", () => {
  const policy = { ...workflows, docs: readme }

  assertMutationFails("corrupt exact HEAD equality", policy, (candidate) => ({
    ...candidate,
    stable: mutate(
      candidate.stable,
      'test "$(git rev-parse HEAD)" = "$(git rev-parse origin/master)" || {',
      'test "$(git rev-parse HEAD)" != "$(git rev-parse origin/master)" || {',
    ),
  }))
  assertMutationFails("remove exact HEAD equality but leave it in a comment", policy, (candidate) => ({
    ...candidate,
    stable: mutate(
      candidate.stable,
      'test "$(git rev-parse HEAD)" = "$(git rev-parse origin/master)" || {',
      '# test "$(git rev-parse HEAD)" = "$(git rev-parse origin/master)" || {',
    ),
  }))
  assertMutationFails("move stable build after version", policy, (candidate) => ({
    ...candidate,
    stable: mutate(candidate.stable, "pnpm nx release patch", "pnpm nx TEMP patch")
      .replace("pnpm nx run-many -t build", "pnpm nx release patch")
      .replace("pnpm nx TEMP patch", "pnpm nx run-many -t build"),
  }))
  assertMutationFails("move stable test after publish", policy, (candidate) => ({
    ...candidate,
    stable: mutate(candidate.stable, "pnpm nx release publish", "pnpm nx TEMP publish")
      .replace("pnpm nx run-many -t test", "pnpm nx release publish")
      .replace("pnpm nx TEMP publish", "pnpm nx run-many -t test"),
  }))
  assertMutationFails("remove stable build", policy, (candidate) => ({
    ...candidate,
    stable: mutate(candidate.stable, "pnpm nx run-many -t build", "echo build removed"),
  }))
  assertMutationFails("remove stable test", policy, (candidate) => ({
    ...candidate,
    stable: mutate(candidate.stable, "pnpm nx run-many -t test", "echo test removed"),
  }))
  assertMutationFails("weaken stable allowlist membership", policy, (candidate) => ({
    ...candidate,
    stable: mutate(candidate.stable, "grep -Fx --", "grep -F --"),
  }))
  assertMutationFails("allow stable versioning during publish-only recovery", policy, (candidate) => ({
    ...candidate,
    stable: mutate(
      candidate.stable,
      "      - name: 🔖 Graduate Selected Prereleases\n        if: ${{ inputs.publish_only != true }}",
      "      - name: 🔖 Graduate Selected Prereleases",
    ),
  }))
  assertMutationFails("skip stable build during publish-only recovery", policy, (candidate) => ({
    ...candidate,
    stable: mutate(
      candidate.stable,
      "      - name: 🏗️ Build Selected Projects\n        env:",
      "      - name: 🏗️ Build Selected Projects\n        if: ${{ inputs.publish_only != true }}\n        env:",
    ),
  }))
  assertMutationFails("comment out the policy contract", policy, (candidate) => ({
    ...candidate,
    stable: mutate(
      candidate.stable,
      "run: node --test scripts/release-policy-contract.test.mjs",
      "run: echo contract removed\n        # node --test scripts/release-policy-contract.test.mjs",
    ),
  }))
})

test("alpha and beta exact-range and membership mutations fail closed", () => {
  const policy = { ...workflows, docs: readme }

  for (const channel of ["alpha", "beta"]) {
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
})
