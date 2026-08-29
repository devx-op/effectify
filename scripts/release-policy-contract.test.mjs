import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
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
const stableFinalizeScript = read("scripts/release-finalize-stable.sh")

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
      [/^'@effectify\/solid-query=0\.5\.12-beta\.0' \| sort > "\$EXPECTED_MATRIX"$/, "sorted incident matrix"],
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

  for (const transition of [
    "@effectify/hatchet=0.1.0-beta.0=0.1.0|packages/hatchet/package.json",
    "@effectify/node-better-auth=0.5.12-beta.0=0.5.12|packages/node/better-auth/package.json",
    "@effectify/prisma=1.1.13-beta.0=1.1.13|packages/prisma/package.json",
    "@effectify/react-query=1.0.0-beta.1=1.0.0|packages/react/query/package.json",
    "@effectify/react-router=0.6.0-beta.0=0.6.0|packages/react/router/package.json",
    "@effectify/react-router-better-auth=0.5.12-beta.0=0.5.12|packages/react/router-better-auth/package.json",
    "@effectify/solid-query=0.5.13-beta.0=0.5.13|packages/solid/query/package.json",
  ])
    if (!active.includes(transition)) violations.push(`beta stable transition ${transition}`)
  if (/\bread\s+-r\s+TRANSITION\s+PATH\b/.test(active)) violations.push("beta stable reserved PATH shadowing")
  for (const pattern of [
    /cmp -s "\$EXPECTED_PATHS" "\$CHANGED"/,
    /git show "\$BASE:\$MANIFEST_PATH" \| jq -er \.name/,
    /git show "\$BASE:\$MANIFEST_PATH" \| jq -er \.version/,
    /jq -er \.name "\$MANIFEST_PATH"/,
    /jq -er \.version "\$MANIFEST_PATH"/,
    /\[ "\$OLD_NAME" = "\$NAME" \] && \[ "\$NEW_NAME" = "\$NAME" \] && \[ "\$OLD_VERSION" = "\$OLD" \] && \[ "\$NEW_VERSION" = "\$NEW" \]/,
  ])
    if (!pattern.test(active)) violations.push(`beta stable structural check ${String(pattern)}`)
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

const isStableReleaseValidationCommand = (command) =>
  /printf '%s' "\$RELEASE" \| node -e /.test(command) &&
  /const value=JSON\.parse\(fs\.readFileSync\(0,"utf8"\)\)/.test(command) &&
  /typeof value\.tagName!=="string"/.test(command) &&
  /typeof value\.isDraft!=="boolean"/.test(command) &&
  /typeof value\.isPrerelease!=="boolean"/.test(command) &&
  /value\.tagName!==tag\|\|value\.isDraft\|\|value\.isPrerelease/.test(command)

