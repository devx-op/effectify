import { Hatchet as HatchetClient, type JsonObject, type JsonValue } from "@hatchet-dev/typescript-sdk"
import * as Cause from "effect/Cause"
import * as Clock from "effect/Clock"
import type * as Context from "effect/Context"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import type * as Scope from "effect/Scope"
import {
  HatchetConfigError,
  HatchetSdkError,
  InvalidHatchetConfiguration,
  InvalidTimeError,
  MissingTaskError,
  TaskSchemaError,
} from "../Error.js"
import * as Hatchet from "../Hatchet.js"
import type { HatchetOptions } from "../HatchetConfig.js"
import * as CronExpression from "../CronExpression.js"
import { type CronRecord, makeCronId, makeRunId, makeScheduleId, type ScheduleRecord } from "../Model.js"
import type * as Task from "../Task.js"
import * as CronValidation from "./cron-validation.js"
import * as Declarations from "./declaration-validation.js"
import { getErrorCause } from "./error-cause.js"
import * as Registry from "./registry.js"
import * as SdkDeclaration from "./sdk-declaration.js"

type LiveOutputEnvelope = { readonly value: JsonValue }

type LiveRunReference = {
  readonly runId: Promise<string>
  readonly output: Promise<LiveOutputEnvelope>
  readonly cancel: () => Promise<void>
}

type LiveDeclaration =
  & ReturnType<
    ReturnType<typeof HatchetClient.init>["task"]
  >
  & { readonly runNoWait: (input: JsonObject) => Promise<LiveRunReference> }

class LiveCallbackError extends Error {
  constructor(override readonly cause: unknown) {
    super("Hatchet task callback failed")
  }
}

class WorkerStopDefect extends Error {
  constructor(readonly originalCause: unknown) {
    super("Hatchet worker stop failed")
  }
}

const abortSignalEffect = (signal: AbortSignal): Effect.Effect<never> =>
  Effect.callback((resume) => {
    if (signal.aborted) {
      resume(Effect.interrupt)
      return
    }
    const onAbort = () => resume(Effect.interrupt)
    signal.addEventListener("abort", onAbort, { once: true })
    return Effect.sync(() => signal.removeEventListener("abort", onAbort))
  })

const isTransportValue = (value: unknown): value is JsonValue => {
  if (
    value === null ||
    value === undefined ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return true
  }
  if (Array.isArray(value)) return value.every(isTransportValue)
  if (
    typeof value !== "object" ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    return false
  }
  return Object.values(value).every(isTransportValue)
}

const isTransportObject = (value: unknown): value is JsonObject =>
  typeof value === "object" &&
  value !== null &&
  !Array.isArray(value) &&
  Object.getPrototypeOf(value) === Object.prototype &&
  Object.values(value).every(isTransportValue)

const sdkError = (
  operation: string,
  originalCause: unknown,
  resourceId?: string,
): HatchetSdkError =>
  new HatchetSdkError({
    operation,
    originalCause,
    ...(resourceId === undefined ? {} : { resourceId }),
  })

const isNotFound = (error: HatchetSdkError): boolean => {
  const cause = getErrorCause(error)
  return (
    typeof cause === "object" &&
    cause !== null &&
    "response" in cause &&
    typeof cause.response === "object" &&
    cause.response !== null &&
    "status" in cause.response &&
    cause.response.status === 404
  )
}

const isAmbiguousCronCreateCause = (cause: unknown, depth = 0): boolean => {
  if (typeof cause !== "object" || cause === null || depth > 2) return false
  const status = "status" in cause && typeof cause.status === "number"
    ? cause.status
    : "response" in cause &&
        typeof cause.response === "object" &&
        cause.response !== null &&
        "status" in cause.response &&
        typeof cause.response.status === "number"
    ? cause.response.status
    : undefined
  if (status === 408 || (status !== undefined && status >= 500 && status < 600)) {
    return true
  }
  if (
    "code" in cause &&
    ["ECONNREFUSED", "ECONNRESET", "ENETUNREACH", "ETIMEDOUT"].includes(
      String(cause.code),
    )
  ) {
    return true
  }
  return "cause" in cause && isAmbiguousCronCreateCause(cause.cause, depth + 1)
}

