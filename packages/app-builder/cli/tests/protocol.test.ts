import { expect, it } from "vitest"
import { mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { join } from "node:path"
import * as Effect from "effect/Effect"
import { surfaceRequest } from "../../generation/tests/surface-request.js"

interface CommandDispatcher {
  readonly dispatch: (request: unknown) => Effect.Effect<unknown, unknown>
}

interface CliRuntime {
  readonly readFile: (path: string) => Effect.Effect<string, unknown>
  readonly readStdin: () => Effect.Effect<string, unknown>
  readonly writeStderr: (value: string) => Effect.Effect<void>
  readonly writeStdout: (value: string) => Effect.Effect<void>
}

interface MainModule {
  readonly runCli: (args: ReadonlyArray<string>, runtime: CliRuntime) => Effect.Effect<number, unknown>
  readonly runCliWithDispatcher: (
    args: ReadonlyArray<string>,
    runtime: CliRuntime,
    dispatcher: CommandDispatcher,
  ) => Effect.Effect<number, unknown>
}

interface ReplayModule {
  readonly captureReplayProvenance: (candidate: unknown) => Effect.Effect<unknown, unknown>
}

type PublicModule = typeof import("../src/index.js")
type GenerationModule = typeof import("@effectify/app-builder-generation")

const request = {
  version: "effectify.app-builder-cli-request/1",
  command: "plan",
  payload: {
    version: "effectify.creation-intent/1",
    preset: "todo",
    capabilities: ["todo.events"],
  },
}

const generateRequest = (workspace: string) => ({
  ...request,
  command: "generate" as const,
  payload: {
    intent: request.payload,
    workspace,
  },
})
const customGenerateRequest = (workspace: string) => ({
  ...generateRequest(workspace),
  payload: {
    ...generateRequest(workspace).payload,
    intent: {
      ...request.payload,
      naming: {
        workspace: "operations-workspace",
        npmScope: "@acme",
        domain: { id: "operations", name: "Operations" },
        entity: { id: "task", singular: "Task", plural: "Tasks" },
        entrypoint: { id: "admin-console", name: "AdminConsole" },
      },
    },
  },
})

const main = () => Effect.promise<MainModule>(() => import(new URL("../src/main.js", import.meta.url).href))

const replay = () =>
  Effect.promise<ReplayModule>(() => import(new URL("../../generation/src/replay.js", import.meta.url).href))

const publicSurface = () =>
  Effect.all({
    Cli: Effect.promise<PublicModule>(() => import(new URL("../src/index.js", import.meta.url).href)),
    Generation: Effect.promise<GenerationModule>(() => import("@effectify/app-builder-generation")),
  })

const invoke = (
  args: ReadonlyArray<string>,
  stdin: string,
  files: Readonly<Record<string, string>> = {},
  dispatcher?: CommandDispatcher,
) =>
  Effect.gen(function* () {
    const Main = yield* main()
    const reads = { file: 0, stdin: 0 }
    const stderr: Array<string> = []
    const stdout: Array<string> = []
    const runtime: CliRuntime = {
      readFile: (path) =>
        Effect.suspend(() => {
          reads.file += 1
          const value = files[path]
          return value === undefined ? Effect.fail(new Error(`Unexpected file read: ${path}`)) : Effect.succeed(value)
        }),
      readStdin: () =>
        Effect.sync(() => {
          reads.stdin += 1
          return stdin
        }),
      writeStderr: (value) => Effect.sync(() => void stderr.push(value)),
      writeStdout: (value) => Effect.sync(() => void stdout.push(value)),
    }
    const exit = yield* dispatcher === undefined
      ? Main.runCli(args, runtime)
      : Main.runCliWithDispatcher(args, runtime, dispatcher)
    return { exit, reads, stderr: stderr.join(""), stdout: stdout.join("") }
  })

const dispatchRecorder = () => {
  const dispatched: Array<unknown> = []
  const dispatcher: CommandDispatcher = {
    dispatch: (value) =>
      Effect.sync(() => {
        dispatched.push(value)
        return { _tag: "Success" }
      }),
  }
  return { dispatched, dispatcher }
}

const effect = (name: string, test: () => Effect.Effect<void, unknown>) => it(name, () => Effect.runPromise(test()))

effect("S16 and S18 execute the trusted plan command from stdin or an explicit JSON file", () =>
  Effect.gen(function* () {
    const stdin = yield* invoke(["plan"], JSON.stringify(request))
    const file = yield* invoke(["plan", "--input", "tests/fixtures/plan-request.json"], "", {
      "tests/fixtures/plan-request.json": JSON.stringify(request),
    })

    for (const result of [stdin, file]) {
      expect(result.exit).toBe(0)
      expect(result.stderr).toBe("")
      expect(result.stdout.trim().split("\n")).toHaveLength(1)
      expect(JSON.parse(result.stdout)).toMatchObject({
        version: "effectify.app-builder-cli-terminal/1",
        terminal: { _tag: "Success", command: "plan", result: { mutation: "none" } },
      })
    }
    expect(file.reads).toEqual({ stdin: 1, file: 1 })
  }),
)

effect("generic CLI planning behaviorally composes actual surface catalogs", () =>
  Effect.gen(function* () {
    const { Cli, Generation } = yield* publicSurface()
    for (const [scope, workspace] of [
      ["@acme", "task-workspace"],
      ["@globex", "console"],
    ]) {
      const options = surfaceRequest(Generation, scope, workspace)
      const direct = yield* Generation.composeCatalog(options)
      const adapter = yield* Cli.composeGeneration(options)

      expect(adapter).toEqual(direct)
    }
  }),
)

effect("S19 emits JSON Lines only when selected and always ends with one terminal envelope", () =>
  Effect.gen(function* () {
    const result = yield* invoke(["plan", "--events=jsonl"], JSON.stringify(request))
    const frames = result.stdout
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line))

    expect(result.exit).toBe(0)
    expect(result.stderr).toBe("")
    expect(frames).toHaveLength(2)
    expect(frames[0]).toMatchObject({ version: "effectify.app-builder-cli-event/1", _tag: "Event", command: "plan" })
    expect(frames.filter((frame) => frame.version === "effectify.app-builder-cli-terminal/1")).toHaveLength(1)
    expect(frames[1]).toMatchObject({ terminal: { _tag: "Success", command: "plan" } })
  }),
)

