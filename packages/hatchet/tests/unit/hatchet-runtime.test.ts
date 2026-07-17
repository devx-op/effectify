import { beforeEach, describe, expect, it, vi } from "vitest"
import * as ConfigProvider from "effect/ConfigProvider"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Layer from "effect/Layer"
import * as ManagedRuntime from "effect/ManagedRuntime"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import { failureReason, Hatchet, makeRunId, Task } from "@effectify/hatchet"

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
      events.push(`register:${tasks.map((task) => task.name).join(",")}`)
    },
  )
  const worker = vi.fn(async (_name?: string, _options?: unknown) => {
    events.push("worker")
    return { registerWorkflows, start, waitUntilReady, stop }
  })
  const runNoWait = vi.fn(async () => ({
    runId: Promise.resolve("run-1"),
    output: Promise.resolve({ value: "done" }),
    cancel: vi.fn(async () => undefined),
  }))
  const task = vi.fn((declaration) => ({ ...declaration, runNoWait }))
  const scheduled = {
    create: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  }
  const runs = { cancel: vi.fn() }
  const crons = {
    create: vi.fn(async (name: string) => ({
      metadata: { id: "cron-1" },
      workflowName: name,
      cron: "0 0 * * *",
      enabled: true,
      method: "DEFAULT",
    })),
    get: vi.fn(),
    list: vi.fn(),
    delete: vi.fn(),
  }
  return {
    events,
    init: vi.fn(() => ({
      task,
      worker,
      crons,
      scheduled,
      runs,
    })),
    task,
    worker,
    registerWorkflows,
    start,
    waitUntilReady,
    stop,
    runNoWait,
    scheduled,
    runs,
    crons,
  }
})

vi.mock("@hatchet-dev/typescript-sdk", () => ({ Hatchet: { init: sdk.init } }))

const first = Task.make({
  name: "first-task",
  fn: (_input: undefined) => Effect.succeed("first"),
})
const second = Task.make({
  name: "second-task",
  fn: (_input: undefined) => Effect.succeed("second"),
})
const scheduledTask = Task.make({
  name: "scheduled-task",
  input: Schema.Struct({ value: Schema.NumberFromString }),
  fn: () => Effect.void,
})

const directLayer = () =>
  Hatchet.layer({
    tasks: [first, second, scheduledTask],
    options: {
      client: { token: Redacted.make("runtime-token") },
      worker: { name: "runtime-worker" },
    },
  })

const runtimeOf = <E>(layer: Layer.Layer<Hatchet.Hatchet, E>) => ManagedRuntime.make(layer)

const configuredTasks = (
  options: unknown,
): ReadonlyArray<{ readonly name: string }> => {
  if (
    typeof options !== "object" ||
    options === null ||
    !("workflows" in options) ||
    !Array.isArray(options.workflows)
  ) {
    return []
  }
  return options.workflows.filter(
    (value): value is { readonly name: string } =>
      typeof value === "object" &&
      value !== null &&
      "name" in value &&
      typeof value.name === "string",
  )
}

const failureOf = <E>(exit: Exit.Exit<unknown, E>): E => {
  if (!Exit.isFailure(exit)) throw new Error("expected failure")
  const failure = exit.cause.reasons.find((reason) => reason._tag === "Fail")
  if (failure?._tag !== "Fail") throw new Error("expected typed failure")
  return failure.error
}

