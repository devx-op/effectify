import { constants } from "node:fs"
import { access, readFile } from "node:fs/promises"
import { describe, expect, it } from "vitest"

const appFile = (path: string): Promise<string> => readFile(new URL(`../../../${path}`, import.meta.url), "utf8")

describe("one-task Hatchet example configuration", () => {
  it("keeps local Compose loopback-only with required database variables", async () => {
    const compose = await appFile("docker-compose.yml")
    expect(compose).toContain("ghcr.io/hatchet-dev/hatchet/hatchet-lite")
    expect(compose).toContain('"127.0.0.1:${HATCHET_GRPC_PORT:-7077}:7077"')
    expect(compose).toContain('"127.0.0.1:${HATCHET_UI_PORT:-8888}:8888"')
    expect(compose).toContain('"127.0.0.1:${HATCHET_DB_PORT:-5432}:5432"')
    expect(compose).toContain("${HATCHET_DB_USER:?")
    expect(compose).toContain("${HATCHET_DB_PASSWORD:?")
    expect(compose).toContain("${HATCHET_DB_NAME:?")
    expect(compose).not.toMatch(
      /postgresql:\/\/hatchet:hatchet|POSTGRES_(?:DB|PASSWORD|USER):\s*hatchet/,
    )
  })

  it("documents only direct Compose setup and the one Task endpoint", async () => {
    const readme = await appFile("README.md")
    for (
      const expected of [
        "docker compose up -d",
        "docker compose down",
        "HATCHET_CLIENT_TOKEN",
        "/api/hatchet/runs",
        "Hatchet.layer",
        "Hatchet.run",
      ]
    ) {
      expect(readme).toContain(expected)
    }
    for (
      const removed of [
        "ensure-hatchet",
        "hatchet:ensure",
        "hatchet:up",
        "dev:hatchet",
        "/api/hatchet/crons/",
        "HatchetRuntime",
      ]
    ) {
      expect(readme).not.toContain(removed)
    }
  })

  it("keeps Nx free of app-owned Hatchet orchestration", async () => {
    const project = await appFile("project.json")
    expect(project).not.toMatch(/"(?:hatchet:[^"]+|dev:hatchet)"/)
    expect(project).not.toContain("ensure-hatchet")
  })

  it("keeps the public package external without exposing its SDK", async () => {
    const vite = await appFile("vite.config.ts")
    expect(vite).toMatch(
      /ssr:\s*\{[\s\S]*external:[\s\S]*"@effectify\/hatchet"/,
    )
    expect(vite).not.toContain("@hatchet-dev/typescript-sdk")
  })

  it("removes the custom Hatchet orchestration script", async () => {
    await expect(
      access(
        new URL("../../../scripts/ensure-hatchet.mjs", import.meta.url),
        constants.F_OK,
      ),
    ).rejects.toThrow()
  })
})
