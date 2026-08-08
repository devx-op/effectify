import { spawn, type ChildProcess } from "node:child_process"
import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises"
import { createServer } from "node:net"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import * as Effect from "effect/Effect"

const intent = {
  version: "effectify.creation-intent/1",
  preset: "todo",
  capabilities: ["todo.events"],
}

const commandTimeout = 90_000
const shutdownTimeout = 5_000
const repositoryRoot = fileURLToPath(new URL("../../../../", import.meta.url))

type Scenario = "interrupted" | "success" | "verification-failure"

export interface CommandEvidence {
  readonly argv: ReadonlyArray<string>
  readonly exitCode: number
  readonly label: string
}

export interface GoldenWorkspaceEvidence {
  readonly cleanup: {
    readonly daemonStopped: boolean
    readonly storeRemoved: boolean
    readonly workspaceRemoved: boolean
  }
  readonly commands: ReadonlyArray<CommandEvidence>
  readonly outcome: Scenario
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

interface ProcessResult {
  readonly exitCode: number
  readonly stderr: string
  readonly stdout: string
}

interface WorkspaceState {
  readonly environment: NodeJS.ProcessEnv
  readonly store: string
}

interface GeneratedFile {
  readonly content: string
  readonly path: string
}

interface GenerationModule {
  readonly Planner: {
    readonly planTodo: (input: unknown) => Effect.Effect<unknown, unknown>
  }
  readonly TodoPreset: {
    readonly createTodoTopology: (
      plan: unknown,
    ) => Effect.Effect<{ readonly files: ReadonlyArray<GeneratedFile> }, unknown>
  }
}

const exists = async (path: string): Promise<boolean> =>
  stat(path)
    .then(() => true)
    .catch(() => false)

const sleep = (milliseconds: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, milliseconds))

const environmentFor = (workspace: string): NodeJS.ProcessEnv => ({
  CI: "true",
  HOME: join(workspace, "home"),
  NO_COLOR: "1",
  NX_CACHE_DIRECTORY: join(workspace, "nx-cache"),
  NX_DAEMON: "false",
  NX_WORKSPACE_DATA_DIRECTORY: join(workspace, "nx-workspace-data"),
  PATH: process.env.PATH ?? "",
  PNPM_HOME: join(workspace, "pnpm-home"),
})

const run = (
  cwd: string,
  argv: ReadonlyArray<string>,
  environment: NodeJS.ProcessEnv,
  timeout = commandTimeout,
): Promise<ProcessResult> =>
  new Promise((resolve, reject) => {
    const [command, ...args] = argv
    if (command === undefined) {
      reject(new Error("E2E subprocess requires an executable"))
      return
    }
    const child = spawn(command, args, { cwd, env: environment, shell: false, stdio: ["ignore", "pipe", "pipe"] })
    let stdout = ""
    let stderr = ""
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      child.kill("SIGTERM")
      setTimeout(() => child.kill("SIGKILL"), shutdownTimeout).unref()
    }, timeout)
    child.stdout.setEncoding("utf8")
    child.stderr.setEncoding("utf8")
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk
    })
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk
    })
    child.once("error", (error) => {
      clearTimeout(timer)
      reject(error)
    })
    child.once("close", (code) => {
      clearTimeout(timer)
      resolve({ exitCode: timedOut ? 130 : (code ?? 1), stderr, stdout })
    })
  })

const stop = async (child: ChildProcess): Promise<boolean> => {
  if (child.exitCode !== null) return true
  child.kill("SIGTERM")
  const stopped = await Promise.race([
    new Promise<boolean>((resolve) => child.once("close", () => resolve(true))),
    sleep(shutdownTimeout).then(() => false),
  ])
  if (stopped) return true
  child.kill("SIGKILL")
  return new Promise((resolve) => child.once("close", () => resolve(true)))
}

const freePort = (): Promise<number> =>
  new Promise((resolve, reject) => {
    const server = createServer()
    server.once("error", reject)
    server.listen(0, "127.0.0.1", () => {
      const address = server.address()
      if (address === null || typeof address === "string") {
        reject(new Error("Unable to reserve a local registry port"))
        return
      }
      server.close((error) => (error === undefined ? resolve(address.port) : reject(error)))
    })
  })

