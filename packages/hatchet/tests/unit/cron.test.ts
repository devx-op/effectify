import { describe, expect, it } from "vitest"
import * as Effect from "effect/Effect"
import * as Result from "effect/Result"
import * as Schema from "effect/Schema"
import type * as Scope from "effect/Scope"
import { type CreateCronOptions, CronExpression, Hatchet, Task } from "@effectify/hatchet"
import * as CronValidation from "../../src/internal/cron-validation.js"
const task = Task.make({
  name: "cron-task",
  input: Schema.Struct({ count: Schema.NumberFromString }),
  fn: () => Effect.void,
})
const run = <A, E>(
  effect: Effect.Effect<A, E, Hatchet.Hatchet | Scope.Scope>,
) =>
  Effect.runPromise(
    Effect.scoped(effect.pipe(Effect.provide(Hatchet.layerInMemory))),
  )
const validSchedule = Effect.runSync(CronExpression.parse("0 9 * * 1-5"))
const valid: CreateCronOptions = {
  name: "daily",
  schedule: validSchedule,
  input: { count: 1 },
}
const invalidPriority: CreateCronOptions = { ...valid, priority: 1 }
Reflect.set(invalidPriority, "priority", 4)
type Case = readonly [
  string,
  Effect.Effect<unknown, { readonly field: string }>,
]
const validationCases: ReadonlyArray<Case> = [
  ["name", CronValidation.validateCreate({ ...valid, name: "  " })],
  ["priority", CronValidation.validateCreate(invalidPriority)],
  [
    "input",
    CronValidation.validateInput({ secret: "raw-secret", value: new Date() }),
  ],
  ["taskName", CronValidation.validateList({ taskName: " " })],
  ["name", CronValidation.validateList({ name: "" })],
  ["offset", CronValidation.validateList({ offset: -0.5 })],
  ["limit", CronValidation.validateList({ limit: 0 })],
  ["limit", CronValidation.validateList({ limit: 1.5 })],
]
describe("CronExpression", () => {
  it("parses a Hatchet-compatible five-field expression", async () => {
    const schedule = await Effect.runPromise(
      CronExpression.parse("0 9 * * 1-5"),
    )

    expect(CronExpression.source(schedule)).toBe("0 9 * * 1-5")
  })

  it.each([
    ["semantic invalidity", "61 9 * * *"],
    ["six fields", "0 0 9 * * *"],
  ])("rejects %s", async (_case, source) => {
    const error = await Effect.runPromise(
      CronExpression.parse(source).pipe(Effect.flip),
    )

    expect(error).toMatchObject({
      _tag: "InvalidCronError",
      field: "expression",
    })
  })

  it.each([null, {}, 42])("rejects non-string runtime input %j", async (input) => {
    const result = Reflect.apply(CronExpression.parseResult, undefined, [input])
    expect(Result.isFailure(result)).toBe(true)
    if (Result.isFailure(result)) {
      expect(result.failure).toMatchObject({
        _tag: "InvalidCronError",
        field: "expression",
      })
    }

    const effect = Reflect.apply(CronExpression.parse, undefined, [input])
    const error = await Effect.runPromise(effect.pipe(Effect.flip))
    expect(error).toMatchObject({ _tag: "InvalidCronError", field: "expression" })
  })

  it("preserves a normalized source string", async () => {
    const schedule = await Effect.runPromise(
      CronExpression.parse("  0   9  *  *   1-5  "),
    )

    expect(CronExpression.source(schedule)).toBe("0 9 * * 1-5")
    expect(Object.keys(schedule)).toEqual([])
    expect(JSON.stringify(schedule)).toBe("{}")
  })

  it("validates values at runtime without exposing internal state", () => {
    expect(() => Reflect.apply(CronExpression.source, undefined, [{}])).toThrow(
      "Invalid CronExpression value",
    )
  })

  it("previews deterministic next occurrences", async () => {
    const schedule = await Effect.runPromise(CronExpression.parse("* * * * *"))
    const after = new Date("2025-01-01T12:00:30.000Z")

    expect(CronExpression.next(schedule, after).toISOString()).toBe(
      "2025-01-01T12:01:00.000Z",
    )
    expect(
      CronExpression.nextRuns(schedule, 3, after).map((date) => date.toISOString()),
    ).toEqual([
      "2025-01-01T12:01:00.000Z",
      "2025-01-01T12:02:00.000Z",
      "2025-01-01T12:03:00.000Z",
    ])
  })
})

describe("cron validation and lifecycle", () => {
  it.each(
    validationCases,
  )("attributes invalid %s values without exposing input", async (field, effect) => {
    const error = await Effect.runPromise(Effect.flip(effect))
    expect(error).toMatchObject({ field })
    expect(JSON.stringify(error)).not.toContain("raw-secret")
  })
  it("creates distinct records and applies deterministic lifecycle operations", async () => {
    await run(
      Effect.gen(function*() {
        const first = yield* Hatchet.createCron(task, valid)
        const duplicate = yield* Hatchet.createCron(task, valid)
        expect(duplicate.id).not.toBe(first.id)
        expect(first.expression).toBe("0 9 * * 1-5")
        expect(first.input).toEqual({ count: "1" })
        expect((yield* Hatchet.getCron(first.id))._tag).toBe("Some")
        expect(
          yield* Hatchet.listCrons({
            taskName: task.name,
            offset: 1,
            limit: 1,
          }),
        ).toEqual([duplicate])
        expect(yield* Hatchet.listCrons({ name: "daily" })).toEqual([
          first,
          duplicate,
        ])
        expect([
          yield* Hatchet.deleteCron(first.id),
          yield* Hatchet.deleteCron(first.id),
        ]).toEqual([true, false])
        expect((yield* Hatchet.getCron(first.id))._tag).toBe("None")
      }),
    )
  })
})
