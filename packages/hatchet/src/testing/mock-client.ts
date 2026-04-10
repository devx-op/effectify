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
  readonly get: (runId: string) => Promise<unknown>
  readonly get_status: (runId: string) => Promise<string>
  readonly list: (options?: unknown) => Promise<{ rows?: unknown[] }>
}

type MockHatchetWorkflowsClient = {
  readonly get: (name: string) => Promise<unknown>
  readonly list: (options?: unknown) => Promise<{ workflows: unknown[] }>
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
  }
  readonly runs: MockHatchetRunsClient
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
  readonly runs?: Partial<MockHatchetClient["runs"]>
  readonly workflows?: Partial<MockHatchetClient["workflows"]>
  readonly worker?: MockHatchetClient["worker"]
}

const unimplemented = (method: string) => async () => {
  throw new Error(`Mock Hatchet client method not implemented: ${method}`)
}

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
    },
    runs: {
      cancel: unimplemented("runs.cancel"),
      get: unimplemented("runs.get"),
      get_status: unimplemented("runs.get_status"),
      list: (async () => ({
        rows: [],
        pagination: {} as never,
      })) as MockHatchetClient["runs"]["list"],
    },
    workflows: {
      get: unimplemented("workflows.get"),
      list: async () => ({ workflows: [] }),
    },
    worker: (async () => ({
      registerWorkflows: async () => {},
      start: async () => {},
    })) as unknown as MockHatchetClient["worker"],
  } satisfies MockHatchetClientOverrides

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
      ...overrides.api,
    },
    runs: {
      ...baseClient.runs,
      ...overrides.runs,
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
