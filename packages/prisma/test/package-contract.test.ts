import { execFile } from "node:child_process"
import { mkdir, mkdtemp, readFile, readdir, realpath, rm, stat, symlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { promisify } from "node:util"
import { afterAll, beforeAll, describe, expect, it } from "vitest"

const execFileAsync = promisify(execFile)
const packageDir = path.resolve(import.meta.dirname, "..")
const repositoryRoot = path.resolve(packageDir, "../..")

const rootRuntimeTarget = "./dist/src/runtime/index.js"
const rootTypesTarget = "./dist/src/runtime/index.d.ts"
const cliRuntimeTarget = "./dist/src/cli.js"
const cliTypesTarget = "./dist/src/cli.d.ts"

interface PackageManifest {
  readonly name: string
  readonly version: string
  readonly main?: string
  readonly module?: string
  readonly types?: string
  readonly bin?: Record<string, string>
  readonly exports?: Record<string, Record<string, string>>
  readonly files?: ReadonlyArray<string>
  readonly dependencies?: Record<string, string>
  readonly peerDependencies?: Record<string, string>
}

interface ProjectManifest {
  readonly targets: {
    readonly build: {
      readonly options: {
        readonly main: string
        readonly additionalEntryPoints: ReadonlyArray<string>
      }
    }
    readonly test: {
      readonly dependsOn: ReadonlyArray<string>
    }
  }
}

interface ExampleProjectManifest {
  readonly targets: {
    readonly "prisma:generate": {
      readonly dependsOn: ReadonlyArray<{
        readonly target: string
        readonly projects: ReadonlyArray<string>
      }>
    }
  }
}

const readJson = async <T>(filePath: string): Promise<T> => JSON.parse(await readFile(filePath, "utf8")) as T

const run = async (command: string, args: ReadonlyArray<string>, cwd: string) => {
  const result = await execFileAsync(command, args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
    timeout: 30_000,
  })

  return {
    stdout: String(result.stdout),
    stderr: String(result.stderr),
  }
}

const toTarEntry = (target: string) => `package/${target.replace(/^\.\//, "")}`

const publicContract = (manifest: PackageManifest) => ({
  main: manifest.main,
  module: manifest.module,
  types: manifest.types,
  bin: manifest.bin,
  exports: manifest.exports,
  files: manifest.files,
})

const expectedExports = {
  ".": {
    types: rootTypesTarget,
    import: rootRuntimeTarget,
    default: rootRuntimeTarget,
  },
  "./cli": {
    types: cliTypesTarget,
    import: cliRuntimeTarget,
    default: cliRuntimeTarget,
  },
}

const etaTemplates = [
  "effect-branded-id.eta",
  "effect-enums.eta",
  "effect-index.eta",
  "effect-join-table.eta",
  "effect-model.eta",
  "effect-types-header.eta",
  "index-custom-error.eta",
  "index-default.eta",
  "kysely-db-interface.eta",
  "model.eta",
  "prisma-raw-sql.eta",
  "prisma-repository.eta",
  "prisma-schema.eta",
].map((fileName) => `package/dist/src/templates/${fileName}`)

