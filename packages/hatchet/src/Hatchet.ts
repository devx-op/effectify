import { Hatchet as HatchetClient, type JsonObject, type JsonValue } from "@hatchet-dev/typescript-sdk"
import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import type * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import type * as Scope from "effect/Scope"
import {
  DuplicateTaskError,
  HatchetConfigError,
  HatchetSdkError,
  MissingTaskError,
  TaskSchemaError,
  WorkerAlreadyStartedError,
} from "./Error.js"
import { makeRunId, type RunId } from "./Model.js"
import * as Registry from "./internal/registry.js"
import type * as Task from "./Task.js"

declare const RegisteredTaskTypeId: unique symbol

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
  & {
    readonly runNoWait: (input: JsonObject) => Promise<LiveRunReference>
  }

const isLiveTransportValue = (value: unknown): value is JsonValue => {
  if (
    value === null ||
    value === undefined ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return true
  }
  if (Array.isArray(value)) return value.every(isLiveTransportValue)
  if (
    typeof value !== "object" ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) {
    return false
  }
  return Object.values(value).every(isLiveTransportValue)
}

const isLiveTransportObject = (value: unknown): value is JsonObject =>
  typeof value === "object" &&
  value !== null &&
  !Array.isArray(value) &&
  Object.getPrototypeOf(value) === Object.prototype &&
  Object.values(value).every(isLiveTransportValue)

const toLiveOutputEnvelope = (value: JsonValue): LiveOutputEnvelope => ({
  value,
})

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

export interface RegisteredTask<Name extends string, Input, Output, Error> {
  readonly name: Name
  readonly [RegisteredTaskTypeId]: readonly [Input, Output, Error]
}

export interface RunHandle<Output, Error> {
  readonly id: RunId
  readonly await: Effect.Effect<
    Output,
    Error | TaskSchemaError | HatchetSdkError
  >
  readonly cancel: Effect.Effect<void, HatchetSdkError>
}

export interface LiveOptions {
  readonly worker: {
    readonly name: string
    readonly slots?: number
    readonly labels?: Readonly<Record<string, string | number>>
    readonly handleKill?: boolean
    readonly readyTimeoutMs?: number
    readonly stopTimeout?: Duration.Input
  }
  readonly client?: {
    readonly token?: string
    readonly hostPort?: string
    readonly apiUrl?: string
    readonly tenantId?: string
    readonly namespace?: string
    readonly logLevel?: "OFF" | "DEBUG" | "INFO" | "WARN" | "ERROR"
  }
}

export interface Service {
  readonly register: <Name extends string, Input, Output, Error, Requirements>(
    task: Task.Task<Name, Input, Output, Error, Requirements>,
  ) => Effect.Effect<
    RegisteredTask<Name, Input, Output, Error>,
    DuplicateTaskError | WorkerAlreadyStartedError,
    Requirements
  >
  readonly run: <Name extends string, Input, Output, Error>(
    task: RegisteredTask<Name, Input, Output, Error>,
    input: unknown,
  ) => Effect.Effect<
    Output,
    Error | TaskSchemaError | MissingTaskError | HatchetSdkError,
    Scope.Scope
  >
  readonly runNoWait: <Name extends string, Input, Output, Error>(
    task: RegisteredTask<Name, Input, Output, Error>,
    input: unknown,
  ) => Effect.Effect<
    RunHandle<Output, Error>,
    MissingTaskError | TaskSchemaError | HatchetSdkError,
    Scope.Scope
  >
}

export class Hatchet extends Context.Service<Hatchet, Service>()(
  "@effectify/hatchet/Hatchet",
) {}

