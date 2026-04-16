import { existsSync, readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const workspaceRoot = resolve(__dirname, "../../../../..")
const appRoot = resolve(workspaceRoot, "apps/react-router-example")
const e2eRoot = resolve(workspaceRoot, "apps/react-router-example-e2e")

const readJson = <T>(filePath: string): T => JSON.parse(readFileSync(filePath, "utf8")) as T

describe("react-router example cypress migration", () => {
  it("adds Nx Cypress dependencies to the workspace", () => {
    const workspace = readFileSync(
      resolve(workspaceRoot, "pnpm-workspace.yaml"),
      "utf8",
    )
    const packageJson = readJson<{ devDependencies?: Record<string, string> }>(
      resolve(workspaceRoot, "package.json"),
    )

    expect(workspace).toContain("@nx/cypress")
    expect(workspace).toContain("cypress: 15.13.1")
    expect(packageJson.devDependencies?.["@nx/cypress"]).toBe("catalog:")
    expect(packageJson.devDependencies?.cypress).toBe("catalog:")
  })

  it("creates a dedicated Nx Cypress project under apps", () => {
    const projectJson = readJson<{
      name: string
      root?: string
      sourceRoot?: string
      projectType?: string
      targets?: Record<
        string,
        {
          executor?: string
          options?: Record<string, string | number | boolean>
          configurations?: Record<
            string,
            Record<string, string | number | boolean>
          >
        }
      >
    }>(resolve(e2eRoot, "project.json"))
    const packageJson = readJson<{ name: string; private?: boolean }>(
      resolve(e2eRoot, "package.json"),
    )
    const cypressConfig = readFileSync(
      resolve(e2eRoot, "cypress.config.ts"),
      "utf8",
    )

    expect(packageJson.name).toBe("@effectify/react-router-example-e2e")
    expect(packageJson.private).toBe(true)
    expect(projectJson.name).toBe("@effectify/react-router-example-e2e")
    expect(projectJson.root).toBe("apps/react-router-example-e2e")
    expect(projectJson.sourceRoot).toBe("apps/react-router-example-e2e/src")
    expect(projectJson.projectType).toBe("application")
    expect(projectJson.targets?.e2e?.executor).toBe("@nx/cypress:cypress")
    expect(projectJson.targets?.e2e?.options?.testingType).toBe("e2e")
    expect(projectJson.targets?.e2e?.options?.devServerTarget).toBe(
      "@effectify/react-router-example:start",
    )
    expect(projectJson.targets?.e2e?.options?.port).toBe(3100)
    expect(projectJson.targets?.e2e?.configurations?.manual).toEqual({
      skipServe: true,
      baseUrl: "http://localhost:3100",
    })
    expect(cypressConfig).toContain("http://localhost:3100")
    expect(cypressConfig).toContain("nxE2EPreset")
    expect(cypressConfig).toContain("allowCypressEnv: false")
    expect(cypressConfig).not.toContain("webServerCommands")
    expect(cypressConfig).not.toContain("CYPRESS_MANUAL_SERVER")
    expect(existsSync(resolve(e2eRoot, "src/e2e/app-smoke.cy.ts"))).toBe(true)
    expect(existsSync(resolve(e2eRoot, "src/support/commands.ts"))).toBe(true)
    expect(existsSync(resolve(e2eRoot, "src/support/e2e.ts"))).toBe(true)
    expect(existsSync(resolve(e2eRoot, "src/fixtures"))).toBe(true)
  })

  it("moves browser ownership out of the app package", () => {
    const projectJson = readJson<{ targets?: Record<string, unknown> }>(
      resolve(appRoot, "project.json"),
    )
    const packageJson = readJson<{ devDependencies?: Record<string, string> }>(
      resolve(appRoot, "package.json"),
    )

    expect(projectJson.targets?.["test:browser"]).toBeUndefined()
    expect(packageJson.devDependencies?.["@vitest/browser"]).toBeUndefined()
    expect(
      packageJson.devDependencies?.["@vitest/browser-webdriverio"],
    ).toBeUndefined()
    expect(packageJson.devDependencies?.webdriverio).toBeUndefined()
    expect(existsSync(resolve(appRoot, "tests/browser"))).toBe(false)
    expect(existsSync(resolve(appRoot, "vitest.browser.config.ts"))).toBe(
      false,
    )
  })

  it("keeps the app start target ready for Nx-managed e2e orchestration", () => {
    const projectJson = readJson<{
      targets?: {
        start?: {
          continuous?: boolean
          dependsOn?: string[]
          options?: Record<string, string | number | boolean>
        }
      }
    }>(resolve(appRoot, "project.json"))

    expect(projectJson.targets?.start?.continuous).toBe(true)
    expect(projectJson.targets?.start?.dependsOn).toEqual(["build"])
    expect(projectJson.targets?.start?.options?.port).toBe(3100)
    expect(projectJson.targets?.start?.options?.forwardAllArgs).toBe(false)
    expect(projectJson.targets?.start?.options?.command).toBe(
      "PORT={args.port} react-router-serve build/server/index.js",
    )
  })
})
