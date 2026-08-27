import { readFile } from "node:fs/promises"
import { describe, expect, it } from "vitest"

const appFile = (path: string): Promise<string> => readFile(new URL(`../../../app/${path}`, import.meta.url), "utf8")

describe("Effect-native Hatchet architecture", () => {
  it("keeps Hatchet package-owned with one declarative task and Effect-native routes", async () => {
    const [sharedRuntime, task, runRoute, cronRoute, routes] = await Promise.all([
      appFile("lib/runtime.server.ts"),
      appFile("lib/hatchet/greeting-task.server.ts"),
      appFile("routes/api.hatchet.runs.ts"),
      appFile("routes/hatchet-crons.tsx"),
      appFile("routes.tsx"),
    ])
    const combined = [sharedRuntime, task, runRoute, cronRoute, routes].join("\n")

    expect(sharedRuntime).toContain("Hatchet.layer({ tasks: [greetingTask] })")
    expect(sharedRuntime).toMatch(/Layer\.mergeAll\([\s\S]*hatchetLayer/)
    expect(task).toContain("Task.make")
    expect(runRoute).toContain("Effect.gen")
    expect(runRoute).toContain("yield* Hatchet.runNoWait(greetingTask, input)")
    expect(runRoute).toContain("withActionEffect")
    expect(cronRoute).toContain("yield* Hatchet.listCrons")
    expect(cronRoute).toContain("yield* Hatchet.createCron(greetingTask")
    expect(cronRoute).toContain("CronExpression.parse")
    expect(cronRoute).toContain("CronExpression.nextRuns")
    expect(cronRoute).not.toContain("Hatchet.deleteCron")
    expect(cronRoute).not.toContain("cron-owner")
    expect(routes.match(/api\/hatchet/g)?.length).toBe(1)
    expect(routes).toContain('route("hatchet-crons"')

    for (const forbidden of [
      "HatchetRuntime",
      "ManagedRuntime",
      "runPromise",
      "authorize(",
      "HATCHET_EXAMPLE_API_KEY",
    ]) {
      expect(combined).not.toContain(forbidden)
    }
    expect([task, runRoute, cronRoute].join("\n")).not.toContain("process.env")
  })
})
