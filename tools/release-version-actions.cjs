const { readFileSync, writeFileSync } = require("node:fs")
const { join, relative } = require("node:path")
const { execFile, execFileSync } = require("node:child_process")
const defaultVersionActions = require("@nx/js/src/release/version-actions")

function createRootChangelog(releasedPackages, date = new Date()) {
  const releasedOn = date.toISOString().slice(0, 10)
  const sortedPackages = [...releasedPackages].sort((left, right) => left.name.localeCompare(right.name))

  return [
    "# Changelog",
    "",
    "All notable changes to this project will be documented in this file.",
    "",
    "This changelog summarizes releases for the following packages:",
    "",
    ...sortedPackages.map((packageJson) => `- ${packageJson.name}`),
    "",
    ...sortedPackages.flatMap((packageJson) => [
      `## ${packageJson.name}`,
      "",
      `## ${packageJson.version} (${releasedOn})`,
      "",
    ]),
  ].join("\n")
}

function createReleaseEntries(releasedPackages, date) {
  const releasedOn = date.toISOString().slice(0, 10)
  const sortedPackages = [...releasedPackages].sort((left, right) => left.name.localeCompare(right.name))

  return sortedPackages
    .flatMap((packageJson) => [`## ${packageJson.name}`, "", `## ${packageJson.version} (${releasedOn})`, ""])
    .join("\n")
}

function hasRelease(content, packageJson) {
  return content.includes(`## ${packageJson.name}\n\n## ${packageJson.version} (`)
}