const scheduleRecord = (
  value: unknown,
  operation: string,
): Effect.Effect<ScheduleRecord, HatchetSdkError> => {
  if (
    typeof value !== "object" ||
    value === null ||
    !("metadata" in value) ||
    typeof value.metadata !== "object" ||
    value.metadata === null ||
    !("id" in value.metadata) ||
    typeof value.metadata.id !== "string" ||
    !("workflowName" in value) ||
    typeof value.workflowName !== "string" ||
    !("triggerAt" in value) ||
    typeof value.triggerAt !== "string"
  ) {
    return Effect.fail(sdkError(operation, value))
  }
  const triggerAt = new Date(value.triggerAt)
  return Number.isNaN(triggerAt.getTime())
    ? Effect.fail(sdkError(operation, value))
    : Effect.succeed({
      id: makeScheduleId(value.metadata.id),
      taskName: value.workflowName,
      triggerAt,
    })
}

const cronListIds = (value: unknown): ReadonlyArray<string> | undefined => {
  if (
    typeof value !== "object" ||
    value === null ||
    !("rows" in value) ||
    !Array.isArray(value.rows)
  ) {
    return undefined
  }
  const ids: Array<string> = []
  for (const row of value.rows) {
    if (
      typeof row !== "object" ||
      row === null ||
      !("metadata" in row) ||
      typeof row.metadata !== "object" ||
      row.metadata === null ||
      !("id" in row.metadata) ||
      typeof row.metadata.id !== "string"
    ) {
      return undefined
    }
    ids.push(row.metadata.id)
  }
  return ids
}

const pageNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0

export const verifyCronAbsent = async (
  list: (query: {
    readonly offset: number
    readonly limit: number
  }) => Promise<unknown>,
  id: string,
  maxPages = 1_000,
): Promise<boolean> => {
  const limit = 100
  let offset = 0
  const seen = new Set<number>()
  for (let pages = 0; pages < maxPages; pages++) {
    const response = await list({ offset, limit })
    const ids = cronListIds(response)
    if (!ids || ids.length > limit || ids.includes(id)) return false
    if (
      typeof response !== "object" ||
      response === null ||
      !("pagination" in response)
    ) {
      if (ids.length < limit) return true
      offset += limit
      if (!Number.isSafeInteger(offset)) return false
      continue
    }
    const pagination = response.pagination
    if (typeof pagination !== "object" || pagination === null) return false
    const current = "current_page" in pagination ? pagination.current_page : undefined
    const next = "next_page" in pagination ? pagination.next_page : undefined
    const total = "num_pages" in pagination ? pagination.num_pages : undefined
    if (
      !pageNumber(current) ||
      !pageNumber(total) ||
      seen.has(current) ||
      (next !== undefined && !pageNumber(next))
    ) {
      return false
    }
    seen.add(current)
    if (current >= total) return true
    if (next === undefined || next <= current || next > total) return false
    offset += (next - current) * limit
    if (!Number.isSafeInteger(offset)) return false
  }
  return false
}

const cronVerificationListTimeout = Duration.seconds(5)

const verifyCronAbsentWithinBound = (
  list: Parameters<typeof verifyCronAbsent>[0],
  id: string,
): Effect.Effect<boolean> =>
  Effect.tryPromise(() => verifyCronAbsent(list, id)).pipe(
    Effect.timeoutOption(cronVerificationListTimeout),
    Effect.catch(() => Effect.succeed(Option.none())),
    Effect.map(Option.getOrElse(() => false)),
  )

