import { expect, it } from "vitest"

type CommandEvidence = {
  readonly argv: ReadonlyArray<string>
  readonly exitCode: number
  readonly label: string
  readonly output?: string
}

interface GoldenWorkspaceEvidence {
  readonly cleanup: {
    readonly daemonStopped: boolean
    readonly storeRemoved: boolean
    readonly workspaceRemoved: boolean
  }
  readonly commands: ReadonlyArray<CommandEvidence>
  readonly outcome: "interrupted" | "success" | "verification-failure"
  readonly regeneration: {
    readonly changedPaths: ReadonlyArray<string>
    readonly secondWritePaths: ReadonlyArray<string>
  }
  readonly rootProjectNames: ReadonlyArray<string>
  readonly task: {
    readonly events: ReadonlyArray<string>
    readonly id: string
    readonly state: "[]\n"
  }
  readonly termination?: {
    readonly descendantPid?: number
    readonly descendantGone: boolean
    readonly directChildClosed: boolean
    readonly directChildClosedBeforeKill: boolean
    readonly escalated: boolean
    readonly groupId: number
    readonly groupGone: boolean
    readonly killSent: boolean
    readonly readinessObserved: boolean
    readonly stopped: boolean
    readonly termSent: boolean
  }
}

interface GoldenWorkspaceModule {
  readonly runGoldenCommandTimeout: (timeout?: number) => Promise<unknown>
  readonly runGoldenNestedWorkspace: (options?: {
    readonly scenario?: GoldenWorkspaceEvidence["outcome"]
  }) => Promise<GoldenWorkspaceEvidence>
}

const golden = () =>
  import(new URL("../src/golden-workspace.js", import.meta.url).href) as Promise<GoldenWorkspaceModule>

it("R14 and S25-S27 generate a custom workspace through the public CLI, run Nx and Live runtime, and replay cleanly", async () => {
  const Golden = await golden()
  const result = await Golden.runGoldenNestedWorkspace()

  expect(result.outcome).toBe("success")
  expect(result.commands).toEqual([
    expect.objectContaining({ label: "cli-install", exitCode: 0 }),
    expect.objectContaining({
      label: "generate",
      exitCode: 0,
      argv: [expect.stringMatching(/\/effectify-app-builder$/), "generate", "--events=jsonl"],
    }),
    expect.objectContaining({
      label: "install",
      exitCode: 0,
      argv: expect.arrayContaining(["pnpm", "install", "--frozen-lockfile", "--store-dir", "--registry"]),
    }),
    expect.objectContaining({ label: "graph", exitCode: 0, argv: ["pnpm", "exec", "nx", "graph", "--print"] }),
    expect.objectContaining({
      label: "test",
      exitCode: 0,
      argv: ["pnpm", "exec", "nx", "run", "@acme/admin-console:test"],
    }),
    expect.objectContaining({
      label: "typecheck",
      exitCode: 0,
      argv: ["pnpm", "exec", "nx", "run", "@acme/admin-console:typecheck"],
    }),
    expect.objectContaining({
      label: "build",
      exitCode: 0,
      argv: ["pnpm", "exec", "nx", "run", "@acme/admin-console:build"],
    }),
    expect.objectContaining({ label: "runtime", exitCode: 0 }),
    expect.objectContaining({
      label: "replay",
      exitCode: 0,
      argv: [expect.stringMatching(/\/effectify-app-builder$/), "generate", "--events=jsonl"],
    }),
  ])
  expect(result.task.id).toMatch(/^[0-9a-f-]{36}$/)
  expect(result.task.events).toEqual([
    `added:${result.task.id}:write the public proof`,
    `completed:${result.task.id}:write the public proof`,
    `removed:${result.task.id}:write the public proof`,
  ])
  expect(result.task.state).toBe("[]\n")
  expect(result.regeneration).toEqual({ changedPaths: [], secondWritePaths: [] })
  expect(result.rootProjectNames.filter((name) => name.startsWith("@acme/"))).toEqual([])
  expect(result.cleanup).toEqual({ daemonStopped: true, storeRemoved: true, workspaceRemoved: true })
}, 300_000)

it("rejects a non-closing process on timeout without retaining its timer", async () => {
  const timeoutCount = process.getActiveResourcesInfo().filter((resource) => resource === "Timeout").length

  await expect((await golden()).runGoldenCommandTimeout(50)).rejects.toThrow("Process did not close within 50ms")
  expect(process.getActiveResourcesInfo().filter((resource) => resource === "Timeout").length).toBeLessThanOrEqual(
    timeoutCount,
  )
})

it("reports a real generated Nx typecheck failure and removes its isolated resources", async () => {
  const timeoutCount = process.getActiveResourcesInfo().filter((resource) => resource === "Timeout").length
  const result = await (await golden()).runGoldenNestedWorkspace({ scenario: "verification-failure" })

  expect(result.outcome).toBe("verification-failure")
  const failure = result.commands.find((command) => command.label === "verification-failure")
  expect(failure?.argv).toEqual(["pnpm", "exec", "nx", "run", "@acme/admin-console:typecheck"])
  expect(failure?.exitCode).not.toBe(0)
  expect(failure?.output).toContain("src/index.ts")
  expect(failure?.output).toContain("TS2322")
  expect(result.rootProjectNames.filter((name) => name.startsWith("@acme/"))).toEqual([])
  expect(result.cleanup).toEqual({ daemonStopped: true, storeRemoved: true, workspaceRemoved: true })
  expect(process.getActiveResourcesInfo().filter((resource) => resource === "Timeout").length).toBeLessThanOrEqual(
    timeoutCount,
  )
}, 300_000)

it("interrupts a ready generated Vitest workflow and kills its TERM-resistant descendant", async () => {
  const result = await (await golden()).runGoldenNestedWorkspace({ scenario: "interrupted" })

  expect(result.outcome).toBe("interrupted")
  expect(result.commands).toContainEqual({
    argv: ["pnpm", "exec", "nx", "run", "@acme/admin-console:test"],
    exitCode: 130,
    label: "interruption",
  })
  expect(result.termination).toEqual({
    descendantPid: expect.any(Number),
    descendantGone: true,
    directChildClosed: true,
    directChildClosedBeforeKill: true,
    escalated: true,
    groupId: expect.any(Number),
    groupGone: true,
    killSent: true,
    readinessObserved: true,
    stopped: true,
    termSent: true,
  })
  expect(result.rootProjectNames.filter((name) => name.startsWith("@acme/"))).toEqual([])
  expect(result.cleanup).toEqual({ daemonStopped: true, storeRemoved: true, workspaceRemoved: true })
}, 300_000)
