const assert = require("node:assert/strict")
const test = require("node:test")

const {
  createAfterAllProjectsVersioned,
  createCollisionAwareVersionActions,
  createRootChangelog,
  getPublishedVersionsFromNpm,
  getRootChangelogUpdate,
  mergeRootChangelog,
  resolveNpmRegistry,
} = require("./release-version-actions.cjs")

const releasedPackages = [
  { name: "@effectify/react-query", version: "2.0.0" },
  { name: "@effectify/prisma", version: "1.0.0" },
]

const independentCandidates = [
  ["@future/nebula", "4.7.0", []],
  ["@future/orbit", "8.0.1", ["8.0.0"]],
  ["@future/quasar", "12.3.5", ["12.3.4"]],
]

test("no-network stable actions accept arbitrary independent candidates and reject an exact target collision", async () => {
  const delegated = []
  const delegatedUpdates = []
  class BaseVersionActions {
    constructor(releaseGroup, projectGraphNode, finalConfigForProject) {
      this.releaseGroup = releaseGroup
      this.projectGraphNode = projectGraphNode
      this.finalConfigForProject = finalConfigForProject
    }
    async init() {}
    async calculateNewVersion() {
      delegated.push(this.packageJson?.name ?? this.projectGraphNode.data.root)
      return { newVersion: this.finalConfigForProject.candidate, logText: "Nx selected exact target" }
    }
    async updateProjectVersion(_tree, version) {
      delegatedUpdates.push(version)
    }
  }

  const run = async ([name, candidate, publishedVersions]) => {
    const VersionActions = createCollisionAwareVersionActions({
      BaseVersionActions,
      resolveRegistry: async () => "https://registry.example.test/",
      getPublishedVersions: async () => publishedVersions,
    })
    const action = new VersionActions({}, { data: { root: name.slice("@effectify/".length) } }, {
      candidate,
      versionActionsOptions: {},
    })
    await action.init({ root: "/repo", read: () => Buffer.from(JSON.stringify({ name, version: "0.0.0" })) })
    return action.calculateNewVersion("0.0.0", candidate, "exact stable", {}, "")
  }

  const accepted = []
  for (const record of independentCandidates) accepted.push(await run(record))
  assert.deepEqual(accepted.map(({ newVersion }) => newVersion), independentCandidates.map(([, version]) => version))
  assert.equal(delegated.length, independentCandidates.length)

  const beforeCollision = delegated.length
  await assert.rejects(
    () => run(["@future/quasar", "12.3.5", ["12.3.4", "12.3.5"]]),
    /stable candidate 12\.3\.5 is already published/,
  )
  assert.equal(delegated.length, beforeCollision + 1)
  assert.deepEqual(delegatedUpdates, [])
})

