import { expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as ToolProcess from "../src/tool-process.js"

const spawn = (overrides: Partial<ToolProcess.SpawnInput> = {}): ToolProcess.SpawnInput => ({
  workspace: "/workspace",
  argv: ["tool", "--safe"],
  cwd: "/workspace/project",
  environment: { TOKEN: "value" },
  ...overrides,
})

it("accepts argv-only execution at the workspace root or below it", () => {
  expect(ToolProcess.validateSpawn(spawn())).toEqual({ _tag: "Valid" })
  expect(ToolProcess.validateSpawn(spawn({ cwd: "/workspace" }))).toEqual({ _tag: "Valid" })
})

it("rejects relative paths and paths outside the workspace boundary", () => {
  const cases = [
    spawn({ workspace: "workspace" }),
    spawn({ cwd: "project" }),
    spawn({ cwd: "/tmp" }),
    spawn({ cwd: "/workspace-sibling" }),
  ]

  expect(cases).toHaveLength(4)
  for (const input of cases) {
    expect(ToolProcess.validateSpawn(input)).toEqual({ _tag: "Invalid", reason: "UnsafeCwd" })
  }
})

it("rejects empty argv entries, null bytes, and shell command execution", () => {
  const emptyCases = [spawn({ argv: [] }), spawn({ argv: ["tool", ""] }), spawn({ argv: ["tool\u0000"] })]
  const shellCases = [
    spawn({ argv: ["sh", "-c", "echo unsafe"] }),
    spawn({ argv: ["cmd", "/c", "echo unsafe"] }),
    spawn({ argv: ["powershell", "-Command", "Write-Output unsafe"] }),
  ]

  expect(emptyCases).toHaveLength(3)
  for (const input of emptyCases) {
    expect(ToolProcess.validateSpawn(input)).toEqual({ _tag: "Invalid", reason: "EmptyArgv" })
  }
  expect(shellCases).toHaveLength(3)
  for (const input of shellCases) {
    expect(ToolProcess.validateSpawn(input)).toEqual({ _tag: "Invalid", reason: "ShellExecution" })
  }
})

it("rejects empty or null-containing explicit environment entries", () => {
  const cases = [
    spawn({ environment: { "": "value" } }),
    spawn({ environment: { "BAD\u0000KEY": "value" } }),
    spawn({ environment: { TOKEN: "bad\u0000value" } }),
  ]

  expect(cases).toHaveLength(3)
  for (const input of cases) {
    expect(ToolProcess.validateSpawn(input)).toEqual({ _tag: "Invalid", reason: "UnsafeEnvironment" })
  }
})

it.effect("provides an inactive process service without a live child", () =>
  Effect.gen(function* () {
    expect(Option.isNone(yield* ToolProcess.none.active())).toBe(true)
    expect(
      Option.isNone(
        yield* ToolProcess.Service.pipe(
          Effect.provide(ToolProcess.layer),
          Effect.flatMap((s) => s.active()),
        ),
      ),
    ).toBe(true)
  }),
)
