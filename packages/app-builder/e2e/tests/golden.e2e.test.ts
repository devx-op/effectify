import { expect, it } from "vitest"

type CommandEvidence = {
  readonly argv: ReadonlyArray<string>
  readonly exitCode: number
  readonly label: string
}

interface GoldenWorkspaceEvidence {
  readonly cleanup: {
    readonly daemonStopped: boolean
    readonly storeRemoved: boolean
    readonly workspaceRemoved: boolean
  }
  readonly commands: ReadonlyArray<CommandEvidence>
  readonly outcome: "success"
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
}

interface GoldenWorkspaceModule {
  readonly runGoldenNestedWorkspace: () => Promise<GoldenWorkspaceEvidence>
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