describe("published package contract", () => {
  let sourceManifest: PackageManifest
  let packedManifest: PackageManifest
  let archivePath: string
  let archiveEntries: ReadonlyArray<string>
  let tempRoot: string
  let consumerDir: string
  let installedPackageDir: string

  beforeAll(async () => {
    sourceManifest = await readJson<PackageManifest>(path.join(packageDir, "package.json"))
    tempRoot = await mkdtemp(path.join(tmpdir(), "effectify-prisma-package-contract-"))

    const packDir = path.join(tempRoot, "pack")
    await mkdir(packDir)
    await run("pnpm", ["pack", "--pack-destination", packDir], packageDir)

    const archives = (await readdir(packDir)).filter((entry) => entry.endsWith(".tgz"))
    expect(archives).toHaveLength(1)
    archivePath = path.join(packDir, archives[0]!)

    const archive = await run("tar", ["-tzf", archivePath], packageDir)
    archiveEntries = archive.stdout.trim().split("\n").filter(Boolean)
    expect(archiveEntries).toContain("package/package.json")

    consumerDir = path.join(tempRoot, "consumer")
    installedPackageDir = path.join(consumerDir, "node_modules", "@effectify", "prisma")
    await mkdir(installedPackageDir, { recursive: true })
    await run("tar", ["-xzf", archivePath, "-C", installedPackageDir, "--strip-components=1"], packageDir)
    packedManifest = await readJson<PackageManifest>(path.join(installedPackageDir, "package.json"))

    const consumerNodeModules = path.join(consumerDir, "node_modules")
    const dependencyNames = new Set([
      ...Object.keys(packedManifest.dependencies ?? {}),
      ...Object.keys(packedManifest.peerDependencies ?? {}),
    ])

    for (const dependencyName of dependencyNames) {
      const source = await realpath(path.join(packageDir, "node_modules", dependencyName))
      const destination = path.join(consumerNodeModules, dependencyName)
      await mkdir(path.dirname(destination), { recursive: true })
      await symlink(source, destination, "dir")
    }
  }, 30_000)

  afterAll(async () => {
    if (tempRoot) {
      await rm(tempRoot, { force: true, recursive: true })
    }
  })

  it("declares only built runtime, type, and CLI entrypoints", async () => {
    const project = await readJson<ProjectManifest>(path.join(packageDir, "project.json"))

    expect(sourceManifest).toMatchObject({
      name: "@effectify/prisma",
      main: rootRuntimeTarget,
      module: rootRuntimeTarget,
      types: rootTypesTarget,
      bin: {
        "effect-prisma": cliRuntimeTarget,
      },
      files: ["dist"],
    })
    expect(sourceManifest.exports).toEqual(expectedExports)
    expect(sourceManifest.exports).not.toHaveProperty("./prisma")
    expect(packedManifest.name).toBe(sourceManifest.name)
    expect(publicContract(packedManifest)).toEqual(publicContract(sourceManifest))

    const declaredTargets = [
      sourceManifest.main,
      sourceManifest.module,
      sourceManifest.types,
      ...Object.values(sourceManifest.bin ?? {}),
      ...Object.values(sourceManifest.exports ?? {}).flatMap(Object.values),
    ]
    expect(declaredTargets.every((target) => target?.startsWith("./dist/"))).toBe(true)
    expect(declaredTargets.some((target) => target?.endsWith(".ts") && !target.endsWith(".d.ts"))).toBe(false)
    expect(declaredTargets.some((target) => target?.includes("tsx"))).toBe(false)

    expect(project.targets.build.options).toMatchObject({
      main: "packages/prisma/src/runtime/index.ts",
      additionalEntryPoints: ["packages/prisma/src/cli.ts"],
    })
    expect(project.targets.test.dependsOn).toEqual(["build", "prisma:generate"])
  })

  it("builds Prisma before generating the example app client", async () => {
    const project = await readJson<ExampleProjectManifest>(
      path.join(repositoryRoot, "apps/react-router-example/project.json"),
    )

    expect(project.targets["prisma:generate"].dependsOn).toEqual([
      {
        target: "build",
        projects: ["@effectify/prisma"],
      },
    ])
  })

  it("packs every declared target, declarations, and Eta templates without source trees", async () => {
    const declaredTargets = new Set([
      packedManifest.main,
      packedManifest.module,
      packedManifest.types,
      ...Object.values(packedManifest.bin ?? {}),
      ...Object.values(packedManifest.exports ?? {}).flatMap(Object.values),
    ])

    for (const target of declaredTargets) {
      expect(target).toBeDefined()
      expect(archiveEntries).toContain(toTarEntry(target!))
    }

    const distFiles = archiveEntries.filter((entry) => entry.startsWith("package/dist/") && !entry.endsWith("/"))
    const declarations = distFiles.filter((entry) => entry.endsWith(".d.ts"))
    const templates = distFiles.filter((entry) => entry.endsWith(".eta"))

    expect(distFiles.length).toBeGreaterThan(0)
    expect(declarations.length).toBeGreaterThan(0)
    expect(templates).toEqual(expect.arrayContaining(etaTemplates))
    expect(archiveEntries.some((entry) => entry.startsWith("package/src/"))).toBe(false)
    expect(archiveEntries.some((entry) => entry.startsWith("package/bin/"))).toBe(false)

    for (const entry of distFiles) {
      const extractedPath = path.join(installedPackageDir, entry.replace(/^package\//, ""))
      expect((await stat(extractedPath)).size, entry).toBeGreaterThan(0)
    }
  })

  it("imports the extracted package root and resolves root and CLI types with NodeNext", async () => {
    await writeFile(
      path.join(consumerDir, "runtime.mjs"),
      [
        'import { generated } from "@effectify/prisma"',
        'if (typeof generated !== "function") throw new Error("missing runtime export")',
      ].join("\n"),
    )
    await run(process.execPath, ["runtime.mjs"], consumerDir)

    await writeFile(
      path.join(consumerDir, "index.ts"),
      [
        'import { generated, type Insertable } from "@effectify/prisma"',
        'import type * as PrismaCli from "@effectify/prisma/cli"',
        "type Row = Insertable<{ readonly id: string }>",
        "declare const row: Row",
        "declare const cli: typeof PrismaCli",
        "generated(row)",
        "void cli",
      ].join("\n"),
    )
    await writeFile(
      path.join(consumerDir, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: {
          module: "NodeNext",
          moduleResolution: "NodeNext",
          noEmit: true,
          skipLibCheck: true,
          strict: true,
          types: [],
        },
        files: ["index.ts"],
      }),
    )

    const tscPath = path.join(repositoryRoot, "node_modules", ".bin", "tsc")
    await run(tscPath, ["--project", "tsconfig.json"], consumerDir)
  })

  it("runs the packed effect-prisma --help entrypoint as an executable", async () => {
    const binTarget = packedManifest.bin?.["effect-prisma"]
    expect(binTarget).toBe(cliRuntimeTarget)

    const cliPath = path.join(installedPackageDir, binTarget!.replace(/^\.\//, ""))
    const cliStat = await stat(cliPath)
    const cliSource = await readFile(cliPath, "utf8")
    expect(cliSource.startsWith("#!/usr/bin/env node\n")).toBe(true)
    expect(cliStat.mode & 0o111).not.toBe(0)
    expect(cliSource).not.toMatch(/tsx|src\/cli\.ts/)

    const result = await run(cliPath, ["--help"], consumerDir)
    expect(result.stdout + result.stderr).toContain("prisma")
  })
})
