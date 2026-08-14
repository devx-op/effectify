import { createHash } from "node:crypto"
import { execFile } from "node:child_process"
import { readFile, readdir, stat } from "node:fs/promises"
import { join, relative, resolve } from "node:path"
import { promisify } from "node:util"
import { expect, it } from "vitest"

const exec = promisify(execFile)
const repositoryRoot = resolve(import.meta.dirname, "../../../../")
const showcaseRoot = join(repositoryRoot, "examples/app-builder-todo")
const receiptPath = join(showcaseRoot, ".effectify/app-builder/showcase.json")

const walk = async (root: string, current = root): Promise<ReadonlyArray<string>> =>
  (
    await Promise.all(
      (
        await readdir(current, { withFileTypes: true })
      ).map((entry) => {
        const absolute = join(current, entry.name)
        return entry.isDirectory() ? walk(root, absolute) : Promise.resolve([relative(root, absolute)])
      }),
    )
  )
    .flat()
    .sort()

const run = async (args: ReadonlyArray<string>) =>
  exec("pnpm", args, {
    cwd: repositoryRoot,
    env: { ...process.env, NX_DAEMON: "false" },
    maxBuffer: 16 * 1024 * 1024,
  })

it("freezes every canonical installed-public-CLI output identity byte-for-byte and mode-for-mode", async () => {
  const receipt = JSON.parse(await readFile(receiptPath, "utf8"))
  const identities = receipt.provenance.outputIdentities as ReadonlyArray<{
    readonly mode: string
    readonly path: string
    readonly sourceDigest: string
  }>
  const paths = identities.map(({ path }) => path).sort()
  const authored = [".effectify/app-builder/showcase.json", "README.md"]
  const files = await walk(showcaseRoot)

  expect(receipt).toMatchObject({
    command: "generate",
    request: {
      command: "generate",
      payload: {
        intent: {
          capabilities: ["todo.events"],
          preset: "todo",
          version: "effectify.creation-intent/1",
        },
        workspace: "app-builder-todo",
      },
      version: "effectify.app-builder-cli-request/1",
    },
    version: "effectify.app-builder-showcase/1",
  })
  expect(paths).toHaveLength(18)
  expect(paths).toEqual(
    expect.arrayContaining([
      "nx.json",
      "package.json",
      "pnpm-workspace.yaml",
      "tsconfig.build.json",
      "vitest.config.mts",
    ]),
  )
  expect(files).toEqual([...authored, ...paths].sort())

  for (const identity of identities) {
    const target = join(showcaseRoot, identity.path)
    const bytes = await readFile(target)
    expect(`sha256:${createHash("sha256").update(bytes).digest("hex")}`, identity.path).toBe(identity.sourceDigest)
    expect((0o100000 | ((await stat(target)).mode & 0o777)).toString(8), identity.path).toBe(identity.mode)
  }
})

it("keeps the standalone showcase outside root package, Nx, and formatter discovery", async () => {
  const [readme, pnpmWorkspace, nxConfig, nxIgnore, formatConfig, projects, packages] = await Promise.all([
    readFile(join(showcaseRoot, "README.md"), "utf8"),
    readFile(join(repositoryRoot, "pnpm-workspace.yaml"), "utf8"),
    readFile(join(repositoryRoot, "nx.json"), "utf8"),
    readFile(join(repositoryRoot, ".nxignore"), "utf8"),
    readFile(join(repositoryRoot, ".oxfmtrc.json"), "utf8"),
    run(["nx", "show", "projects", "--json"]),
    run(["-r", "list", "--depth", "-1", "--json"]),
  ])
  const config = JSON.parse(nxConfig)
  const projectNames = JSON.parse(projects.stdout)
  const packageNames = JSON.parse(packages.stdout).flatMap((entry: { readonly name?: string }) =>
    entry.name === undefined ? [] : [entry.name],
  )

  expect(readme).toContain("installed public App Builder")
  expect(readme).toContain("node_modules/.bin/effectify-app-builder")
  expect(pnpmWorkspace).toContain('"!examples/**"')
  expect(nxIgnore).toContain("examples/app-builder-todo/**")
  expect(JSON.parse(formatConfig).ignorePatterns).toContain("examples/app-builder-todo/**")
  expect(
    config.plugins
      .filter((plugin: { readonly plugin: string }) => ["@nx/js/typescript", "@nx/vitest"].includes(plugin.plugin))
      .every((plugin: { readonly exclude?: ReadonlyArray<string> }) =>
        plugin.exclude?.includes("examples/app-builder-todo/**/*"),
      ),
  ).toBe(true)
  expect(projectNames.filter((name: string) => name.startsWith("@effectify/todo-"))).toEqual([])
  expect(packageNames).not.toContain("@effectify/todo-workspace")
})
