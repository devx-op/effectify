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
  readonly outcome: "interrupted" | "success" | "verification-failure"
  readonly regeneration: {
    readonly changedPaths: ReadonlyArray<string>
    readonly secondWritePaths: ReadonlyArray<string>
  }
  readonly rootProjectNames: ReadonlyArray<string>
  readonly todo: {
    readonly events: ReadonlyArray<string>
    readonly state: "[]\n"
  }
}

interface GoldenWorkspaceModule {
  readonly runGoldenNestedWorkspace: (input?: {
    readonly scenario?: "interrupted" | "success" | "verification-failure"
  }) => Promise<GoldenWorkspaceEvidence>
}

const golden = () =>
  import(new URL("../src/golden-workspace.js", import.meta.url).href) as Promise<GoldenWorkspaceModule>

it("R14 and S25-S27 generate an isolated Todo Nx workspace, run its real commands, and preserve zero-diff regeneration", async () => {
  const Golden = await golden()
  const result = await Golden.runGoldenNestedWorkspace()

  expect(result.outcome).toBe("success")
  expect(result.commands).toEqual([
    expect.objectContaining({
      label: "install",
      exitCode: 0,
      argv: expect.arrayContaining(["pnpm", "install", "--frozen-lockfile", "--store-dir", "--registry"]),
    }),
    expect.objectContaining({ label: "graph", exitCode: 0, argv: ["pnpm", "exec", "nx", "graph", "--print"] }),
    expect.objectContaining({
      label: "test",
      exitCode: 0,
      argv: ["pnpm", "exec", "nx", "run", "@effectify/todo-workspace:test"],
    }),
    expect.objectContaining({
      label: "typecheck",
      exitCode: 0,
      argv: ["pnpm", "exec", "nx", "run", "@effectify/todo-workspace:typecheck"],
    }),
    expect.objectContaining({
      label: "build",
      exitCode: 0,
      argv: ["pnpm", "exec", "nx", "run", "@effectify/todo-workspace:build"],
    }),
  ])
  expect(result.todo.events).toEqual([
    "added:todo-1:write the nested proof",
    "completed:todo-1:write the nested proof",
    "removed:todo-1:write the nested proof",
  ])
  expect(result.todo.state).toBe("[]\n")
  expect(result.regeneration).toEqual({ changedPaths: [], secondWritePaths: [] })
  expect(result.rootProjectNames.filter((name) => name.startsWith("@effectify/todo-"))).toEqual([])
  expect(result.cleanup).toEqual({ daemonStopped: true, storeRemoved: true, workspaceRemoved: true })
}, 300_000)

it("R15 and S28 clean isolated resources after nested verification failure and interruption without root Nx pollution", async () => {
  const Golden = await golden()
  const verificationFailure = await Golden.runGoldenNestedWorkspace({ scenario: "verification-failure" })
  const interrupted = await Golden.runGoldenNestedWorkspace({ scenario: "interrupted" })

  for (const result of [verificationFailure, interrupted]) {
    expect(result.commands).toContainEqual(expect.objectContaining({ label: "install", exitCode: 0 }))
    expect(result.cleanup).toEqual({ daemonStopped: true, storeRemoved: true, workspaceRemoved: true })
    expect(result.rootProjectNames.filter((name) => name.startsWith("@effectify/todo-"))).toEqual([])
  }
  expect(verificationFailure.outcome).toBe("verification-failure")
  expect(interrupted.outcome).toBe("interrupted")
}, 300_000)
