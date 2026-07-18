import { describe, expect, it } from "vitest"
import * as Effect from "effect/Effect"
import * as CronExpression from "../../src/CronExpression.js"
import * as Trigger from "../../src/Trigger.js"
import * as Declarations from "../../src/internal/declaration-validation.js"
import * as SdkDeclaration from "../../src/internal/sdk-declaration.js"

const cron = Effect.runSync(CronExpression.parse(" 0  9 * * 1-5 "))

describe("Trigger", () => {
  it("creates immutable package-owned event and cron values", () => {
    const event = Trigger.event("customer:updated")
    const scheduled = Trigger.cron(cron)

    expect(event).toEqual({ _tag: "Event", event: "customer:updated" })
    expect(scheduled).toEqual({ _tag: "Cron", expression: cron })
    expect(Object.isFrozen(event)).toBe(true)
    expect(Object.isFrozen(scheduled)).toBe(true)
  })

  it("preserves duplicates and stable per-kind order in on", () => {
    const triggers = [
      Trigger.event("first"),
      Trigger.cron(cron),
      Trigger.event("first"),
      Trigger.cron(Effect.runSync(CronExpression.parse("30 8 * * *"))),
    ]

    expect(Declarations.triggers("task", triggers)).toEqual(triggers)
    expect(SdkDeclaration.on(triggers)).toEqual({
      event: ["first", "first"],
      cron: ["0 9 * * 1-5", "30 8 * * *"],
    })
  })

  it("omits on for an empty collection", () => {
    expect(SdkDeclaration.on([])).toBeUndefined()
  })

  it.each([
    "",
    "  ",
    "event\u0000name",
  ])("rejects invalid event %j", (event) => {
    expect(() => Declarations.triggers("task", [Trigger.event(event)])).toThrow(
      "event",
    )
  })
})
