import { readdir, readFile } from "node:fs/promises"
import { matchRoutes, type RouteObject } from "react-router"
import { describe, expect, it } from "vitest"

const appRoot = new URL("../../../", import.meta.url)

const readJson = async (file: string) =>
  JSON.parse(await readFile(new URL(file, appRoot), "utf8")) as Record<string, any>

const readSource = (file: string) => readFile(new URL(file, appRoot), "utf8")

const readTree = async (directory: URL): Promise<string> => {
  const entries = await readdir(directory, { withFileTypes: true })
  const contents = await Promise.all(
    entries.map((entry) => {
      const url = new URL(entry.name + (entry.isDirectory() ? "/" : ""), directory)
      return entry.isDirectory() ? readTree(url) : readFile(url, "utf8")
    }),
  )
  return contents.join("\n")
}

const loadRouteConfig = async () => {
  const module = await import(new URL("app/routes.ts", appRoot).href)
  return module.default as RouteObject[]
}

describe("React Router 7 framework configuration", () => {
  it("activates the complete app-owned RR7 family while retaining temporary manifest residue", async () => {
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
      build: "react-router build",
      dev: "react-router dev",
      start: "react-router-serve ./build/server/index.js",
      typegen: "react-router typegen",
      typecheck: "tsc",
    })
  })

  it("activates the React Router Vite plugin beside the RR7 SSR config", async () => {
    const [viteSource, frameworkConfig] = await Promise.all([
      readSource("vite.config.ts"),
      import(new URL("react-router.config.ts", appRoot).href),
    ])

    expect(viteSource).toContain('import { reactRouter } from "@react-router/dev/vite"')
    expect(viteSource).toContain("plugins: [reactRouter()]")
    expect(viteSource).not.toContain("@remix-run/dev")
    expect(frameworkConfig.default).toEqual({ ssr: true })
  })

  it("uses only RR7 browser, server, and framework source contracts", async () => {
    const [clientSource, serverSource, appSource] = await Promise.all([
      readSource("app/entry.client.tsx"),
      readSource("app/entry.server.tsx"),
      readTree(new URL("app/", appRoot)),
    ])

    expect(clientSource).toContain('import { HydratedRouter } from "react-router/dom"')
    expect(serverSource).toContain('import { createReadableStreamFromReadable } from "@react-router/node"')
    expect(serverSource).toContain('import { ServerRouter, type EntryContext } from "react-router"')
    expect(appSource).not.toMatch(/@remix-run\//)
    expect(appSource).not.toMatch(/\bRemix(?:Browser|Server)\b/)
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