const stableViolations = (source, finalizeScript = stableFinalizeScript) => {
  const violations = []
  const active = withoutComments(source)
  const activeFinalize = withoutComments(finalizeScript)
  if (/\bjq\b/.test(`${active}\n${activeFinalize}`)) violations.push("stable jq dependency")
  const required = [
    ["dispatch", /^\s*workflow_dispatch:/m],
    ["duplicates", /sort \| uniq -d/],
    ["matrix", /stable requires exact seven-project matrix/],
    ["prepare SHA", /test -z "\$EXPECTED_SHA"/],
    ["full SHA", /\[\[ "\$EXPECTED_SHA" =~ \^\[0-9a-f\]\{40\}\$ \]\]/],
    ["fresh master", /git fetch origin master:refs\/remotes\/origin\/master --no-tags/],
    ["master equality", /test "\$HEAD_SHA" = "\$REMOTE_SHA"/],
    ["SHA equality", /test "\$HEAD_SHA" = "\$EXPECTED_SHA"/],
    ["policy", contractCommand],
    ["build", buildCommand],
    ["test", testCommand],
    ...rr8Commands.map((pattern, index) => [`readiness ${index}`, pattern]),
    ["clean input", /test -z "\$\(git status --porcelain\)"/],
    ["ref snapshot", /REFS_BEFORE=\$\(git for-each-ref/],
    [
      "Nx flags",
      /^pnpm nx release version "\$NEW" "--projects=\$NAME" --git-commit=false --git-tag=false --git-push=false --stage-changes=false$/m,
    ],
    ["refs unchanged", /test "\$REFS_BEFORE" = "\$\(git for-each-ref/],
    ["no Nx staging", /test -z "\$\(git diff --cached --name-only\)"/],
    ["all paths", /git diff --name-only --no-renames HEAD; git ls-files --others --exclude-standard/],
    ["path equality", /cmp -s "\$EXPECTED_PATHS" "\$ACTUAL"/],
    ["pathspec", /git add --pathspec-from-file="\$EXPECTED_PATHS"/],
    ["index equality", /cmp -s "\$EXPECTED_PATHS" \/tmp\/stable-staged/],
    ["commit", /git commit -m "chore\(release\): prepare stable from \$SOURCE_SHA \[skip release\]"/],
    ["clean output", /::error::post-commit tree dirty/],
    ["branch refspec", /git push origin "HEAD:refs\/heads\/release\/stable-\$SHA_PREFIX"/],
    ["Node manifest validation", /node -e/],
    ["Node JSON type validation", /JSON\.parse\(/],
    ["manifest object type", /!value\|\|typeof value!=="object"\|\|Array\.isArray\(value\)/],
    ["manifest name type", /typeof value\.name!=="string"/],
    ["manifest version type", /typeof value\.version!=="string"/],
    ["manifest exact identity", /value\.name!==name\|\|value\.version!==version/],
    ["npm histories", /npm view "\$(?:NAME|name)" versions --json/],
    ["npm versions type", /typeof (?:value|vs)==="string"\|\|Array\.isArray\((?:value|vs)\)&&(?:value|vs)\.every\((?:item|x)=>typeof (?:item|x)==="string"\)/],
    ["npm latest", /npm view "\$(?:NAME|name)" dist-tags\.latest --json/],
    ["npm latest type", /typeof (?:value|latest)!=="string"/],
    ["latest conflict", /existing stable has divergent latest/],
    ["tag refs", /git ls-remote --tags origin "refs\/tags\/\$(?:TAG|tag)" "refs\/tags\/\$(?:TAG|tag)\^\{\}"/],
    ["direct unique", /awk -v r="refs\/tags\/\$(?:TAG|tag)"[^\n]*n\+\+/],
    ["peeled unique", /awk -v r="refs\/tags\/\$(?:TAG|tag)\^\{\}"[^\n]*n\+\+/],
    ["tag target", /awk -v r="refs\/tags\/\$(?:TAG|tag)\^\{\}"[^\n]*print \$1/],
    ["release read", /gh release view "\$(?:TAG|tag)" --json tagName,isDraft,isPrerelease/],
    ["annotated tag", /git tag -a "\$TAG" "\$EXPECTED_SHA" -m "\$TAG"/],
    ["tag refspec", /TAG_REFS\+=\("refs\/tags\/\$TAG:refs\/tags\/\$TAG"\)/],
    ["atomic push", /git push --atomic origin "\$\{TAG_REFS\[@\]\}"/],
    ["release create", /gh release create "\$TAG" --verify-tag --generate-notes/],
    ["missing subset", /pnpm nx release publish "--projects=\$MISSING_PROJECTS"/],
    ["six reads", /MAX_NPM_READS=6[\s\S]*for ATTEMPT in \$\(seq 1 "\$MAX_NPM_READS"\)/],
    ["delay", /NPM_READ_DELAY=\$\{NPM_READ_DELAY:-10\}[\s\S]*sleep "\$NPM_READ_DELAY"/],
    ["exhaustion", /npm did not converge/],
  ]
  const steps = extractSteps(source)
  const prepare = steps.find((step) => step.name.includes("PREPARE protected stable"))
  const finalize = steps.find((step) => step.name.includes("FINALIZE exact stable artifacts"))
  const prepareBody = prepare ? `- name: PREPARE\n${prepare.source}` : ""
  const finalizeBody = finalize
    ? finalize.commands.includes("bash scripts/release-finalize-stable.sh")
      ? `- name: FINALIZE\n  run: |\n${finalizeScript.split("\n").map((line) => `    ${line}`).join("\n")}`
      : `- name: FINALIZE\n${finalize.source}`
    : ""
  const prepareContracts = new Set([
    "clean input",
    "ref snapshot",
    "Nx flags",
    "refs unchanged",
    "no Nx staging",
    "all paths",
    "path equality",
    "pathspec",
    "index equality",
    "commit",
    "clean output",
    "branch refspec",
  ])
  const finalizeContracts = new Set([
    "npm histories",
    "npm versions type",
    "npm latest",
    "npm latest type",
    "latest conflict",
    "tag refs",
    "direct unique",
    "peeled unique",
    "tag target",
    "release read",
    "annotated tag",
    "tag refspec",
    "atomic push",
    "release create",
    "missing subset",
    "six reads",
    "delay",
    "exhaustion",
  ])
  for (const [name, pattern] of required) {
    const body = prepareContracts.has(name) ? prepareBody : finalizeContracts.has(name) ? finalizeBody : active
    const commands = commandEntries(body).map(({ command }) => command)
    pattern.lastIndex = 0
    const inSource = pattern.test(body)
    const inCommands = commands.some((command) => {
      pattern.lastIndex = 0
      return pattern.test(command)
    })
    if (!inSource && !inCommands) violations.push(`stable ${name}`)
  }
  const sharedPhaseContracts = required.filter(([name]) =>
    [
      "Node manifest validation",
      "Node JSON type validation",
      "manifest object type",
      "manifest name type",
      "manifest version type",
      "manifest exact identity",
    ].includes(name),
  )
  const manifestCommand = /node -e '[^\n]*fs\.readFileSync\(path,"utf8"\)[^\n]*' "\$MANIFEST_PATH" "\$NAME"/
  const releaseValidationCommands = commandEntries(finalizeBody)
    .map(({ command }) => command)
    .filter((command) => /printf '%s' "\$(?:RELEASE|value)" \| node -e /.test(command))
  if (
    releaseValidationCommands.length !== 1 ||
    !/JSON\.parse\(fs\.readFileSync\(0,"utf8"\)\)/.test(releaseValidationCommands[0]) ||
    !/\.tagName!==tag/.test(releaseValidationCommands[0]) ||
    !/\.isDraft!==false/.test(releaseValidationCommands[0]) ||
    !/\.isPrerelease!==false/.test(releaseValidationCommands[0])
  ) violations.push("stable FINALIZE exact Release validation command")
  for (const [phase, body] of [
    ["PREPARE", prepareBody],
    ["FINALIZE", finalizeBody],
  ]) {
    for (const [name, pattern] of sharedPhaseContracts) {
      pattern.lastIndex = 0
      const compatibleBody = phase === "FINALIZE"
        ? body.replaceAll("let v;", "let value;").replaceAll("v=JSON.parse", "value=JSON.parse").replaceAll("!v||", "!value||").replaceAll("typeof v", "typeof value").replaceAll("(v)", "(value)").replaceAll("Array.isArray(v)", "Array.isArray(value)").replaceAll("v.name", "value.name").replaceAll("v.version", "value.version")
        : body
      if (!pattern.test(compatibleBody)) violations.push(`stable ${phase} ${name}`)
    }
    if (/\bread\s+-r\s+[^\n;]*\bPATH\b/.test(body)) violations.push(`stable ${phase} reserved PATH shadowing`)
    const hasManifestCommand = phase === "PREPARE"
      ? commandEntries(body).map(({ command }) => command).some((command) => manifestCommand.test(command))
      : /node -e '[^\n]*fs\.readFileSync\(path,"utf8"\)[^\n]*' "\$1" "\$2" "\$3"/.test(body) && /manifest_ok "\$MANIFEST_PATH" "\$NAME" "\$VERSION"/.test(body)
    if (!hasManifestCommand) violations.push(`stable ${phase} MANIFEST_PATH manifest command`)
    if (!/process\.exit\(2\)/.test(body) || !/manifest execution or parse failed/.test(body)) {
      violations.push(`stable ${phase} manifest execution diagnostic`)
    }
    if (!/manifest identity mismatch/.test(body)) violations.push(`stable ${phase} manifest identity diagnostic`)
        if (!/actual=\$\{JSON\.stringify\((?:actual|\{name:typeof v\?\.name==="string"\?v\.name:null,version:typeof v\?\.version==="string"\?v\.version:null\})\)\}/.test(body)) {
          violations.push(`stable ${phase} manifest actual identity detail`)
        }
        if (!/expected=\$\{JSON\.stringify\(\{name,version\}\)\}/.test(body)) {
          violations.push(`stable ${phase} manifest expected identity detail`)
        }
  }
  if (prepare) {
    const versionCommands = prepare.commands.filter((command) => /pnpm nx release version/.test(command))
    if (versionCommands.length !== 1 || /\bpatch\b|--projects=\$PROJECTS/.test(versionCommands[0])) violations.push("stable exact per-record version action")
    if (/writeFileSync|fs\.writeFile|jq[^\n]*\.version|sed -i|npm pkg set/.test(prepare.source)) violations.push("stable direct manifest edit")
    const records = [...prepare.source.matchAll(/'(@effectify\/[^|']+\|[^|']+\|[^|']+\|[^']+)'/g)].map(([, record]) => record)
    const expectedRecords = [
      "@effectify/hatchet|packages/hatchet/package.json|0.1.0-beta.0|0.1.0",
      "@effectify/node-better-auth|packages/node/better-auth/package.json|0.5.12-beta.0|0.5.12",
      "@effectify/prisma|packages/prisma/package.json|1.1.13-beta.0|1.1.13",
      "@effectify/react-query|packages/react/query/package.json|1.0.0-beta.1|1.0.0",
      "@effectify/react-router|packages/react/router/package.json|0.6.0-beta.0|0.6.0",
      "@effectify/react-router-better-auth|packages/react/router-better-auth/package.json|0.5.12-beta.0|0.5.12",
      "@effectify/solid-query|packages/solid/query/package.json|0.5.13-beta.0|0.5.13",
    ]
    if (JSON.stringify(records) !== JSON.stringify(expectedRecords)) violations.push("stable exact PREPARE records")
  }
  if (!prepare || !/mode == 'prepare'/.test(prepare.condition)) violations.push("stable PREPARE isolation")
  if (
    prepare &&
    /NODE_AUTH_TOKEN|npm publish|gh issue|gh pr|gh release|workflow run|refs\/heads\/master/.test(prepare.source)
  )
    violations.push("stable PREPARE side effects")
  if (/release publish[^\n]*--tag=/.test(`${active}\n${activeFinalize}`)) violations.push("stable channel")
  if (/npm dist-tag|npm unpublish|gh release delete|git tag -f/.test(`${active}\n${activeFinalize}`)) {
    violations.push("stable destructive repair")
  }
  const order = [
    /npm view "\$(?:NAME|name)" versions/,
    /git ls-remote --tags/,
    /gh release view/,
    /git push --atomic/,
    /gh release create/,
    /nx release publish/,
  ].map((p) => finalizeBody.search(p))
  if (order.some((p) => p < 0) || order.some((p, i) => i && p <= order[i - 1])) violations.push("stable ordering")
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

const policyViolations = ({ alpha, beta, stable, stableFinalize = stableFinalizeScript, docs }) => {
  const violations = [...channelViolations("alpha", alpha), ...betaViolations(beta), ...stableViolations(stable, stableFinalize)]
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

const mutateStable = (candidate, before, after) => {
  const stable = candidate.stable.replace(before, after)
  if (stable !== candidate.stable) return { ...candidate, stable }
  return { ...candidate, stableFinalize: mutate(candidate.stableFinalize ?? stableFinalizeScript, before, after) }
}

test("dev pushes retain exact-range conditional alpha publication", () => {
  assert.deepEqual(channelViolations("alpha", workflows.alpha), [])
})

test("beta incident matrix canonicalization matches sorted actual output", () => {
  const unsortedExpected = ["@effectify/react-router=0.6.0-beta.0", "@effectify/hatchet=0.1.0-beta.0"]
  const sortedActual = [...unsortedExpected].sort()

  assert.notDeepEqual(unsortedExpected, sortedActual)
  assert.deepEqual([...unsortedExpected].sort(), sortedActual)
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

test("protected stable PREPARE and FINALIZE reject independent safety mutations", () => {
  const policy = { ...workflows, docs: readme }
  assert.deepEqual(stableViolations(policy.stable), [])

  const prepareJson = mutateStep(policy.stable, "PREPARE protected stable", /JSON\.parse/g, "JSON.parseSafe")
  assert.ok(stableViolations(prepareJson).includes("stable PREPARE Node JSON type validation"))
  const prepareShadow = mutateStep(policy.stable, "PREPARE protected stable", /read -r NAME MANIFEST_PATH/, "read -r NAME PATH")
  assert.ok(stableViolations(prepareShadow).includes("stable PREPARE reserved PATH shadowing"))
  const prepareArgument = mutateStep(policy.stable, "PREPARE protected stable", /"\$MANIFEST_PATH" "\$NAME"/g, '"$PATH" "$NAME"')
  assert.ok(stableViolations(prepareArgument).includes("stable PREPARE MANIFEST_PATH manifest command"))

  for (const [name, before, after] of [
    ["JSON parser", /JSON\.parse/g, "JSON.parseSafe"],
    ["manifest path arguments", `' "$1" "$2" "$3"`, `' "$PATH" "$2" "$3"`],
    ["reserved PATH binding", "read -r NAME MANIFEST_PATH VERSION", "read -r NAME PATH VERSION"],
    ["Release JSON input", 'JSON.parse(fs.readFileSync(0,"utf8"))', "{tagName:tag,isDraft:false,isPrerelease:false}"],
  ]) {
    const changedScript = mutate(stableFinalizeScript, before, after)
    assert.notDeepEqual(stableViolations(policy.stable, changedScript), [], `FINALIZE ${name}`)
  }

  for (const [name, before, after] of [
    ["allow abbreviated SHA", "^[0-9a-f]{40}$", "^[0-9a-f]{7,40}$"],
    ["fetch tags", "--no-tags", "--tags"],
    ["skip current master", 'test "$HEAD_SHA" = "$REMOTE_SHA"', 'test "$HEAD_SHA" != "$REMOTE_SHA"'],
    ["skip exact SHA", 'test "$HEAD_SHA" = "$EXPECTED_SHA"', 'test "$HEAD_SHA" != "$EXPECTED_SHA"'],
    ["enable Nx commits", "--git-commit=false", "--git-commit=true"],
    ["enable Nx tags", "--git-tag=false", "--git-tag=true"],
    ["enable Nx pushes", "--git-push=false", "--git-push=true"],
    ["enable Nx staging", "--stage-changes=false", "--stage-changes=true"],
    ["weaken path comparison", 'cmp -s "$EXPECTED_PATHS" "$ACTUAL"', 'test -s "$ACTUAL"'],
    ["stage broad tree", 'git add --pathspec-from-file="$EXPECTED_PATHS"', "git add -A"],
    ["push master", "HEAD:refs/heads/release/stable-$SHA_PREFIX", "HEAD:refs/heads/master"],
    ["restore jq", "node -e", "jq -e"],
    ["read latest as beta", "dist-tags.latest", "dist-tags.beta"],
    ["accept divergent latest", "existing stable has divergent latest", "existing stable accepted"],
    ["create lightweight tag", 'git tag -a "$TAG" "$EXPECTED_SHA" -m "$TAG"', 'git tag "$TAG" "$EXPECTED_SHA"'],
    ["target tag at HEAD", 'git tag -a "$TAG" "$EXPECTED_SHA" -m "$TAG"', 'git tag -a "$TAG" HEAD -m "$TAG"'],
    ["remove atomic push", "git push --atomic origin", "git push origin"],
    ["use wildcard refspec", "refs/tags/$TAG:refs/tags/$TAG", "refs/tags/*:refs/tags/*"],
    ["create prerelease", "--verify-tag --generate-notes", "--verify-tag --prerelease --generate-notes"],
    ["publish beta", 'release publish "--projects=$MISSING_PROJECTS"', 'release publish "--projects=$MISSING_PROJECTS" --tag=beta'],
    ["unbound retries", "MAX_NPM_READS=6", "MAX_NPM_READS=60"],
    ["shorten propagation wait", "NPM_READ_DELAY=${NPM_READ_DELAY:-10}", "NPM_READ_DELAY=1"],
  ])
    assertMutationFails(name, policy, (candidate) => mutateStable(candidate, before, after))

  for (const command of [
    "npm dist-tag add @effectify/hatchet@0.1.0 latest",
    "npm unpublish @effectify/hatchet@0.1.0",
    'gh release delete "$TAG" --yes',
    'git tag -f "$TAG" "$EXPECTED_SHA"',
  ]) {
    assertMutationFails(`reject destructive stable repair ${command}`, policy, (candidate) => ({
      ...candidate,
      stable: `${candidate.stable}\n${command}\n`,
    }))
  }

  for (const command of [
    "node --test scripts/release-policy-contract.test.mjs",
    'pnpm nx run-many -t build "--projects=$PROJECTS" --parallel=3',
    'pnpm nx run-many -t test "--projects=$PROJECTS" --parallel=3 --passWithNoTests',
    "pnpm nx test @effectify/react-router",
    "pnpm nx run @effectify/react-router-example:migration:test",
    "pnpm nx run @effectify/react-router-example:migration:verify",
    "pnpm nx run @effectify/react-router-example:migration:manifest",
    "pnpm nx run @effectify/react-router-example:consolidation:verify",
  ]) {
    assertMutationFails(`remove gate ${command}`, policy, (candidate) => ({
      ...candidate,
      stable: mutate(candidate.stable, command, "echo gate-removed"),
    }))
  }
})

test("stable suppression rejects path, transition, and message-only mutations", () => {
  const policy = { ...workflows, docs: readme }
  for (const [name, before, after] of [
    ["omit changelog", "CHANGELOG.md packages/hatchet", "packages/hatchet"],
    ["add path", "packages/solid/query/package.json | sort", "README.md packages/solid/query/package.json | sort"],
    ["alter source", "0.1.0-beta.0=0.1.0|packages/hatchet", "0.1.0-beta.1=0.1.0|packages/hatchet"],
    ["alter target", "1.0.0-beta.1=1.0.0|packages/react/query", "1.0.0-beta.1=1.0.1|packages/react/query"],
    ["ignore old JSON", 'OLD_VERSION=$(git show "$BASE:$MANIFEST_PATH" | jq -er .version)', "OLD_VERSION=$OLD"],
    ["ignore new JSON", 'NEW_VERSION=$(jq -er .version "$MANIFEST_PATH")', "NEW_VERSION=$NEW"],
    ["restore reserved PATH loop binding", "read -r TRANSITION MANIFEST_PATH", "read -r TRANSITION PATH"],
    [
      "message authorizes suppression",
      'if cmp -s "$EXPECTED_PATHS" "$CHANGED"; then',
      'if [[ "$HEAD_MESSAGE" == *"[skip release]"* ]]; then',
    ],
  ])
    assertMutationFails(name, policy, (candidate) => ({
      ...candidate,
      beta: mutate(candidate.beta, before, after),
    }))
})

test("protected stable documentation rejects authorization and recovery drift", () => {
  for (const [name, before, after] of [
    ["manual PR", "manually open its linked PR", "automatically open a PR"],
    ["protected checks", "Required checks, review, and branch protection authorize merge", "PREPARE authorizes merge"],
    [
      "channel policy",
      "Alpha remains prerelease-only with `--tag=alpha`; beta remains prerelease-only",
      "Alpha and beta may use latest",
    ],
    ["same identity retry", "Retry only the same exact SHA and matrix", "Retry with a new SHA"],
    ["stop conditions", "**Stop immediately**", "Continue automatically"],
    ["forward recovery", "never delete, retarget, unpublish, deprecate, or rewrite it", "delete conflicting artifacts"],
  ]) {
    const changed = mutate(setup, before, after)
    const required = [
      "manually open its linked PR",
      "Required checks, review, and branch protection authorize merge",
      "Alpha remains prerelease-only with `--tag=alpha`; beta remains prerelease-only",
      "Retry only the same exact SHA and matrix",
      "**Stop immediately**",
      "never delete, retarget, unpublish, deprecate, or rewrite it",
    ]
    assert.ok(
      required.some((text) => !changed.includes(text)),
      name,
    )
  }
})

test("protected stable promotion exposes exact PREPARE and FINALIZE contracts", () => {
  const active = withoutComments(`${workflows.stable}\n${stableFinalizeScript}`)
  assert.match(active, /expected_sha:/)
  assert.match(active, /MODE=prepare/)
  assert.match(active, /MODE=finalize/)
  assert.match(
    active,
    /pnpm nx release version "\$NEW" "--projects=\$NAME" --git-commit=false --git-tag=false --git-push=false --stage-changes=false/,
  )
  assert.match(active, /HEAD:refs\/heads\/release\/stable-\$SHA_PREFIX/)
  assert.match(active, /git push --atomic origin "\$\{TAG_REFS\[@\]\}"/)
  assert.match(active, /gh release create "\$TAG" --verify-tag --generate-notes/)
  assert.match(active, /pnpm nx release publish "--projects=\$MISSING_PROJECTS"/)
  assert.doesNotMatch(active, /release publish[^\n]*--tag=/)
  assert.match(active, /MAX_NPM_READS=6/)
  assert.match(active, /NPM_READ_DELAY=\$\{NPM_READ_DELAY:-10\}/)
  assert.match(active, /sleep "\$NPM_READ_DELAY"/)
})

test("beta structurally suppresses only the exact stable matrix", () => {
  const active = withoutComments(workflows.beta)
  for (const transition of [
    "@effectify/hatchet=0.1.0-beta.0=0.1.0",
    "@effectify/node-better-auth=0.5.12-beta.0=0.5.12",
    "@effectify/prisma=1.1.13-beta.0=1.1.13",
    "@effectify/react-query=1.0.0-beta.1=1.0.0",
    "@effectify/react-router=0.6.0-beta.0=0.6.0",
    "@effectify/react-router-better-auth=0.5.12-beta.0=0.5.12",
    "@effectify/solid-query=0.5.13-beta.0=0.5.13",
  ])
    assert.match(active, new RegExp(transition.replaceAll("/", "\\/")))
  assert.match(active, /stable promotion shape is partial, mixed, or malformed/)
})

test("corrective solid-query beta and updated stable matrix are exact", () => {
  const beta = withoutComments(workflows.beta)
  const stable = withoutComments(workflows.stable)
  assert.match(beta, /manual PREPARE requires all seven release projects or the corrective solid-query singleton/)
  assert.match(beta, /echo "version_specifier=prepatch" >> "\$GITHUB_OUTPUT"/)
  assert.match(beta, /pnpm nx release version \$VERSION_SPECIFIER "--projects=\$PROJECTS" --preid=beta --git-commit=false --git-tag=false --git-push=false --stage-changes=false/)
  assert.match(beta, /0\.5\.12-beta\.0=0\.5\.13-beta\.0\|packages\/solid\/query\/package\.json/)
  assert.match(beta, /CHANGELOG\.md packages\/solid\/query\/package\.json \| sort > "\$CORRECTIVE_PATHS"/)
  assert.match(stable, /@effectify\/solid-query\|packages\/solid\/query\/package\.json\|0\.5\.13-beta\.0\|0\.5\.13/)
  assert.doesNotMatch(stable, /@effectify\/solid-query\|packages\/solid\/query\/package\.json\|0\.5\.12-beta\.0\|0\.5\.12/)

  for (const [name, before, after, required] of [
    ["arbitrary singleton", 'elif [ "$SELECTED_PROJECTS" = "@effectify/solid-query" ]', 'elif [ "$SELECTED_PROJECTS" = "@effectify/react-query" ]', /SELECTED_PROJECTS" = "@effectify\/solid-query/],
    ["prerelease specifier", "version_specifier=prepatch", "version_specifier=prerelease", /version_specifier=prepatch/],
    ["wrong target", "CORRECTIVE_TRANSITION='@effectify/solid-query=0.5.12-beta.0=0.5.13-beta.0", "CORRECTIVE_TRANSITION='@effectify/solid-query=0.5.12-beta.0=0.5.14-beta.0", /CORRECTIVE_TRANSITION='@effectify\/solid-query=0\.5\.12-beta\.0=0\.5\.13-beta\.0/],
    ["wrong counter", "CORRECTIVE_TRANSITION='@effectify/solid-query=0.5.12-beta.0=0.5.13-beta.0", "CORRECTIVE_TRANSITION='@effectify/solid-query=0.5.12-beta.0=0.5.13-beta.1", /CORRECTIVE_TRANSITION='@effectify\/solid-query=0\.5\.12-beta\.0=0\.5\.13-beta\.0/],
    ["broad paths", "CHANGELOG.md packages/solid/query/package.json | sort", "CHANGELOG.md README.md packages/solid/query/package.json | sort", /CHANGELOG\.md packages\/solid\/query\/package\.json \| sort/],
    ["message-only", 'if cmp -s "$CORRECTIVE_PATHS" "$CHANGED"; then', 'if [[ "$HEAD_MESSAGE" == *"[skip release]"* ]]; then', /cmp -s "\$CORRECTIVE_PATHS" "\$CHANGED"/],
  ]) {
    const mutated = mutate(beta, before, after)
    assert.doesNotMatch(mutated, required, name)
  }
  const oldStable = mutate(stable, "0.5.13-beta.0|0.5.13", "0.5.12-beta.0|0.5.12")
  assert.doesNotMatch(oldStable, /0\.5\.13-beta\.0\|0\.5\.13/)
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
