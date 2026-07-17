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
  output: Schema.NonEmptyString,
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

const configuredWorkflows = (
  options: unknown,
): ReadonlyArray<CallbackDeclaration> => {
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

  it.each([
    "",
    "   ",
  ])("rejects an empty or whitespace token before SDK initialization", async (token) => {
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
  })

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

  it("shares one cancellation outcome across repeated evaluations", async () => {
    const runtime = ManagedRuntime.make(layer())
    const successful = await runtime.runPromise(
      Hatchet.runNoWait(upper, { value: "done" }),
    )

    await runtime.runPromise(successful.cancel)
    await runtime.runPromise(successful.cancel)
    expect(sdk.cancel).toHaveBeenCalledOnce()

    const rejection = new Error("cancel rejected")
    sdk.cancel.mockRejectedValueOnce(rejection)
    const failing = await runtime.runPromise(
      Hatchet.runNoWait(upper, { value: "done" }),
    )
    const concurrent = await runtime.runPromise(
      Effect.all(
        [failing.cancel.pipe(Effect.flip), failing.cancel.pipe(Effect.flip)],
        { concurrency: "unbounded" },
      ),
    )
    const repeated = await runtime.runPromise(failing.cancel.pipe(Effect.flip))

    expect(sdk.cancel).toHaveBeenCalledTimes(2)
    expect(concurrent[1]).toBe(concurrent[0])
    expect(repeated).toBe(concurrent[0])
    await runtime.dispose()
  })

  it.each(
    [
      ["rejection", "Unavailable"],
      ["empty ID", "Unknown"],
    ] as const,
  )("compensates a run ID %s without replacing its error", async (kind, reason) => {
    const runIdFailure = Object.assign(new Error("run-id-token"), { status: 503 })
    const cancelFailure = new Error("cancel-token")
    if (kind === "empty ID") sdk.cancel.mockRejectedValueOnce(cancelFailure)
    let rejectRunId: ((reason: unknown) => void) | undefined
    const runId = kind === "empty ID" ? Promise.resolve("") : new Promise<string>(
      (_, reject) => rejectRunId = reject,
    )
    sdk.runNoWait.mockResolvedValueOnce({
      runId,
      output: Promise.resolve({ value: "DONE" }),
      cancel: sdk.cancel,
    })
    const runtime = ManagedRuntime.make(layer())

    const failure = runtime.runPromise(
      Hatchet.runNoWait(upper, { value: "done" }).pipe(Effect.flip),
    )
    await vi.waitFor(() => expect(sdk.runNoWait).toHaveBeenCalledOnce())
    rejectRunId?.(runIdFailure)
    const error = await failure

    expect(error).toMatchObject({
      _tag: "HatchetSdkError",
      operation: "run.runId",
      reason,
    })
    expect("originalCause" in error && error.originalCause).not.toBe(cancelFailure)
    if (kind === "rejection") {
      expect("originalCause" in error && error.originalCause).toBe(runIdFailure)
    }
    expect(JSON.stringify(error)).not.toMatch(/run-id-token|cancel-token/)
    expect(sdk.cancel).toHaveBeenCalledOnce()
    await runtime.dispose()
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

  it("returns the handle before output and permits independent Effect work", async () => {
    let resolveOutput:
      | ((value: { readonly value: string }) => void)
      | undefined
    const output = new Promise<{ readonly value: string }>((resolve) => {
      resolveOutput = resolve
    })
    sdk.runNoWait.mockResolvedValueOnce({
      runId: Promise.resolve("run-latched"),
      output,
      cancel: sdk.cancel,
    })
    const runtime = ManagedRuntime.make(layer())

    const handle = await runtime.runPromise(
      Hatchet.runNoWait(upper, { value: "done" }),
    )
    expect(sdk.cancel).not.toHaveBeenCalled()
    const independent = await runtime.runPromise(Effect.succeed("independent"))
    resolveOutput?.({ value: "DONE" })

    expect(independent).toBe("independent")
    await expect(runtime.runPromise(handle.await)).resolves.toBe("DONE")
    await runtime.dispose()
  })

  it("retains input and output Schema error phases", async () => {
    const runtime = ManagedRuntime.make(layer())

    const inputError = await runtime.runPromise(
      Hatchet.runNoWait(upper, { value: 42 }).pipe(Effect.flip),
    )
    sdk.runNoWait.mockResolvedValueOnce({
      runId: Promise.resolve("run-invalid-output"),
      output: Promise.resolve({ value: "" }),
      cancel: sdk.cancel,
    })
    const handle = await runtime.runPromise(
      Hatchet.runNoWait(upper, { value: "done" }),
    )
    const outputError = await runtime.runPromise(
      handle.await.pipe(Effect.flip),
    )

    expect(inputError).toMatchObject({
      _tag: "TaskSchemaError",
      phase: "input",
    })
    expect(outputError).toMatchObject({
      _tag: "TaskSchemaError",
      phase: "output",
    })
    await runtime.dispose()
  })

  it("maps dispatch, result, and cancellation failures without serializing SDK causes", async () => {
    const secret = "sdk-token-that-must-not-leak"
    const runtime = ManagedRuntime.make(layer())

    sdk.runNoWait.mockRejectedValueOnce(new Error(secret))
    const dispatchError = await runtime.runPromise(
      Hatchet.runNoWait(upper, { value: "done" }).pipe(Effect.flip),
    )
    expect(sdk.cancel).not.toHaveBeenCalled()

    let rejectOutput: ((reason: unknown) => void) | undefined
    const output = new Promise<{ readonly value: string }>(
      (_resolve, reject) => {
        rejectOutput = reject
      },
    )
    sdk.cancel.mockRejectedValueOnce(new Error(secret))
    sdk.runNoWait.mockResolvedValueOnce({
      runId: Promise.resolve("run-failing"),
      output,
      cancel: sdk.cancel,
    })
    const handle = await runtime.runPromise(
      Hatchet.runNoWait(upper, { value: "done" }),
    )
    const resultFailure = runtime.runPromise(handle.await.pipe(Effect.flip))
    rejectOutput?.(new Error(secret))
    const resultError = await resultFailure
    const cancelError = await runtime.runPromise(
      handle.cancel.pipe(Effect.flip),
    )

    for (
      const [error, operation] of [
        [dispatchError, "task.runNoWait"],
        [resultError, "run.output"],
        [cancelError, "run.cancel"],
      ] as const
    ) {
      expect(error).toMatchObject({ _tag: "HatchetSdkError", operation })
      expect(JSON.stringify(error)).not.toContain(secret)
    }
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
