import { beforeEach, describe, expect, it, vi } from "vitest"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as Layer from "effect/Layer"
import * as ManagedRuntime from "effect/ManagedRuntime"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import { TestClock } from "effect/testing"
import { CronExpression, Hatchet, makeCronId, Task } from "@effectify/hatchet"
import { verifyCronAbsent } from "../../src/internal/live.js"

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
    list: vi.fn(async (_options: unknown): Promise<unknown> => ({ rows: [] })),
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

const cronRow = (id: string) => ({
  metadata: { id },
  workflowName: "upper",
  name: "daily-upper",
  cron: "0 0 * * *",
  enabled: true,
  method: "DEFAULT",
})

const createDailyCron = (schedule: CronExpression.CronExpression) =>
  Hatchet.createCron(upper, {
    name: "daily-upper",
    schedule,
    input: { value: "scheduled" },
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
    const runIdFailure = Object.assign(new Error("run-id-token"), {
      status: 503,
    })
    const cancelFailure = new Error("cancel-token")
    if (kind === "empty ID") sdk.cancel.mockRejectedValueOnce(cancelFailure)
    let rejectRunId: ((reason: unknown) => void) | undefined
    const runId = kind === "empty ID"
      ? Promise.resolve("")
      : new Promise<string>((_, reject) => (rejectRunId = reject))
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
    expect("originalCause" in error).toBe(false)
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

    const schedule = await Effect.runPromise(CronExpression.parse("0 0 * * *"))
    const created = await runtime.runPromise(
      Hatchet.createCron(upper, {
        name: "daily-upper",
        schedule,
        input: { value: "scheduled" },
      }),
    )
    expect(created).toMatchObject({ id: "cron-42", taskName: "upper" })
    expect(sdk.crons.create).toHaveBeenCalledWith("upper", {
      name: "daily-upper",
      expression: "0 0 * * *",
      input: { value: "scheduled" },
    })
    sdk.crons.get.mockRejectedValueOnce({ response: { status: 404 } })
    sdk.crons.delete.mockRejectedValueOnce({ response: { status: 404 } })
    await expect(
      runtime.runPromise(Hatchet.getCron(created.id)),
    ).resolves.toMatchObject({
      _tag: "None",
    })
    await expect(
      runtime.runPromise(Hatchet.deleteCron(created.id)),
    ).resolves.toBe(false)
    expect(sdk.crons.list).not.toHaveBeenCalled()

    await runtime.dispose()
  })

  it("recovers an ambiguous cron create failure when exactly one matching cron exists", async () => {
    const runtime = ManagedRuntime.make(layer())
    sdk.crons.create.mockRejectedValueOnce({
      response: { status: 503, data: "create-secret" },
    })
    sdk.crons.list.mockResolvedValueOnce({
      rows: [
        cronRow("cron-recovered"),
        { ...cronRow("cron-unrelated"), name: "other-cron" },
      ],
    })
    const schedule = await Effect.runPromise(CronExpression.parse("0 0 * * *"))

    const created = await runtime.runPromise(createDailyCron(schedule))

    expect(created).toMatchObject({
      id: "cron-recovered",
      taskName: "upper",
      name: "daily-upper",
    })
    expect(sdk.crons.create).toHaveBeenCalledOnce()
    expect(sdk.crons.list).toHaveBeenCalledExactlyOnceWith({
      workflowName: "upper",
      cronName: "daily-upper",
      offset: 0,
      limit: 2,
    })
    await runtime.dispose()
  })

  it("preserves an ambiguous cron create failure when no matching cron exists", async () => {
    const runtime = ManagedRuntime.make(layer())
    sdk.crons.create.mockRejectedValueOnce({
      response: { status: 503, data: "create-secret" },
    })
    sdk.crons.list.mockResolvedValueOnce({
      rows: [{ ...cronRow("cron-unrelated"), workflowName: "other-task" }],
    })
    const schedule = await Effect.runPromise(CronExpression.parse("0 0 * * *"))

    const error = await runtime.runPromise(
      createDailyCron(schedule).pipe(Effect.flip),
    )

    expect(error).toMatchObject({
      _tag: "HatchetSdkError",
      operation: "cron.create",
      reason: "Unavailable",
    })
    expect(JSON.stringify(error)).not.toContain("create-secret")
    expect(sdk.crons.create).toHaveBeenCalledOnce()
    expect(sdk.crons.list).toHaveBeenCalledExactlyOnceWith({
      workflowName: "upper",
      cronName: "daily-upper",
      offset: 0,
      limit: 2,
    })
    await runtime.dispose()
  })

  it("preserves an ambiguous cron create failure when multiple matching crons exist", async () => {
    const runtime = ManagedRuntime.make(layer())
    sdk.crons.create.mockRejectedValueOnce({
      response: { status: 503, data: "create-secret" },
    })
    sdk.crons.list.mockResolvedValueOnce({
      rows: [cronRow("cron-first"), cronRow("cron-second")],
    })
    const schedule = await Effect.runPromise(CronExpression.parse("0 0 * * *"))

    const error = await runtime.runPromise(
      createDailyCron(schedule).pipe(Effect.flip),
    )

    expect(error).toMatchObject({
      _tag: "HatchetSdkError",
      operation: "cron.create",
      reason: "Unavailable",
    })
    expect(JSON.stringify(error)).not.toContain("create-secret")
    expect(sdk.crons.create).toHaveBeenCalledOnce()
    expect(sdk.crons.list).toHaveBeenCalledExactlyOnceWith({
      workflowName: "upper",
      cronName: "daily-upper",
      offset: 0,
      limit: 2,
    })
    await runtime.dispose()
  })

  it("treats a failed cron delete as absent only when a safe list proves absence", async () => {
    const runtime = ManagedRuntime.make(layer())
    const deletionFailure = {
      response: { status: 500, data: "delete-secret" },
    }
    sdk.crons.delete.mockRejectedValueOnce(deletionFailure)
    sdk.crons.list.mockResolvedValueOnce({ rows: [] })

    const cronId = makeCronId("cron-42")
    await expect(runtime.runPromise(Hatchet.deleteCron(cronId))).resolves.toBe(
      false,
    )
    expect(sdk.crons.delete).toHaveBeenCalledExactlyOnceWith(cronId)
    expect(sdk.crons.list).toHaveBeenCalledExactlyOnceWith({
      offset: 0,
      limit: 100,
    })
    expect(sdk.crons.get).not.toHaveBeenCalled()
    await runtime.dispose()
  })

  it("preserves the delete failure when the cron is still listed", async () => {
    const runtime = ManagedRuntime.make(layer())
    sdk.crons.delete.mockRejectedValueOnce({
      response: { status: 500, data: "delete-secret" },
    })
    sdk.crons.list.mockResolvedValueOnce({
      rows: [{ metadata: { id: "cron-42" } }],
    })

    const error = await runtime.runPromise(
      Hatchet.deleteCron(makeCronId("cron-42")).pipe(Effect.flip),
    )

    expect(error).toMatchObject({
      _tag: "HatchetSdkError",
      operation: "cron.delete",
      resourceId: "cron-42",
      reason: "Unavailable",
    })
    expect("originalCause" in error).toBe(false)
    expect(JSON.stringify(error)).not.toContain("delete-secret")
    await runtime.dispose()
  })

  it.each([
    ["malformed", { rows: "verification-secret" }],
    ["missing rows", { verification: "verification-secret" }],
    ["malformed row", { rows: [{ metadata: { id: 42 } }] }],
  ])("preserves the delete failure when the cron list is %s", async (_kind, response) => {
    const runtime = ManagedRuntime.make(layer())
    sdk.crons.delete.mockRejectedValueOnce({
      response: { status: 500, data: "delete-secret" },
    })
    sdk.crons.list.mockResolvedValueOnce(response)

    const error = await runtime.runPromise(
      Hatchet.deleteCron(makeCronId("cron-42")).pipe(Effect.flip),
    )

    expect(error).toMatchObject({
      _tag: "HatchetSdkError",
      operation: "cron.delete",
      resourceId: "cron-42",
      reason: "Unavailable",
    })
    expect(JSON.stringify(error)).not.toMatch(
      /delete-secret|verification-secret/,
    )
    await runtime.dispose()
  })

  it("preserves the delete failure when cron list verification fails", async () => {
    const runtime = ManagedRuntime.make(layer())
    sdk.crons.delete.mockRejectedValueOnce({
      response: { status: 500, data: "delete-secret" },
    })
    sdk.crons.list.mockRejectedValueOnce({
      response: { status: 503, data: "list-secret" },
    })

    const error = await runtime.runPromise(
      Hatchet.deleteCron(makeCronId("cron-42")).pipe(Effect.flip),
    )

    expect(error).toMatchObject({
      _tag: "HatchetSdkError",
      operation: "cron.delete",
      resourceId: "cron-42",
      reason: "Unavailable",
    })
    expect(JSON.stringify(error)).not.toMatch(/delete-secret|list-secret/)
    await runtime.dispose()
  })

  it("preserves the delete failure when cron list verification times out", async () => {
    sdk.crons.delete.mockRejectedValueOnce({
      response: { status: 500, data: "delete-secret" },
    })

    const error = await Effect.runPromise(
      Effect.gen(function*() {
        const listStarted = yield* Deferred.make<void>()
        sdk.crons.list.mockImplementationOnce(() => {
          Effect.runSync(Deferred.succeed(listStarted, undefined))
          return new Promise<unknown>(() => undefined)
        })
        const fiber = yield* Hatchet.deleteCron(makeCronId("cron-42")).pipe(
          Effect.flip,
          Effect.forkChild,
        )
        yield* Deferred.await(listStarted)
        expect(sdk.crons.list).toHaveBeenCalledExactlyOnceWith({
          offset: 0,
          limit: 100,
        })
        yield* TestClock.adjust("5 seconds")
        return yield* Fiber.join(fiber)
      }).pipe(
        Effect.provide(Layer.merge(layer(), TestClock.layer())),
        Effect.scoped,
      ),
    )

    expect(error).toMatchObject({
      _tag: "HatchetSdkError",
      operation: "cron.delete",
      resourceId: "cron-42",
      reason: "Unavailable",
    })
    expect(JSON.stringify(error)).not.toContain("delete-secret")
  })

  it.each(
    [
      ["offset", -1],
      ["limit", 0],
    ] as const,
  )("rejects invalid cron %s before the SDK call", async (field, value) => {
    const runtime = ManagedRuntime.make(layer())

    await expect(
      runtime.runPromise(Hatchet.listCrons({ [field]: value })),
    ).rejects.toMatchObject({ _tag: "InvalidCronFilterError", field })
    expect(sdk.crons.list).not.toHaveBeenCalled()
    await runtime.dispose()
  })

  it("paginates failed-delete absence verification safely", async () => {
    const page = (ids: ReadonlyArray<string>, pagination?: unknown) => ({
      rows: ids.map((id) => ({ metadata: { id } })),
      ...(pagination === undefined ? {} : { pagination }),
    })
    const full = page(
      Array.from({ length: 100 }, (_, index) => `other-${index}`),
    )
    const paginated = [
      page([], { current_page: 1, next_page: 2, num_pages: 2 }),
      page(["cron-42"], { current_page: 2, num_pages: 2 }),
    ]
    const cases = [
      [paginated, false, [0, 100]],
      [[page([], { current_page: 1, num_pages: 1 })], true, [0]],
      [[full, page([])], true, [0, 100]],
      [
        [page([], { current_page: 1, next_page: "2", num_pages: 2 })],
        false,
        [0],
      ],
      [[page([], { current_page: 1, next_page: 1, num_pages: 2 })], false, [0]],
      [[full, full], false, [0, 100], 2],
    ] as const
    for (const [responses, absent, offsets, maxPages] of cases) {
      const list = vi.fn()
      for (const response of responses) list.mockResolvedValueOnce(response)
      await expect(verifyCronAbsent(list, "cron-42", maxPages)).resolves.toBe(
        absent,
      )
      expect(list.mock.calls.map(([query]) => query)).toEqual(
        offsets.map((offset) => ({ offset, limit: 100 })),
      )
    }
  })
})
