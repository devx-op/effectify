import { describe, expect, it } from "vitest"
import * as Effect from "effect/Effect"
import { Hatchet } from "@effectify/hatchet"

describe("Hatchet.pushEvent", () => {
  it("validates JSON-object events before side effects and echoes valid in-memory events", async () => {
    const invalid = await Effect.runPromise(
      Hatchet.pushEvent(" ", { value: "ok" }).pipe(Effect.flip, Effect.provide(Hatchet.layerInMemory), Effect.scoped),
    )
    expect(invalid).toMatchObject({
      _tag: "InvalidEventError",
      field: "key",
      reason: "EmptyKey",
    })

    const receipt = await Effect.runPromise(
      Hatchet.pushEvent(
        "customer.updated",
        { nested: [true, null] },
        {
          additionalMetadata: { source: "test" },
          priority: 4,
          scope: "tenant-a",
        },
      ).pipe(Effect.provide(Hatchet.layerInMemory), Effect.scoped),
    )
    expect(receipt).toEqual({
      eventId: "event-1",
      key: "customer.updated",
      payload: { nested: [true, null] },
      additionalMetadata: { source: "test" },
      scope: "tenant-a",
    })
  })

  it("rejects sparse JSON arrays without advancing the in-memory event counter", async () => {
    const payload = { nested: ["value"] }
    delete payload.nested[0]
    const program = Effect.gen(function* () {
      const service = yield* Hatchet.Hatchet
      const failure = yield* service.pushEvent("invalid", payload).pipe(Effect.flip)
      const receipt = yield* service.pushEvent("valid", { ok: true })
      return { failure, receipt }
    }).pipe(Effect.provide(Hatchet.layerInMemory), Effect.scoped)

    await expect(Effect.runPromise(program)).resolves.toMatchObject({
      failure: {
        _tag: "InvalidEventError",
        field: "payload",
        reason: "InvalidJsonObject",
      },
      receipt: { eventId: "event-1" },
    })
  })
})
