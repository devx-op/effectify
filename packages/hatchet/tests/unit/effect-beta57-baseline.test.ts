import { readFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const workspaceRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../..",
)

const EFFECT_BETA57_VERSION = "4.0.0-beta.57"
const catalogEffectFamilyPackages = [
  "effect",
  "@effect/platform",
  "@effect/platform-node",
  "@effect/vitest",
  "@effect/atom-solid",
] as const

const readWorkspaceFile = async (relativePath: string) => {
  return readFile(join(workspaceRoot, relativePath), "utf8")
}

const escapeForRegExp = (value: string) => value.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&")

describe("Effect beta57 dependency baseline", () => {
  it("pins the full Effect family to beta57 in the workspace catalog", async () => {
    const workspaceYaml = await readWorkspaceFile("pnpm-workspace.yaml")

    for (const packageName of catalogEffectFamilyPackages) {
      expect(workspaceYaml).toMatch(
        new RegExp(
          `(?:["'])?${escapeForRegExp(packageName)}(?:["'])?:\\s*${escapeForRegExp(EFFECT_BETA57_VERSION)}`,
        ),
      )
    }
  })

  it("keeps the root pnpm override aligned with the beta57 platform-node-shared package", async () => {
    const packageJson = JSON.parse(
      await readWorkspaceFile("package.json"),
    ) as {
      pnpm: {
        overrides: Record<string, string>
      }
    }

    expect(packageJson.pnpm.overrides["@effect/platform-node-shared"]).toBe(
      EFFECT_BETA57_VERSION,
    )
  })

  it("refreshes the lockfile to the same beta57 Effect family baseline", async () => {
    const lockfile = await readWorkspaceFile("pnpm-lock.yaml")

    expect(lockfile).not.toContain("4.0.0-beta.33")
    expect(lockfile).toContain(
      `'@effect/atom-solid':\n      specifier: ${EFFECT_BETA57_VERSION}\n      version: ${EFFECT_BETA57_VERSION}`,
    )
    expect(lockfile).toContain(
      `'@effect/platform-node':\n      specifier: ${EFFECT_BETA57_VERSION}\n      version: ${EFFECT_BETA57_VERSION}`,
    )
    expect(lockfile).toContain(
      `'@effect/vitest':\n      specifier: ${EFFECT_BETA57_VERSION}\n      version: ${EFFECT_BETA57_VERSION}`,
    )
    expect(lockfile).toContain(
      `effect:\n      specifier: ${EFFECT_BETA57_VERSION}\n      version: ${EFFECT_BETA57_VERSION}`,
    )
    expect(lockfile).toContain(`'@effect/platform-node-shared': ${EFFECT_BETA57_VERSION}`)
  })
})
