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
  it("pins the complete app-owned RR7 family and uses official framework scripts", async () => {
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
    expect(manifest.scripts).toMatchObject({
      build: "react-router build",
      dev: "react-router dev",
      start: "react-router-serve build/server/index.js",
      typegen: "react-router typegen",
      typecheck: "tsc",
    })
  })

  it("uses the native React Router Vite plugin with server rendering enabled", async () => {
    const [viteSource, frameworkConfig] = await Promise.all([
      readSource("vite.config.ts"),
      import(new URL("react-router.config.ts", appRoot).href),
    ])

    expect(viteSource).toContain('import { reactRouter } from "@react-router/dev/vite"')
    expect(viteSource).toContain("plugins: [reactRouter()]")
    expect(viteSource).not.toContain("@remix-run/dev")
    expect(frameworkConfig.default).toEqual({ ssr: true })
  })

  it("includes generated route types and orders typegen before typecheck and build", async () => {
    const [tsconfigSource, project] = await Promise.all([readSource("tsconfig.json"), readJson("project.json")])

    expect(tsconfigSource).toContain('".react-router/types/**/*"')
    expect(tsconfigSource).toContain('"@react-router/node"')
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
