/**
 * @effectify/hatchet - Mock Hatchet Client
 *
 * Mock implementations of Hatchet client for testing.
 */

import * as Layer from "effect/Layer"
import type { HatchetClient as HatchetClientType } from "@hatchet-dev/typescript-sdk"
import type { PushEventOptions } from "../clients/events.js"
import { HatchetClientService } from "../core/client.js"
import { HatchetConfig } from "../core/config.js"

/**
 * Mock HatchetClient type for testing
 * eslint-disable-next-line @typescript-eslint/no-explicit-any
 */
export type MockHatchetClient = HatchetClientType & {
  readonly tenantId: string
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
}

export interface MockHatchetClientOverrides {
  readonly tenantId?: string
  readonly events?: Partial<MockHatchetClient["events"]>
  readonly api?: Partial<MockHatchetClient["api"]>
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
    events: {
      push: unimplemented("events.push"),
      list: async () => ({ rows: [] }),
    },
    api: {
      v1EventGet: unimplemented("api.v1EventGet"),
    },
  } satisfies MockHatchetClientOverrides

  return {
    ...baseClient,
    ...overrides,
    tenantId: overrides.tenantId ?? baseClient.tenantId,
    events: {
      ...baseClient.events,
      ...overrides.events,
    },
    api: {
      ...baseClient.api,
      ...overrides.api,
    },
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