const cronRecord = (
  value: unknown,
  operation: string,
): Effect.Effect<CronRecord, HatchetSdkError> => {
  if (
    typeof value !== "object" ||
    value === null ||
    !("metadata" in value) ||
    typeof value.metadata !== "object" ||
    value.metadata === null ||
    !("id" in value.metadata) ||
    typeof value.metadata.id !== "string" ||
    !("workflowName" in value) ||
    typeof value.workflowName !== "string" ||
    !("cron" in value) ||
    typeof value.cron !== "string" ||
    !("enabled" in value) ||
    typeof value.enabled !== "boolean" ||
    !("method" in value) ||
    (value.method !== "DEFAULT" && value.method !== "API")
  ) {
    return Effect.fail(sdkError(operation, value))
  }
  return Effect.succeed({
    id: makeCronId(value.metadata.id),
    taskName: value.workflowName,
    ...("name" in value && typeof value.name === "string"
      ? { name: value.name }
      : {}),
    expression: value.cron,
    ...("input" in value && isTransportObject(value.input)
      ? { input: value.input }
      : {}),
    ...("additionalMetadata" in value &&
        isTransportObject(value.additionalMetadata)
      ? { additionalMetadata: value.additionalMetadata }
      : {}),
    enabled: value.enabled,
    method: value.method,
    ...("priority" in value && typeof value.priority === "number"
      ? { priority: value.priority }
      : {}),
  })
}

const reconcileCronCreateWithinBound = (
  list: () => Promise<unknown>,
  taskName: string,
  name: string,
): Effect.Effect<Option.Option<CronRecord>> =>
  Effect.tryPromise(list).pipe(
    Effect.flatMap((response) => {
      if (
        typeof response !== "object" ||
        response === null ||
        !("rows" in response) ||
        !Array.isArray(response.rows)
      ) {
        return Effect.succeed(Option.none())
      }
      return Effect.forEach(response.rows, (row) => cronRecord(row, "cron.list")).pipe(
        Effect.map((records) => {
          const matches = records.filter(
            (record) => record.taskName === taskName && record.name === name,
          )
          const [only] = matches
          return matches.length === 1 && only !== undefined
            ? Option.some(only)
            : Option.none()
        }),
      )
    }),
    Effect.timeoutOption(cronVerificationListTimeout),
    Effect.catch(() => Effect.succeed(Option.none())),
    Effect.map((result) => Option.isSome(result) ? result.value : Option.none()),
  )

const makeService = <Requirements>(
  client: ReturnType<typeof HatchetClient.init>,
  options: HatchetOptions,
  declarationsToLoad: ReadonlyArray<Task.Any<Requirements>>,
): Effect.Effect<
  Hatchet.Service,
  HatchetSdkError,
  Scope.Scope | Requirements
