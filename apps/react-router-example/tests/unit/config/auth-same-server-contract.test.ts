import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const workspaceRoot = resolve(__dirname, "../../../../..")
const appRoot = resolve(workspaceRoot, "apps/react-router-example")

describe("react-router example auth same-server contract", () => {
  it("keeps the auth client on the current origin without a proxy hop", () => {
    const authClient = readFileSync(
      resolve(appRoot, "app/lib/auth-client.ts"),
      "utf8",
    )

    expect(authClient).toContain('baseURL: ""')
    expect(authClient).not.toContain("proxy to localhost:3001")
  })

  it("defaults the server auth origin to the app's localhost:4200 contract", () => {
    const authOptions = readFileSync(
      resolve(appRoot, "app/lib/better-auth-options.server.ts"),
      "utf8",
    )

    expect(authOptions).toContain(
      'process.env.BETTER_AUTH_URL ?? "http://localhost:4200"',
    )
  })

  it("serves the app on port 4200 without an /api/auth proxy", () => {
    const viteConfig = readFileSync(resolve(appRoot, "vite.config.ts"), "utf8")

    expect(viteConfig).toContain("port: 4200")
    expect(viteConfig).not.toContain('target: "http://localhost:3001"')
    expect(viteConfig).not.toContain('"/api/auth":')
  })

  it("verifies protected routes against the current request origin by default", () => {
    const authGuard = readFileSync(
      resolve(
        workspaceRoot,
        "packages/react/router-better-auth/src/lib/auth-guard.ts",
      ),
      "utf8",
    )

    expect(authGuard).toContain("new URL(request.url).origin")
    expect(authGuard).not.toContain('"http://localhost:3001"')
    expect(authGuard).not.toContain('"http://localhost:3000"')
  })
})
