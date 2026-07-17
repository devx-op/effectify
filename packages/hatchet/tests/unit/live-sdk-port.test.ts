import { beforeEach, describe, expect, it, vi } from "vitest"
import * as Effect from "effect/Effect"
import * as ManagedRuntime from "effect/ManagedRuntime"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import { Hatchet, Task } from "@effectify/hatchet"

const sdk = vi.hoisted(() => {
  const events: Array<string> = []
  const start = vi.fn(() => new Promise<void>(() => undefined))
  const waitUntilReady = vi.fn(async () => {
    events.push("ready")
  })
  const stop = vi.fn(async () => {
    events.push("stop")
  })
  const registerWorkflows = vi.fn(
    async (tasks: ReadonlyArray<{ readonly name: string }>) => {
      events.push(`declarations:${tasks.map((task) => task.name).join(",")}`)
    },
  )
  const worker = vi.fn(async (_name?: string, _options?: unknown) => {
    events.push("worker")
    return { registerWorkflows, start, waitUntilReady, stop }
  })
  const cancel = vi.fn(async () => undefined)
  const runNoWait = vi.fn(async (_input?: unknown) => ({
    runId: Promise.resolve("run-42"),
    output: Promise.resolve({ value: "DONE" }),
    cancel,
  }))
  const task = vi.fn((declaration) => ({ ...declaration, runNoWait }))
  const crons = {
    create: vi.fn(async (name: string) => ({
      metadata: { id: "cron-42" },
      workflowName: name,
      cron: "0 0 * * *",
      enabled: true,
      method: "DEFAULT",
    })),
    get: vi.fn(),
    list: vi.fn(async () => ({ rows: [] })),
    delete: vi.fn(),
  }
  return {
    events,
    init: vi.fn(() => ({
      task,
      worker,
      crons,
      scheduled: { create: vi.fn(), get: vi.fn(), delete: vi.fn() },
      runs: { cancel: vi.fn() },
    })),
    task,
    worker,
    registerWorkflows,
    start,
    waitUntilReady,
    stop,
    runNoWait,
    cancel,
    crons,
  }
})

vi.mock("@hatchet-dev/typescript-sdk", () => ({ Hatchet: { init: sdk.init } }))

const upper = Task.make({
  name: "upper",
  input: Schema.Struct({ value: Schema.String }),
  output: Schema.String,
  fn: ({ value }) => Effect.succeed(value.toUpperCase()),
})

const layer = (token = "test-token") =>
  Hatchet.layer({
    tasks: [upper],
    options: {
      client: { token: Redacted.make(token) },
      worker: { name: "test-worker" },
    },
  })

const context = (controller = new AbortController()) => ({
  workflowRunId: () => "workflow-1",
  taskRunExternalId: () => "task-1",
  abortController: controller,
})

type CallbackDeclaration = {
  readonly name: string
  readonly fn: (
    input: unknown,
    taskContext: ReturnType<typeof context>,
  ) => Promise<{ readonly value: string }>
}

const isCallbackDeclaration = (value: unknown): value is CallbackDeclaration =>
  typeof value === "object" &&
  value !== null &&
  "name" in value &&
  typeof value.name === "string" &&
  "fn" in value &&
  typeof value.fn === "function"

const configuredWorkflows = (options: unknown): ReadonlyArray<CallbackDeclaration> => {
  if (
    typeof options !== "object" ||
    options === null ||
    !("workflows" in options) ||
    !Array.isArray(options.workflows)
  ) {
    return []
  }
  return options.workflows.filter(isCallbackDeclaration)
}

