import { expect, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import { make, publish } from "../src/internal/executable-evidence.js"

it.effect("captures a pre-cleanup terminal trail in revision order", () =>
  Effect.gen(function* () {
    const observer = yield* make()
    yield* publish(observer, [
      { revision: 1, state: "Validated", digest: "1".repeat(64) },
      { revision: 4, state: "Executing", digest: "4".repeat(64) },
      { revision: 5, state: "Succeeded", digest: "5".repeat(64) },
    ])

    expect(yield* observer.read).toEqual([
      { revision: 1, state: "Validated", digest: "1".repeat(64) },
      { revision: 4, state: "Executing", digest: "4".repeat(64) },
      { revision: 5, state: "Succeeded", digest: "5".repeat(64) },
    ])
  }),
)