> =>
  Effect.gen(function*() {
    const tasks = Registry.make()
    const declarations = new Map<string, LiveDeclaration>()
    const taskIdentities = new Set<object>()
    let closing = false

    const addDeclaration = <Name extends string, Input, Output, Error>(
      task: Task.Task<Name, Input, Output, Error, Requirements>,
      context: Context.Context<Requirements>,
    ) => {
      tasks.add(task, context)
      const rateLimits = SdkDeclaration.rateLimits(task.rateLimits)
      const on = SdkDeclaration.on(task.triggers)
      const declaration = client.task<JsonObject, LiveOutputEnvelope>({
        name: task.name,
        ...(rateLimits.length === 0 ? {} : { rateLimits }),
        ...(on === undefined ? {} : { on }),
        fn: (input, sdkContext) => {
          const stored = tasks.run<Output, Error>(task.name, input, {
            workflowRunId: Option.some(sdkContext.workflowRunId()),
            taskRunExternalId: Option.some(sdkContext.taskRunExternalId()),
            interruption: abortSignalEffect(sdkContext.abortController.signal),
          })
          if (!stored) {
            return Promise.reject(new Error(`Missing task: ${task.name}`))
          }
          const encoded = Effect.raceFirst(
            abortSignalEffect(sdkContext.abortController.signal),
            stored,
          ).pipe(
            Effect.flatMap((value) =>
              task.outputSchema
                ? Schema.encodeUnknownEffect(task.outputSchema)(value).pipe(
                  Effect.mapError(
                    (issue) =>
                      new TaskSchemaError({
                        taskName: task.name,
                        phase: "output",
                        issue,
                      }),
                  ),
                )
                : Effect.succeed(value)
            ),
          )
          return Effect.runPromiseExit(Effect.scoped(encoded)).then((exit) => {
            if (!Exit.isSuccess(exit)) throw new LiveCallbackError(exit.cause)
            if (!isTransportValue(exit.value)) {
              throw new LiveCallbackError(
                Cause.die(
                  new TypeError("live callback output is not transportable"),
                ),
              )
            }
            return { value: exit.value }
          })
        },
      })
      declarations.set(task.name, declaration)
      taskIdentities.add(task)
    }

    const context = yield* Effect.context<Requirements>()
    for (const task of declarationsToLoad) {
      Declarations.rateLimits(task.name, task.rateLimits)
      Declarations.triggers(task.name, task.triggers)
    }
    for (const task of declarationsToLoad) addDeclaration(task, context)

    let startFiber: Fiber.Fiber<void, HatchetSdkError> | undefined
    const workflows = Array.from(declarations.values())
    const worker = yield* Effect.acquireRelease(
      Effect.tryPromise({
        try: () =>
          client.worker(options.worker.name, {
            workflows,
            ...(options.worker.slots === undefined
              ? {}
              : { slots: options.worker.slots }),
            ...(options.worker.labels === undefined
              ? {}
              : { labels: options.worker.labels }),
            ...(options.worker.handleKill === undefined
              ? {}
              : { handleKill: options.worker.handleKill }),
          }),
        catch: (originalCause) => sdkError("client.worker", originalCause, options.worker.name),
      }),
      (worker, exit) =>
        Effect.uninterruptible(
          Effect.gen(function*() {
            closing = true
            const stopped = yield* Effect.tryPromise({
              try: () => worker.stop(),
              catch: (originalCause) => new WorkerStopDefect(originalCause),
            }).pipe(
              Effect.timeout(options.worker.stopTimeoutMs ?? 5_000),
              Effect.mapError((cause) =>
                cause instanceof WorkerStopDefect
                  ? cause
                  : new WorkerStopDefect(cause)
              ),
              Effect.interruptible,
              Effect.exit,
            )
            yield* startFiber ? Fiber.interrupt(startFiber) : Effect.void
            if (Exit.isFailure(stopped)) {
              const stopDefect = Cause.squash(stopped.cause)
              if (!(stopDefect instanceof WorkerStopDefect)) {
                return yield* Effect.die(stopDefect)
              }
              const timedOut = Cause.isTimeoutError(stopDefect.originalCause)
              if (timedOut) {
                yield* Effect.logError(
                  "Hatchet worker stop timed out",
                  options.worker.name,
                )
              }
              if (Exit.isFailure(exit)) {
                if (!timedOut) {
                  yield* Effect.logError(
                    "Hatchet worker stop failed during failed scope cleanup",
                    stopDefect.originalCause,
                  )
                }
                return
              }
              return yield* Effect.die(stopDefect)
            }
          }),
        ),
    )
    const started = yield* Effect.try({
      try: () => worker.start(),
      catch: (originalCause) => sdkError("worker.start", originalCause, options.worker.name),
    })
    startFiber = yield* Effect.tryPromise({
      try: () => started,
      catch: (originalCause) => sdkError("worker.start", originalCause, options.worker.name),
    }).pipe(Effect.forkScoped)
    yield* Effect.tryPromise({
      try: () => worker.waitUntilReady(options.worker.readyTimeoutMs),
      catch: (originalCause) => sdkError("worker.waitUntilReady", originalCause, options.worker.name),
    })

    const ensureKnown = (task: object & { readonly name: string }) =>
      taskIdentities.has(task)
        ? Effect.void
        : Effect.fail(new MissingTaskError({ taskName: task.name }))

    const ensureOpen = (operation: string) =>
      closing
        ? Effect.fail(
          sdkError(
            operation,
            new Error("worker scope is closing"),
            options.worker.name,
          ),
        )
        : Effect.void

    const encodeInput = <
      Name extends string,
      Input,
      Output,
      Error,
      TaskRequirements,
    >(
      task: Task.Task<Name, Input, Output, Error, TaskRequirements>,
      input: unknown,
      operation: string,
    ): Effect.Effect<
      JsonObject,
      MissingTaskError | TaskSchemaError | HatchetSdkError
    > =>
      ensureKnown(task).pipe(
        Effect.andThen(
          task.inputSchema
            ? Schema.encodeUnknownEffect(task.inputSchema)(input).pipe(
              Effect.mapError(
                (issue) =>
                  new TaskSchemaError({
                    taskName: task.name,
                    phase: "input",
                    issue,
                  }),
              ),
            )
            : Effect.succeed(input),
        ),
        Effect.flatMap((value) =>
          isTransportObject(value)
            ? Effect.succeed(value)
            : Effect.fail(
              sdkError(
                operation,
                new TypeError(
                  "live task input must encode to a transportable JsonObject",
                ),
                task.name,
              ),
            )
        ),
      )

    const runNoWait: Hatchet.Service["runNoWait"] = (task, input) =>
      Effect.gen(function*() {
        yield* ensureOpen("worker.run")
        const encodedInput = yield* encodeInput(
          task,
          input,
          "task.runNoWait.input",
        )
        const declaration = declarations.get(task.name)
        if (!declaration) {
          return yield* new MissingTaskError({ taskName: task.name })
        }
        const reference = yield* Effect.tryPromise({
          try: () => declaration.runNoWait(encodedInput),
          catch: (originalCause) => sdkError("task.runNoWait", originalCause, task.name),
        })
        const compensate = Effect.tryPromise({
          try: () => reference.cancel(),
          catch: () => undefined,
        }).pipe(Effect.ignore)
        const id = yield* Effect.tryPromise({
          try: () => reference.runId,
          catch: (originalCause) => sdkError("run.runId", originalCause, task.name),
        }).pipe(
          Effect.flatMap((rawId) =>
            Effect.try({
              try: () => makeRunId(rawId),
              catch: (originalCause) => sdkError("run.runId", originalCause, task.name),
            })
          ),
          Effect.tapError(() => compensate),
        )
        const awaitOutput = Effect.gen(function*() {
          const envelope = yield* Effect.tryPromise({
            try: () => reference.output,
            catch: (originalCause) => sdkError("run.output", originalCause, id),
          })
          if (
            envelope === null ||
            typeof envelope !== "object" ||
            Array.isArray(envelope) ||
            !Object.hasOwn(envelope, "value")
          ) {
            return yield* sdkError("run.output", envelope, id)
          }
          if (!task.outputSchema) return envelope.value as never
          return yield* Schema.decodeUnknownEffect(task.outputSchema)(
            envelope.value,
          ).pipe(
            Effect.mapError(
              (issue) =>
                new TaskSchemaError({
                  taskName: task.name,
                  phase: "output",
                  issue,
                }),
            ),
          )
        })
        const cancel = yield* Effect.cached(
          Effect.tryPromise({
            try: () => reference.cancel(),
            catch: (originalCause) => sdkError("run.cancel", originalCause, id),
          }),
        )
        return { id, await: awaitOutput, cancel }
      })

    const createCron: Hatchet.Service["createCron"] = (task, cronOptions) =>
      Effect.gen(function*() {
        yield* CronValidation.validateCreate(cronOptions)
        yield* ensureKnown(task)
        const encoded = task.inputSchema
          ? yield* Schema.encodeUnknownEffect(task.inputSchema)(
            cronOptions.input,
          ).pipe(
            Effect.mapError(
              (issue) =>
                new TaskSchemaError({
                  taskName: task.name,
                  phase: "input",
                  issue,
                }),
            ),
          )
          : cronOptions.input
        const input = yield* CronValidation.validateInput(encoded)
        const result = yield* Effect.tryPromise({
          try: () =>
            client.crons.create(task.name, {
              name: cronOptions.name,
              expression: CronExpression.source(cronOptions.schedule),
              input,
              ...(cronOptions.additionalMetadata === undefined
                ? {}
                : { additionalMetadata: cronOptions.additionalMetadata }),
              ...(cronOptions.priority === undefined
                ? {}
                : { priority: cronOptions.priority }),
            }),
          catch: (cause) => sdkError("cron.create", cause),
        }).pipe(Effect.result)
        if (result._tag === "Success") {
          return yield* cronRecord(result.success, "cron.create")
        }
        if (!isAmbiguousCronCreateCause(getErrorCause(result.failure))) {
          return yield* result.failure
        }
        const reconciled = yield* reconcileCronCreateWithinBound(
          () =>
            client.crons.list({
              workflow: task.name,
              ...{ name: cronOptions.name },
              offset: 0,
              limit: 2,
            }),
          task.name,
          cronOptions.name,
        )
        if (Option.isSome(reconciled)) return reconciled.value
        return yield* result.failure
      })

    return {
      run: (task, input) => runNoWait(task, input).pipe(Effect.flatMap((handle) => handle.await)),
      runNoWait,
      schedule: (task, input, timing) =>
        Effect.gen(function*() {
          const encodedInput = yield* encodeInput(
            task,
            input,
            "task.schedule.input",
          )
          const now = yield* Clock.currentTimeMillis
          const triggerAt = timing._tag === "At"
            ? timing.at
            : new Date(now + Duration.toMillis(timing.delay))
          if (
            !Number.isFinite(triggerAt.getTime()) ||
            triggerAt.getTime() <= now
          ) {
            return yield* new InvalidTimeError({
              field: timing._tag === "At" ? "at" : "delay",
              originalCause: timing,
            })
          }
          const response = yield* Effect.tryPromise({
            try: () =>
              client.scheduled.create(task.name, {
                triggerAt,
                input: encodedInput,
              }),
            catch: (cause) => sdkError("schedule.create", cause),
          })
          return yield* scheduleRecord(response, "schedule.create")
        }),
      getSchedule: (id) =>
        Effect.tryPromise({
          try: () => client.scheduled.get(id),
          catch: (cause) => sdkError("schedule.get", cause, id),
        }).pipe(
          Effect.flatMap((response) =>
            scheduleRecord(response, "schedule.get").pipe(
              Effect.map(Option.some),
            )
          ),
          Effect.catchIf(isNotFound, () => Effect.succeed(Option.none())),
        ),
      deleteSchedule: (id) =>
        Effect.tryPromise({
          try: () => client.scheduled.delete(id),
          catch: (cause) => sdkError("schedule.delete", cause, id),
        }).pipe(
          Effect.as(true),
          Effect.catchIf(isNotFound, () => Effect.succeed(false)),
        ),
      cancelRun: (id) =>
        Effect.tryPromise({
          try: () => client.runs.cancel({ ids: [id] }),
          catch: (cause) => sdkError("run.cancel", cause, id),
        }).pipe(Effect.asVoid),
      createCron,
      getCron: (id) =>
        Effect.tryPromise({
          try: () => client.crons.get(id),
          catch: (cause) => sdkError("cron.get", cause, id),
        }).pipe(
          Effect.flatMap((response) => cronRecord(response, "cron.get").pipe(Effect.map(Option.some))),
          Effect.catchIf(isNotFound, () => Effect.succeed(Option.none())),
        ),
      listCrons: (listOptions = {}) =>
        Effect.gen(function*() {
          yield* CronValidation.validateList(listOptions)
          const response = yield* Effect.tryPromise({
            try: () =>
              client.crons.list({
                ...(listOptions.taskName === undefined
                  ? {}
                  : { workflow: listOptions.taskName }),
                ...(listOptions.name === undefined
                  ? {}
                  : { name: listOptions.name }),
                ...(listOptions.offset === undefined
                  ? {}
                  : { offset: listOptions.offset }),
                ...(listOptions.limit === undefined
                  ? {}
                  : { limit: listOptions.limit }),
              }),
            catch: (cause) => sdkError("cron.list", cause),
          })
          return yield* Array.isArray(response.rows)
            ? Effect.forEach(response.rows, (cron) => cronRecord(cron, "cron.list"))
            : Effect.fail(sdkError("cron.list", response))
        }),
      deleteCron: (id) =>
        Effect.tryPromise({
          try: () => client.crons.delete(id),
          catch: (cause) => sdkError("cron.delete", cause, id),
        }).pipe(
          Effect.as(true),
          Effect.catchIf(
            () => true,
            (deleteError: HatchetSdkError) => {
              if (isNotFound(deleteError)) return Effect.succeed(false)
              return verifyCronAbsentWithinBound(
                (query) => client.crons.list(query),
                id,
              ).pipe(
                Effect.flatMap((absent) => absent ? Effect.succeed(false) : Effect.fail(deleteError)),
              )
            },
          ),
        ),
    }
  })