test("cumulative arbitrary-subset root changelog is idempotent and dry-run updates never write", () => {
  const packages = independentCandidates.map(([name, version]) => ({ name, version }))
  const date = new Date("2026-07-12T00:00:00Z")
  const changelog = mergeRootChangelog(undefined, packages, date)
  assert.equal((changelog.match(/^## @future\//gm) ?? []).length, independentCandidates.length)
  assert.equal(mergeRootChangelog(changelog, packages, date), changelog)
  assert.deepEqual(getRootChangelogUpdate("# stale\n", changelog, true), {
    changed: true,
    content: changelog,
    shouldWrite: false,
    shouldReportChangedFile: false,
  })
})

test("creates the root release snapshot with UTC version dates and package names", () => {
  assert.equal(
    createRootChangelog(releasedPackages, new Date("2026-07-11T23:59:59-07:00")),
    [
      "# Changelog",
      "",
      "All notable changes to this project will be documented in this file.",
      "",
      "This changelog summarizes releases for the following packages:",
      "",
      "- @effectify/prisma",
      "- @effectify/react-query",
      "",
      "## @effectify/prisma",
      "",
      "## 1.0.0 (2026-07-12)",
      "",
      "## @effectify/react-query",
      "",
      "## 2.0.0 (2026-07-12)",
      "",
    ].join("\n"),
  )
})

test("preserves existing changelog history while prepending only new package versions", () => {
  const existing = [
    "# Changelog",
    "",
    "All notable changes to this project will be documented in this file.",
    "",
    "This changelog summarizes releases for the following packages:",
    "",
    "- @effectify/prisma",
    "",
    "## @effectify/prisma",
    "",
    "## 0.9.0 (2026-07-01)",
    "",
    "Legacy release notes.",
    "",
  ].join("\n")

  const merged = mergeRootChangelog(existing, releasedPackages, new Date("2026-07-12T00:00:00Z"))

  assert.match(merged, /## @effectify\/prisma\n\n## 1\.0\.0 \(2026-07-12\)/)
  assert.match(merged, /## @effectify\/react-query\n\n## 2\.0\.0 \(2026-07-12\)/)
  assert.match(merged, /## 0\.9\.0 \(2026-07-01\)\n\nLegacy release notes\./)
  assert.equal((merged.match(/^# Changelog$/gm) ?? []).length, 1)
  assert.equal(mergeRootChangelog(merged, releasedPackages, new Date("2026-07-12T00:00:00Z")), merged)
})

test("writes and reports missing or different changelogs only outside dry runs", () => {
  const nextContent = createRootChangelog(releasedPackages, new Date("2026-07-12T00:00:00Z"))

  assert.deepEqual(getRootChangelogUpdate(undefined, nextContent, false), {
    changed: true,
    content: nextContent,
    shouldWrite: true,
    shouldReportChangedFile: true,
  })
  assert.deepEqual(getRootChangelogUpdate("# older snapshot\n", nextContent, true), {
    changed: true,
    content: nextContent,
    shouldWrite: false,
    shouldReportChangedFile: false,
  })
  assert.deepEqual(getRootChangelogUpdate(nextContent, nextContent, false), {
    changed: false,
    content: nextContent,
    shouldWrite: false,
    shouldReportChangedFile: false,
  })
})

function createHookFixture({ changedFiles = [], existingChangelog, result, failure } = {}) {
  const writes = []
  const hook = createAfterAllProjectsVersioned({
    versionActions: {
      afterAllProjectsVersioned: async () => {
        if (failure) throw failure
        return result ?? { changedFiles: ["packages/prisma/package.json"] }
      },
    },
    execFileSync: () => changedFiles.join("\n"),
    readFileSync: (path) => {
      if (path.endsWith("CHANGELOG.md")) return existingChangelog
      if (path.endsWith("prisma/package.json")) {
        return JSON.stringify(releasedPackages[1])
      }
      throw new Error(`Unexpected read: ${path}`)
    },
    writeFileSync: (path, content) => writes.push({ path, content }),
    join: (...parts) => parts.join("/"),
    relative: (_cwd, path) => path.replace("/repo/", ""),
    date: () => new Date("2026-07-11T00:00:00Z"),
  })
  return { hook, writes }
}

test("afterAllProjectsVersioned leaves empty manifests and default changed files unchanged", async () => {
  const { hook, writes } = createHookFixture({ changedFiles: [] })
  const result = await hook("/repo", { dryRun: false })
  assert.deepEqual(result, { changedFiles: ["packages/prisma/package.json"] })
  assert.deepEqual(writes, [])
})

test("afterAllProjectsVersioned adds the root changelog to default changed files", async () => {
  const { hook, writes } = createHookFixture({
    changedFiles: ["packages/prisma/package.json"],
    existingChangelog: "# old\n",
  })
  const result = await hook("/repo", { dryRun: false })
  assert.deepEqual(result.changedFiles, ["packages/prisma/package.json", "CHANGELOG.md"])
  assert.equal(writes.length, 1)
})

test("afterAllProjectsVersioned does not write unchanged changelogs or dry runs", async () => {
  const snapshot = createRootChangelog([releasedPackages[1]], new Date("2026-07-11T00:00:00Z"))
  const unchanged = createHookFixture({
    changedFiles: ["packages/prisma/package.json"],
    existingChangelog: snapshot,
  })
  await unchanged.hook("/repo", { dryRun: false })
  assert.deepEqual(unchanged.writes, [])

  const dryRun = createHookFixture({
    changedFiles: ["packages/prisma/package.json"],
    existingChangelog: "# old\n",
  })
  await dryRun.hook("/repo", { dryRun: true })
  assert.deepEqual(dryRun.writes, [])
})

test("afterAllProjectsVersioned propagates delegated default hook failures", async () => {
  const failure = new Error("default hook failed")
  const { hook } = createHookFixture({ failure })
  await assert.rejects(() => hook("/repo", { dryRun: false }), failure)
})

function createVersionActionFixture({ candidate = "1.0.0-beta.0", publishedVersions = [], registryFailure } = {}) {
  const delegatedCalculations = []
  const delegatedUpdates = []
  const registryResolutions = []
  const registryQueries = []

  class BaseVersionActions {
    constructor(releaseGroup, projectGraphNode, finalConfigForProject) {
      this.releaseGroup = releaseGroup
      this.projectGraphNode = projectGraphNode
      this.finalConfigForProject = finalConfigForProject
    }

    async init() {}

    async calculateNewVersion(...args) {
      delegatedCalculations.push(args)
      return { newVersion: candidate, logText: `Nx selected ${candidate}` }
    }

    async updateProjectVersion(_tree, version) {
      delegatedUpdates.push(version)
      return [`Nx wrote ${version}`]
    }
  }

  const VersionActions = createCollisionAwareVersionActions({
    BaseVersionActions,
    resolveRegistry: async (options) => {
      registryResolutions.push(options)
      return "https://registry.example.test/"
    },
    getPublishedVersions: async (options) => {
      registryQueries.push(options)
      if (registryFailure) throw registryFailure
      return publishedVersions
    },
  })
  const action = new VersionActions(
    {},
    {
      name: "react-query",
      data: { root: "packages/react/query" },
    },
    {
      versionActionsOptions: {
        registry: "https://configured.example.test/",
      },
    },
  )
  const tree = {
    root: "/repo",
    read: (path) => {
      assert.equal(path, "packages/react/query/package.json")
      return Buffer.from(JSON.stringify({ name: "@effectify/react-query", version: "0.9.0" }))
    },
  }

  return {
    action,
    delegatedCalculations,
    delegatedUpdates,
    registryQueries,
    registryResolutions,
    tree,
  }
}

const calculationArguments = ["0.9.0", "preminor", "conventional commits", { commits: 1 }, "beta"]

test("keeps an absent prerelease candidate and delegates Nx calculation unchanged", async () => {
  const fixture = createVersionActionFixture()
  await fixture.action.init(fixture.tree)

  const result = await fixture.action.calculateNewVersion(...calculationArguments)

  assert.deepEqual(result, {
    newVersion: "1.0.0-beta.0",
    logText: "Nx selected 1.0.0-beta.0",
  })
  assert.deepEqual(fixture.delegatedCalculations, [calculationArguments])
  assert.equal(fixture.registryResolutions.length, 1)
  assert.equal(fixture.registryResolutions[0].configuredRegistry, "https://configured.example.test/")
  assert.deepEqual(fixture.registryQueries, [
    {
      cwd: "/repo",
      packageName: "@effectify/react-query",
      packageVersion: "1.0.0-beta.0",
      registry: "https://registry.example.test/",
      registryConfigKey: "@effectify:registry",
    },
  ])
})

test("advances an occupied beta.0 candidate to beta.1 and logs the decision", async () => {
  const fixture = createVersionActionFixture({
    publishedVersions: ["1.0.0-beta.0"],
  })
  await fixture.action.init(fixture.tree)

  const result = await fixture.action.calculateNewVersion(...calculationArguments)

  assert.equal(result.newVersion, "1.0.0-beta.1")
  assert.match(result.logText, /@effectify\/react-query.*1\.0\.0-beta\.0.*1\.0\.0-beta\.1/)
  assert.deepEqual(fixture.delegatedCalculations, [calculationArguments])
})

test("skips contiguous prerelease collisions while remaining on the requested channel", async () => {
  const fixture = createVersionActionFixture({
    publishedVersions: ["1.0.0-alpha.2", "1.0.0-beta.0", "1.0.0-beta.1", "1.0.0-beta.2"],
  })
  await fixture.action.init(fixture.tree)

  const result = await fixture.action.calculateNewVersion(...calculationArguments)

  assert.equal(result.newVersion, "1.0.0-beta.3")
  assert.doesNotMatch(result.newVersion, /alpha/)
})

test("fails closed on registry errors before any version update is delegated", async () => {
  const failure = new Error("registry authentication failed")
  const fixture = createVersionActionFixture({ registryFailure: failure })
  await fixture.action.init(fixture.tree)

  await assert.rejects(
    () => fixture.action.calculateNewVersion(...calculationArguments),
    (error) => {
      assert.equal(error.name, "RegistryVerificationError")
      assert.equal(error.failureClass, "authentication")
      assert.match(error.message, /@effectify\/react-query@1\.0\.0-beta\.0.*https:\/\/registry\.example\.test/)
      assert.doesNotMatch(error.message, /registry authentication failed/)
      assert.equal(error.cause, undefined)
      return true
    },
  )
  assert.deepEqual(fixture.delegatedUpdates, [])
})

test("fails closed when an occupied candidate is stable", async () => {
  const fixture = createVersionActionFixture({
    candidate: "1.0.0",
    publishedVersions: ["1.0.0"],
  })
  await fixture.action.init(fixture.tree)

  await assert.rejects(
    () => fixture.action.calculateNewVersion("0.9.0", "minor", "conventional commits", {}, ""),
    /@effectify\/react-query.*stable candidate 1\.0\.0 is already published/,
  )
  assert.deepEqual(fixture.delegatedUpdates, [])
})

test("fails closed instead of changing a prerelease to a different requested channel", async () => {
  const fixture = createVersionActionFixture({
    candidate: "1.0.0-alpha.0",
    publishedVersions: ["1.0.0-alpha.0"],
  })
  await fixture.action.init(fixture.tree)

  await assert.rejects(
    () => fixture.action.calculateNewVersion(...calculationArguments),
    /does not match requested prerelease channel beta/,
  )
  assert.deepEqual(fixture.delegatedUpdates, [])
})

test("resolves scoped npm configuration with exact argv and a default-registry fallback", async () => {
  const calls = []
  const registry = await resolveNpmRegistry({
    cwd: "/repo",
    packageJson: { name: "@effectify/react-query" },
    execute: async (...args) => {
      calls.push(args)
      return calls.length === 1 ? "undefined" : "https://registry.example.test/"
    },
  })

  assert.equal(registry, "https://registry.example.test/")
  assert.deepEqual(calls, [
    ["npm", ["config", "get", "@effectify:registry"], { cwd: "/repo" }],
    ["npm", ["config", "get", "registry"], { cwd: "/repo" }],
  ])
})

function npmFailure({ code = 1, stderr, message = "npm command failed", ...properties }) {
  return Object.assign(new Error(message), { code, stderr, ...properties })
}

const npmQueryOptions = {
  cwd: "/repo",
  packageName: "@effectify/react-query",
  packageVersion: "1.0.0-beta.0",
  registry: "https://registry.example.test/",
  registryConfigKey: "@effectify:registry",
}

async function expectRegistryFailure({ failure, failureClass, registry = npmQueryOptions.registry }) {
  const calls = []
  await assert.rejects(
    () =>
      getPublishedVersionsFromNpm({
        ...npmQueryOptions,
        registry,
        execute: async (...args) => {
          calls.push(args)
          throw failure
        },
      }),
    (error) => {
      assert.equal(error.name, "RegistryVerificationError")
      assert.equal(error.failureClass, failureClass)
      assert.match(error.message, /@effectify\/react-query@1\.0\.0-beta\.0/)
      assert.match(error.message, /https:\/\/registry\.example\.test/)
      assert.equal(error.cause, undefined)
      return true
    },
  )
  assert.equal(calls.length, 1)
}

test("sanitizes npm config child-process failures while resolving a registry", async () => {
  const secret = "config-secret-token"
  const failure = npmFailure({
    stderr: `E401 ${secret}`,
    message: `Command failed with ${secret}`,
    cmd: `npm config get registry --token=${secret}`,
    argv: ["npm", "config", "get", "registry", `--token=${secret}`],
  })

  await assert.rejects(
    () =>
      resolveNpmRegistry({
        cwd: "/repo",
        packageJson: { name: "@effectify/react-query" },
        packageVersion: "1.0.0-beta.0",
        execute: async () => Promise.reject(failure),
      }),
    (error) => {
      assert.equal(error.name, "RegistryVerificationError")
      assert.equal(error.failureClass, "authentication")
      assert.match(error.message, /@effectify\/react-query@1\.0\.0-beta\.0.*<unresolved-registry>/)
      assert.doesNotMatch(`${error.message}\n${error.stack}`, /config-secret-token|Command failed|npm config|--token/)
      assert.equal(error.cause, undefined)
      return true
    },
  )
})

test("uses one successful package-level history query to prove an absent candidate is available", async () => {
  const calls = []
  const versions = await getPublishedVersionsFromNpm({
    ...npmQueryOptions,
    execute: async (...args) => {
      calls.push(args)
      return '["0.9.0","1.0.0-alpha.0"]'
    },
  })

  assert.deepEqual(versions, ["0.9.0", "1.0.0-alpha.0"])
  assert.deepEqual(calls, [
    [
      "npm",
      ["view", "@effectify/react-query", "versions", "--json", "--@effectify:registry=https://registry.example.test/"],
      { cwd: "/repo" },
    ],
  ])
})

test("returns successful package history containing an occupied beta.0 candidate", async () => {
  const calls = []
  const versions = await getPublishedVersionsFromNpm({
    ...npmQueryOptions,
    execute: async (...args) => {
      calls.push(args)
      return '["0.9.0","1.0.0-beta.0"]'
    },
  })

  assert.deepEqual(versions, ["0.9.0", "1.0.0-beta.0"])
  assert.equal(calls.length, 1)
  assert.deepEqual(calls[0], [
    "npm",
    ["view", "@effectify/react-query", "versions", "--json", "--@effectify:registry=https://registry.example.test/"],
    { cwd: "/repo" },
  ])
})

test("accepts npm's single-version JSON string as validated package history", async () => {
  const versions = await getPublishedVersionsFromNpm({
    ...npmQueryOptions,
    execute: async () => '"0.9.0"',
  })

  assert.deepEqual(versions, ["0.9.0"])
})

test("fails closed on real npm-style ambiguous E404 package-history responses", async () => {
  await expectRegistryFailure({
    failure: npmFailure({
      stderr: JSON.stringify({
        error: {
          code: "E404",
          summary: "Not Found - GET https://registry.example.test/@effectify%2freact-query - Not found",
          detail: "'@effectify/react-query' could not be found or you do not have permission to access it.",
        },
      }),
    }),
    failureClass: "ambiguous-not-found",
  })
})

test("fails closed on mixed E404 with server or timeout evidence", async () => {
  const exactDetail = "'@effectify/react-query@1.0.0-beta.0' is not in this registry."
  const mixedFailures = [
    {
      failure: npmFailure({
        stderr: JSON.stringify({
          error: {
            code: "E404",
            summary: "No match found for version 1.0.0-beta.0",
            detail: `${exactDetail}\nE503 Service Unavailable`,
          },
        }),
      }),
      failureClass: "ambiguous-not-found",
    },
    {
      failure: npmFailure({
        code: "ETIMEDOUT",
        killed: true,
        signal: "SIGTERM",
        stderr: JSON.stringify({
          error: {
            code: "E404",
            summary: "No match found for version 1.0.0-beta.0",
            detail: exactDetail,
          },
        }),
      }),
      failureClass: "timeout",
    },
  ]

  for (const expectation of mixedFailures) {
    await expectRegistryFailure(expectation)
  }
})

test("rejects masked-private-registry and unstructured E404 responses", async () => {
  const ambiguousFailures = [
    npmFailure({
      stderr: JSON.stringify({
        error: {
          code: "E404",
          summary: "404 Not Found - GET https://registry.example.test/@effectify%2freact-query - Not found",
          detail: "Authentication is required or the package does not exist.",
        },
      }),
    }),
    npmFailure({ stderr: "npm ERR! code E404\nnpm ERR! 404 package missing" }),
  ]

  for (const failure of ambiguousFailures) {
    await expectRegistryFailure({ failure, failureClass: "ambiguous-not-found" })
  }
})

test("fails closed with classified sanitized errors for timeout, authentication, forbidden, and server failures", async () => {
  await expectRegistryFailure({
    failure: npmFailure({ code: "ETIMEDOUT", killed: true, signal: "SIGTERM", stderr: "" }),
    failureClass: "timeout",
  })
  await expectRegistryFailure({
    failure: npmFailure({ code: null, killed: false, signal: "SIGKILL", stderr: "" }),
    failureClass: "timeout",
  })
  await expectRegistryFailure({
    failure: npmFailure({ stderr: '{"error":{"code":"E401","summary":"Unauthorized"}}' }),
    failureClass: "authentication",
  })
  await expectRegistryFailure({
    failure: npmFailure({ stderr: '{"error":{"code":"E403","summary":"Forbidden"}}' }),
    failureClass: "forbidden",
  })
  await expectRegistryFailure({
    failure: npmFailure({ stderr: '{"error":{"code":"E503","summary":"Service unavailable"}}' }),
    failureClass: "server",
  })
})

test("redacts registry credentials, query tokens, fragments, child messages, commands, and argv", async () => {
  const secret = "super-secret-token"
  const registry = `https://release-user:${secret}@registry.example.test/private?token=${secret}#${secret}`
  const failure = npmFailure({
    stderr: `E401 ${secret}`,
    message: `Command failed: npm --registry=${registry}`,
    cmd: `npm view --registry=${registry}`,
    argv: ["npm", `--registry=${registry}`],
  })

  await expectRegistryFailure({ failure, failureClass: "authentication", registry })

  try {
    await getPublishedVersionsFromNpm({ ...npmQueryOptions, registry, execute: async () => Promise.reject(failure) })
    assert.fail("expected registry verification to fail")
  } catch (error) {
    const rendered = `${error.name}: ${error.message}\n${error.stack}`
    assert.doesNotMatch(rendered, /super-secret-token|release-user|token=|#super-secret-token|Command failed|npm view/)
    assert.equal(error.cause, undefined)
  }
})

test("fails closed on non-SemVer registry values and malformed registry responses", async () => {
  const payloads = [
    '["1.0.0","latest"]',
    '["1.0"]',
    '["01.0.0"]',
    '["1.0.0+invalid_build"]',
    '{"versions":["1.0.0"]}',
    '["1.0.0",2]',
    "null",
    "42",
    "not json",
    Buffer.from('["1.0.0"]'),
  ]

  for (const payload of payloads) {
    let call = 0
    await assert.rejects(
      () =>
        getPublishedVersionsFromNpm({
          ...npmQueryOptions,
          execute: async () => {
            call += 1
            return payload
          },
        }),
      (error) => {
        assert.equal(error.name, "RegistryVerificationError")
        assert.match(error.failureClass, /invalid-version|malformed-response/)
        assert.equal(error.cause, undefined)
        return true
      },
    )
    assert.equal(call, 1)
  }
})

test("does not delegate an update after any registry verification or payload failure", async () => {
  const failures = [
    npmFailure({ stderr: "E404 could not be found or you do not have permission" }),
    npmFailure({ stderr: "E404 could not be found or E503 service unavailable" }),
    npmFailure({ code: "ETIMEDOUT", killed: true, signal: "SIGTERM", stderr: "E404 ambiguous" }),
    new Error("timeout secret-token"),
    new Error("E401 secret-token"),
    new Error("E403 secret-token"),
    new Error("E503 secret-token"),
  ]

  for (const registryFailure of failures) {
    const fixture = createVersionActionFixture({ registryFailure })
    await fixture.action.init(fixture.tree)
    await assert.rejects(() => fixture.action.calculateNewVersion(...calculationArguments))
    assert.deepEqual(fixture.delegatedUpdates, [])
    assert.equal(fixture.registryQueries.length, 1)
  }

  for (const publishedVersions of [["not-semver"], ["1.0.0", 2], { versions: ["1.0.0"] }]) {
    const fixture = createVersionActionFixture({ publishedVersions })
    await fixture.action.init(fixture.tree)
    await assert.rejects(() => fixture.action.calculateNewVersion(...calculationArguments))
    assert.deepEqual(fixture.delegatedUpdates, [])
    assert.equal(fixture.registryQueries.length, 1)
  }
})