const makeInMemoryService = (): Service => {
  const tasks = Registry.make()
  const capabilities = new WeakMap<object, string>()
  let nextRunId = 1
  const registeredName = <Name extends string, Input, Output, Error>(
    task: RegisteredTask<Name, Input, Output, Error>,
  ): string | undefined => capabilities.get(task)
  const nextContext = (): {
    readonly id: string
    readonly context: Task.Context
  } => {
    const id = `run-${nextRunId++}`
    return {
      id,
      context: {
        workflowRunId: Option.some(id),
        taskRunExternalId: Option.some(`task-${id}`),
        interruption: Effect.never,
      },
    }
  }
  return {
    register: <Name extends string, Input, Output, Error, Requirements>(
      task: Task.Task<Name, Input, Output, Error, Requirements>,
    ) =>
      Effect.gen(function*() {
        if (tasks.has(task.name)) {
          return yield* new DuplicateTaskError({ taskName: task.name })
        }
        const context = yield* Effect.context<Requirements>()
        tasks.register(task, context)
        const registered = Object.freeze({ name: task.name }) as RegisteredTask<
          Name,
          Input,
          Output,
          Error
        >
        capabilities.set(registered, task.name)
        return registered
      }),
    run: <Name extends string, Input, Output, Error>(
      task: RegisteredTask<Name, Input, Output, Error>,
      input: unknown,
    ) => {
      const name = registeredName(task)
      if (!name) {
        return Effect.fail(new MissingTaskError({ taskName: task.name }))
      }
      const execution = nextContext()
      const stored = tasks.run<Output, Error>(name, input, execution.context)
      return (
        stored ?? Effect.fail(new MissingTaskError({ taskName: task.name }))
      )
    },
    runNoWait: <Name extends string, Input, Output, Error>(
      task: RegisteredTask<Name, Input, Output, Error>,
      input: unknown,
    ) => {
      const name = registeredName(task)
      if (!name) {
        return Effect.fail(new MissingTaskError({ taskName: task.name }))
      }
      const execution = nextContext()
      const stored = tasks.run<Output, Error>(name, input, execution.context)
      if (!stored) {
        return Effect.fail(new MissingTaskError({ taskName: task.name }))
      }
      return Effect.gen(function*() {
        const fiber = yield* stored.pipe(Effect.forkScoped)
        return {
          id: makeRunId(execution.id),
          await: Fiber.join(fiber),
          cancel: Fiber.interrupt(fiber).pipe(Effect.asVoid),
        }
      })
    },
  }
}

