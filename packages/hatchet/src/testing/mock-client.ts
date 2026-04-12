/**
 * @effectify/hatchet - Mock Hatchet Client
 *
 * Mock implementations of Hatchet client for testing.
 */

import * as Layer from "effect/Layer"
import { Hatchet as HatchetClientSDK } from "@hatchet-dev/typescript-sdk"
import type { PushEventOptions } from "../clients/events.js"
import { HatchetClientService } from "../core/client.js"
import { HatchetConfig } from "../core/config.js"

type HatchetClientType = InstanceType<typeof HatchetClientSDK>

type MockHatchetRunsClient = {
  readonly cancel: (options: unknown) => Promise<unknown>
  readonly replay: (options: unknown) => Promise<unknown>
  readonly restoreTask: (taskExternalId: string) => Promise<unknown>
  readonly branchDurableTask: (
    taskExternalId: string,
    nodeId: number,
    branchId?: number,
  ) => Promise<unknown>
  readonly get: (runId: string) => Promise<unknown>
  readonly get_status: (runId: string) => Promise<string>
  readonly getTaskExternalId: (runId: string) => Promise<string>
  readonly list: (options?: unknown) => Promise<{ rows?: unknown[] }>
}

type MockHatchetLogsClient = {
  readonly listTask: (
    taskId: string,
    options?: unknown,
  ) => Promise<{ rows?: unknown[] }>
  readonly listTenant: (options?: unknown) => Promise<{ rows?: unknown[] }>
}

type MockHatchetMetricsClient = {
  readonly getTaskMetrics: (options?: unknown) => Promise<{
    byStatus: {
      PENDING: number
      RUNNING: number
      COMPLETED: number
      FAILED: number
      CANCELLED: number
    }
  }>
  readonly getQueueMetrics: () => Promise<{
    total: { queued: number; running: number; pending: number }
    workflowBreakdown: Record<
      string,
      { queued: number; running: number; pending: number }
    >
    stepRun: Record<string, number>
  }>
}

type MockHatchetWorkflowsClient = {
  readonly get: (name: string) => Promise<unknown>
  readonly list: (options?: unknown) => Promise<{ workflows: unknown[] }>
  readonly delete: (workflow: unknown) => Promise<void>
}

type MockHatchetSchedulesClient = {
  readonly create: (workflow: string, options: unknown) => Promise<unknown>
  readonly get: (scheduleId: string) => Promise<unknown>
  readonly list: (options?: unknown) => Promise<{ rows?: unknown[] }>
  readonly delete: (scheduleId: string) => Promise<void>
}

type MockHatchetCronsClient = {
  readonly create: (workflow: string, options: unknown) => Promise<unknown>
  readonly get: (cronId: string) => Promise<unknown>
  readonly list: (options?: unknown) => Promise<{ rows?: unknown[] }>
  readonly delete: (cronId: string) => Promise<void>
}

type MockHatchetWebhooksClient = {
  readonly list: (options?: unknown) => Promise<{ rows?: unknown[] }>
  readonly get: (webhookName: string) => Promise<unknown>
  readonly create: (options: unknown) => Promise<unknown>
  readonly update: (webhookName: string, options?: unknown) => Promise<unknown>
  readonly delete: (webhookName: string) => Promise<unknown>
}

type MockHatchetRateLimitsClient = {
  readonly list: (options?: unknown) => Promise<{ rows?: unknown[] }>
  readonly upsert: (options: unknown) => Promise<string>
}

type MockHatchetFiltersClient = {
  readonly list: (options?: unknown) => Promise<{ rows?: unknown[] }>
  readonly get: (filterId: string) => Promise<unknown>
  readonly create: (options: unknown) => Promise<unknown>
  readonly delete: (filterId: string) => Promise<unknown>
}

type MockHatchetSchedulesClient = {
  readonly create: (workflow: string, options: unknown) => Promise<unknown>
  readonly get: (scheduleId: string) => Promise<unknown>
  readonly list: (options?: unknown) => Promise<{ rows?: unknown[] }>
  readonly delete: (scheduleId: string) => Promise<void>
}

