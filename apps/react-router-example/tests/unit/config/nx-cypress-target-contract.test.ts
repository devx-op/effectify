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

  it("adds an explicit opt-in Hatchet dev workflow instead of forcing Docker into the default dev target", () => {
    const projectJson = readJson<{
      targets?: Record<
        string,
        {
          executor?: string
          continuous?: boolean
          cache?: boolean
          dependsOn?: string[]
          parallelism?: boolean
          options?: Record<string, string | number | boolean>
        }
      >
    }>(resolve(workspaceRoot, "apps/react-router-example/project.json"))

    expect(projectJson.targets?.["hatchet:status"]?.options?.command).toBe(
      "node ./scripts/ensure-hatchet.mjs status",
    )
    expect(projectJson.targets?.["hatchet:up"]?.options?.command).toBe(
      "node ./scripts/ensure-hatchet.mjs up",
    )
    expect(projectJson.targets?.["hatchet:ensure"]?.options?.command).toBe(
      "node ./scripts/ensure-hatchet.mjs ensure",
    )
    expect(projectJson.targets?.["hatchet:down"]?.options?.command).toBe(
      "docker compose -f docker-compose.yml down",
    )
    expect(projectJson.targets?.["hatchet:ensure"]?.parallelism).toBe(false)
    expect(projectJson.targets?.["hatchet:status"]?.cache).toBe(false)
    expect(projectJson.targets?.["hatchet:status"]?.options?.env).toEqual({
      HATCHET_GRPC_PORT: "7177",
      HATCHET_UI_PORT: "8899",
      HATCHET_HOST: "localhost:7177",
      HATCHET_API_URL: "http://localhost:8899",
      HATCHET_SERVER_URL: "http://localhost:8899",
    })
    expect(projectJson.targets?.["dev:hatchet"]?.executor).toBe("nx:run-commands")
    expect(projectJson.targets?.["dev:hatchet"]?.continuous).toBe(true)
    expect(projectJson.targets?.["dev:hatchet"]?.cache).toBe(false)
    expect(projectJson.targets?.["dev:hatchet"]?.parallelism).toBe(false)
    expect(projectJson.targets?.["dev:hatchet"]?.dependsOn).toEqual([
      "hatchet:ensure",
      "^build",
    ])
    expect(projectJson.targets?.["dev:hatchet"]?.options).toEqual({
      command: "pnpm run dev",
      cwd: "apps/react-router-example",
      env: {
        HATCHET_GRPC_PORT: "7177",
        HATCHET_UI_PORT: "8899",
        HATCHET_HOST: "localhost:7177",
        HATCHET_API_URL: "http://localhost:8899",
        HATCHET_SERVER_URL: "http://localhost:8899",
      },
      forwardAllArgs: false,
    })
  })

  it("uses the React Router build script as the single build artifact producer", () => {
    const projectJson = readJson<{
      targets?: {
        build?: {
          executor?: string
          dependsOn?: string[]
          options?: Record<string, string | number | boolean>
        }
      }
    }>(resolve(workspaceRoot, "apps/react-router-example/project.json"))
    const packageJson = readJson<{
      scripts?: Record<string, string>
    }>(resolve(workspaceRoot, "apps/react-router-example/package.json"))

    expect(projectJson.targets?.build?.executor).toBe("nx:run-script")
    expect(projectJson.targets?.build?.dependsOn).toEqual([
      "typegen",
      "prisma:generate",
      "^build",
    ])
    expect(projectJson.targets?.build?.options).toEqual({ script: "build" })
    expect(packageJson.scripts?.build).toBe("react-router build")
  })

  it("removes the stale Vite outDir override so build artifacts stay under build/", () => {
    const viteConfig = readFileSync(
      resolve(workspaceRoot, "apps/react-router-example/vite.config.ts"),
      "utf8",
    )

    expect(viteConfig).not.toContain(
      "../../dist/apps/react-app-router-example",
    )
    expect(viteConfig).not.toContain("outDir:")
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
    expect(cypressConfig).toContain("allowCypressEnv: false")
    expect(cypressConfig).not.toContain("webServerCommands")
    expect(cypressConfig).not.toContain("CYPRESS_MANUAL_SERVER")
  })
})
