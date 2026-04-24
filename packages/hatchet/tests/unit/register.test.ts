import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { describe, expect, it, vi } from "vitest"
import {
  HatchetClientService,
  HatchetError,
  registerWorkflow,
  registerWorkflowWithConfig,
  workflow,
} from "@effectify/hatchet"

type CapturedWorkflowInput = Record<string, unknown>
type CapturedTaskInput = Record<string, unknown>

const createRegisterHarness = () => {
  const capturedWorkflows: CapturedWorkflowInput[] = []
  const capturedTasks: CapturedTaskInput[] = []
  const createdTaskRefs: Record<string, { readonly name: string }> = {}
  const registerWorkflowMock = vi.fn(async () => undefined)
  const startMock = vi.fn(async () => undefined)
  const workerMock = vi.fn(async () => ({
    registerWorkflow: registerWorkflowMock,
    start: startMock,
  }))

  const hatchet = {
    workflow: vi.fn((input: CapturedWorkflowInput) => {
      capturedWorkflows.push(input)

      return {
        task: (taskInput: CapturedTaskInput) => {
          capturedTasks.push(taskInput)
          const taskRef = { name: String(taskInput.name) }
          createdTaskRefs[taskRef.name] = taskRef
          return taskRef
        },
      }
    }),
    worker: workerMock,
  }

  const clientLayer = Layer.succeed(HatchetClientService, hatchet as never)

  return {
    capturedWorkflows,
    capturedTasks,
    createdTaskRefs,
    hatchet,
    registerWorkflowMock,
    startMock,
    workerMock,
    clientLayer,
  }
}

describe("registerWorkflow", () => {
  it("converts workflow and task concurrency inputs before registering the workflow", async () => {
    const harness = createRegisterHarness()
    const workflowConcurrency = {
      expression: "input.userId",
      maxRuns: 1,
    } as const
    const taskConcurrency = [
      { expression: "input.accountId", maxRuns: 2 },
      { expression: "input.region", maxRuns: 3 },
    ] as const

    const wf = workflow({
      name: "orders.process",
      concurrency: workflowConcurrency as never,
    }).task(
      {
        name: "sync-order",
        concurrency: taskConcurrency as never,
      },
      Effect.succeed("ok"),
    )

    await registerWorkflow("orders-worker", wf, Layer.empty).pipe(
      Effect.provide(harness.clientLayer),
      Effect.runPromise,
    )

    expect(harness.capturedWorkflows).toHaveLength(1)
    expect(harness.capturedWorkflows[0]?.concurrency).toBe(workflowConcurrency)
    expect(harness.capturedTasks).toHaveLength(1)
    expect(harness.capturedTasks[0]?.concurrency).toEqual(taskConcurrency)
    expect(harness.capturedTasks[0]?.concurrency).not.toBe(taskConcurrency)
  })

  it("wires parent tasks to the previously registered task references", async () => {
    const harness = createRegisterHarness()

    const wf = workflow({ name: "orders.process" })
      .task({ name: "fetch-order" }, Effect.succeed("fetched"))
      .task(
        {
          name: "charge-order",
          parents: ["fetch-order", "missing-parent"],
        },
        Effect.succeed("charged"),
      )

    await registerWorkflow("orders-worker", wf, Layer.empty).pipe(
      Effect.provide(harness.clientLayer),
      Effect.runPromise,
    )

    expect(harness.capturedTasks).toHaveLength(2)
    expect(harness.capturedTasks[1]?.parents).toEqual([
      harness.createdTaskRefs["fetch-order"],
    ])
  })

  it("converts task rate limits without changing the public duration values", async () => {
    const harness = createRegisterHarness()

    const wf = workflow({ name: "orders.process" }).task(
      {
        name: "email-customer",
        rateLimits: [
          {
            units: 1,
            key: "tenant:email",
            limit: 10,
            duration: "1 minute",
          },
        ],
      },
      Effect.succeed("sent"),
    )

    await registerWorkflow("orders-worker", wf, Layer.empty).pipe(
      Effect.provide(harness.clientLayer),
      Effect.runPromise,
    )

    expect(harness.capturedTasks[0]?.rateLimits).toEqual([
      {
        units: 1,
        key: "tenant:email",
        staticKey: undefined,
        dynamicKey: undefined,
        limit: 10,
        duration: "1 minute",
      },
    ])
  })

  it("wraps worker creation failures in HatchetError", async () => {
    const cause = new Error("worker unavailable")
    const harness = createRegisterHarness()
    harness.workerMock.mockRejectedValueOnce(cause)

    const exit = await registerWorkflow(
      "orders-worker",
      workflow({ name: "orders.process" }).task(
        { name: "sync-order" },
        Effect.succeed("ok"),
      ),
      Layer.empty,
    ).pipe(Effect.provide(harness.clientLayer), Effect.runPromiseExit)

    expect(exit._tag).toBe("Failure")

    if (exit._tag === "Failure") {
      const error = Cause.squash(exit.cause) as HatchetError
      expect(error).toBeInstanceOf(HatchetError)
      expect(error.message).toContain("Failed to create worker")
      expect(error.cause).toBe(cause)
    }
  })

  it("wraps workflow registration failures in HatchetError", async () => {
    const cause = new Error("register unavailable")
    const harness = createRegisterHarness()
    harness.registerWorkflowMock.mockRejectedValueOnce(cause)

    const exit = await registerWorkflow(
      "orders-worker",
      workflow({ name: "orders.process" }).task(
        { name: "sync-order" },
        Effect.succeed("ok"),
      ),
      Layer.empty,
    ).pipe(Effect.provide(harness.clientLayer), Effect.runPromiseExit)

    expect(exit._tag).toBe("Failure")

    if (exit._tag === "Failure") {
      const error = Cause.squash(exit.cause) as HatchetError
      expect(error).toBeInstanceOf(HatchetError)
      expect(error.message).toContain("Failed to register workflow")
      expect(error.cause).toBe(cause)
    }
  })

  it("wraps worker start failures in HatchetError", async () => {
    const cause = new Error("start unavailable")
    const harness = createRegisterHarness()
    harness.startMock.mockRejectedValueOnce(cause)

    const exit = await registerWorkflow(
      "orders-worker",
      workflow({ name: "orders.process" }).task(
        { name: "sync-order" },
        Effect.succeed("ok"),
      ),
      Layer.empty,
    ).pipe(Effect.provide(harness.clientLayer), Effect.runPromiseExit)

    expect(exit._tag).toBe("Failure")

    if (exit._tag === "Failure") {
      const error = Cause.squash(exit.cause) as HatchetError
      expect(error).toBeInstanceOf(HatchetError)
      expect(error.message).toContain("Failed to start worker")
      expect(error.cause).toBe(cause)
    }
  })

  it("runs the optional onStart callback before registration", async () => {
    const harness = createRegisterHarness()
    const onStart = vi.fn(() => Effect.void)

    await registerWorkflowWithConfig({
      workerName: "orders-worker",
      workflow: workflow({ name: "orders.process" }).task(
        { name: "sync-order" },
        Effect.succeed("ok"),
      ),
      layer: Layer.empty,
      onStart,
    }).pipe(Effect.provide(harness.clientLayer), Effect.runPromise)

    expect(onStart).toHaveBeenCalledTimes(1)
    expect(harness.hatchet.workflow).toHaveBeenCalledTimes(1)
    expect(harness.startMock).toHaveBeenCalledTimes(1)
  })
})