type MockHatchetCronsClient = {
  readonly create: (workflow: string, options: unknown) => Promise<unknown>
  readonly get: (cronId: string) => Promise<unknown>
  readonly list: (options?: unknown) => Promise<{ rows?: unknown[] }>
  readonly delete: (cronId: string) => Promise<void>
}

type MockHatchetWebhooksClient = {
  readonly list: (options?: unknown) => Promise<{ rows?: unknown[] }>
  readonly get: (webhookName: string) => Promise<unknown>
  readonly create: (options: unknown) => Promise<unknown>
  readonly update: (webhookName: string, options?: unknown) => Promise<unknown>
  readonly delete: (webhookName: string) => Promise<unknown>
}

type MockWorkerInstance = {
  readonly registerWorkflows: (workflows?: unknown[]) => Promise<void>
  readonly start: () => Promise<void>
}

/**
 * Mock HatchetClient type for testing
 * eslint-disable-next-line @typescript-eslint/no-explicit-any
 */
export type MockHatchetClient = HatchetClientType & {
  readonly tenantId: string
  readonly run: (
    workflow: string,
    input: unknown,
    options?: unknown,
  ) => Promise<unknown>
  readonly runNoWait: (
    workflow: string,
    input: unknown,
    options?: unknown,
  ) => Promise<unknown>
  readonly events: {
    readonly push: (
      key: string,
      payload: unknown,
      options?: PushEventOptions,
    ) => Promise<unknown>
    readonly list: (options?: unknown) => Promise<unknown>
  }
  readonly api: {
    readonly v1EventGet: (
      tenantId: string,
      eventId: string,
    ) => Promise<{ data: unknown }>
    readonly v1LogLineList: (
      taskId: string,
      query?: unknown,
    ) => Promise<{ data: { rows?: unknown[] } }>
    readonly v1TenantLogLineList: (
      tenantId: string,
      query?: unknown,
    ) => Promise<{ data: { rows?: unknown[] } }>
    readonly v1TaskListStatusMetrics: (
      tenantId: string,
      query: unknown,
    ) => Promise<{ data: unknown }>
    readonly tenantGetQueueMetrics: (
      tenantId: string,
      query?: unknown,
    ) => Promise<{ data: unknown }>
    readonly tenantGetStepRunQueueMetrics: (
      tenantId: string,
    ) => Promise<{ data: unknown }>
  }
  readonly logs: MockHatchetLogsClient
  readonly metrics: MockHatchetMetricsClient
  readonly runs: MockHatchetRunsClient
  readonly crons: MockHatchetCronsClient
  readonly ratelimits: MockHatchetRateLimitsClient
  readonly filters: MockHatchetFiltersClient
  readonly webhooks: MockHatchetWebhooksClient
  readonly scheduled: MockHatchetSchedulesClient
  readonly workflows: MockHatchetWorkflowsClient
  readonly worker: (
    name: string,
    options?: unknown,
  ) => Promise<MockWorkerInstance>
}

export interface MockHatchetClientOverrides {
  readonly tenantId?: string
  readonly run?: MockHatchetClient["run"]
  readonly runNoWait?: MockHatchetClient["runNoWait"]
  readonly events?: Partial<MockHatchetClient["events"]>
  readonly api?: Partial<MockHatchetClient["api"]>
  readonly logs?: Partial<MockHatchetClient["logs"]>
  readonly metrics?: Partial<MockHatchetClient["metrics"]>
  readonly runs?: Partial<MockHatchetClient["runs"]>
  readonly crons?: Partial<MockHatchetClient["crons"]>
  readonly ratelimits?: Partial<MockHatchetClient["ratelimits"]>
  readonly filters?: Partial<MockHatchetClient["filters"]>
  readonly webhooks?: Partial<MockHatchetClient["webhooks"]>
  readonly scheduled?: Partial<MockHatchetClient["scheduled"]>
  readonly workflows?: Partial<MockHatchetClient["workflows"]>
  readonly worker?: MockHatchetClient["worker"]
}

const unimplemented = (method: string) => async () => {
  throw new Error(`Mock Hatchet client method not implemented: ${method}`)
}

const asMockApiMethod = <T>(value: unknown): T => value as T

/**
 * Create a mock HatchetClient for testing
 */
