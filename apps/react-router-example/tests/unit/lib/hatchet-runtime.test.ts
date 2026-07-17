import { readFile } from "node:fs/promises"
import { describe, expect, it } from "vitest"

const appFile = (path: string): Promise<string> => readFile(new URL(`../../../app/${path}`, import.meta.url), "utf8")

describe("Effect-native Hatchet architecture", () => {
  it("keeps Hatchet package-owned with one declarative task and one endpoint", async () => {
    const [sharedRuntime, task, route, routes] = await Promise.all([
      appFile("lib/runtime.server.ts"),
      appFile("lib/hatchet/greeting-task.server.ts"),
      appFile("routes/api.hatchet.runs.ts"),
      appFile("routes.tsx"),
    ])
    const combined = [sharedRuntime, task, route, routes].join("\n")

    expect(sharedRuntime).toContain("Hatchet.layer({ tasks: [greetingTask] })")
    expect(sharedRuntime).toMatch(/Layer\.mergeAll\([\s\S]*hatchetLayer/)
    expect(task).toContain("Task.make")
    expect(route).toContain("Effect.gen")
    expect(route).toContain("yield* Hatchet.run(greetingTask, input)")
    expect(route).toContain("withActionEffect")
    expect(routes.match(/api\/hatchet/g)?.length).toBe(1)
    expect(routes).not.toContain("crons")

    for (
      const forbidden of [
        "HatchetRuntime",
        "ManagedRuntime",
        "runPromise",
        "authorize(",
        "HATCHET_EXAMPLE_API_KEY",
        "createCron",
        "listCrons",
        "deleteCron",
      ]
    ) {
      expect(combined).not.toContain(forbidden)
    }
    expect([task, route].join("\n")).not.toContain("process.env")
  })
})
