import * as Cause from "effect/Cause"
import * as Clock from "effect/Clock"
import type * as Config from "effect/Config"
import * as Context from "effect/Context"
import * as Deferred from "effect/Deferred"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import * as Scope from "effect/Scope"
import * as Semaphore from "effect/Semaphore"
import {
  HatchetConfigError,
  HatchetSdkError,
  InvalidCronError,
  InvalidCronFilterError,
  type InvalidHatchetConfiguration,
  InvalidTimeError,
  type MissingTaskError,
  TaskSchemaError,
} from "./Error.js"
import {
  type CronId,
  type CronRecord,
  makeCronId,
  makeRunId,
  makeScheduleId,
  type RunId,
  type ScheduleId,
  type ScheduleRecord,
} from "./Model.js"
import type { HatchetOptions } from "./HatchetConfig.js"
import * as HatchetConfig from "./HatchetConfig.js"
import * as Live from "./internal/live.js"
import * as Registry from "./internal/registry.js"
import type * as Task from "./Task.js"

export type { CronRecord, ScheduleRecord } from "./Model.js"

export interface RunHandle<Output, Error> {
  readonly id: RunId
  readonly await: Effect.Effect<
    Output,
    Error | TaskSchemaError | HatchetSdkError
  >
  readonly cancel: Effect.Effect<void, HatchetSdkError>
}

export type ScheduleTiming =
  | { readonly _tag: "At"; readonly at: Date }
  | { readonly _tag: "After"; readonly delay: Duration.Input }

export interface CreateCronOptions {
  readonly name: string
  readonly expression: string
  readonly input: unknown
  readonly additionalMetadata?: Readonly<Record<string, string>>
  readonly priority?: 1 | 2 | 3
}

export interface ListCronOptions {
  readonly taskName?: string
  readonly name?: string
  readonly offset?: number
  readonly limit?: number
}

export type AcquisitionError =
  | HatchetConfigError
  | InvalidHatchetConfiguration
  | HatchetSdkError

export interface Service {
  readonly run: <Name extends string, Input, Output, Error, Requirements>(
    task: Task.Task<Name, Input, Output, Error, Requirements>,
    input: unknown,
  ) => Effect.Effect<
    Output,
    Error | TaskSchemaError | MissingTaskError | AcquisitionError,
    Requirements
  >
  readonly runNoWait: <Name extends string, Input, Output, Error, Requirements>(
    task: Task.Task<Name, Input, Output, Error, Requirements>,
    input: unknown,
  ) => Effect.Effect<
    RunHandle<Output, Error>,
    MissingTaskError | TaskSchemaError | AcquisitionError,
    Requirements
  >
  readonly schedule: <Name extends string, Input, Output, Error, Requirements>(
    task: Task.Task<Name, Input, Output, Error, Requirements>,
    input: unknown,
    timing: ScheduleTiming,
  ) => Effect.Effect<
    ScheduleRecord,
    MissingTaskError | InvalidTimeError | TaskSchemaError | AcquisitionError,
    Requirements
  >
  readonly getSchedule: (
    id: ScheduleId,
  ) => Effect.Effect<Option.Option<ScheduleRecord>, AcquisitionError>
  readonly deleteSchedule: (
    id: ScheduleId,
  ) => Effect.Effect<boolean, AcquisitionError>
  readonly cancelRun: (id: RunId) => Effect.Effect<void, AcquisitionError>
  readonly createCron: <
    Name extends string,
    Input,
    Output,
    Error,
    Requirements,
  >(
    task: Task.Task<Name, Input, Output, Error, Requirements>,
    options: CreateCronOptions,
  ) => Effect.Effect<
    CronRecord,
    MissingTaskError | InvalidCronError | TaskSchemaError | AcquisitionError,
    Requirements
  >
  readonly getCron: (
    id: CronId,
  ) => Effect.Effect<Option.Option<CronRecord>, AcquisitionError>
  readonly listCrons: (
    options?: ListCronOptions,
  ) => Effect.Effect<
    ReadonlyArray<CronRecord>,
    InvalidCronFilterError | AcquisitionError
  >
  readonly deleteCron: (id: CronId) => Effect.Effect<boolean, AcquisitionError>
}

export class Hatchet extends Context.Service<Hatchet, Service>()(
  "@effectify/hatchet/Hatchet",
) {}