describe("Hatchet lazy Layer", () => {
  beforeEach(() => {
    sdk.events.length = 0
    vi.clearAllMocks()
    sdk.init.mockImplementation(() => ({
      task: sdk.task,
      worker: sdk.worker,
      crons: sdk.crons,
      scheduled: sdk.scheduled,
      runs: sdk.runs,
    }))
    sdk.worker.mockImplementation(async (_name, options) => {
      sdk.events.push("worker")
      await sdk.registerWorkflows(configuredTasks(options))
      return {
        registerWorkflows: sdk.registerWorkflows,
        start: sdk.start,
        waitUntilReady: sdk.waitUntilReady,
        stop: sdk.stop,
      }
    })
    sdk.registerWorkflows.mockImplementation(async (tasks) => {
      sdk.events.push(`register:${tasks.map((task) => task.name).join(",")}`)
    })
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
    sdk.runNoWait.mockResolvedValue({
      runId: Promise.resolve("run-1"),
      output: Promise.resolve({ value: "done" }),
      cancel: vi.fn(async () => undefined),
    })
    sdk.crons.list.mockResolvedValue({ rows: [] })
  })

  it("acquires only lazy package state and does not read config or construct the SDK", async () => {
    const provider = ConfigProvider.fromEnv({ env: {} })
    const runtime = runtimeOf(
      Hatchet.layer({ tasks: [first] }).pipe(
        Layer.provide(ConfigProvider.layer(provider)),
      ),
    )

    await expect(
      runtime.runPromise(Effect.as(Hatchet.Hatchet, "ready")),
    ).resolves.toBe("ready")
    expect(sdk.init).not.toHaveBeenCalled()
    expect(sdk.worker).not.toHaveBeenCalled()

    const exit = await runtime.runPromiseExit(Hatchet.runNoWait(first, {}))
    expect(failureOf(exit)).toMatchObject({
      _tag: "HatchetConfigError",
      reason: "NotConfigured",
    })
    expect(sdk.init).not.toHaveBeenCalled()
    await runtime.dispose()
  })

  it("collapses concurrent first operations into one initialization and reuses it", async () => {
    const runtime = runtimeOf(directLayer())

    const [firstHandle, secondHandle] = await Promise.all([
      runtime.runPromise(Hatchet.runNoWait(first, {})),
      runtime.runPromise(Hatchet.runNoWait(second, {})),
    ])
    await runtime.runPromise(Hatchet.listCrons({ taskName: first.name }))

    expect([firstHandle.id, secondHandle.id]).toEqual(["run-1", "run-1"])
    expect(sdk.events.slice(0, 4)).toEqual([
      "worker",
      "register:first-task,second-task,scheduled-task",
      "start",
      "ready",
    ])
    expect(sdk.init).toHaveBeenCalledTimes(1)
    expect(sdk.worker).toHaveBeenCalledTimes(1)
    expect(sdk.start).toHaveBeenCalledTimes(1)
    await runtime.dispose()
    expect(sdk.stop).toHaveBeenCalledTimes(1)
  })

  it("delegates Task-native schedule controls to the SDK", async () => {
    const triggerAt = new Date("2030-01-02T03:04:05.000Z")
    const sdkSchedule = {
      metadata: { id: "schedule-1" },
      workflowName: scheduledTask.name,
      triggerAt: triggerAt.toISOString(),
    }
    sdk.scheduled.create.mockResolvedValueOnce(sdkSchedule)
    sdk.scheduled.get.mockRejectedValueOnce({ response: { status: 404 } })
    sdk.scheduled.delete.mockResolvedValueOnce(undefined)
    sdk.runs.cancel.mockResolvedValueOnce(undefined)
    const runtime = runtimeOf(directLayer())

    const schedule = await runtime.runPromise(
      Hatchet.schedule(scheduledTask, { value: 1 }, { _tag: "At", at: triggerAt }),
    )
    const missing = await runtime.runPromise(Hatchet.getSchedule(schedule.id))
    await expect(
      runtime.runPromise(Hatchet.deleteSchedule(schedule.id)),
    ).resolves.toBe(true)
    await runtime.runPromise(Hatchet.cancelRun(makeRunId("run-1")))

    expect(sdk.scheduled.create).toHaveBeenCalledExactlyOnceWith(scheduledTask.name, {
      triggerAt,
      input: { value: "1" },
    })
    expect(missing).toMatchObject({ _tag: "None" })
    expect(sdk.scheduled.delete).toHaveBeenCalledExactlyOnceWith(schedule.id)
    expect(sdk.runs.cancel).toHaveBeenCalledExactlyOnceWith({ ids: ["run-1"] })
    await runtime.dispose()
    expect(sdk.stop).toHaveBeenCalledOnce()
  })

  it("shares a failed concurrent attempt, cleans it, and retries on the next operation", async () => {
    const readinessFailure = Object.assign(new Error("connection refused"), {
      code: "ECONNREFUSED",
    })
    let releaseFailure: (() => void) | undefined
    sdk.waitUntilReady.mockImplementationOnce(
      () =>
        new Promise<void>((_resolve, reject) => {
          releaseFailure = () => reject(readinessFailure)
        }),
    )
    const runtime = runtimeOf(directLayer())

    const firstAttempt = Promise.all([
      runtime.runPromiseExit(Hatchet.runNoWait(first, {})),
      runtime.runPromiseExit(Hatchet.runNoWait(second, {})),
    ])
    await vi.waitFor(() => expect(releaseFailure).toBeTypeOf("function"))
    releaseFailure?.()
    const failed = await firstAttempt

    expect(failed.map(failureOf)).toEqual([
      expect.objectContaining({
        _tag: "HatchetSdkError",
        reason: "Unavailable",
      }),
      expect.objectContaining({
        _tag: "HatchetSdkError",
        reason: "Unavailable",
      }),
    ])
    expect(sdk.worker).toHaveBeenCalledTimes(1)
    expect(sdk.stop).toHaveBeenCalledTimes(1)

    await expect(
      runtime.runPromise(Hatchet.runNoWait(first, {})),
    ).resolves.toMatchObject({ id: "run-1" })
    expect(sdk.worker).toHaveBeenCalledTimes(2)
    await runtime.dispose()
    await runtime.dispose()
    expect(sdk.stop).toHaveBeenCalledTimes(2)
  })

  it("publishes one stable package classifier without serializing original causes", () => {
    const error = {
      _tag: "HatchetConfigError",
      reason: "NotConfigured" as const,
    }

    expect(failureReason(error)).toBe("NotConfigured")
    expect(failureReason({ response: { status: 401 } })).toBe("Unauthorized")
    expect(JSON.stringify(error)).not.toContain("missing secret token")
  })

  it("does not expose the removed Promise bridge", () => {
    expect(Hatchet).not.toHaveProperty("make")
    expect(Hatchet).not.toHaveProperty("toManaged")
  })
})
