import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const workspaceRoot = resolve(__dirname, "../../../../..")

const readJson = <T>(filePath: string): T => JSON.parse(readFileSync(filePath, "utf8")) as T

describe("Nx Cypress target contract", () => {
  it("keeps the app start target deterministic for Nx e2e orchestration", () => {
    const projectJson = readJson<{
      targets?: {
        start?: {
          continuous?: boolean
          dependsOn?: string[]
          options?: Record<string, string | number | boolean>
        }
      }
    }>(resolve(workspaceRoot, "apps/react-router-example/project.json"))

    expect(projectJson.targets?.start?.continuous).toBe(true)
    expect(projectJson.targets?.start?.dependsOn).toEqual(["build"])
    expect(projectJson.targets?.start?.options?.port).toBe(3100)
    expect(projectJson.targets?.start?.options?.forwardAllArgs).toBe(false)
    expect(projectJson.targets?.start?.options?.command).toBe(
      "PORT={args.port} react-router-serve build/server/index.js",
    )
  })

  it("makes the e2e project own orchestration and expose an explicit manual bypass", () => {
    const projectJson = readJson<{
      targets?: {
        e2e?: {
          options?: Record<string, string | number | boolean>
          configurations?: {
            manual?: Record<string, string | number | boolean>
          }
        }
      }
    }>(resolve(workspaceRoot, "apps/react-router-example-e2e/project.json"))

    expect(projectJson.targets?.e2e?.options?.devServerTarget).toBe(
      "@effectify/react-router-example:start",
    )
    expect(projectJson.targets?.e2e?.options?.port).toBe(3100)
    expect(projectJson.targets?.e2e?.configurations?.manual).toEqual({
      skipServe: true,
      baseUrl: "http://localhost:3100",
    })
  })

  it("keeps Cypress config focused on Cypress concerns only", () => {
    const cypressConfig = readFileSync(
      resolve(workspaceRoot, "apps/react-router-example-e2e/cypress.config.ts"),
      "utf8",
    )

    expect(cypressConfig).toContain("nxE2EPreset")
    expect(cypressConfig).toContain('baseUrl: "http://localhost:3100"')
    expect(cypressConfig).not.toContain("webServerCommands")
    expect(cypressConfig).not.toContain("CYPRESS_MANUAL_SERVER")
  })
})
