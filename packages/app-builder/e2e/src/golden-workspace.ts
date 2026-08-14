import { spawn, type ChildProcess } from "node:child_process"
import { appendFile, mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises"
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

type Scenario = "interrupted" | "success" | "verification-failure"

export interface CommandEvidence {
  readonly argv: ReadonlyArray<string>
  readonly exitCode: number
  readonly label: string
  readonly output?: string
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
  readonly task: { readonly events: ReadonlyArray<string>; readonly id: string; readonly state: "[]\n" }
  readonly termination?: TerminationEvidence
}

interface ProcessResult {
  readonly exitCode: number
  readonly stderr: string
  readonly stdout: string
  readonly termination?: TerminationEvidence
}

interface TerminationEvidence {
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

interface WorkspaceState {
  readonly environment: NodeJS.ProcessEnv
  readonly store: string
}

const exists = async (path: string): Promise<boolean> =>
  stat(path)
    .then(() => true)
    .catch(() => false)

const sleep = (milliseconds: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, milliseconds))

class ProcessTimeoutError extends Error {}

const waitForClose = <Value>(closed: Promise<Value>, timeout: number): Promise<Value> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      clearTimeout(timer)
      reject(new ProcessTimeoutError(`Process did not close within ${timeout}ms`))
    }, timeout)
    closed.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error: unknown) => {
        clearTimeout(timer)
        reject(error)
      },
    )
  })

const isAbsent = (error: unknown): boolean =>
  typeof error === "object" && error !== null && Reflect.get(error, "code") === "ESRCH"

const signalGroup = (pgid: number, signal: NodeJS.Signals): boolean => {
  try {
    process.kill(-pgid, signal)
    return true
  } catch (error) {
    if (isAbsent(error)) return false
    throw error
  }
}

const processExists = (pid: number): boolean => {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    if (isAbsent(error)) return false
    if (typeof error === "object" && error !== null && Reflect.get(error, "code") === "EPERM") return true
    throw error
  }
}

const waitUntil = async (predicate: () => boolean, timeout: number): Promise<boolean> => {
  const deadline = Date.now() + timeout
  while (!predicate()) {
    if (Date.now() >= deadline) return false
    await sleep(25)
  }
  return true
}

const waitForReadiness = async (path: string, assertRunning: () => void): Promise<number> => {
  const deadline = Date.now() + commandTimeout
  while (Date.now() < deadline) {
    assertRunning()
    try {
      const value = JSON.parse(await readFile(path, "utf8")) as { readonly descendantPid?: unknown }
      if (typeof value.descendantPid === "number" && value.descendantPid > 0) return value.descendantPid
    } catch {
      // The generated Vitest test has not completed its descendant handshake yet.
    }
    await sleep(25)
  }
  throw new Error("Generated Vitest workflow did not publish deterministic readiness evidence")
}

const terminateGroup = async (
  pgid: number,
  directClose: Promise<unknown>,
  isDirectChildClosed: () => boolean,
  readinessObserved: boolean,
  descendantPid?: number,
): Promise<TerminationEvidence> => {
  const termSent = signalGroup(pgid, "SIGTERM")
  let groupGone = await waitUntil(() => !processExists(-pgid), shutdownTimeout)
  const escalated = !groupGone
  const directChildClosedBeforeKill = isDirectChildClosed()
  let killSent = false
  if (escalated) {
    killSent = signalGroup(pgid, "SIGKILL")
    groupGone = await waitUntil(() => !processExists(-pgid), shutdownTimeout)
  }
  const directChildClosed = await waitForClose(directClose, shutdownTimeout).then(
    () => true,
    (error) => {
      if (error instanceof ProcessTimeoutError) return false
      throw error
    },
  )
  const descendantGone =
    descendantPid === undefined || (await waitUntil(() => !processExists(descendantPid), shutdownTimeout))
  return {
    descendantPid,
    descendantGone,
    directChildClosed,
    directChildClosedBeforeKill,
    escalated,
    groupId: pgid,
    groupGone,
    killSent,
    readinessObserved,
    stopped: directChildClosed && groupGone && descendantGone,
    termSent,
  }
}

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

const run = async (
  cwd: string,
  argv: ReadonlyArray<string>,
  environment: NodeJS.ProcessEnv,
  timeout = commandTimeout,
  input = "",
  readinessPath?: string,
): Promise<ProcessResult> => {
  const [command, ...args] = argv
  if (command === undefined) throw new Error("E2E subprocess requires an executable")
  const child = spawn(command, args, {
    cwd,
    detached: true,
    env: environment,
    shell: false,
    stdio: ["pipe", "pipe", "pipe"],
  })
  let directChildClosed = false
  let childError: unknown
  const closed = new Promise<number | null>((resolve, reject) => {
    child.once("error", (error) => {
      childError = error
      reject(error)
    })
    child.once("close", (code) => {
      directChildClosed = true
      resolve(code)
    })
  })
  void closed.catch(() => undefined)
  if (child.pid === undefined) {
    await closed
    throw new Error("E2E subprocess did not expose a process-group identifier")
  }
  const pgid = child.pid
  let stdout = ""
  let stderr = ""
  child.stdout.setEncoding("utf8")
  child.stderr.setEncoding("utf8")
  child.stdout.on("data", (chunk: string) => {
    stdout += chunk
  })
  child.stderr.on("data", (chunk: string) => {
    stderr += chunk
  })
  child.stdin.end(input)

  if (readinessPath !== undefined) {
    let descendantPid: number
    try {
      descendantPid = await waitForReadiness(readinessPath, () => {
        if (childError !== undefined) throw childError
        if (directChildClosed) throw new Error("Generated Vitest workflow closed before publishing readiness evidence")
      })
    } catch (error) {
      const cleanup = await terminateGroup(pgid, closed, () => directChildClosed, false)
      if (!cleanup.stopped)
        throw new Error(`Unready generated workflow process group did not stop: ${JSON.stringify(cleanup)}`)
      throw error
    }
    const termination = await terminateGroup(pgid, closed, () => directChildClosed, true, descendantPid)
    if (!termination.stopped)
      throw new Error(`Generated workflow process group did not stop: ${JSON.stringify(termination)}`)
    return { exitCode: 130, stderr, stdout, termination }
  }

  try {
    const completed = await waitForClose(closed, timeout)
    return { exitCode: completed ?? 1, stderr, stdout }
  } catch (error) {
    const termination = await terminateGroup(pgid, closed, () => directChildClosed, false)
    if (!termination.stopped) throw new Error(`Failed process group did not stop: ${JSON.stringify(termination)}`)
    throw error
  }
}

