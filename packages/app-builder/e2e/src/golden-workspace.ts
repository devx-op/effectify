import { spawn, type ChildProcess } from "node:child_process"
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises"
import { createRequire } from "node:module"
import { createServer } from "node:net"
import { tmpdir } from "node:os"
import { basename, dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const intent = {
  version: "effectify.creation-intent/1",
  preset: "todo",
  capabilities: ["todo.events"],
  naming: {
    workspace: "operations-workspace",
    npmScope: "@acme",
    domain: { id: "operations", name: "Operations" },
    entity: { id: "task", singular: "Task", plural: "Tasks" },
    entrypoint: { id: "admin-console", name: "AdminConsole" },
  },
}

const commandTimeout = 90_000
const shutdownTimeout = 5_000
const repositoryRoot = fileURLToPath(new URL("../../../../", import.meta.url))

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
  readonly outcome: "success"
  readonly regeneration: {
    readonly changedPaths: ReadonlyArray<string>
    readonly secondWritePaths: ReadonlyArray<string>
  }
  readonly rootProjectNames: ReadonlyArray<string>
  readonly task: { readonly events: ReadonlyArray<string>; readonly id: string; readonly state: "[]\n" }
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
  input = "",
): Promise<ProcessResult> =>
  new Promise((resolve, reject) => {
    const [command, ...args] = argv
    if (command === undefined) {
      reject(new Error("E2E subprocess requires an executable"))
      return
    }
    const child = spawn(command, args, { cwd, env: environment, shell: false, stdio: ["pipe", "pipe", "pipe"] })
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
    child.stdin.end(input)
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

const generationRoot = createRequire(import.meta.url)
  .resolve("@effectify/app-builder-generation")
  .replace(/\/dist\/.*$/, "")
const packageRoots = ["contracts", "generation", "cli"].map((name) => join(dirname(generationRoot), name))

const installCli = async (workspace: string, registry: string, environment: NodeJS.ProcessEnv) => {
  const tarballs: Array<string> = []
  for (const root of packageRoots) {
    const packed = await run(root, ["pnpm", "pack", "--pack-destination", join(workspace, "distribution")], environment)
    if (packed.exitCode !== 0) throw new Error(`Unable to pack public CLI dependency: ${packed.stderr}`)
    const tarball = packed.stdout.trim().split("\n").at(-1)
    if (tarball === undefined) throw new Error("Package distribution did not produce a tarball")
    tarballs.push(tarball)
  }
  const driver = join(workspace, "driver")
  await write(join(driver, "package.json"), '{"private":true}\n')
  const argv = ["npm", "install", "--registry", registry, ...tarballs, "effect@4.0.0-beta.102"]
  const result = await run(driver, argv, environment)
  if (result.exitCode !== 0) throw new Error(`Unable to install public CLI: ${result.stderr}${result.stdout}`)
  return { argv, cli: join(driver, "node_modules/.bin/effectify-app-builder"), result }
}

const generate = async (workspace: string, cli: string, environment: NodeJS.ProcessEnv) => {
  const argv = [cli, "generate", "--events=jsonl"]
  const result = await run(
    tmpdir(),
    argv,
    environment,
    commandTimeout,
    `${JSON.stringify({
      version: "effectify.app-builder-cli-request/1",
      command: "generate",
      payload: { intent, workspace: basename(workspace) },
    })}\n`,
  )
  if (result.exitCode !== 0) throw new Error(`Public CLI generation failed: ${result.stderr}${result.stdout}`)
  const terminal = JSON.parse(result.stdout.trim().split("\n").at(-1) ?? "null") as {
    readonly terminal?: {
      readonly _tag?: string
      readonly result?: { readonly writtenPaths?: ReadonlyArray<string> }
    }
  }
  if (terminal.terminal?._tag !== "Success" || terminal.terminal.result?.writtenPaths === undefined) {
    throw new Error("Public CLI generation did not return successful materialization evidence")
  }
  return { argv, result, writtenPaths: terminal.terminal.result.writtenPaths }
}

const runtimeProof = `
const { readFile } = await import("node:fs/promises")
const Effect = await import("effect/Effect")
const { createLiveRuntime, renderEvent } = await import("./src/index.ts")
const evidence = await Effect.runPromise(Effect.gen(function* () {
  const task = yield* createLiveRuntime(".task-state.json")
  const added = yield* task.add("write the public proof")
  const completed = yield* task.complete(added.id)
  const removed = yield* task.remove(added.id)
  return { id: added.id, events: [renderEvent({ _tag: "TaskAdded", task: added }), renderEvent({ _tag: "TaskCompleted", task: completed }), renderEvent({ _tag: "TaskRemoved", task: removed })], remaining: yield* task.list(), state: yield* Effect.promise(() => readFile(".task-state.json", "utf8")) }
}))
console.log(JSON.stringify(evidence))
`

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

const verdaccioPath = fileURLToPath(
  new URL(
    "../../../../node_modules/.pnpm/verdaccio@6.7.4_encoding@0.1.13_typanion@3.14.0/node_modules/verdaccio/bin/verdaccio",
    import.meta.url,
  ),
)

/** Runs a real installed public CLI proof and removes its isolated registry and files. */
export const runGoldenNestedWorkspace = async (): Promise<GoldenWorkspaceEvidence> => {
  const workspace = await mkdtemp(join(tmpdir(), "effectify-app-builder-e2e-"))
  const state: WorkspaceState = { environment: environmentFor(workspace), store: join(workspace, "pnpm-store") }
  const commands: Array<CommandEvidence> = []
  let registry: ChildProcess | undefined
  let regeneration = { changedPaths: [] as ReadonlyArray<string>, secondWritePaths: [] as ReadonlyArray<string> }
  let task = { events: [] as ReadonlyArray<string>, id: "", state: "[]\n" as const }
  let cleanup = { daemonStopped: false, storeRemoved: false, workspaceRemoved: false }

  try {
    await mkdir(state.environment.HOME!, { recursive: true })
    const port = await freePort()
    const config = join(workspace, "registry/config.yaml")
    await write(config, registryConfig(workspace))
    registry = spawn(process.execPath, [verdaccioPath, "--config", config, "--listen", `127.0.0.1:${port}`], {
      cwd: workspace,
      env: state.environment,
      shell: false,
      stdio: "ignore",
    })
    const registryUrl = `http://127.0.0.1:${port}`
    await waitForRegistry(registryUrl)

    const installed = await installCli(workspace, registryUrl, state.environment)
    commands.push({ argv: installed.argv, exitCode: installed.result.exitCode, label: "cli-install" })
    const firstGeneration = await generate(workspace, installed.cli, state.environment)
    commands.push({ argv: firstGeneration.argv, exitCode: firstGeneration.result.exitCode, label: "generate" })

    const registryArgs = ["--store-dir", state.store, "--registry", registryUrl]
    const lock = await run(workspace, ["pnpm", "install", "--lockfile-only", ...registryArgs], state.environment)
    if (lock.exitCode !== 0) throw new Error(`Nested lockfile materialization failed: ${lock.stderr}${lock.stdout}`)
    const installArgv = ["pnpm", "install", "--frozen-lockfile", ...registryArgs]
    const install = await run(workspace, installArgv, state.environment)
    commands.push({ argv: installArgv, exitCode: install.exitCode, label: "install" })
    if (install.exitCode !== 0) throw new Error(`Nested frozen install failed: ${install.stderr}${install.stdout}`)

    {
      const graphArgv = ["pnpm", "exec", "nx", "graph", "--print"]
      const graph = await run(workspace, graphArgv, state.environment)
      commands.push({ argv: graphArgv, exitCode: graph.exitCode, label: "graph" })
      if (graph.exitCode !== 0) throw new Error(`Nested Nx graph failed: ${graph.stderr}`)
      const projectNames = Object.keys(
        (JSON.parse(graph.stdout) as { readonly graph: { readonly nodes: Record<string, unknown> } }).graph.nodes,
      ).sort()
      const expectedProjects = [
        "@acme/admin-console",
        "@acme/operations-application",
        "@acme/operations-domain",
        "@acme/operations-infrastructure",
      ]
      if (JSON.stringify(projectNames) !== JSON.stringify(expectedProjects)) {
        throw new Error(`Nested Nx graph did not match the expected projects: ${JSON.stringify(projectNames)}`)
      }

      for (const label of ["test", "typecheck", "build"] as const) {
        const argv = ["pnpm", "exec", "nx", "run", `@acme/admin-console:${label}`]
        const result = await run(workspace, argv, state.environment)
        commands.push({ argv, exitCode: result.exitCode, label })
        if (result.exitCode !== 0) throw new Error(`Nested ${label} failed: ${result.stderr}`)
      }
      const runtimeArgv = [process.execPath, "--input-type=module", "--eval", runtimeProof]
      const runtime = await run(join(workspace, "apps/admin-console"), runtimeArgv, state.environment)
      commands.push({ argv: runtimeArgv, exitCode: runtime.exitCode, label: "runtime" })
      if (runtime.exitCode !== 0) throw new Error(`Generated Live runtime failed: ${runtime.stderr}`)
      const runtimeEvidence = JSON.parse(runtime.stdout) as {
        readonly events: ReadonlyArray<string>
        readonly id: string
        readonly remaining: ReadonlyArray<unknown>
        readonly state: "[]\n"
      }
      if (runtimeEvidence.remaining.length !== 0) throw new Error("Generated Live runtime did not remove the Task")

      const beforeReplay = await snapshot(workspace, firstGeneration.writtenPaths)
      const secondGeneration = await generate(workspace, installed.cli, state.environment)
      commands.push({ argv: secondGeneration.argv, exitCode: secondGeneration.result.exitCode, label: "replay" })
      const afterReplay = await snapshot(workspace, firstGeneration.writtenPaths)
      regeneration = {
        changedPaths: firstGeneration.writtenPaths.filter((path) => beforeReplay[path] !== afterReplay[path]),
        secondWritePaths: secondGeneration.writtenPaths,
      }
      task = { events: runtimeEvidence.events, id: runtimeEvidence.id, state: runtimeEvidence.state }
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
  if (rootProjectNames.some((name) => name.startsWith("@acme/"))) {
    throw new Error("Nested generated projects polluted root Nx discovery")
  }
  if (!cleanup.daemonStopped || !cleanup.storeRemoved || !cleanup.workspaceRemoved) {
    throw new Error("Nested E2E cleanup did not remove all isolated resources")
  }
  return { cleanup, commands, outcome: "success", regeneration, rootProjectNames, task }
}