export const createMockHatchetClient = (
  overrides: MockHatchetClientOverrides = {},
): MockHatchetClient => {
  const baseClient = {
    tenantId: "test-tenant-id",
    run: unimplemented("run"),
    runNoWait: unimplemented("runNoWait"),
    events: {
      push: unimplemented("events.push"),
      list: async () => ({ rows: [] }),
    },
    api: {
      v1EventGet: unimplemented("api.v1EventGet"),
      v1LogLineList: asMockApiMethod<MockHatchetClient["api"]["v1LogLineList"]>(
        async () => ({ data: { rows: [] } }),
      ),
      v1TenantLogLineList: asMockApiMethod<
        MockHatchetClient["api"]["v1TenantLogLineList"]
      >(async () => ({ data: { rows: [] } })),
      v1TaskListStatusMetrics: asMockApiMethod<
        MockHatchetClient["api"]["v1TaskListStatusMetrics"]
      >(async () => ({ data: [] })),
      tenantGetQueueMetrics: asMockApiMethod<
        MockHatchetClient["api"]["tenantGetQueueMetrics"]
      >(async () => ({ data: { total: {}, workflow: {} } })),
      tenantGetStepRunQueueMetrics: asMockApiMethod<
        MockHatchetClient["api"]["tenantGetStepRunQueueMetrics"]
      >(async () => ({ data: { queues: {} } })),
    },
    logs: {
      listTask: async () => ({ rows: [] }),
      listTenant: async () => ({ rows: [] }),
    },
    metrics: {
      getTaskMetrics: async () => ({
        byStatus: {
          PENDING: 0,
          RUNNING: 0,
          COMPLETED: 0,
          FAILED: 0,
          CANCELLED: 0,
        },
      }),
      getQueueMetrics: async () => ({
        total: { queued: 0, running: 0, pending: 0 },
        workflowBreakdown: {},
        stepRun: {},
      }),
    },
    runs: {
      cancel: unimplemented("runs.cancel"),
      replay: unimplemented("runs.replay"),
      restoreTask: unimplemented(
        "runs.restoreTask",
      ) as MockHatchetClient["runs"]["restoreTask"],
      branchDurableTask: unimplemented(
        "runs.branchDurableTask",
      ) as MockHatchetClient["runs"]["branchDurableTask"],
      get: unimplemented("runs.get"),
      get_status: unimplemented("runs.get_status"),
      getTaskExternalId: unimplemented(
        "runs.getTaskExternalId",
      ) as MockHatchetRunsClient["getTaskExternalId"],
      list: (async () => ({
        rows: [],
        pagination: {} as never,
      })) as MockHatchetClient["runs"]["list"],
    },
    crons: {
      create: unimplemented("crons.create"),
      get: unimplemented("crons.get"),
      list: async () => ({ rows: [] }),
      delete: (async () => undefined) as MockHatchetClient["crons"]["delete"],
    },
    ratelimits: {
      list: async () => ({ rows: [] }),
      upsert: unimplemented(
        "ratelimits.upsert",
      ) as MockHatchetClient["ratelimits"]["upsert"],
    },
    filters: {
      list: async () => ({ rows: [] }),
      get: unimplemented("filters.get"),
      create: unimplemented("filters.create"),
      delete: unimplemented(
        "filters.delete",
      ) as MockHatchetClient["filters"]["delete"],
    },
    webhooks: {
      list: async () => ({ rows: [] }),
      get: unimplemented("webhooks.get"),
      create: unimplemented("webhooks.create"),
      update: unimplemented(
        "webhooks.update",
      ) as MockHatchetClient["webhooks"]["update"],
      delete: unimplemented(
        "webhooks.delete",
      ) as MockHatchetClient["webhooks"]["delete"],
    },
    scheduled: {
      create: unimplemented("scheduled.create"),
      get: unimplemented("scheduled.get"),
      list: async () => ({ rows: [] }),
      delete: (async () => undefined) as MockHatchetClient["scheduled"]["delete"],
    },
    workflows: {
      get: unimplemented("workflows.get"),
      list: async () => ({ workflows: [] }),
      delete: (async () => undefined) as MockHatchetClient["workflows"]["delete"],
    },
    worker: (async () => ({
      registerWorkflows: async () => {},
      start: async () => {},
    })) as unknown as MockHatchetClient["worker"],
  } satisfies MockHatchetClientOverrides

  const logs = {
    ...baseClient.logs,
    ...overrides.logs,
  }

  const metrics = {
    ...baseClient.metrics,
    ...overrides.metrics,
  }

  return {
    ...baseClient,
    ...overrides,
    tenantId: overrides.tenantId ?? baseClient.tenantId,
    run: overrides.run ?? baseClient.run,
    runNoWait: overrides.runNoWait ?? baseClient.runNoWait,
    events: {
      ...baseClient.events,
      ...overrides.events,
    },
    api: {
      ...baseClient.api,
      v1LogLineList: overrides.api?.v1LogLineList ??
        asMockApiMethod<MockHatchetClient["api"]["v1LogLineList"]>(
          async (taskId: string, query?: unknown) => ({
            data: await logs.listTask(taskId, query),
          }),
        ),
      v1TenantLogLineList: overrides.api?.v1TenantLogLineList ??
        asMockApiMethod<MockHatchetClient["api"]["v1TenantLogLineList"]>(
          async (tenantId: string, query?: unknown) => {
            void tenantId
            return { data: await logs.listTenant(query) }
          },
        ),
      v1TaskListStatusMetrics: overrides.api?.v1TaskListStatusMetrics ??
        asMockApiMethod<MockHatchetClient["api"]["v1TaskListStatusMetrics"]>(
          async (tenantId: string, query: unknown) => {
            void tenantId
            return { data: await metrics.getTaskMetrics(query) }
          },
        ),
      tenantGetQueueMetrics: overrides.api?.tenantGetQueueMetrics ??
        asMockApiMethod<MockHatchetClient["api"]["tenantGetQueueMetrics"]>(
          async (tenantId: string) => {
            void tenantId
            const data = await metrics.getQueueMetrics()

            return {
              data: {
                total: {
                  numQueued: data.total.queued,
                  numRunning: data.total.running,
                  numPending: data.total.pending,
                },
                workflow: Object.entries(data.workflowBreakdown).reduce<
                  Record<string, unknown>
                >((acc, [key, value]) => {
                  const counts = value as {
                    queued: number
                    running: number
                    pending: number
                  }
                  acc[key] = {
                    numQueued: counts.queued,
                    numRunning: counts.running,
                    numPending: counts.pending,
                  }
                  return acc
                }, {}),
              },
            }
          },
        ),
      tenantGetStepRunQueueMetrics: overrides.api?.tenantGetStepRunQueueMetrics ??
        asMockApiMethod<
          MockHatchetClient["api"]["tenantGetStepRunQueueMetrics"]
        >(async (tenantId: string) => {
          void tenantId
          const data = await metrics.getQueueMetrics()
          return { data: { queues: data.stepRun } }
        }),
      ...overrides.api,
    },
    logs,
    metrics,
    runs: {
      ...baseClient.runs,
      ...overrides.runs,
    },
    crons: {
      ...baseClient.crons,
      ...overrides.crons,
    },
    ratelimits: {
      ...baseClient.ratelimits,
      ...overrides.ratelimits,
    },
    filters: {
      ...baseClient.filters,
      ...overrides.filters,
    },
    webhooks: {
      ...baseClient.webhooks,
      ...overrides.webhooks,
    },
    scheduled: {
      ...baseClient.scheduled,
      ...overrides.scheduled,
    },
    workflows: {
      ...baseClient.workflows,
      ...overrides.workflows,
    },
    worker: overrides.worker ?? baseClient.worker,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as MockHatchetClient
}

export const createMockHatchetClientLayer = (
  overrides: MockHatchetClientOverrides = {},
) => Layer.succeed(HatchetClientService, createMockHatchetClient(overrides))

/**
 * Layer that provides a mock HatchetClientService
 */
export const MockHatchetClientLayer = Layer.succeed(
  HatchetClientService,
  createMockHatchetClient(),
)

/**
 * Layer that provides test HatchetConfig
 */
export const TestHatchetConfigLayer = Layer.succeed(HatchetConfig, {
  host: "localhost:7077",
  token: "test-token",
  namespace: undefined,
})

/**
 * Combined layer for testing with mock client
 */
export const TestHatchetLayer = Layer.mergeAll(
  TestHatchetConfigLayer,
  MockHatchetClientLayer,
)