function mergeRootChangelog(existingContent, releasedPackages, date) {
  if (existingContent === undefined) {
    return createRootChangelog(releasedPackages, date)
  }

  const newPackages = releasedPackages.filter((packageJson) => !hasRelease(existingContent, packageJson))
  if (newPackages.length === 0) return existingContent

  const firstReleaseIndex = existingContent.search(/^## /m)
  if (firstReleaseIndex === -1) {
    return `${existingContent.trimEnd()}\n\n${createReleaseEntries(newPackages, date)}`
  }

  const header = existingContent.slice(0, firstReleaseIndex).trimEnd()
  const history = existingContent.slice(firstReleaseIndex).trimStart()
  return `${header}\n\n${createReleaseEntries(newPackages, date).trimEnd()}\n\n${history}`
}

function getRootChangelogUpdate(existingContent, nextContent, dryRun) {
  const changed = existingContent !== nextContent

  return {
    changed,
    content: nextContent,
    shouldWrite: changed && !dryRun,
    shouldReportChangedFile: changed && !dryRun,
  }
}

function readRootChangelog(changelogPath, readFile = readFileSync) {
  try {
    return readFile(changelogPath, "utf8")
  } catch (error) {
    if (error.code === "ENOENT") {
      return undefined
    }

    throw error
  }
}

function executeFile(command, args, options) {
  return new Promise((resolve, reject) => {
    execFile(
      command,
      args,
      {
        ...options,
        encoding: "utf8",
        maxBuffer: 1024 * 1024,
        timeout: 10_000,
        windowsHide: true,
      },
      (error, stdout, stderr) => {
        if (error) {
          error.stderr = stderr
          reject(error)
          return
        }

        resolve(stdout.trim())
      },
    )
  })
}

function getRegistryConfigKey(packageName) {
  const scope = packageName.startsWith("@") ? packageName.split("/")[0] : ""
  return scope ? `${scope}:registry` : "registry"
}

async function resolveNpmRegistry({ cwd, packageJson, packageVersion, configuredRegistry, execute = executeFile }) {
  const registryConfigKey = getRegistryConfigKey(packageJson.name)
  const publishConfigRegistry = packageJson.publishConfig?.[registryConfigKey]
  if (publishConfigRegistry !== undefined) {
    if (typeof publishConfigRegistry !== "string" || !publishConfigRegistry) {
      throw new Error(`Invalid publishConfig.${registryConfigKey}`)
    }
    return publishConfigRegistry
  }
  if (configuredRegistry !== undefined) {
    if (typeof configuredRegistry !== "string" || !configuredRegistry) {
      throw new Error("Invalid versionActionsOptions.registry")
    }
    return configuredRegistry
  }

  let registry
  try {
    if (registryConfigKey !== "registry") {
      registry = await execute("npm", ["config", "get", registryConfigKey], {
        cwd,
      })
    }
    if (!registry || registry === "undefined") {
      registry = await execute("npm", ["config", "get", "registry"], { cwd })
    }
  } catch (error) {
    throw createRegistryError(
      { packageName: packageJson.name, packageVersion, registry },
      classifyCommandFailure(error),
    )
  }
  if (!registry || registry === "undefined") {
    throw new Error("npm did not resolve a registry")
  }
  return registry
}

const SEMVER_PATTERN =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/

class RegistryVerificationError extends Error {
  constructor({ packageName, packageVersion, registry, failureClass }) {
    super(
      `Registry verification failed for ${packageName}@${packageVersion} at ${getSafeRegistryOrigin(registry)} (${failureClass})`,
    )
    this.name = "RegistryVerificationError"
    this.failureClass = failureClass
  }
}

function getSafeRegistryOrigin(registry) {
  if (typeof registry !== "string") return "<unresolved-registry>"
  try {
    const parsed = new URL(registry)
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return "<invalid-registry>"
    return parsed.origin
  } catch {
    return "<invalid-registry>"
  }
}

function createRegistryError(options, failureClass) {
  return new RegistryVerificationError({ ...options, failureClass })
}

function classifyCommandFailure(error) {
  const evidence = [error?.code, error?.signal, error?.stderr, error?.message].map(String).join("\n")
  if (error?.killed || error?.signal || /\b(?:ETIMEDOUT|ETIME|SIGTERM)\b/i.test(evidence)) return "timeout"
  if (/\bE404\b|\b404\b/.test(evidence)) return "ambiguous-not-found"
  if (/\bE401\b|\b401\b|unauthori[sz]ed|authentication/i.test(evidence)) return "authentication"
  if (/\bE403\b|\b403\b|forbidden/i.test(evidence)) return "forbidden"
  if (/\bE5\d\d\b|\b5\d\d\b/.test(evidence)) return "server"
  return "command"
}

function parseJsonResponse(output, errorOptions) {
  if (typeof output !== "string") {
    throw createRegistryError(errorOptions, "malformed-response")
  }
  try {
    return JSON.parse(output)
  } catch {
    throw createRegistryError(errorOptions, "malformed-response")
  }
}

function isValidSemVer(version) {
  return typeof version === "string" && SEMVER_PATTERN.test(version)
}

function validatePublishedVersions(payload, errorOptions) {
  const versions = typeof payload === "string" ? [payload] : payload
  if (!Array.isArray(versions) || versions.some((version) => typeof version !== "string")) {
    throw createRegistryError(errorOptions, "malformed-response")
  }
  if (versions.some((version) => !isValidSemVer(version))) {
    throw createRegistryError(errorOptions, "invalid-version")
  }
  return versions
}

async function getPublishedVersionsFromNpm({
  cwd,
  packageName,
  packageVersion,
  registry,
  registryConfigKey,
  execute = executeFile,
}) {
  const errorOptions = { packageName, packageVersion, registry }
  const registryArgument = `--${registryConfigKey}=${registry}`
  let versionsOutput
  try {
    versionsOutput = await execute("npm", ["view", packageName, "versions", "--json", registryArgument], { cwd })
  } catch (error) {
    // npm E404 details cannot distinguish a missing package from a private or
    // masked package. First publication therefore requires a separate explicit
    // path; this collision gate accepts absence only from readable history.
    throw createRegistryError(errorOptions, classifyCommandFailure(error))
  }

  return validatePublishedVersions(parseJsonResponse(versionsOutput, errorOptions), errorOptions)
}

function selectAvailableVersion(packageName, candidate, preid, publishedVersions) {
  if (!Array.isArray(publishedVersions)) {
    throw new Error("registry returned an invalid published versions payload")
  }
  if (publishedVersions.some((version) => typeof version !== "string")) {
    throw new Error("registry returned a non-string published version")
  }

  const published = new Set(publishedVersions)
  if (!published.has(candidate)) return candidate

  const prereleaseSeparator = candidate.indexOf("-")
  if (prereleaseSeparator === -1) {
    throw new Error(
      `Package ${packageName} stable candidate ${candidate} is already published; stable versions are never advanced automatically`,
    )
  }
  if (!preid) {
    throw new Error(`Package ${packageName} candidate ${candidate} is occupied but no prerelease channel was requested`)
  }

  const versionCore = candidate.slice(0, prereleaseSeparator)
  const channelPrefix = `${versionCore}-${preid}.`
  if (!candidate.startsWith(channelPrefix)) {
    throw new Error(
      `Package ${packageName} candidate ${candidate} does not match requested prerelease channel ${preid}`,
    )
  }
  const counterText = candidate.slice(channelPrefix.length)
  if (!/^(0|[1-9]\d*)$/.test(counterText)) {
    throw new Error(`Package ${packageName} candidate ${candidate} has an unsupported prerelease counter`)
  }

  let counter = Number(counterText)
  if (!Number.isSafeInteger(counter)) {
    throw new Error(`Package ${packageName} candidate ${candidate} has an unsafe prerelease counter`)
  }
  for (let attempt = 0; attempt <= published.size; attempt += 1) {
    counter += 1
    if (!Number.isSafeInteger(counter)) break
    const replacement = `${channelPrefix}${counter}`
    if (!published.has(replacement)) return replacement
  }
  throw new Error(`Unable to select a bounded prerelease replacement for ${packageName} candidate ${candidate}`)
}

function createCollisionAwareVersionActions({
  BaseVersionActions = defaultVersionActions.default,
  resolveRegistry = resolveNpmRegistry,
  getPublishedVersions = getPublishedVersionsFromNpm,
} = {}) {
  return class CollisionAwareVersionActions extends BaseVersionActions {
    async init(tree) {
      await super.init(tree)
      const manifestPath = join(this.projectGraphNode.data.root, "package.json")
      const manifest = tree.read(manifestPath)
      if (!manifest) {
        throw new Error(`Unable to read package manifest ${manifestPath}`)
      }
      try {
        this.packageJson = JSON.parse(manifest.toString())
      } catch (error) {
        throw new Error(`Unable to parse package manifest ${manifestPath}`, {
          cause: error,
        })
      }
      if (!this.packageJson.name || typeof this.packageJson.name !== "string") {
        throw new Error(`Package manifest ${manifestPath} has no valid name`)
      }
      this.workspaceRoot = tree.root || process.cwd()
    }

    async calculateNewVersion(...args) {
      const result = await super.calculateNewVersion(...args)
      const preid = args[4]
      const packageName = this.packageJson.name
      const candidate = result.newVersion
      let registry
      let publishedVersions
      try {
        registry = await resolveRegistry({
          cwd: this.workspaceRoot,
          packageJson: this.packageJson,
          packageVersion: candidate,
          packageRoot: this.projectGraphNode.data.root,
          configuredRegistry: this.finalConfigForProject.versionActionsOptions?.registry,
        })
        publishedVersions = await getPublishedVersions({
          cwd: this.workspaceRoot,
          packageName,
          packageVersion: candidate,
          registry,
          registryConfigKey: getRegistryConfigKey(packageName),
        })
        publishedVersions = validatePublishedVersions(publishedVersions, {
          packageName,
          packageVersion: candidate,
          registry,
        })
      } catch (error) {
        if (error instanceof RegistryVerificationError || error?.name === "RegistryVerificationError") throw error
        throw createRegistryError({ packageName, packageVersion: candidate, registry }, classifyCommandFailure(error))
      }

      let replacement
      try {
        replacement = selectAvailableVersion(packageName, candidate, preid, publishedVersions)
      } catch (error) {
        throw new Error(error.message, { cause: error })
      }
      if (replacement === candidate) return result

      return {
        ...result,
        newVersion: replacement,
        logText: `${result.logText}\n♻️  Package ${packageName} candidate ${candidate} is already published; selected ${replacement}`,
      }
    }
  }
}

const CollisionAwareVersionActions = createCollisionAwareVersionActions()

function createAfterAllProjectsVersioned({
  versionActions = defaultVersionActions,
  execFileSync: execute = execFileSync,
  readFileSync: readFile = readFileSync,
  writeFileSync: writeFile = writeFileSync,
  join: joinPath = join,
  relative: relativePath = relative,
  date = () => new Date(),
} = {}) {
  return async (cwd, options) => {
    const result = await versionActions.afterAllProjectsVersioned(cwd, options)
    const changedPackageFiles = execute("git", ["diff", "--name-only", "HEAD", "--", "packages/**/package.json"], {
      cwd,
      encoding: "utf8",
    })
      .trim()
      .split("\n")
      .filter(Boolean)

    if (changedPackageFiles.length === 0) return result

    const releasedPackages = changedPackageFiles
      .map((packageFile) => {
        try {
          return JSON.parse(readFile(joinPath(cwd, packageFile), "utf8"))
        } catch (error) {
          throw new Error(`Unable to read released package manifest ${packageFile}`, { cause: error })
        }
      })
      .filter((packageJson) => packageJson.name && packageJson.version)

    if (releasedPackages.length === 0) return result

    const changelogPath = joinPath(cwd, "CHANGELOG.md")
    const existingContent = readRootChangelog(changelogPath, readFile)
    const update = getRootChangelogUpdate(
      existingContent,
      mergeRootChangelog(existingContent, releasedPackages, date()),
      options.dryRun,
    )

    if (!update.shouldWrite) return result

    writeFile(changelogPath, update.content)
    return {
      ...result,
      changedFiles: update.shouldReportChangedFile
        ? [...result.changedFiles, relativePath(cwd, changelogPath)]
        : result.changedFiles,
    }
  }
}

module.exports = CollisionAwareVersionActions
module.exports.createAfterAllProjectsVersioned = createAfterAllProjectsVersioned
module.exports.createCollisionAwareVersionActions = createCollisionAwareVersionActions
module.exports.createRootChangelog = createRootChangelog
module.exports.getPublishedVersionsFromNpm = getPublishedVersionsFromNpm
module.exports.getRootChangelogUpdate = getRootChangelogUpdate
module.exports.mergeRootChangelog = mergeRootChangelog
module.exports.resolveNpmRegistry = resolveNpmRegistry
module.exports.afterAllProjectsVersioned = createAfterAllProjectsVersioned()