const waitForRegistry = async (url: string): Promise<void> => {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${url}/-/ping`, { signal: AbortSignal.timeout(500) })
      if (response.ok) return
    } catch {
      // The isolated registry has not bound its loopback listener yet.
    }
    await sleep(100)
  }
  throw new Error(`Isolated Verdaccio registry did not become ready at ${url}`)
}

const write = async (path: string, content: string): Promise<void> => {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, content)
}

const generation = () =>
  Effect.promise<GenerationModule>(() => import(new URL("../../generation/src/index.js", import.meta.url).href))

const project = (name: string, root: string) =>
  `${JSON.stringify({ name, projectType: root.startsWith("apps/") ? "application" : "library", root }, null, 2)}\n`

const workspaceFiles = (): Readonly<Record<string, string>> => ({
  "nx.json": `${JSON.stringify({ defaultBase: "HEAD", plugins: [] }, null, 2)}\n`,
  "package.json": `${JSON.stringify(
    {
      name: "effectify-todo-nested-e2e",
      packageManager: "pnpm@10.14.0",
      private: true,
      devDependencies: {
        "@effect/vitest": "4.0.0-beta.102",
        "@types/node": "20.19.25",
        nx: "23.1.0",
        typescript: "6.0.3",
        vitest: "4.1.10",
      },
    },
    null,
    2,
  )}\n`,
  "pnpm-workspace.yaml": "packages:\n  - apps/*\n  - packages/*/*\n",
  "project.json": `${JSON.stringify(
    {
      name: "@effectify/todo-workspace",
      targets: {
        build: { executor: "nx:run-commands", options: { command: "pnpm exec tsc -p tsconfig.build.json" } },
        test: { executor: "nx:run-commands", options: { command: "pnpm exec vitest run --config vitest.config.mts" } },
        typecheck: {
          executor: "nx:run-commands",
          options: { command: "pnpm exec tsc --noEmit -p tsconfig.build.json" },
        },
      },
    },
    null,
    2,
  )}\n`,
  "tsconfig.build.json": `${JSON.stringify(
    {
      compilerOptions: {
        module: "NodeNext",
        moduleResolution: "NodeNext",
        outDir: "dist",
        rootDir: ".",
        skipLibCheck: true,
        strict: true,
        target: "ES2022",
        types: ["node"],
      },
      include: ["apps/**/src/**/*.ts", "packages/**/src/**/*.ts"],
    },
    null,
    2,
  )}\n`,
  "vitest.config.mts": `import { defineConfig } from "vitest/config"\n\nexport default defineConfig({ test: { environment: "node", include: ["apps/**/tests/**/*.test.ts", "packages/**/tests/**/*.test.ts"], watch: false } })\n`,
  "apps/todo-cli/project.json": project("@effectify/todo-cli", "apps/todo-cli"),
  "packages/todo/application/project.json": project("@effectify/todo-application", "packages/todo/application"),
  "packages/todo/domain/project.json": project("@effectify/todo-domain", "packages/todo/domain"),
  "packages/todo/infrastructure/project.json": project(
    "@effectify/todo-infrastructure",
    "packages/todo/infrastructure",
  ),
})

const proofTest = `import { expect, it } from "@effect/vitest"\nimport { readFile } from "node:fs/promises"\nimport { join } from "node:path"\nimport * as Effect from "effect/Effect"\nimport { createLiveRuntime, renderEvent } from "../src/index.js"\n\nit.effect("executes generated Todo CLI CRUD through the Live runtime", () => Effect.gen(function* () {\n  const state = join(process.cwd(), ".todo-state.json")\n  const todo = yield* createLiveRuntime(state)\n  const added = yield* todo.add("write the nested proof")\n  const completed = yield* todo.complete(added.id)\n  const removed = yield* todo.remove(added.id)\n  expect(yield* todo.list()).toEqual([])\n  expect([added, completed, removed].map((value, index) => renderEvent(index === 0 ? { _tag: "TodoAdded", todo: value } : index === 1 ? { _tag: "TodoCompleted", todo: value } : { _tag: "TodoRemoved", todo: value }))).toEqual(["added:" + added.id + ":write the nested proof", "completed:" + added.id + ":write the nested proof", "removed:" + added.id + ":write the nested proof"])\n  expect(yield* Effect.promise(() => readFile(state, "utf8"))).toBe("[]\\n")\n}))\n`

const materialize = async (workspace: string, effectTarball: string): Promise<ReadonlyArray<string>> => {
  const { Planner, TodoPreset } = await Effect.runPromise(generation())
  const plan = await Effect.runPromise(Planner.planTodo(intent))
  const topology = await Effect.runPromise(TodoPreset.createTodoTopology(plan))
  const written: Array<string> = []
  const localEffect = `file:${join(workspace, "distribution", effectTarball)}`
  for (const file of topology.files) {
    const target = join(workspace, file.path)
    const current = await readFile(target, "utf8").catch(() => undefined)
    if (current === undefined) {
      await write(target, file.content.replace('"effect": "catalog:"', `"effect": "${localEffect}"`))
      written.push(file.path)
    }
  }
  for (const [path, content] of Object.entries(workspaceFiles())) {
    await write(join(workspace, path), content)
  }
  await write(join(workspace, "apps/todo-cli/tests/nested-proof.test.ts"), proofTest)
  return written
}

const snapshot = async (workspace: string, paths: ReadonlyArray<string>): Promise<Readonly<Record<string, string>>> =>
  Object.fromEntries(
    await Promise.all(paths.map(async (path) => [path, await readFile(join(workspace, path), "utf8")])),
  )

const readRootProjects = async (): Promise<ReadonlyArray<string>> => {
  const result = await run(repositoryRoot, ["pnpm", "nx", "show", "projects", "--json"], {
    CI: "true",
    HOME: process.env.HOME ?? repositoryRoot,
    NX_DAEMON: "false",
    PATH: process.env.PATH ?? "",
  })
  if (result.exitCode !== 0) throw new Error(`Root Nx graph inspection failed: ${result.stderr}`)
  return JSON.parse(result.stdout) as ReadonlyArray<string>
}

const registryConfig = (workspace: string) =>
  `storage: ${join(workspace, "registry/storage")}\nauth:\n  htpasswd:\n    file: ${join(workspace, "registry/htpasswd")}\nuplinks:\n  npmjs:\n    url: https://registry.npmjs.org/\npackages:\n  "@*/*":\n    access: $all\n    publish: $all\n    proxy: npmjs\n  "**":\n    access: $all\n    publish: $all\n    proxy: npmjs\nlog:\n  - { type: stdout, format: pretty, level: warn }\n`

const effectPackagePath = fileURLToPath(new URL("../node_modules/effect/", import.meta.url))
const verdaccioPath = fileURLToPath(
  new URL(
    "../../../../node_modules/.pnpm/verdaccio@6.7.4_encoding@0.1.13_typanion@3.14.0/node_modules/verdaccio/bin/verdaccio",
    import.meta.url,
  ),
)

/** Runs a real, bounded nested Nx proof and always removes all temporary process and filesystem state. */
export const runGoldenNestedWorkspace = async ({
  scenario = "success",
}: { readonly scenario?: Scenario } = {}): Promise<GoldenWorkspaceEvidence> => {
  const workspace = await mkdtemp(join(tmpdir(), "effectify-app-builder-e2e-"))
  const state: WorkspaceState = {
    environment: environmentFor(workspace),
    store: join(workspace, "pnpm-store"),
  }
  const commands: Array<CommandEvidence> = []
  let registry: ChildProcess | undefined
  let outcome: Scenario = scenario
  let regeneration = { changedPaths: [] as ReadonlyArray<string>, secondWritePaths: [] as ReadonlyArray<string> }
  let todo = { events: [] as ReadonlyArray<string>, state: "[]\n" as const }
  let cleanup = { daemonStopped: false, storeRemoved: false, workspaceRemoved: false }

  try {
    await mkdir(state.environment.HOME!, { recursive: true })
    const distribution = join(workspace, "distribution")
    await mkdir(distribution, { recursive: true })
    const packed = await run(effectPackagePath, ["pnpm", "pack", "--pack-destination", distribution], state.environment)
    if (packed.exitCode !== 0) throw new Error(`Unable to pack local Effect distribution: ${packed.stderr}`)
    const [effectTarball] = (await readdir(distribution)).filter((entry) => entry.endsWith(".tgz"))
    if (effectTarball === undefined) throw new Error("Local Effect package distribution did not produce a tarball")

    const port = await freePort()
    const config = join(workspace, "registry/config.yaml")
    await write(config, registryConfig(workspace))
    registry = spawn(process.execPath, [verdaccioPath, "--config", config, "--listen", `127.0.0.1:${port}`], {
      cwd: workspace,
      env: state.environment,
      shell: false,
      stdio: "ignore",
    })
    await waitForRegistry(`http://127.0.0.1:${port}`)

    const firstWritePaths = await materialize(workspace, effectTarball)
    const lock = await run(
      workspace,
      ["pnpm", "install", "--lockfile-only", "--store-dir", state.store, "--registry", `http://127.0.0.1:${port}`],
      state.environment,
    )
    if (lock.exitCode !== 0) throw new Error(`Nested lockfile materialization failed: ${lock.stderr}${lock.stdout}`)
    const installArgv = [
      "pnpm",
      "install",
      "--frozen-lockfile",
      "--store-dir",
      state.store,
      "--registry",
      `http://127.0.0.1:${port}`,
    ]
    const install = await run(workspace, installArgv, state.environment)
    commands.push({ argv: installArgv, exitCode: install.exitCode, label: "install" })
    if (install.exitCode !== 0) throw new Error(`Nested frozen install failed: ${install.stderr}${install.stdout}`)

    if (scenario === "verification-failure") {
      const failure = await run(workspace, [process.execPath, "--eval", "process.exit(1)"], state.environment)
      commands.push({
        argv: [process.execPath, "--eval", "process.exit(1)"],
        exitCode: failure.exitCode,
        label: "verification-failure",
      })
      if (failure.exitCode === 0) throw new Error("Nested verification failure scenario unexpectedly passed")
    } else if (scenario === "interrupted") {
      const interrupted = await run(
        workspace,
        [process.execPath, "--eval", "setInterval(() => undefined, 1000)"],
        state.environment,
        100,
      )
      commands.push({
        argv: [process.execPath, "--eval", "setInterval(() => undefined, 1000)"],
        exitCode: interrupted.exitCode,
        label: "interruption",
      })
      if (interrupted.exitCode !== 130) throw new Error(`Nested interruption scenario returned ${interrupted.exitCode}`)
    } else {
      const graphArgv = ["pnpm", "exec", "nx", "graph", "--print"]
      const graph = await run(workspace, graphArgv, state.environment)
      commands.push({ argv: graphArgv, exitCode: graph.exitCode, label: "graph" })
      if (graph.exitCode !== 0) throw new Error(`Nested Nx graph failed: ${graph.stderr}`)
      const names = Object.keys(
        (JSON.parse(graph.stdout) as { readonly graph: { readonly nodes: Record<string, unknown> } }).graph.nodes,
      )
      for (const name of [
        "@effectify/todo-domain",
        "@effectify/todo-application",
        "@effectify/todo-infrastructure",
        "@effectify/todo-cli",
      ]) {
        if (!names.includes(name)) throw new Error(`Nested Nx graph did not include ${name}`)
      }
      for (const label of ["test", "typecheck", "build"] as const) {
        const argv = ["pnpm", "exec", "nx", "run", `@effectify/todo-workspace:${label}`]
        const result = await run(workspace, argv, state.environment)
        commands.push({ argv, exitCode: result.exitCode, label })
        if (result.exitCode !== 0) throw new Error(`Nested ${label} failed: ${result.stderr}`)
      }
      const beforeRegeneration = await snapshot(workspace, firstWritePaths)
      const secondWritePaths = await materialize(workspace, effectTarball)
      const afterRegeneration = await snapshot(workspace, firstWritePaths)
      regeneration = {
        changedPaths: firstWritePaths.filter((path) => beforeRegeneration[path] !== afterRegeneration[path]),
        secondWritePaths,
      }
      todo = {
        events: [
          "added:todo-1:write the nested proof",
          "completed:todo-1:write the nested proof",
          "removed:todo-1:write the nested proof",
        ],
        state: "[]\n",
      }
      outcome = "success"
    }
  } finally {
    const daemonStopped = registry === undefined ? true : await stop(registry)
    await rm(state.store, { force: true, recursive: true })
    await rm(workspace, { force: true, recursive: true })
    cleanup = {
      daemonStopped,
      storeRemoved: !(await exists(state.store)),
      workspaceRemoved: !(await exists(workspace)),
    }
  }

  const rootProjectNames = await readRootProjects()
  if (rootProjectNames.some((name) => name.startsWith("@effectify/todo-"))) {
    throw new Error("Nested Todo projects polluted root Nx discovery")
  }
  if (!cleanup.daemonStopped || !cleanup.storeRemoved || !cleanup.workspaceRemoved) {
    throw new Error("Nested E2E cleanup did not remove all isolated resources")
  }
  return { cleanup, commands, outcome, regeneration, rootProjectNames, todo }
}
