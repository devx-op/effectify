import { matchRoutes } from "react-router"
import { describe, expect, it } from "vitest"

import routes from "../../app/routes.js"

const matchRoute = (pathname: string) => matchRoutes(routes, pathname)?.at(-1)

describe("React Router 8 explicit route map", () => {
  it.each([
    ["/", "./app.tsx"],
    ["/chat", "./routes/chat.tsx"],
    ["/demo", "./routes/demo.tsx"],
    ["/api/auth/session", "./routes/api.auth.ts"],
    ["/api/hatchet/runs", "./routes/api.hatchet.runs.ts"],
    ["/login", "./routes/login.tsx"],
    ["/signup", "./routes/signup.tsx"],
    ["/todo-app", "./routes/todo-app.tsx"],
    ["/hatchet-crons", "./routes/hatchet-crons.tsx"],
  ])("matches %s to %s", (pathname, expectedFile) => {
    expect(matchRoute(pathname)?.route).toMatchObject({ file: expectedFile })
  })

  it("selects the index route only for the application root", () => {
    expect(matchRoute("/")?.route).toMatchObject({
      file: "./app.tsx",
      index: true,
    })
    expect(matchRoute("/missing")).toBeUndefined()
  })

  it("matches the explicit nested Hatchet API path", () => {
    expect(matchRoute("/api/hatchet/runs")?.route).toMatchObject({
      file: "./routes/api.hatchet.runs.ts",
      path: "api/hatchet/runs",
    })
    expect(matchRoute("/api/hatchet/other")).toBeUndefined()
  })

  it.each([
    ["/api/auth/session", "session"],
    ["/api/auth/user/profile", "user/profile"],
  ])("preserves the exact splat params for %s", (pathname, splat) => {
    const match = matchRoute(pathname)

    expect(match?.route).toMatchObject({
      file: "./routes/api.auth.ts",
      path: "api/auth/*",
    })
    expect(match?.params).toEqual({ "*": splat })
  })
})