export const runGoldenCommandTimeout = (timeout = 50): Promise<ProcessResult> =>
  run(
    tmpdir(),
    [process.execPath, "-e", 'require("node:net").createServer().listen(0, "127.0.0.1")'],
    process.env,
    timeout,
  )

const stop = async (child: ChildProcess): Promise<boolean> => {
  if (child.pid === undefined) return true
  const pgid = child.pid
  if (!processExists(-pgid)) return true
  signalGroup(pgid, "SIGTERM")
  if (await waitUntil(() => !processExists(-pgid), shutdownTimeout)) return true
  signalGroup(pgid, "SIGKILL")
  return waitUntil(() => !processExists(-pgid), shutdownTimeout)
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
export const runGoldenNestedWorkspace = async ({
  scenario = "success",
}: { readonly scenario?: Scenario } = {}): Promise<GoldenWorkspaceEvidence> => {
  const workspace = await mkdtemp(join(tmpdir(), "effectify-app-builder-e2e-"))
  const state: WorkspaceState = { environment: environmentFor(workspace), store: join(workspace, "pnpm-store") }
  const commands: Array<CommandEvidence> = []
  let registry: ChildProcess | undefined
  let outcome = scenario
  let regeneration = { changedPaths: [] as ReadonlyArray<string>, secondWritePaths: [] as ReadonlyArray<string> }
  let task = { events: [] as ReadonlyArray<string>, id: "", state: "[]\n" as const }
  let termination: TerminationEvidence | undefined
  let cleanup = { daemonStopped: false, storeRemoved: false, workspaceRemoved: false }

  try {
    await mkdir(state.environment.HOME!, { recursive: true })
    const port = await freePort()
    const config = join(workspace, "registry/config.yaml")
    await write(config, registryConfig(workspace))
    registry = spawn(process.execPath, [verdaccioPath, "--config", config, "--listen", `127.0.0.1:${port}`], {
      cwd: workspace,
      detached: true,
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

    if (scenario === "verification-failure") {
      await appendFile(join(workspace, "apps/admin-console/src/index.ts"), "\nexport const invalidProof: string = 1\n")
      const argv = ["pnpm", "exec", "nx", "run", "@acme/admin-console:typecheck"]
      const failure = await run(workspace, argv, state.environment)
      commands.push({
        argv,
        exitCode: failure.exitCode,
        label: "verification-failure",
        output: `${failure.stdout}${failure.stderr}`,
      })
      const output = `${failure.stdout}${failure.stderr}`
      if (failure.exitCode === 0 || !output.includes("src/index.ts") || !output.includes("TS2322")) {
        throw new Error("Generated Nx typecheck did not report the intentional TypeScript corruption")
      }
    } else if (scenario === "interrupted") {
      const ready = join(workspace, ".interruption-ready.json")
      await appendFile(
        join(workspace, "apps/admin-console/tests/task.test.ts"),
        `\nit("publishes interruption readiness", async () => {\n  const { spawn } = await import("node:child_process")\n  const descendant = spawn(process.execPath, ["-e", ${JSON.stringify(`const { writeFileSync } = require("node:fs"); const { createServer } = require("node:net"); process.on("SIGTERM", () => {}); createServer().listen(0, "127.0.0.1", () => writeFileSync(${JSON.stringify(ready)}, JSON.stringify({ descendantPid: process.pid })))`)}], { stdio: "ignore" })\n  if (descendant.pid === undefined) throw new Error("resistant descendant did not start")\n  await new Promise((resolve) => descendant.once("exit", resolve))\n})\n`,
      )
      const argv = ["pnpm", "exec", "nx", "run", "@acme/admin-console:test"]
      const interrupted = await run(workspace, argv, state.environment, commandTimeout, "", ready)
      termination = interrupted.termination
      commands.push({ argv, exitCode: interrupted.exitCode, label: "interruption" })
      if (interrupted.exitCode !== 130 || termination?.stopped !== true || termination.escalated !== true) {
        throw new Error(
          `Generated Vitest interruption lacked truthful termination evidence: ${JSON.stringify(termination)}`,
        )
      }
    } else {
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
  if (rootProjectNames.some((name) => name.startsWith("@acme/"))) {
    throw new Error("Nested generated projects polluted root Nx discovery")
  }
  if (!cleanup.daemonStopped || !cleanup.storeRemoved || !cleanup.workspaceRemoved) {
    throw new Error("Nested E2E cleanup did not remove all isolated resources")
  }
  return { cleanup, commands, outcome, regeneration, rootProjectNames, task, termination }
}
