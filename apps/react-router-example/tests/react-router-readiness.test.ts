import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import { createContext, createStaticHandler, type MiddlewareFunction, RouterContextProvider } from "react-router"
import config from "../react-router.config.js"
import { describe, expect, it } from "vitest"
import { resolveConfig } from "vite"

describe("React Router final-v8 safety", () => {
  it("keeps Framework Mode server rendering enabled", () => {
    expect(config.ssr).toBe(true)
  })

  it("removes obsolete future flags and pins the final 8.3.0 family", async () => {
    expect("future" in config).toBe(false)
    const catalog = await readFile(resolve(import.meta.dirname, "../../../pnpm-workspace.yaml"), "utf8")
    for (const dependency of ["react-router", "@react-router/dev", "@react-router/node", "@react-router/serve"]) {
      expect(catalog).toMatch(new RegExp(`['"]?${dependency.replace("/", "\\/")}['"]?: 8\\.3\\.0`))
    }
  })

  it.each(["development", "production"])("resolves the React Router Vite plugin for %s mode", async (mode) => {
    const resolved = await resolveConfig(
      { configFile: resolve(import.meta.dirname, "../vite.config.ts") },
      "serve",
      mode,
    )

    expect(resolved.plugins.some((plugin) => plugin.name === "react-router")).toBe(true)
  })

  it("decodes generated Todo IDs with the Effect Schema v4 API", async () => {
    const route = await readFile(resolve(import.meta.dirname, "../app/routes/todo-app.tsx"), "utf8")

    expect(route).toContain("Schema.decodeUnknownSync(TodoId)(randomUUID())")
    expect(route).not.toContain("TodoId.makeUnsafe")
  })

  it("runs native middleware in order with the request context and response identity", async () => {
    const requestValue = createContext("missing")
    const requestContext = new RouterContextProvider()
    const response = new Response("ok", { status: 201 })
    const calls: string[] = []
    const middleware = [
      async ({ context }, next) => {
        calls.push(`outer-before:${context.get(requestValue)}`)
        const value = await next()
        calls.push("outer-after")
        return value
      },
      async (_args, next) => {
        calls.push("inner-before")
        const value = await next()
        calls.push("inner-after")
        return value
      },
    ] satisfies MiddlewareFunction[]
    requestContext.set(requestValue, "request-local")
    const handler = createStaticHandler([{ id: "root", path: "/", middleware, loader: () => response }])

    const result = await handler.queryRoute(new Request("https://effectify.dev/"), {
      requestContext,
      generateMiddlewareResponse: async (query) => {
        const value = await query(new Request("https://effectify.dev/"))
        return value instanceof Response ? value : Response.json(value)
      },
    })

    expect(result).toBe(response)
    expect(calls).toEqual(["outer-before:request-local", "inner-before", "inner-after", "outer-after"])
  })

  it("rejects a native middleware that calls next twice", async () => {
    const handler = createStaticHandler([
      {
        id: "root",
        path: "/",
        middleware: [
          async (_args, next) => {
            await next()
            return next()
          },
        ],
        loader: () => new Response("ok"),
      },
    ])

    await expect(
      handler.queryRoute(new Request("https://effectify.dev/"), {
        generateMiddlewareResponse: async (query) => {
          const value = await query(new Request("https://effectify.dev/"))
          return value instanceof Response ? value : Response.json(value)
        },
      }),
    ).rejects.toThrow("You may only call `next()` once per middleware")
  })

  it.each([
    ["document", "https://effectify.dev/todo-app"],
    ["client-navigation data", "https://effectify.dev/todo-app.data?_routes=routes/todo-app"],
  ])("preserves the %s request URL through native middleware", async (_kind, url) => {
    const seenUrls: string[] = []
    const handler = createStaticHandler([
      {
        id: "todo-app",
        path: "/todo-app.data",
        middleware: [
          async ({ request }, next) => {
            seenUrls.push(request.url)
            return next()
          },
        ],
        loader: () => new Response("data", { headers: { "X-Effectify-Request": "data" } }),
      },
      {
        id: "todo-document",
        path: "/todo-app",
        middleware: [
          async ({ request }, next) => {
            seenUrls.push(request.url)
            return next()
          },
        ],
        loader: () =>
          new Response("document", {
            headers: { "X-Effectify-Request": "document" },
          }),
      },
    ])

    const result = await handler.queryRoute(new Request(url), {
      generateMiddlewareResponse: async (query) => {
        const value = await query(new Request(url))
        return value instanceof Response ? value : Response.json(value)
      },
    })

    expect(result.headers.get("X-Effectify-Request")).toBe(url.includes(".data") ? "data" : "document")
    expect(seenUrls).toEqual([url])
  })
})
