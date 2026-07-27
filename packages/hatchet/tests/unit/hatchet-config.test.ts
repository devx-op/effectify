import { describe, expect, it } from "vitest"
import * as ConfigProvider from "effect/ConfigProvider"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import { CronRecord, HatchetConfig, InvalidHatchetConfiguration, ScheduleRecord } from "@effectify/hatchet"

const load = (env: Record<string, string>) =>
  Effect.runPromise(
    HatchetConfig.fromEnv.pipe(
      Effect.provide(ConfigProvider.layer(ConfigProvider.fromEnv({ env }))),
    ),
  )

const loadExit = (env: Record<string, string>) =>
  Effect.runPromiseExit(
    HatchetConfig.fromEnv.pipe(
      Effect.provide(ConfigProvider.layer(ConfigProvider.fromEnv({ env }))),
    ),
  )

describe("HatchetConfig", () => {
  it("requires the exact HATCHET_CLIENT_TOKEN key", async () => {
    const exit = await loadExit({})

    expect(Exit.isFailure(exit)).toBe(true)
    expect(String(exit)).toContain("HATCHET_CLIENT_TOKEN")
  })

  it("keeps the SDK token redacted in values and diagnostics", async () => {
    const secret = "secret-client-token"
    const config = await load({ HATCHET_CLIENT_TOKEN: secret })

    expect(Redacted.value(config.client.token)).toBe(secret)
    expect(String(config.client.token)).not.toContain(secret)
    expect(JSON.stringify(config)).not.toContain(secret)

    const error = new InvalidHatchetConfiguration({
      field: "client",
      message: "SDK construction failed",
    })
    const encoded = Schema.encodeUnknownSync(InvalidHatchetConfiguration)(
      error,
    )
    expect(JSON.stringify(encoded)).not.toContain(secret)
    expect(encoded).not.toHaveProperty("originalCause")
  })

  it.each(
    [
      "tls",
      "mtls",
      "none",
    ] as const,
  )("accepts the %s TLS literal", async (tlsStrategy) => {
    const config = await load({
      HATCHET_CLIENT_TOKEN: "token",
      HATCHET_TLS_STRATEGY: tlsStrategy,
    })

    expect(config.client.tlsStrategy).toBe(tlsStrategy)
  })

  it("rejects invalid TLS before SDK construction", async () => {
    const exit = await loadExit({
      HATCHET_CLIENT_TOKEN: "token",
      HATCHET_TLS_STRATEGY: "insecure",
    })

    expect(Exit.isFailure(exit)).toBe(true)
    expect(String(exit)).toContain("HATCHET_TLS_STRATEGY")
  })

  it("treats an empty optional value as absent", async () => {
    const config = await load({
      HATCHET_CLIENT_TOKEN: "token",
      HATCHET_HOST_PORT: "",
    })

    expect(config.client).not.toHaveProperty("hostPort")
  })

  it("rejects an invalid optional worker slot count", async () => {
    const exit = await loadExit({
      HATCHET_CLIENT_TOKEN: "token",
      HATCHET_WORKER_SLOTS: "0",
    })

    expect(Exit.isFailure(exit)).toBe(true)
    expect(String(exit)).toContain("HATCHET_WORKER_SLOTS")
  })

  it("omits TLS to preserve the SDK secure default", async () => {
    const config = await load({ HATCHET_CLIENT_TOKEN: "token" })

    expect(config.client).not.toHaveProperty("tlsStrategy")
  })

  it("applies worker defaults and preserves absent optional client keys", async () => {
    const config = await load({ HATCHET_CLIENT_TOKEN: "token" })

    expect(config.worker).toEqual({
      name: "hatchet-worker",
      stopTimeoutMs: 5_000,
    })
    expect(config.client).toEqual({ token: config.client.token })
  })

  it("loads every explicit flat client and worker key", async () => {
    const config = await load({
      HATCHET_CLIENT_TOKEN: "token",
      HATCHET_HOST_PORT: "localhost:7077",
      HATCHET_API_URL: "http://localhost:8888",
      HATCHET_TLS_STRATEGY: "none",
      HATCHET_TENANT_ID: "tenant",
      HATCHET_NAMESPACE: "namespace",
      HATCHET_WORKER_NAME: "worker",
      HATCHET_WORKER_SLOTS: "4",
      HATCHET_WORKER_READY_TIMEOUT_MS: "6000",
      HATCHET_WORKER_STOP_TIMEOUT_MS: "7000",
    })

    expect(config).toMatchObject({
      client: {
        hostPort: "localhost:7077",
        apiUrl: "http://localhost:8888",
        tlsStrategy: "none",
        tenantId: "tenant",
        namespace: "namespace",
      },
      worker: {
        name: "worker",
        slots: 4,
        readyTimeoutMs: 6000,
        stopTimeoutMs: 7000,
      },
    })
  })

  it("publishes Schema-first durable schedule and cron records", () => {
    const schedule = Schema.decodeUnknownSync(ScheduleRecord)({
      id: "schedule-1",
      taskName: "greet",
      triggerAt: "2030-01-01T00:00:00.000Z",
    })
    const cron = Schema.decodeUnknownSync(CronRecord)({
      id: "cron-1",
      taskName: "greet",
      expression: "0 0 * * *",
      enabled: true,
      method: "API",
    })

    expect(schedule.triggerAt).toEqual(new Date("2030-01-01T00:00:00.000Z"))
    expect(cron.method).toBe("API")
  })
})