const isTransportValue = (value: unknown): boolean => {
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

const isTransportObject = (
  value: unknown,
): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" &&
  value !== null &&
  !Array.isArray(value) &&
  Object.getPrototypeOf(value) === Object.prototype &&
  Object.values(value).every(isTransportValue)

const makeInMemoryService = (ownerScope: Scope.Scope): Service => {
  const tasks = Registry.make()
  const schedules = new Map<
    ScheduleId,
    {
      readonly record: ScheduleRecord
      readonly fiber: Fiber.Fiber<void, never>
      deleting: boolean
    }
  >()
  const runs = new Map<RunId, Fiber.Fiber<unknown, unknown>>()
  const crons = new Map<CronId, CronRecord>()
  let nextRunId = 1
  let nextScheduleId = 1
  let nextCronId = 1

  const ensureTask = <Name extends string, Input, Output, Error, Requirements>(
    task: Task.Task<Name, Input, Output, Error, Requirements>,
  ): Effect.Effect<void, never, Requirements> =>
    Effect.gen(function*() {
      if (tasks.has(task.name)) return
      const context = yield* Effect.context<Requirements>()
      tasks.add(task, context)
    })

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

  const mapTaskSchemaError = (taskName: string, phase: "input" | "output") => (issue: unknown) =>
    new TaskSchemaError({ taskName, phase, issue })

  const executeDecoded = <
    Name extends string,
    Input,
    Output,
    Error,
    Requirements,
  >(
    task: Task.Task<Name, Input, Output, Error, Requirements>,
    input: Input,
    context: Task.Context,
  ) =>
    Effect.scoped(task.execute(input, context)).pipe(
      Effect.tap((output) =>
        task.outputSchema
          ? Schema.encodeUnknownEffect(task.outputSchema)(output).pipe(
            Effect.mapError(mapTaskSchemaError(task.name, "output")),
          )
          : Effect.void
      ),
    )

  type PreparedExecution<Output, Error, Requirements> = (
    context: Task.Context,
  ) => Effect.Effect<Output, Error | TaskSchemaError, Requirements>

  const prepareInput = <
    Name extends string,
    Input,
    Output,
    Error,
    Requirements,
  >(
    task: Task.Task<Name, Input, Output, Error, Requirements>,
    input: unknown,
  ): Effect.Effect<
    PreparedExecution<Output, Error, Requirements>,
    TaskSchemaError
  > => {
    if (!task.inputSchema) {
      return Effect.succeed((context: Task.Context) =>
        Effect.scoped(
          tasks.run<Output, Error>(task.name, input, context) ??
            Effect.die("registered task disappeared"),
        )
      )
    }
    return Schema.decodeUnknownEffect(task.inputSchema)(input).pipe(
      Effect.mapError(mapTaskSchemaError(task.name, "input")),
      Effect.map(
        (decoded) => (context: Task.Context) => executeDecoded(task, decoded, context),
      ),
    )
  }

  const runNoWait = <Name extends string, Input, Output, Error, Requirements>(
    task: Task.Task<Name, Input, Output, Error, Requirements>,
    input: unknown,
  ): Effect.Effect<
    RunHandle<Output, Error>,
    MissingTaskError | TaskSchemaError | HatchetSdkError,
    Requirements
  > =>
    Effect.gen(function*() {
      yield* ensureTask(task)
      const prepared = yield* prepareInput(task, input)
      const execution = nextContext()
      const fiber = yield* Effect.forkIn(
        prepared(execution.context),
        ownerScope,
      )
      const id = makeRunId(execution.id)
      const remove = Effect.sync(() => runs.delete(id))
      runs.set(id, fiber)
      return {
        id,
        await: Fiber.join(fiber).pipe(Effect.ensuring(remove)),
        cancel: Fiber.interrupt(fiber).pipe(
          Effect.asVoid,
          Effect.ensuring(remove),
        ),
      }
    })

  const schedule = <Name extends string, Input, Output, Error, Requirements>(
    task: Task.Task<Name, Input, Output, Error, Requirements>,
    input: unknown,
    timing: ScheduleTiming,
  ): Effect.Effect<
    ScheduleRecord,
    MissingTaskError | InvalidTimeError | TaskSchemaError | HatchetSdkError,
    Requirements
  > =>
    Effect.gen(function*() {
      yield* ensureTask(task)
      const now = yield* Clock.currentTimeMillis
      const triggerAt = timing._tag === "At"
        ? timing.at.getTime()
        : now + Duration.toMillis(timing.delay)
      if (!Number.isFinite(triggerAt) || triggerAt <= now) {
        return yield* new InvalidTimeError({
          field: timing._tag === "At" ? "at" : "delay",
          originalCause: timing,
        })
      }
      const prepared = yield* prepareInput(task, input)
      const id = makeScheduleId(`schedule-${nextScheduleId++}`)
      const record: ScheduleRecord = {
        id,
        taskName: task.name,
        triggerAt: new Date(triggerAt),
      }
      const execute = Effect.suspend(() => prepared(nextContext().context))
      const timer = Effect.sleep(triggerAt - now).pipe(
        Effect.andThen(execute),
        Effect.onError((cause) =>
          Cause.hasInterruptsOnly(cause)
            ? Effect.void
            : Effect.logError(
              `ScheduledTaskFailure scheduleId=${id} taskName=${task.name}`,
            )
        ),
        Effect.ignore,
        Effect.ensuring(Effect.sync(() => schedules.delete(id))),
      )
      const fiber = yield* Effect.forkIn(timer, ownerScope)
      schedules.set(id, { record, fiber, deleting: false })
      return record
    })

  const createCron = <Name extends string, Input, Output, Error, Requirements>(
    task: Task.Task<Name, Input, Output, Error, Requirements>,
    options: CreateCronOptions,
  ): Effect.Effect<
    CronRecord,
    MissingTaskError | InvalidCronError | TaskSchemaError | HatchetSdkError,
    Requirements
  > =>
    Effect.gen(function*() {
      yield* ensureTask(task)
      if (options.name.trim().length === 0) {
        return yield* new InvalidCronError({
          field: "name",
          originalCause: options.name,
        })
      }
      if (options.expression.trim().split(/\s+/).length !== 5) {
        return yield* new InvalidCronError({
          field: "expression",
          originalCause: options.expression,
        })
      }
      const input = task.inputSchema
        ? yield* Schema.encodeUnknownEffect(task.inputSchema)(
          options.input,
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
        : options.input
      if (!isTransportObject(input)) {
        return yield* new InvalidCronError({
          field: "input",
          originalCause: input,
        })
      }
      if (
        options.priority !== undefined &&
        (!Number.isInteger(options.priority) ||
          options.priority < 1 ||
          options.priority > 3)
      ) {
        return yield* new InvalidCronError({
          field: "priority",
          originalCause: options.priority,
        })
      }
      const record: CronRecord = {
        id: makeCronId(`cron-${nextCronId++}`),
        taskName: task.name,
        name: options.name,
        expression: options.expression,
        input,
        ...(options.additionalMetadata === undefined
          ? {}
          : { additionalMetadata: options.additionalMetadata }),
        enabled: true,
        method: "DEFAULT",
        ...(options.priority === undefined
          ? {}
          : { priority: options.priority }),
      }
      crons.set(record.id, record)
      return record
    })

  const listCrons = (
    options: ListCronOptions = {},
  ): Effect.Effect<
    ReadonlyArray<CronRecord>,
    InvalidCronFilterError | HatchetSdkError
  > =>
    Effect.gen(function*() {
      for (
        const [field, value] of [
          ["taskName", options.taskName],
          ["name", options.name],
        ] as const
      ) {
        if (value !== undefined && value.trim().length === 0) {
          return yield* new InvalidCronFilterError({
            field,
            originalCause: value,
          })
        }
      }
      for (
        const [field, value, valid] of [
          [
            "offset",
            options.offset,
            options.offset === undefined ||
            (Number.isInteger(options.offset) && options.offset >= 0),
          ],
          [
            "limit",
            options.limit,
            options.limit === undefined ||
            (Number.isInteger(options.limit) && options.limit > 0),
          ],
        ] as const
      ) {
        if (!valid) {
          return yield* new InvalidCronFilterError({
            field,
            originalCause: value,
          })
        }
      }
      return Array.from(crons.values())
        .filter(
          (cron) =>
            options.taskName === undefined ||
            cron.taskName === options.taskName,
        )
        .filter(
          (cron) => options.name === undefined || cron.name === options.name,
        )
        .slice(
          options.offset ?? 0,
          options.limit === undefined
            ? undefined
            : (options.offset ?? 0) + options.limit,
        )
    })

  return {
    run: (task, input) => runNoWait(task, input).pipe(Effect.flatMap((handle) => handle.await)),
    runNoWait,
    schedule,
    getSchedule: (id) => Effect.sync(() => Option.fromNullishOr(schedules.get(id)?.record)),
    deleteSchedule: (id) =>
      Effect.gen(function*() {
        const schedule = schedules.get(id)
        if (!schedule || schedule.deleting) return false
        schedule.deleting = true
        yield* Fiber.interrupt(schedule.fiber)
        return true
      }),
    cancelRun: (id) => {
      const run = runs.get(id)
      if (!run) {
        return Effect.fail(
          new HatchetSdkError({
            operation: "run.cancel",
            resourceId: id,
            originalCause: new Error("local run was not found"),
          }),
        )
      }
      return Fiber.interrupt(run).pipe(Effect.asVoid)
    },
    createCron,
    getCron: (id) => Effect.sync(() => Option.fromNullishOr(crons.get(id))),
    listCrons,
    deleteCron: (id) => Effect.sync(() => crons.delete(id)),
  }
}

export const layerInMemory = Layer.effect(Hatchet)(
  Effect.map(Scope.Scope, makeInMemoryService),
)

export interface LayerOptions<Tasks extends ReadonlyArray<Task.Any>> {
  readonly tasks: Tasks
  readonly options?: HatchetOptions
  readonly config?: Config.Config<HatchetOptions>
}

type Ready = {
  readonly service: Service
  readonly scope: Scope.Closeable
}

type State =
  | { readonly _tag: "Idle" }
  | {
    readonly _tag: "Initializing"
    readonly deferred: Deferred.Deferred<Ready, AcquisitionError>
    readonly scope: Scope.Closeable
  }
  | ({ readonly _tag: "Ready" } & Ready)
  | { readonly _tag: "Disposed" }

const initialize = <const Tasks extends ReadonlyArray<Task.Any>>(
  options: LayerOptions<Tasks>,
  scope: Scope.Closeable,
): Effect.Effect<Ready, AcquisitionError, Task.Requirements<Tasks[number]>> =>
  Effect.gen(function*() {
    const liveOptions = options.options === undefined
      ? yield* (options.config ?? HatchetConfig.fromEnv).pipe(
        Effect.mapError(
          (originalCause) => new HatchetConfigError({ field: "config", originalCause }),
        ),
      )
      : options.options
    const services = yield* Layer.buildWithScope(
      Live.layer<Task.Requirements<Tasks[number]>>(
        liveOptions,
        options.tasks as ReadonlyArray<
          Task.Any<Task.Requirements<Tasks[number]>>
        >,
      ),
      scope,
    )
    return { service: Context.get(services, Hatchet), scope }
  })

/**
 * Creates an inert package-owned Layer. Hatchet configuration, SDK acquisition,
 * task registration, and worker startup occur only on the first Hatchet operation.
 * Concurrent callers share an acquisition attempt; failed attempts are cleaned and
 * the next operation retries.
 */
export const layer = <const Tasks extends ReadonlyArray<Task.Any>>(
  options: LayerOptions<Tasks>,
): Layer.Layer<Hatchet, never, Task.Requirements<Tasks[number]>> =>
  Layer.effect(Hatchet)(
    Effect.gen(function*() {
      const ownerScope = yield* Scope.Scope
      const captured = yield* Effect.context<Task.Requirements<Tasks[number]>>()
      const mutex = yield* Semaphore.make(1)
      let state: State = { _tag: "Idle" }

      const transition = (expected: State, next: State) =>
        mutex.withPermit(
          Effect.sync(() => {
            if (state === expected) state = next
          }),
        )

      const start = Effect.all({
        childScope: Scope.make(),
        deferred: Deferred.make<Ready, AcquisitionError>(),
      }).pipe(
        Effect.flatMap(({ childScope, deferred }) => {
          const initializing: State = {
            _tag: "Initializing",
            deferred,
            scope: childScope,
          }
          state = initializing
          const attempt = Effect.exit(
            initialize(options, childScope).pipe(
              Effect.provideContext(captured),
            ),
          ).pipe(
            Effect.flatMap((exit) =>
              Effect.gen(function*() {
                if (Exit.isFailure(exit)) {
                  yield* Scope.close(childScope, exit)
                }
                yield* Deferred.done(deferred, exit)
                yield* transition(
                  initializing,
                  Exit.isSuccess(exit)
                    ? { _tag: "Ready", ...exit.value }
                    : { _tag: "Idle" },
                )
              })
            ),
          )
          return Effect.forkIn(attempt, ownerScope).pipe(
            Effect.as(Deferred.await(deferred)),
          )
        }),
      )

      const begin = mutex.withPermit(
        Effect.suspend(() => {
          switch (state._tag) {
            case "Ready":
              return Effect.succeed(Effect.succeed<Ready>(state))
            case "Initializing":
              return Effect.succeed(Deferred.await(state.deferred))
            case "Disposed":
              return Effect.succeed(
                Effect.fail(
                  new HatchetSdkError({
                    operation: "layer.operation",
                    originalCause: { reason: "Disposed" },
                  }),
                ),
              )
            case "Idle":
              return start
          }
        }),
      )

      const ready = Effect.flatten(begin)
      const use = <A, E, R>(
        operation: (service: Service) => Effect.Effect<A, E, R>,
      ) => Effect.flatMap(ready, ({ service }) => operation(service))

      const service = Hatchet.of({
        run: (task, input) => use((hatchet) => hatchet.run(task, input)),
        runNoWait: (task, input) => use((hatchet) => hatchet.runNoWait(task, input)),
        schedule: (task, input, timing) => use((hatchet) => hatchet.schedule(task, input, timing)),
        getSchedule: (id) => use((hatchet) => hatchet.getSchedule(id)),
        deleteSchedule: (id) => use((hatchet) => hatchet.deleteSchedule(id)),
        cancelRun: (id) => use((hatchet) => hatchet.cancelRun(id)),
        createCron: (task, cronOptions) => use((hatchet) => hatchet.createCron(task, cronOptions)),
        getCron: (id) => use((hatchet) => hatchet.getCron(id)),
        listCrons: (listOptions) => use((hatchet) => hatchet.listCrons(listOptions)),
        deleteCron: (id) => use((hatchet) => hatchet.deleteCron(id)),
      })

      yield* Effect.addFinalizer(() =>
        mutex.withPermit(
          Effect.gen(function*() {
            const previous = state
            state = { _tag: "Disposed" }
            if (previous._tag === "Ready" || previous._tag === "Initializing") {
              yield* Scope.close(previous.scope, Exit.void)
            }
          }),
        )
      )
      return service
    }),
  )

export const run = <Name extends string, Input, Output, Error, Requirements>(
  task: Task.Task<Name, Input, Output, Error, Requirements>,
  input: unknown,
): Effect.Effect<
  Output,
  Error | TaskSchemaError | MissingTaskError | AcquisitionError,
  Hatchet | Requirements
> => Effect.flatMap(Hatchet, (service) => service.run(task, input))

export const runNoWait = <
  Name extends string,
  Input,
  Output,
  Error,
  Requirements,
>(
  task: Task.Task<Name, Input, Output, Error, Requirements>,
  input: unknown,
): Effect.Effect<
  RunHandle<Output, Error>,
  MissingTaskError | TaskSchemaError | AcquisitionError,
  Hatchet | Requirements
> => Effect.flatMap(Hatchet, (service) => service.runNoWait(task, input))

export const schedule = <
  Name extends string,
  Input,
  Output,
  Error,
  Requirements,
>(
  task: Task.Task<Name, Input, Output, Error, Requirements>,
  input: unknown,
  timing: ScheduleTiming,
): Effect.Effect<
  ScheduleRecord,
  MissingTaskError | InvalidTimeError | TaskSchemaError | AcquisitionError,
  Hatchet | Requirements
> => Effect.flatMap(Hatchet, (service) => service.schedule(task, input, timing))

export const getSchedule = (
  id: ScheduleId,
): Effect.Effect<Option.Option<ScheduleRecord>, AcquisitionError, Hatchet> =>
  Effect.flatMap(Hatchet, (service) => service.getSchedule(id))

export const deleteSchedule = (
  id: ScheduleId,
): Effect.Effect<boolean, AcquisitionError, Hatchet> => Effect.flatMap(Hatchet, (service) => service.deleteSchedule(id))

export const cancelRun = (
  id: RunId,
): Effect.Effect<void, AcquisitionError, Hatchet> => Effect.flatMap(Hatchet, (service) => service.cancelRun(id))

export const createCron = <
  Name extends string,
  Input,
  Output,
  Error,
  Requirements,
>(
  task: Task.Task<Name, Input, Output, Error, Requirements>,
  options: CreateCronOptions,
): Effect.Effect<
  CronRecord,
  MissingTaskError | InvalidCronError | TaskSchemaError | AcquisitionError,
  Hatchet | Requirements
> => Effect.flatMap(Hatchet, (service) => service.createCron(task, options))

export const getCron = (
  id: CronId,
): Effect.Effect<Option.Option<CronRecord>, AcquisitionError, Hatchet> =>
  Effect.flatMap(Hatchet, (service) => service.getCron(id))

export const listCrons = (
  options?: ListCronOptions,
): Effect.Effect<
  ReadonlyArray<CronRecord>,
  InvalidCronFilterError | AcquisitionError,
  Hatchet
> => Effect.flatMap(Hatchet, (service) => service.listCrons(options))

export const deleteCron = (
  id: CronId,
): Effect.Effect<boolean, AcquisitionError, Hatchet> => Effect.flatMap(Hatchet, (service) => service.deleteCron(id))
