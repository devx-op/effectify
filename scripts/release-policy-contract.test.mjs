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
    const step = { name: match[2], condition: "", commands: [], uses: "", packageManagerCache: "", source: "" }
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
        step.source += `${command}\n`
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
      (command, index) => (index < fn.start || index >= fn.end) && new RegExp(`^${fn.name}(?:\\s|$)`).test(command),
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
  /^pnpm nx release version "--projects=\$PROJECTS" --preid=beta --git-commit=false --git-tag=false --git-push=false --stage-changes=false$/
const buildCommand = /^pnpm nx run-many -t build "--projects=\$PROJECTS" --parallel=3$/
const testCommand = /^pnpm nx run-many -t test "--projects=\$PROJECTS" --parallel=3 --passWithNoTests$/
const contractCommand = /^node --test scripts\/release-policy-contract\.test\.mjs$/
const releaseSubjectGuard =
  '[[ "$HEAD_SUBJECT" == *"chore(release):"* || "$HEAD_SUBJECT" == *"[skip release]"* ]] || [ "$BETA_TRANSITIONS" -gt 0 ]'
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

const betaViolations = (source) => {
  const violations = []
  const active = withoutComments(source)
  const steps = extractSteps(source)
  const resolve = steps.find((step) => step.commands.some((command) => /mode=prepare/.test(command)))
  const prepare = steps.find((step) => step.commands.some((command) => betaVersionCommand.test(command)))
  const finalize = steps.find((step) => step.commands.some((command) => channelPublishCommand("beta").test(command)))

  if (!/push:\s*\n\s*branches: \[master\]/.test(active)) violations.push("beta trigger")
  if (!/expected_sha:\s*\n\s*description:[^\n]*\n\s*required: false/.test(active)) {
    violations.push("beta expected SHA input")
  }
  if (!resolve) {
    violations.push("beta mode resolver")
  } else {
    const commands = resolve.commands.join("\n")
    if (!resolve.commands.includes("HEAD_SUBJECT=${HEAD_MESSAGE%%$'\\n'*}")) {
      violations.push("beta first-line release subject")
    }
    if (!resolve.commands.includes(`if ${releaseSubjectGuard}; then`)) {
      violations.push("beta subject-only message defense")
    }
    for (const [pattern, name] of [
      [/mode=prepare/, "prepare mode"],
      [/mode=finalize/, "finalize mode"],
      [/mode=suppress/, "suppress mode"],
      [/\^\[0-9a-f\]\{40\}\$/, "full expected SHA"],
      [/git diff --name-only --no-renames/, "structural changed paths"],
      [/CHANGELOG\.md/, "root changelog shape"],
      [/-beta\\\.\[0-9\]/, "beta manifest transition"],
      [/chore\(release\):/, "release message defense"],
      [/\[skip release\]/, "skip message defense"],
      [/grep -Fx -- "\$project"/, "exact allowlist membership"],
      [/sort \| uniq -d/, "duplicate selection rejection"],
      [/manual PREPARE requires all seven release projects/, "incident project set"],
    ]) {
      if (!pattern.test(commands)) violations.push(`beta ${name}`)
    }
    for (const [project, version] of [
      ["@effectify/react-router", "0.6.0-beta.0"],
      ["@effectify/react-query", "1.0.0-beta.1"],
      ["@effectify/node-better-auth", "0.5.12-beta.0"],
      ["@effectify/solid-query", "0.5.12-beta.0"],
      ["@effectify/react-router-better-auth", "0.5.12-beta.0"],
      ["@effectify/prisma", "1.1.13-beta.0"],
      ["@effectify/hatchet", "0.1.0-beta.0"],
    ]) {
      if (!active.includes(`${project}=${version}`)) violations.push(`beta incident ${project}`)
    }
  }

  if (!prepare) {
    violations.push("beta PREPARE step")
  } else {
    const commands = prepare.commands.join("\n")
    const pushes = prepare.commands.filter((command) => /^git push\b/.test(command))
    if (pushes.length !== 1 || !/^git push origin "HEAD:refs\/heads\/release\/beta-\$SHA_PREFIX"$/.test(pushes[0])) {
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
      [/^git add -- "\$\{RELEASE_PATHS\[@\]\}"$/, "explicit staging"],
      [/^git commit -m "chore\(release\): prepare beta from \$SOURCE_SHA \[skip release\]"$/, "release commit"],
    ]) {
      if (!prepare.commands.some((command) => pattern.test(command))) violations.push(`beta PREPARE ${name}`)
    }
    if ((commands.match(/verify_prepared_tree/g) ?? []).length < 3)
      violations.push("beta PREPARE repeated verification")
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

  if (
    !/if \[ "\$HAS_CHANGELOG" = "true" \] && \[ "\$UNEXPECTED" = "false" \] && \[ "\$BETA_TRANSITIONS" -gt 0 \] && \[ "\$BETA_TRANSITIONS" -eq "\$MANIFEST_CHANGES" \]; then/.test(
      active,
    )
  ) {
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
  const violations = [...channelViolations("alpha", alpha), ...betaViolations(beta), ...stableViolations(stable)]
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

test("beta PREPARE is branch-only, exact-path, and incident-bound", () => {
  assert.deepEqual(betaViolations(workflows.beta), [])
})

test("beta release-merge suppression is structural and fail-closed", () => {
  assert.deepEqual(betaViolations(workflows.beta), [])
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

test("beta FINALIZE is exact-SHA, tag-only, prerelease-first, and retryable", () => {
  assert.deepEqual(betaViolations(workflows.beta), [])
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
  assert.match(setup, /sole `type:\*` label is `type:chore`/)
})

test("beta PREPARE and suppression mutations fail closed", () => {
  const policy = { ...workflows, docs: readme }

  for (const [name, before, after] of [
    ["enable Nx git commit", "--git-commit=false", "--git-commit=true"],
    [
      "push PREPARE to protected master",
      'git push origin "HEAD:refs/heads/release/beta-$SHA_PREFIX"',
      'git push origin "HEAD:refs/heads/master"',
    ],
    [
      "publish from PREPARE",
      'pnpm nx release version "--projects=$PROJECTS" --preid=beta --git-commit=false --git-tag=false --git-push=false --stage-changes=false',
      'pnpm nx release version "--projects=$PROJECTS" --preid=beta --git-commit=false --git-tag=false --git-push=false --stage-changes=false\n          pnpm nx release publish "--projects=$PROJECTS" --tag=beta',
    ],
    ["weaken exact generated paths", 'cmp -s /tmp/expected-release-paths "$ACTUAL_PATHS"', 'test -s "$ACTUAL_PATHS"'],
    [
      "allow Nx ref mutation",
      'test "$REFS_BEFORE" = "$(git for-each-ref',
      'test "$REFS_BEFORE" != "$(git for-each-ref',
    ],
    ["stage every path", 'git add -- "${RELEASE_PATHS[@]}"', "git add -A"],
    ["change an incident version", "@effectify/hatchet=0.1.0-beta.0", "@effectify/hatchet=0.1.0-beta.1"],
    [
      "expose npm credentials to PREPARE",
      "          MANUAL_PREPARE: ${{ github.event_name == 'workflow_dispatch' }}",
      "          MANUAL_PREPARE: ${{ github.event_name == 'workflow_dispatch' }}\n          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}",
    ],
    [
      "weaken suppression changed-path shape",
      '[ "$HAS_CHANGELOG" = "true" ] && [ "$UNEXPECTED" = "false" ]',
      '[ "$HAS_CHANGELOG" = "true" ] && [ "$UNEXPECTED" = "true" ]',
    ],
    ["trust release message without structure", releaseSubjectGuard, '[ "$BETA_TRANSITIONS" -gt 0 ]'],
    [
      "classify release tokens from the full merge message",
      releaseSubjectGuard,
      releaseSubjectGuard.replaceAll("HEAD_SUBJECT", "HEAD_MESSAGE"),
    ],
    [
      "suppress a suspicious shape",
      'echo "suspicious release-shaped master push; refusing preparation" >&2\n            exit 1',
      'echo "suspicious release-shaped master push; refusing preparation" >&2\n            echo "mode=suppress" >> "$GITHUB_OUTPUT"',
    ],
    [
      "hide PREPARE versioning in a heredoc",
      'pnpm nx release version "--projects=$PROJECTS" --preid=beta --git-commit=false --git-tag=false --git-push=false --stage-changes=false',
      "cat <<'DEAD_VERSION'\n          pnpm nx release version \"--projects=$PROJECTS\" --preid=beta --git-commit=false --git-tag=false --git-push=false --stage-changes=false\n          DEAD_VERSION",
    ],
    [
      "hide PREPARE versioning behind false",
      'pnpm nx release version "--projects=$PROJECTS" --preid=beta --git-commit=false --git-tag=false --git-push=false --stage-changes=false',
      'if false; then\n            pnpm nx release version "--projects=$PROJECTS" --preid=beta --git-commit=false --git-tag=false --git-push=false --stage-changes=false\n          fi',
    ],
    [
      "hide PREPARE versioning in an unused function",
      'pnpm nx release version "--projects=$PROJECTS" --preid=beta --git-commit=false --git-tag=false --git-push=false --stage-changes=false',
      'unused_version() {\n            pnpm nx release version "--projects=$PROJECTS" --preid=beta --git-commit=false --git-tag=false --git-push=false --stage-changes=false\n          }',
    ],
  ]) {
    assertMutationFails(name, policy, (candidate) => ({
      ...candidate,
      beta: mutate(candidate.beta, before, after),
    }))
  }
})

test("beta FINALIZE conflict and ordering mutations fail closed", () => {
  const policy = { ...workflows, docs: readme }

  for (const [name, before, after] of [
    ["accept short expected SHA", "^[0-9a-f]{40}$", "^[0-9a-f]{7,40}$"],
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
})
