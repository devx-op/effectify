import * as Config from "effect/Config"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"

export const TlsStrategy = Schema.Literals(["tls", "mtls", "none"])
export type TlsStrategy = typeof TlsStrategy.Type

export const LogLevel = Schema.Literals(["OFF", "DEBUG", "INFO", "WARN", "ERROR"])
export type LogLevel = typeof LogLevel.Type

const PositiveInteger = Schema.Int.check(Schema.isGreaterThan(0))
const WorkerLabels = Schema.Record(Schema.String, Schema.Union([Schema.String, Schema.Number]))

export const ClientOptions = Schema.Struct({
  token: Schema.Redacted(Schema.String),
  hostPort: Schema.optionalKey(Schema.NonEmptyString),
  apiUrl: Schema.optionalKey(Schema.NonEmptyString),
  tenantId: Schema.optionalKey(Schema.NonEmptyString),
  namespace: Schema.optionalKey(Schema.NonEmptyString),
  logLevel: Schema.optionalKey(LogLevel),
  tlsStrategy: Schema.optionalKey(TlsStrategy),
})
export type ClientOptions = typeof ClientOptions.Type

export const WorkerOptions = Schema.Struct({
  name: Schema.NonEmptyString,
  slots: Schema.optionalKey(PositiveInteger),
  labels: Schema.optionalKey(WorkerLabels),
  handleKill: Schema.optionalKey(Schema.Boolean),
  readyTimeoutMs: Schema.optionalKey(PositiveInteger),
  stopTimeoutMs: Schema.optionalKey(PositiveInteger),
})
export type WorkerOptions = typeof WorkerOptions.Type

export const HatchetOptions = Schema.Struct({
  client: ClientOptions,
  worker: WorkerOptions,
})
export type HatchetOptions = typeof HatchetOptions.Type

const optional = <A>(config: Config.Config<A>) => Config.option(config)

/** Package-owned environment contract. Every key is deliberately flat. */
export const fromEnv: Config.Config<HatchetOptions> = Config.all({
  token: Config.redacted("HATCHET_CLIENT_TOKEN"),
  hostPort: optional(Config.schema(Schema.NonEmptyString, "HATCHET_HOST_PORT")),
  apiUrl: optional(Config.schema(Schema.NonEmptyString, "HATCHET_API_URL")),
  tenantId: optional(Config.schema(Schema.NonEmptyString, "HATCHET_TENANT_ID")),
  namespace: optional(Config.schema(Schema.NonEmptyString, "HATCHET_NAMESPACE")),
  logLevel: optional(Config.schema(LogLevel, "HATCHET_LOG_LEVEL")),
  tlsStrategy: optional(Config.schema(TlsStrategy, "HATCHET_TLS_STRATEGY")),
  workerName: Config.schema(Schema.NonEmptyString, "HATCHET_WORKER_NAME").pipe(Config.withDefault("hatchet-worker")),
  workerSlots: optional(Config.schema(PositiveInteger, "HATCHET_WORKER_SLOTS")),
  readyTimeoutMs: optional(Config.schema(PositiveInteger, "HATCHET_WORKER_READY_TIMEOUT_MS")),
  stopTimeoutMs: Config.schema(PositiveInteger, "HATCHET_WORKER_STOP_TIMEOUT_MS").pipe(Config.withDefault(5_000)),
}).pipe(
  Config.map((value) => ({
    client: {
      token: value.token,
      ...(Option.isSome(value.hostPort) ? { hostPort: value.hostPort.value } : {}),
      ...(Option.isSome(value.apiUrl) ? { apiUrl: value.apiUrl.value } : {}),
      ...(Option.isSome(value.tenantId) ? { tenantId: value.tenantId.value } : {}),
      ...(Option.isSome(value.namespace) ? { namespace: value.namespace.value } : {}),
      ...(Option.isSome(value.logLevel) ? { logLevel: value.logLevel.value } : {}),
      ...(Option.isSome(value.tlsStrategy) ? { tlsStrategy: value.tlsStrategy.value } : {}),
    },
    worker: {
      name: value.workerName,
      ...(Option.isSome(value.workerSlots) ? { slots: value.workerSlots.value } : {}),
      ...(Option.isSome(value.readyTimeoutMs) ? { readyTimeoutMs: value.readyTimeoutMs.value } : {}),
      stopTimeoutMs: value.stopTimeoutMs,
    },
  })),
)