const invalid = (
  field: string,
  message: string,
): Effect.Effect<never, InvalidHatchetConfiguration> => Effect.fail(new InvalidHatchetConfiguration({ field, message }))

const validate = (
  options: HatchetOptions,
): Effect.Effect<void, InvalidHatchetConfiguration> =>
  Effect.gen(function*() {
    if (Redacted.value(options.client.token).trim().length === 0) {
      return yield* invalid("client.token", "client.token is required")
    }
    if (options.worker.name.length === 0) {
      return yield* invalid("worker.name", "worker.name is required")
    }
    if (
      options.worker.slots !== undefined &&
      (options.worker.labels !== undefined ||
        options.worker.handleKill !== undefined)
    ) {
      return yield* invalid(
        "worker",
        "slots cannot be combined with labels or handleKill",
      )
    }
    for (const [field, value] of Object.entries(options.client)) {
      if (typeof value === "string" && value.length === 0) {
        return yield* invalid(
          `client.${field}`,
          "explicit client strings must not be empty",
        )
      }
    }
  })

export const layer = <Requirements>(
  options: HatchetOptions,
  tasks: ReadonlyArray<Task.Any<Requirements>>,
): Layer.Layer<
  Hatchet.Hatchet,
  InvalidHatchetConfiguration | HatchetConfigError | HatchetSdkError,
  Requirements
> =>
  Layer.effect(Hatchet.Hatchet)(
    Effect.gen(function*() {
      yield* validate(options)
      const client = options.client
      const sdkClient = yield* Effect.try({
        try: () =>
          HatchetClient.init({
            token: Redacted.value(client.token),
            ...(client.hostPort === undefined
              ? {}
              : { host_port: client.hostPort }),
            ...(client.apiUrl === undefined ? {} : { api_url: client.apiUrl }),
            ...(client.tenantId === undefined
              ? {}
              : { tenant_id: client.tenantId }),
            ...(client.namespace === undefined
              ? {}
              : { namespace: client.namespace }),
            ...(client.logLevel === undefined
              ? {}
              : { log_level: client.logLevel }),
            ...(client.tlsStrategy === undefined
              ? {}
              : { tls_config: { tls_strategy: client.tlsStrategy } }),
          }),
        catch: (originalCause) => new HatchetConfigError({ field: "client", originalCause }),
      })
      return yield* makeService(sdkClient, options, tasks)
    }),
  )