effect("R16 prerequisite generates deterministic consumer output through the public JSONL command", () => {
  const workspace = "tests/public-generate-workspace"
  const workspacePath = join(process.cwd(), workspace)

  return Effect.gen(function* () {
    yield* Effect.promise(() => rm(workspacePath, { force: true, recursive: true }))
    const input = JSON.stringify(customGenerateRequest(workspace))

    return yield* Effect.gen(function* () {
      const first = yield* invoke(["generate", "--events=jsonl"], input)
      const firstFrames = first.stdout
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line))
      const firstTerminal = firstFrames[1]?.terminal

      expect(first.stderr).toBe("")
      expect(first.exit).toBe(0)
      expect(firstFrames).toHaveLength(2)
      expect(firstFrames[0]).toMatchObject({
        version: "effectify.app-builder-cli-event/1",
        _tag: "Event",
        command: "generate",
      })
      expect(firstTerminal).toMatchObject({
        _tag: "Success",
        command: "generate",
        result: {
          provenance: {
            version: "effectify.app-builder-replay-provenance/1",
          },
        },
      })
      expect(firstTerminal.result.writtenPaths).not.toEqual([])
      expect(
        yield* Effect.promise(() => readFile(join(workspacePath, "apps/admin-console/src/index.ts"), "utf8")),
      ).toContain("createLiveRuntime")

      const { Generation } = yield* publicSurface()
      const direct = yield* Generation.TodoPreset.createTodoTopology(
        yield* Generation.Planner.planTodo(customGenerateRequest(workspace).payload.intent),
      )
      const rootFiles = direct.files.filter((file) =>
        Generation.TodoGeneration.WorkspaceRootFiles.some((path) => path === file.path),
      )

      expect(rootFiles).toHaveLength(5)
      expect(firstTerminal.result.writtenPaths).toEqual(expect.arrayContaining(rootFiles.map((file) => file.path)))
      for (const file of rootFiles) {
        expect(yield* Effect.promise(() => readFile(join(workspacePath, file.path), "utf8"))).toBe(file.content)
      }

      const second = yield* invoke(["generate"], input)
      const secondTerminal = JSON.parse(second.stdout).terminal

      expect(second.exit).toBe(0)
      expect(second.stderr).toBe("")
      expect(secondTerminal).toMatchObject({ _tag: "Success", command: "generate" })
      expect(secondTerminal.result.writtenPaths).toEqual([])
      expect(secondTerminal.result.provenance).toEqual(firstTerminal.result.provenance)
    }).pipe(Effect.ensuring(Effect.promise(() => rm(workspacePath, { force: true, recursive: true }))))
  })
})

