/**
 * @effectify/hatchet - Rate Limits Client Tests
 */

import { describe, expect, it } from "vitest"
import * as Cause from "effect/Cause"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { type HatchetRateLimitRecord, listRateLimits, upsertRateLimit } from "../../../src/clients/ratelimits.js"
import * as publicApi from "../../../src/index.js"
import { HatchetRateLimitError } from "../../../src/core/error.js"
import {
  createMockHatchetClient,
  createMockHatchetClientLayer,
  TestHatchetConfigLayer,
} from "../../../src/testing/mock-client.js"

const provideHatchet = (
  layer: ReturnType<typeof createMockHatchetClientLayer>,
) => Effect.provide(Layer.mergeAll(TestHatchetConfigLayer, layer))

describe("Rate Limits Client", () => {
  it("listRateLimits forwards query options and normalizes SDK rows", async () => {
    const result = await listRateLimits({
      limit: 10,
      offset: 20,
      orderByField: publicApi.RateLimitOrderByField.Key,
      orderByDirection: publicApi.RateLimitOrderByDirection.Desc,
    }).pipe(
      provideHatchet(
        createMockHatchetClientLayer({
          ratelimits: {
            list: async (query) => {
              expect(query).toEqual({
                limit: 10,
                offset: 20,
                orderByField: publicApi.RateLimitOrderByField.Key,
                orderByDirection: publicApi.RateLimitOrderByDirection.Desc,
              })

              return {
                rows: [
                  {
                    key: "email:send",
                    tenantId: "tenant-1",
                    limitValue: 15,
                    value: 3,
                    window: "1m",
                    lastRefill: "2026-04-12T18:45:00.000Z",
                  },
                ],
              }
            },
          },
        }),
      ),
      Effect.runPromise,
    )

    expect(result).toEqual<readonly HatchetRateLimitRecord[]>([
      {
        key: "email:send",
        tenantId: "tenant-1",
        limitValue: 15,
        value: 3,
        window: "1m",
        lastRefill: "2026-04-12T18:45:00.000Z",
      },
    ])
  })

  it("listRateLimits returns an empty readonly array when no rows exist", async () => {
    const result = await listRateLimits().pipe(
      provideHatchet(
        createMockHatchetClientLayer({
          ratelimits: {
            list: async () => ({ rows: [] }),
          },
        }),
      ),
      Effect.runPromise,
    )

    expect(result).toEqual([])
  })

  it("upsertRateLimit returns the rate limit key and forwards duration", async () => {
    const result = await publicApi
      .upsertRateLimit({
        key: "email:send",
        limit: 30,
        duration: Duration.minutes(1),
      })
      .pipe(
        provideHatchet(
          createMockHatchetClientLayer({
            ratelimits: {
              upsert: async (options) => {
                expect(options).toEqual({
                  key: "email:send",
                  limit: 30,
                  duration: publicApi.RateLimitDuration.MINUTE,
                })

                return "email:send"
              },
            },
          }),
        ),
        Effect.runPromise,
      )

    expect(result).toBe("email:send")
  })

  it("wraps SDK failures for list and upsert with HatchetRateLimitError", async () => {
    const listCause = new Error("list unavailable")
    const upsertCause = new Error("upsert unavailable")

    const listExit = await listRateLimits().pipe(
      provideHatchet(
        createMockHatchetClientLayer({
          ratelimits: {
            list: async () => {
              throw listCause
            },
          },
        }),
      ),
      Effect.runPromiseExit,
    )

    const upsertExit = await upsertRateLimit({
      key: "email:send",
      limit: 30,
    }).pipe(
      provideHatchet(
        createMockHatchetClientLayer({
          ratelimits: {
            upsert: async () => {
              throw upsertCause
            },
          },
        }),
      ),
      Effect.runPromiseExit,
    )

    expect(listExit._tag).toBe("Failure")
    expect(upsertExit._tag).toBe("Failure")

    if (listExit._tag === "Failure") {
      const error = Cause.squash(listExit.cause)
      expect(error).toBeInstanceOf(HatchetRateLimitError)
      expect(error).toMatchObject({
        _tag: "HatchetRateLimitError",
        operation: "list",
        cause: listCause,
      })
    }

    if (upsertExit._tag === "Failure") {
      expect(Cause.squash(upsertExit.cause)).toMatchObject({
        _tag: "HatchetRateLimitError",
        operation: "upsert",
        key: "email:send",
        cause: upsertCause,
      })
    }
  })

  it("fails normalization when a required rate-limit field is missing", async () => {
    const exit = await listRateLimits().pipe(
      provideHatchet(
        createMockHatchetClientLayer({
          ratelimits: {
            list: async () => ({
              rows: [
                {
                  tenantId: "tenant-1",
                  limitValue: 15,
                  value: 3,
                  window: "1m",
                  lastRefill: "2026-04-12T18:45:00.000Z",
                },
              ],
            }),
          },
        }),
      ),
      Effect.runPromiseExit,
    )

    expect(exit._tag).toBe("Failure")

    if (exit._tag === "Failure") {
      expect(Cause.squash(exit.cause)).toMatchObject({
        _tag: "HatchetRateLimitError",
        operation: "list",
        message: "Rate limit response did not include key",
      })
    }
  })

  it("createMockHatchetClient exposes ratelimits overrides and public enums", async () => {
    const client = createMockHatchetClient({
      ratelimits: {
        list: async () => ({ rows: [] }),
        upsert: async () => "email:send",
      },
    })

    expect(await client.ratelimits.list()).toEqual({ rows: [] })
    expect(
      await client.ratelimits.upsert({ key: "email:send", limit: 30 }),
    ).toBe("email:send")
    expect(publicApi.listRateLimits).toBeTypeOf("function")
    expect(publicApi.upsertRateLimit).toBeTypeOf("function")
    expect(publicApi.RateLimitDuration.MINUTE).toBeDefined()
    expect(publicApi.RateLimitOrderByField.Key).toBeDefined()
    expect(publicApi.RateLimitOrderByDirection.Desc).toBeDefined()
  })
})
