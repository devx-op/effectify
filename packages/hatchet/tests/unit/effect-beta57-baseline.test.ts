import { readFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const workspaceRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../..",
)

const EFFECT_BETA_VERSION = "4.0.0-beta.94"
const catalogEffectFamilyPackages = [
  "effect",
  "@effect/platform-node",
  "@effect/vitest",
  "@effect/atom-solid",
] as const

const readWorkspaceFile = async (relativePath: string) => {
  return readFile(join(workspaceRoot, relativePath), "utf8")
}

const yamlKeys = (key: string) => [key, `"${key}"`, `'${key}'`] as const

const hasCatalogPin = (source: string, packageName: string) =>
  yamlKeys(packageName).some((key) => source.includes(`${key}: ${EFFECT_BETA_VERSION}`))

const hasLockfilePackageBaseline = (source: string, packageName: string) =>
  yamlKeys(packageName).some((key) =>
    source.includes(
      `${key}:\n      specifier: ${EFFECT_BETA_VERSION}\n      version: ${EFFECT_BETA_VERSION}`,
    )
  )

const hasLockfileOverride = (source: string, packageName: string) =>
  yamlKeys(packageName).some((key) => source.includes(`${key}: ${EFFECT_BETA_VERSION}`))

const readPackageJson = async () => {
  try {
    return JSON.parse(await readWorkspaceFile("package.json")) as {
      pnpm: {
        overrides: Record<string, string>
      }
    }
  } catch (cause) {
    throw new Error("Failed to parse workspace package.json", { cause })
  }
}

describe("Effect beta dependency baseline", () => {
  it("pins the full Effect family to the current beta in the workspace catalog", async () => {
    const workspaceYaml = await readWorkspaceFile("pnpm-workspace.yaml")

    for (const packageName of catalogEffectFamilyPackages) {
      expect(hasCatalogPin(workspaceYaml, packageName)).toBe(true)
    }
  })

  it("keeps the root pnpm override aligned with the beta platform-node-shared package", async () => {
    const packageJson = await readPackageJson()

    expect(packageJson.pnpm.overrides["@effect/platform-node-shared"]).toBe(
      EFFECT_BETA_VERSION,
    )
  })

  it("refreshes the lockfile to the same beta Effect family baseline", async () => {
    const lockfile = await readWorkspaceFile("pnpm-lock.yaml")

    expect(lockfile).not.toContain("4.0.0-beta.57")
    expect(hasLockfilePackageBaseline(lockfile, "@effect/atom-solid")).toBe(
      true,
    )
    expect(hasLockfilePackageBaseline(lockfile, "@effect/platform-node")).toBe(
      true,
    )
    expect(hasLockfilePackageBaseline(lockfile, "@effect/vitest")).toBe(true)
    expect(hasLockfilePackageBaseline(lockfile, "effect")).toBe(true)
    expect(hasLockfileOverride(lockfile, "@effect/platform-node-shared")).toBe(
      true,
    )
  })
})
