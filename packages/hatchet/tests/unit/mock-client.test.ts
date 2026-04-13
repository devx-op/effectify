import * as Effect from "effect/Effect"
import { describe, expect, it, vi } from "vitest"
import {
  createMockHatchetClient,
  createMockHatchetClientLayer,
  HatchetClientService,
  HatchetConfig,
  MockHatchetClientLayer,
  TestHatchetLayer,
} from "@effectify/hatchet"

describe("createMockHatchetClient", () => {
  it("returns sensible defaults for collections, metrics, and worker lifecycle helpers", async () => {
    const client = createMockHatchetClient()

    await expect(client.events.list()).resolves.toEqual({ rows: [] })
    await expect(client.logs.listTask("task-1")).resolves.toEqual({ rows: [] })
    await expect(client.logs.listTenant()).resolves.toEqual({ rows: [] })
    await expect(client.runs.list()).resolves.toMatchObject({ rows: [] })
    await expect(client.crons.list()).resolves.toEqual({ rows: [] })
    await expect(client.scheduled.list()).resolves.toEqual({ rows: [] })
    await expect(
      client.scheduled.delete("schedule-1"),
    ).resolves.toBeUndefined()
    await expect(client.workflows.list()).resolves.toEqual({ workflows: [] })
    await expect(
      client.workflows.delete({ name: "orders.process" }),
    ).resolves.toBeUndefined()
    await expect(client.metrics.getTaskMetrics()).resolves.toEqual({
      byStatus: {
        PENDING: 0,
        RUNNING: 0,
        COMPLETED: 0,
        FAILED: 0,
        CANCELLED: 0,
      },
    })
    await expect(client.metrics.getQueueMetrics()).resolves.toEqual({
      total: { queued: 0, running: 0, pending: 0 },
      workflowBreakdown: {},
      stepRun: {},
    })
    await expect(client.api.v1TenantLogLineList("tenant-1")).resolves.toEqual({
      data: { rows: [] },
    })
    await expect(
      client.api.v1TaskListStatusMetrics("tenant-1", {}),
    ).resolves.toEqual({
      data: {
        byStatus: {
          PENDING: 0,
          RUNNING: 0,
          COMPLETED: 0,
          FAILED: 0,
          CANCELLED: 0,
        },
      },
    })

    const worker = await client.worker("orders-worker")
    await expect(worker.registerWorkflows()).resolves.toBeUndefined()
    await expect(worker.start()).resolves.toBeUndefined()
  })

  it("throws descriptive errors for intentionally unimplemented defaults", async () => {
    const client = createMockHatchetClient()

    await expect(client.run("orders.process", {})).rejects.toThrowError(
      "Mock Hatchet client method not implemented: run",
    )
    await expect(client.events.push("orders.created", {})).rejects.toThrowError(
      "Mock Hatchet client method not implemented: events.push",
    )
    await expect(client.runs.cancel({ runId: "run-1" })).rejects.toThrowError(
      "Mock Hatchet client method not implemented: runs.cancel",
    )
  })

  it("applies overrides without losing non-overridden default behaviors", async () => {
    const overrideRun = vi.fn(async () => ({ runId: "run-1" }))
    const overrideLogs = vi.fn(async () => ({ rows: [{ message: "hello" }] }))
    const overrideMetrics = vi.fn(async () => ({
      total: { queued: 5, running: 2, pending: 1 },
      workflowBreakdown: {
        "orders.process": { queued: 5, running: 2, pending: 1 },
      },
      stepRun: { stepA: 3 },
    }))

    const client = createMockHatchetClient({
      tenantId: "tenant-99",
      run: overrideRun,
      logs: {
        listTask: overrideLogs,
      },
      metrics: {
        getQueueMetrics: overrideMetrics,
      },
    })

    await expect(client.run("orders.process", { id: 1 })).resolves.toEqual({
      runId: "run-1",
    })
    await expect(client.api.v1LogLineList("task-1")).resolves.toEqual({
      data: { rows: [{ message: "hello" }] },
    })
    await expect(
      client.api.tenantGetQueueMetrics("tenant-99"),
    ).resolves.toEqual({
      data: {
        total: {
          numQueued: 5,
          numRunning: 2,
          numPending: 1,
        },
        workflow: {
          "orders.process": {
            numQueued: 5,
            numRunning: 2,
            numPending: 1,
          },
        },
      },
    })
    await expect(client.events.list()).resolves.toEqual({ rows: [] })
    expect(client.tenantId).toBe("tenant-99")
  })

  it("provides mock client layers that satisfy Hatchet services in Effect programs", async () => {
    const customClient = createMockHatchetClient({ tenantId: "tenant-custom" })

    const layeredClient = await Effect.service(HatchetClientService).pipe(
      Effect.provide(
        createMockHatchetClientLayer({ tenantId: "tenant-layer" }),
      ),
      Effect.runPromise,
    )
    expect(layeredClient.tenantId).toBe("tenant-layer")

    const defaultClient = await Effect.service(HatchetClientService).pipe(
      Effect.provide(MockHatchetClientLayer),
      Effect.runPromise,
    )
    expect(defaultClient.tenantId).toBe("test-tenant-id")

    const testServices = await Effect.all({
      client: Effect.service(HatchetClientService),
      config: Effect.service(HatchetConfig),
    }).pipe(Effect.provide(TestHatchetLayer), Effect.runPromise)

    expect(testServices.client.tenantId).toBe("test-tenant-id")
    expect(testServices.config).toEqual({
      host: "localhost:7077",
      token: "test-token",
      namespace: undefined,
    })

    const programClient = await Effect.service(HatchetClientService).pipe(
      Effect.provideService(HatchetClientService, customClient),
      Effect.runPromise,
    )
    expect(programClient.tenantId).toBe("tenant-custom")
  })
})