describe("live SDK adapter behind Hatchet.layer", () => {
  beforeEach(() => {
    sdk.events.length = 0
    vi.clearAllMocks()
    sdk.start.mockImplementation(() => {
      sdk.events.push("start")
      return new Promise<void>(() => undefined)
    })
    sdk.waitUntilReady.mockImplementation(async () => {
      sdk.events.push("ready")
    })
    sdk.stop.mockImplementation(async () => {
      sdk.events.push("stop")
    })
    sdk.registerWorkflows.mockImplementation(async (tasks) => {
      sdk.events.push(
        `declarations:${tasks.map((task) => task.name).join(",")}`,
      )
    })
    sdk.worker.mockImplementation(async (_name, options) => {
      sdk.events.push("worker")
      await sdk.registerWorkflows(configuredWorkflows(options))
      return {
        registerWorkflows: sdk.registerWorkflows,
        start: sdk.start,
        waitUntilReady: sdk.waitUntilReady,
        stop: sdk.stop,
      }
    })
    sdk.runNoWait.mockResolvedValue({
      runId: Promise.resolve("run-42"),
      output: Promise.resolve({ value: "DONE" }),
      cancel: sdk.cancel,
    })
  })

  it.each(["", "   "])(
    "rejects an empty or whitespace token before SDK initialization",
    async (token) => {
      const runtime = ManagedRuntime.make(layer(token))

      const error = await runtime.runPromise(
        Hatchet.runNoWait(upper, { value: "done" }).pipe(Effect.flip),
      )

      expect(error).toMatchObject({
        _tag: "InvalidHatchetConfiguration",
        field: "client.token",
      })
      expect(String(error)).not.toContain(token === "" ? "test-token" : token)
      expect(sdk.init).not.toHaveBeenCalled()
      await runtime.dispose()
    },
  )

  it("loads declarations and starts one worker before the first operation", async () => {
    const runtime = ManagedRuntime.make(layer())

    const handle = await runtime.runPromise(
      Hatchet.runNoWait(upper, { value: "done" }),
    )
    await expect(runtime.runPromise(handle.await)).resolves.toBe("DONE")
    await runtime.runPromise(handle.cancel)

    expect(sdk.events.slice(0, 4)).toEqual([
      "worker",
      "declarations:upper",
      "start",
      "ready",
    ])
    expect(sdk.runNoWait).toHaveBeenCalledWith({ value: "done" })
    expect(sdk.cancel).toHaveBeenCalledOnce()

    await runtime.dispose()
    expect(sdk.stop).toHaveBeenCalledOnce()
  })

  it("keeps the configured worker callback alive while the first run awaits output", async () => {
    let activeWorkflows: ReadonlyArray<CallbackDeclaration> = []
    let finishStart: (() => void) | undefined

    sdk.worker.mockImplementation(async (_name, options) => {
      const workflows = configuredWorkflows(options)
      await sdk.registerWorkflows(workflows)
      return {
        registerWorkflows: sdk.registerWorkflows,
        start: vi.fn(() => {
          activeWorkflows = workflows
          return new Promise<void>((resolve) => {
            finishStart = resolve
          })
        }),
        waitUntilReady: sdk.waitUntilReady,
        stop: vi.fn(async () => {
          finishStart?.()
        }),
      }
    })
    sdk.runNoWait.mockImplementation(async (input: unknown) => ({
      runId: Promise.resolve("run-first"),
      output: activeWorkflows[0]
        ? Promise.resolve(activeWorkflows[0].fn(input, context()))
        : new Promise<{ readonly value: string }>(() => undefined),
      cancel: sdk.cancel,
    }))
    const runtime = ManagedRuntime.make(layer())

    await expect(
      runtime.runPromise(
        Hatchet.run(upper, { value: "first" }).pipe(
          Effect.timeout("100 millis"),
        ),
      ),
    ).resolves.toBe("FIRST")
    expect(sdk.registerWorkflows).toHaveBeenCalledOnce()

    await runtime.dispose()
  })

  it("executes SDK callbacks through the declarative Task", async () => {
    const runtime = ManagedRuntime.make(layer())
    await runtime.runPromise(Hatchet.runNoWait(upper, { value: "warm" }))

    const declaration = sdk.task.mock.calls[0]?.[0]
    await expect(
      declaration.fn({ value: "callback" }, context()),
    ).resolves.toEqual({
      value: "CALLBACK",
    })

    await runtime.dispose()
  })

  it("uses Task identity for cron creation", async () => {
    const runtime = ManagedRuntime.make(layer())

    await expect(
      runtime.runPromise(
        Hatchet.createCron(upper, {
          name: "daily-upper",
          expression: "0 0 * * *",
          input: { value: "scheduled" },
        }),
      ),
    ).resolves.toMatchObject({ id: "cron-42", taskName: "upper" })
    expect(sdk.crons.create).toHaveBeenCalledWith(
      "upper",
      expect.objectContaining({ input: { value: "scheduled" } }),
    )

    await runtime.dispose()
  })
})
