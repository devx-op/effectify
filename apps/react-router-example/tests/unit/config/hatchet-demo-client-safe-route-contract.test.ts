import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import process from "node:process"

const appRoot = resolve(process.cwd())

const hatchetDemoFiles = [
  "app/routes/hatchet-demo/runs/route.tsx",
  "app/routes/hatchet-demo/schedules/route.tsx",
  "app/routes/hatchet-demo/crons/route.tsx",
  "app/routes/hatchet-demo/filters/route.tsx",
  "app/routes/hatchet-demo/webhooks/route.tsx",
  "app/routes/hatchet-demo/rate-limits/route.tsx",
  "app/routes/hatchet-demo/management/route.tsx",
  "app/lib/hatchet/orchestration.ts",
] as const

describe("hatchet demo client-safe route contract", () => {
  it("avoids eager value imports from @effectify/hatchet in lazy route modules", () => {
    const valueImportPattern = /import\s+(?!type\b)[^\n]+from\s+"@effectify\/hatchet"/g

    for (const relativePath of hatchetDemoFiles) {
      const source = readFileSync(resolve(appRoot, relativePath), "utf8")

      expect(source.match(valueImportPattern), relativePath).toBeNull()
    }
  })

  it("avoids importing runtime.server directly from lazy hatchet demo route modules", () => {
    const runtimeServerImportPattern = /runtime\.server\.js/

    for (
      const relativePath of hatchetDemoFiles.filter((path) =>
        path.includes("/route") || path.endsWith("orchestration.ts")
      )
    ) {
      const source = readFileSync(resolve(appRoot, relativePath), "utf8")

      expect(source.match(runtimeServerImportPattern), relativePath).toBeNull()
    }
  })

  it("uses document navigation links inside the hatchet demo shell to avoid client router regressions", () => {
    const routeSource = readFileSync(
      resolve(appRoot, "app/routes/hatchet-demo/route.tsx"),
      "utf8",
    )
    const indexSource = readFileSync(
      resolve(appRoot, "app/routes/hatchet-demo/index.tsx"),
      "utf8",
    )

    expect(routeSource).toContain("href={item.to}")
    expect(routeSource).not.toContain("<NavLink")
    expect(indexSource).toContain("<a href={item.to}>{item.title}</a>")
  })
})