effect("R03 and R04 reject a conflicting generated target before writing any other output", () => {
  const workspace = "tests/public-generate-conflict"
  const workspacePath = join(process.cwd(), workspace)
  const conflictingPath = join(workspacePath, "packages/todo/domain/package.json")
  const userBytes = '{"name":"user-authored-domain"}\n'

  return Effect.gen(function* () {
    yield* Effect.promise(() => rm(workspacePath, { force: true, recursive: true }))
    yield* Effect.promise(async () => {
      await mkdir(join(workspacePath, "packages/todo/domain"), { recursive: true })
      await writeFile(conflictingPath, userBytes)
    })

    return yield* Effect.gen(function* () {
      const result = yield* invoke(["generate"], JSON.stringify(generateRequest(workspace)))

      expect(result.exit).toBe(4)
      expect(result.stderr).toContain("conflict:")
      expect(result.stdout.trim().split("\n")).toHaveLength(1)
      expect(JSON.parse(result.stdout)).toMatchObject({
        terminal: { _tag: "Failure", error: { _tag: "ConflictError" } },
      })
      expect(yield* Effect.promise(() => readFile(conflictingPath, "utf8"))).toBe(userBytes)
      expect(
        yield* Effect.promise(() =>
          readFile(join(workspacePath, "apps/todo-cli/package.json"), "utf8")
            .then(() => true)
            .catch(() => false),
        ),
      ).toBe(false)
    }).pipe(Effect.ensuring(Effect.promise(() => rm(workspacePath, { force: true, recursive: true }))))
  })
})

effect("R09 and R11 reject unsafe generate workspaces and injected automation before mutation", () => {
  const injectedWorkspace = join(process.cwd(), "tests/injected-automation")

  return Effect.gen(function* () {
    yield* Effect.promise(() => rm(injectedWorkspace, { force: true, recursive: true }))

    return yield* Effect.gen(function* () {
      for (const payload of [
        generateRequest("../unsafe-workspace"),
        {
          ...generateRequest("tests/injected-automation"),
          payload: {
            intent: { ...request.payload, automation: { execute: "rm -rf /", tool: "mcp" } },
            workspace: "tests/injected-automation",
          },
        },
      ]) {
        const result = yield* invoke(["generate"], JSON.stringify(payload))

        expect(result.exit).toBe(2)
        expect(result.stderr).toContain("input:")
        expect(JSON.parse(result.stdout)).toMatchObject({
          terminal: { _tag: "Failure", error: { _tag: "InputError" } },
        })
      }
      expect(
        yield* Effect.promise(() =>
          readFile(join(injectedWorkspace, "apps/todo-cli/package.json"), "utf8")
            .then(() => true)
            .catch(() => false),
        ),
      ).toBe(false)
    }).pipe(Effect.ensuring(Effect.promise(() => rm(injectedWorkspace, { force: true, recursive: true }))))
  })
})