const makeLiveService = (
  client: ReturnType<typeof HatchetClient.init>,
  options: LiveOptions,
): Effect.Effect<Service, never, Scope.Scope> =>
  Effect.gen(function*() {
    const tasks = Registry.make()
    const capabilities = new WeakMap<object, string>()
    const inputSchemas = new WeakMap<
      object,
      Schema.Codec<unknown, unknown, never, never> | undefined
    >()
    const outputSchemas = new WeakMap<
      object,
      Schema.Codec<unknown, unknown, never, never> | undefined
    >()
    const declarations = new Map<string, LiveDeclaration>()
    const stopTimeout = options.worker.stopTimeout ?? "5 seconds"
    let lifecycle: "collecting" | "starting" | "ready" | "closing" = "collecting"
    const isClosing = (): boolean => lifecycle === "closing"

    const ensureReady = yield* Effect.cached(
      Effect.suspend(() => {
        lifecycle = "starting"
        const snapshot = Array.from(declarations.values())
        if (snapshot.length === 0) {
          return Effect.fail(
            new HatchetSdkError({
              operation: "worker.registerWorkflows",
              resourceId: options.worker.name,
              originalCause: new Error(
                "cannot start a worker without registrations",
              ),
            }),
          )
        }
        return Effect.gen(function*() {
          let startFiber: Fiber.Fiber<void, HatchetSdkError> | undefined
          const worker = yield* Effect.acquireRelease(
            Effect.tryPromise({
              try: () =>
                options.worker.slots === undefined
                  ? client.worker(options.worker.name, {
                    ...(options.worker.labels === undefined
                      ? {}
                      : { labels: options.worker.labels }),
                    ...(options.worker.handleKill === undefined
                      ? {}
                      : { handleKill: options.worker.handleKill }),
                  })
                  : client.worker(options.worker.name, options.worker.slots),
              catch: (originalCause) =>
                new HatchetSdkError({
                  operation: "client.worker",
                  resourceId: options.worker.name,
                  originalCause,
                }),
            }),
            (worker, exit) =>
              Effect.uninterruptible(
                Effect.gen(function*() {
                  lifecycle = "closing"
                  const stopped = yield* Effect.tryPromise({
                    try: () => worker.stop(),
                    catch: (originalCause) => new WorkerStopDefect(originalCause),
                  }).pipe(
                    Effect.timeout(stopTimeout),
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
                    const timedOut = Cause.isTimeoutError(
                      stopDefect.originalCause,
                    )
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
          yield* Effect.tryPromise({
            try: () => worker.registerWorkflows(snapshot),
            catch: (originalCause) =>
              new HatchetSdkError({
                operation: "worker.registerWorkflows",
                resourceId: options.worker.name,
                originalCause,
              }),
          })
          const start = worker.start()
          startFiber = yield* Effect.tryPromise({
            try: () => start,
            catch: (originalCause) =>
              new HatchetSdkError({
                operation: "worker.start",
                resourceId: options.worker.name,
                originalCause,
              }),
          }).pipe(Effect.forkScoped)
          yield* Effect.tryPromise({
            try: () => worker.waitUntilReady(options.worker.readyTimeoutMs),
            catch: (originalCause) =>
              new HatchetSdkError({
                operation: "worker.waitUntilReady",
                resourceId: options.worker.name,
                originalCause,
              }),
          })
          lifecycle = "ready"
        })
      }),
    )

    const runNoWait = <Name extends string, Input, Output, Error>(
      task: RegisteredTask<Name, Input, Output, Error>,
      input: unknown,
    ): Effect.Effect<
      RunHandle<Output, Error>,
      MissingTaskError | TaskSchemaError | HatchetSdkError,
      Scope.Scope
    > =>
      Effect.gen(function*() {
        if (isClosing()) {
          return yield* new HatchetSdkError({
            operation: "worker.run",
            resourceId: options.worker.name,
            originalCause: new Error("worker scope is closing"),
          })
        }
        const name = capabilities.get(task)
        if (!name) return yield* new MissingTaskError({ taskName: task.name })
        const inputSchema = inputSchemas.get(task)
        const encodedInput = inputSchema
          ? yield* Schema.encodeUnknownEffect(inputSchema)(input).pipe(
            Effect.mapError(
              (issue) =>
                new TaskSchemaError({
                  taskName: task.name,
                  phase: "input",
                  issue,
                }),
            ),
          )
          : input
        if (!isLiveTransportObject(encodedInput)) {
          return yield* new HatchetSdkError({
            operation: "task.runNoWait.input",
            resourceId: name,
            originalCause: new TypeError(
              "live task input must encode to a transportable JsonObject",
            ),
          })
        }
        yield* ensureReady
        if (isClosing()) {
          return yield* new HatchetSdkError({
            operation: "worker.run",
            resourceId: options.worker.name,
            originalCause: new Error("worker scope is closing"),
          })
        }
        const declaration = declarations.get(name)
        if (!declaration) {
          return yield* new MissingTaskError({ taskName: task.name })
        }
        const reference = yield* Effect.tryPromise({
          try: () => declaration.runNoWait(encodedInput),
          catch: (originalCause) =>
            new HatchetSdkError({
              operation: "task.runNoWait",
              resourceId: name,
              originalCause,
            }),
        })
        const id = makeRunId(
          yield* Effect.tryPromise({
            try: () => reference.runId,
            catch: (originalCause) =>
              new HatchetSdkError({
                operation: "run.runId",
                resourceId: name,
                originalCause,
              }),
          }),
        )
        const schema = outputSchemas.get(task)
        const awaitOutput: RunHandle<Output, Error>["await"] = Effect.gen(
          function*() {
            const envelope = yield* Effect.tryPromise({
              try: () => reference.output,
              catch: (originalCause) =>
                new HatchetSdkError({
                  operation: "run.output",
                  resourceId: id,
                  originalCause,
                }),
            })
            if (
              envelope === null ||
              typeof envelope !== "object" ||
              Array.isArray(envelope) ||
              !Object.hasOwn(envelope, "value")
            ) {
              return yield* new HatchetSdkError({
                operation: "run.output",
                resourceId: id,
                originalCause: envelope,
              })
            }
            if (!schema) return envelope.value as Output
            return (yield* Schema.decodeUnknownEffect(schema)(
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
            )) as Output
          },
        )
        return {
          id,
          await: awaitOutput,
          cancel: Effect.tryPromise({
            try: () => reference.cancel(),
            catch: (originalCause) =>
              new HatchetSdkError({
                operation: "run.cancel",
                resourceId: id,
                originalCause,
              }),
          }),
        }
      })

    return {
      register: <Name extends string, Input, Output, Error, Requirements>(
        task: Task.Task<Name, Input, Output, Error, Requirements>,
      ) =>
        Effect.gen(function*() {
          if (lifecycle !== "collecting") {
            return yield* new WorkerAlreadyStartedError({
              taskName: task.name,
              workerName: options.worker.name,
            })
          }
          if (tasks.has(task.name)) {
            return yield* new DuplicateTaskError({ taskName: task.name })
          }
          const context = yield* Effect.context<Requirements>()
          tasks.register(task, context)
          const declaration = client.task<JsonObject, LiveOutputEnvelope>({
            name: task.name,
            fn: (input, sdkContext) => {
              const stored = tasks.run<Output, Error>(task.name, input, {
                workflowRunId: Option.some(sdkContext.workflowRunId()),
                taskRunExternalId: Option.some(sdkContext.taskRunExternalId()),
                interruption: abortSignalEffect(
                  sdkContext.abortController.signal,
                ),
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
              return Effect.runPromiseExit(encoded).then(
                (exit): LiveOutputEnvelope => {
                  if (!Exit.isSuccess(exit)) {
                    throw new LiveCallbackError(exit.cause)
                  }
                  if (!isLiveTransportValue(exit.value)) {
                    throw new LiveCallbackError(
                      Cause.die(
                        new TypeError(
                          "live callback output is not transportable",
                        ),
                      ),
                    )
                  }
                  return toLiveOutputEnvelope(exit.value)
                },
              )
            },
          })
          declarations.set(task.name, declaration)
          const registered = Object.freeze({
            name: task.name,
          }) as RegisteredTask<Name, Input, Output, Error>
          capabilities.set(registered, task.name)
          inputSchemas.set(registered, task.inputSchema)
          outputSchemas.set(registered, task.outputSchema)
          return registered
        }),
      runNoWait,
      run: <Name extends string, Input, Output, Error>(
        task: RegisteredTask<Name, Input, Output, Error>,
        input: unknown,
      ) => runNoWait(task, input).pipe(Effect.flatMap((handle) => handle.await)),
    }
  })

export const layerInMemory = Layer.sync(Hatchet)(makeInMemoryService)

const invalid = (
  field: string,
  cause: string,
): Effect.Effect<never, HatchetConfigError> =>
  Effect.fail(
    new HatchetConfigError({ field, originalCause: new Error(cause) }),
  )

const validate = (
  options: LiveOptions,
): Effect.Effect<void, HatchetConfigError> =>
  Effect.gen(function*() {
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
    for (const [field, value] of Object.entries(options.client ?? {})) {
      if (value.length === 0) {
        return yield* invalid(
          `client.${field}`,
          "explicit client strings must not be empty",
        )
      }
    }
  })

export const layer = (
  options: LiveOptions,
): Layer.Layer<Hatchet, HatchetConfigError | HatchetSdkError, Scope.Scope> =>
  Layer.effect(Hatchet)(
    Effect.gen(function*() {
      yield* validate(options)
      const client = options.client
      const sdkClient = yield* Effect.try({
        try: () => {
          const config = {
            ...(client?.token === undefined ? {} : { token: client.token }),
            ...(client?.hostPort === undefined
              ? {}
              : { host_port: client.hostPort }),
            ...(client?.apiUrl === undefined ? {} : { api_url: client.apiUrl }),
            ...(client?.tenantId === undefined
              ? {}
              : { tenant_id: client.tenantId }),
            ...(client?.namespace === undefined
              ? {}
              : { namespace: client.namespace }),
            ...(client?.logLevel === undefined
              ? {}
              : { log_level: client.logLevel }),
          }
          return HatchetClient.init(config)
        },
        catch: (originalCause) => new HatchetConfigError({ field: "client", originalCause }),
      })
      return yield* makeLiveService(sdkClient, options)
    }),
  )

export const register = <
  Name extends string,
  Input,
  Output,
  Error,
  Requirements,
>(
  task: Task.Task<Name, Input, Output, Error, Requirements>,
): Effect.Effect<
  RegisteredTask<Name, Input, Output, Error>,
  DuplicateTaskError | WorkerAlreadyStartedError,
  Hatchet | Requirements
> =>
  Effect.gen(function*() {
    const service = yield* Hatchet
    return yield* service.register(task)
  })

export const run = <Name extends string, Input, Output, Error>(
  task: RegisteredTask<Name, Input, Output, Error>,
  input: unknown,
): Effect.Effect<
  Output,
  Error | TaskSchemaError | MissingTaskError | HatchetSdkError,
  Hatchet | Scope.Scope
> =>
  Effect.gen(function*() {
    const service = yield* Hatchet
    return yield* service.run(task, input)
  })

export const runNoWait = <Name extends string, Input, Output, Error>(
  task: RegisteredTask<Name, Input, Output, Error>,
  input: unknown,
): Effect.Effect<
  RunHandle<Output, Error>,
  MissingTaskError | TaskSchemaError | HatchetSdkError,
  Hatchet | Scope.Scope
> =>
  Effect.gen(function*() {
    const service = yield* Hatchet
    return yield* service.runNoWait(task, input)
  })
