import * as Cron from "effect/Cron"
import type * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as Predicate from "effect/Predicate"
import * as Result from "effect/Result"
import { InvalidCronError } from "./Error.js"

const TypeId = "~effectify/hatchet/CronExpression"
const SourceId = "~effectify/hatchet/CronExpression/source"

export interface CronExpression {
  readonly [TypeId]: typeof TypeId
}

interface Encoded extends CronExpression {
  readonly [SourceId]: string
}

interface State {
  readonly source: string
  readonly cron: Cron.Cron
}

const states = new WeakMap<CronExpression, State>()

class Value implements Encoded {
  declare readonly [TypeId]: typeof TypeId
  declare readonly [SourceId]: string

  constructor(source: string, cron: Cron.Cron) {
    Object.defineProperties(this, {
      [TypeId]: { value: TypeId },
      [SourceId]: { value: source },
    })
    states.set(this, { source, cron })
    Object.freeze(this)
  }
}

const normalize = (input: string): string => input.trim().split(/\s+/).filter(Boolean).join(" ")

const parseCron = (source: string): Result.Result<Cron.Cron, unknown> =>
  source.split(" ").length === 5 ? Cron.parse(source) : Result.fail("Hatchet cron expressions require five fields")

const isEncoded = (value: unknown): value is Encoded =>
  Predicate.hasProperty(value, TypeId) &&
  value[TypeId] === TypeId &&
  Predicate.hasProperty(value, SourceId) &&
  typeof value[SourceId] === "string" &&
  normalize(value[SourceId]) === value[SourceId]

const state = (self: CronExpression): State => {
  const cached = Option.fromNullishOr(states.get(self))
  if (Option.isSome(cached)) return cached.value
  if (!isEncoded(self)) throw new TypeError("Invalid CronExpression value")
  return Result.match(parseCron(self[SourceId]), {
    onFailure: () => {
      throw new TypeError("Invalid CronExpression value")
    },
    onSuccess: (cron) => {
      const decoded = { source: self[SourceId], cron }
      states.set(self, decoded)
      return decoded
    },
  })
}

const invalid = (originalCause: unknown) => new InvalidCronError({ field: "expression", originalCause })

/** Parses exactly five Hatchet cron fields and preserves their normalized source. */
export const parseResult = (input: string): Result.Result<CronExpression, InvalidCronError> => {
  if (typeof input !== "string") {
    return Result.fail(invalid(new TypeError("Cron expression must be a string")))
  }
  const source = normalize(input)
  return Result.map(parseCron(source), (cron) => new Value(source, cron)).pipe(Result.mapError(invalid))
}

/** Effect-native parser for untrusted cron expression boundaries. */
export const parse = (input: string): Effect.Effect<CronExpression, InvalidCronError> =>
  Result.match(parseResult(input), {
    onFailure: Effect.fail,
    onSuccess: Effect.succeed,
  })

/** Returns the normalized five-field source accepted by Hatchet. */
export const source = (self: CronExpression): string => state(self).source

/** Returns the next occurrence strictly after the supplied instant. */
export const next = (self: CronExpression, after?: DateTime.DateTime.Input): Date => Cron.next(state(self).cron, after)

/** Returns a finite preview of upcoming occurrences. */
export const nextRuns = (self: CronExpression, count: number, after?: DateTime.DateTime.Input): ReadonlyArray<Date> => {
  if (!Number.isSafeInteger(count) || count <= 0) return []
  const dates: Array<Date> = []
  for (const date of Cron.sequence(state(self).cron, after)) {
    dates.push(date)
    if (dates.length === count) break
  }
  return dates
}

export * as CronExpression from "./CronExpression.js"