effect("S16 accepts catalog, binds replay to trusted evidence, and keeps three later commands closed", () =>
  Effect.gen(function* () {
    const catalog = yield* invoke(["catalog"], JSON.stringify({ ...request, command: "catalog", payload: {} }))
    expect(catalog.exit).toBe(0)
    expect(JSON.parse(catalog.stdout)).toMatchObject({ terminal: { _tag: "Success", command: "catalog" } })

    for (const command of ["verify", "explain", "doctor"] as const) {
      const result = yield* invoke([command], JSON.stringify({ ...request, command, payload: {} }))
      expect(result.exit).toBe(0)
      expect(JSON.parse(result.stdout)).toMatchObject({ terminal: { _tag: "NotAvailable", command } })
    }

    const Replay = yield* replay()
    const candidate = {
      blocks: ["model"],
      catalog: { version: "effectify.todo-catalog/1" },
      dependencies: [
        {
          importer: "workspace",
          integrity: "sha512-effect",
          name: "effect",
          peers: {},
          version: "4.0.0",
        },
      ],
      intent: request.payload,
      outputs: [
        {
          content: "export const generated = true\n",
          mode: "100644",
          owner: "@effectify/app-builder/model/1",
          path: "packages/todo/domain/src/generated.ts",
        },
      ],
      pins: {
        effect: "4.0.0",
        frozenInstall: true,
        nx: "23.1.0",
        packageManager: "pnpm@10.14.0",
        plugins: [{ name: "@effectify/app-builder-generation", version: "0.0.0" }],
      },
      plan: request.payload,
    }
    const provenance = yield* Replay.captureReplayProvenance(candidate)
    const replayResult = yield* invoke(
      ["replay"],
      JSON.stringify({
        ...request,
        command: "replay",
        payload: { candidate, provenance, workspaceOutputs: candidate.outputs },
      }),
    )

    expect(replayResult.exit).toBe(0)
    expect(JSON.parse(replayResult.stdout)).toMatchObject({
      terminal: { _tag: "Success", command: "replay", result: { diffPaths: [], zeroDiff: true } },
    })
  }),
)

effect(
  "R09, R10, and T1 reject documentation, free-form commands, malformed input, and unsafe options before dispatch",
  () =>
    Effect.gen(function* () {
      for (const [args, stdin] of [
        [["README.md"], JSON.stringify(request)],
        [["plan"], "# documentation is not a command"],
        [["plan", "verify"], JSON.stringify(request)],
        [["plan", "--input", "../README.md"], ""],
        [["plan", "--input=$HOME/request.json"], ""],
        [["plan", "--signal=SIGTERM"], JSON.stringify(request)],
        [["plan", "--mcp"], JSON.stringify(request)],
      ] as const) {
        const { dispatched, dispatcher } = dispatchRecorder()
        const result = yield* invoke(args, stdin, {}, dispatcher)

        expect(result.exit).toBe(2)
        expect(result.stdout.trim().split("\n")).toHaveLength(1)
        expect(JSON.parse(result.stdout)).toMatchObject({
          version: "effectify.app-builder-cli-terminal/1",
          terminal: { _tag: "Failure", error: { _tag: "InputError" } },
        })
        expect(result.stderr).toContain("input:")
        expect(dispatched).toEqual([])
      }
    }),
)

effect("R11, S17, S20, and T2 reject automation payloads and stdin plus file before file reads or dispatch", () =>
  Effect.gen(function* () {
    const automation = dispatchRecorder()
    const automationResult = yield* invoke(
      ["plan"],
      JSON.stringify({ ...request, automation: { execute: "rm -rf /", tool: "mcp" } }),
      {},
      automation.dispatcher,
    )
    const ambiguous = dispatchRecorder()
    const ambiguousResult = yield* invoke(
      ["plan", "--input", "tests/fixtures/plan-request.json"],
      JSON.stringify(request),
      { "tests/fixtures/plan-request.json": JSON.stringify(request) },
      ambiguous.dispatcher,
    )

    for (const result of [automationResult, ambiguousResult]) {
      expect(result.exit).toBe(2)
      expect(JSON.parse(result.stdout)).toMatchObject({ terminal: { _tag: "Failure", error: { _tag: "InputError" } } })
      expect(result.stderr).toContain("input:")
    }
    expect(automation.dispatched).toEqual([])
    expect(ambiguous.dispatched).toEqual([])
    expect(ambiguousResult.reads).toEqual({ stdin: 1, file: 0 })
  }),
)
