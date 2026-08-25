import { readFile } from "node:fs/promises"
import { matchRoutes, type RouteObject } from "react-router"
import { describe, expect, it } from "vitest"

const appRoot = new URL("../../../", import.meta.url)

const readJson = async (file: string) =>
  JSON.parse(await readFile(new URL(file, appRoot), "utf8")) as Record<string, any>

const readSource = (file: string) => readFile(new URL(file, appRoot), "utf8")

const loadRouteConfig = async () => {
  const module = await import(new URL("app/routes.ts", appRoot).href)
  return module.default as RouteObject[]
}

describe("React Router 7 framework configuration", () => {
  it("stages the complete app-owned RR7 family while Remix remains executable", async () => {
    const manifest = await readJson("package.json")

    expect({
      reactRouter: manifest.dependencies?.["react-router"],
      dev: manifest.devDependencies?.["@react-router/dev"],
      node: manifest.dependencies?.["@react-router/node"],
      serve: manifest.dependencies?.["@react-router/serve"],
    }).toEqual({
      reactRouter: "7.18.2",
      dev: "7.18.2",
      node: "7.18.2",
      serve: "7.18.2",
    })
    expect({
      dev: manifest.devDependencies?.["@remix-run/dev"],
      node: manifest.dependencies?.["@remix-run/node"],
      react: manifest.dependencies?.["@remix-run/react"],
      serve: manifest.dependencies?.["@remix-run/serve"],
    }).toEqual({ dev: "2.17.5", node: "2.17.5", react: "2.17.5", serve: "2.17.5" })
    expect(manifest.scripts).toMatchObject({
      build: "remix vite:build",
      dev: "remix vite:dev",
      start: "remix-serve ./build/server/index.js",
      typegen: "react-router typegen",
      typecheck: "tsc",
    })
  })

  it("keeps Remix execution active beside the declarative RR7 SSR config", async () => {
    const [viteSource, frameworkConfig] = await Promise.all([
      readSource("vite.config.ts"),
      import(new URL("react-router.config.ts", appRoot).href),
    ])

    expect(viteSource).toContain('import { vitePlugin as remix } from "@remix-run/dev"')
    expect(viteSource).toContain("plugins: [remix()]")
    expect(viteSource).not.toContain("@react-router/dev/vite")
    expect(frameworkConfig.default).toEqual({ ssr: true })
  })

  it("includes generated route types with their root and orders typegen before consumers", async () => {
    const [tsconfigSource, project] = await Promise.all([readSource("tsconfig.json"), readJson("project.json")])

    expect(tsconfigSource).toContain('".react-router/types/**/*"')
    expect(tsconfigSource).toContain('"@react-router/node"')
    expect(tsconfigSource).toContain('"rootDirs": [".", "./.react-router/types"]')
    expect(project.targets?.typegen).toMatchObject({
      executor: "nx:run-commands",
      options: {
        command: "react-router typegen",
        cwd: "apps/react-remix-example",
      },
    })
    expect(project.targets?.typecheck?.dependsOn).toEqual(["typegen", "prisma:generate"])
    expect(project.targets?.build?.dependsOn).toEqual(["typegen", "^build"])
  })
})

describe("explicit React Router 7 route map", () => {
  it.each([
    ["/", "routes/_index.tsx"],
    ["/demo", "routes/demo.tsx"],
    ["/test", "routes/test.tsx"],
    ["/todos", "routes/todos.tsx"],
    ["/login", "routes/login.tsx"],
    ["/signup", "routes/signup.tsx"],
    ["/api/auth/session", "routes/api.auth.$.ts"],
    ["/api/health", "routes/api.$.ts"],
  ])("maps %s to %s", async (url, expectedFile) => {
    const routes = await loadRouteConfig()
    const matches = matchRoutes(routes, url)

    expect(matches?.at(-1)?.route).toMatchObject({ file: expectedFile })
  })

  it.each([
    ["/api/auth/session", "routes/api.auth.$.ts", "session"],
    ["/api/auth/user/profile", "routes/api.auth.$.ts", "user/profile"],
    ["/api/notes/42", "routes/api.$.ts", "notes/42"],
  ])("preserves the splat parameter for %s", async (url, expectedFile, splat) => {
    const routes = await loadRouteConfig()
    const matches = matchRoutes(routes, url)
    const match = matches?.at(-1)

    expect(match?.route).toMatchObject({ file: expectedFile })
    expect(match?.params).toEqual({ "*": splat })
  })
})
