import * as Effect from "effect/Effect"

export type HatchetModule = typeof import("@effectify/hatchet")

export const loadHatchetModule = (): Effect.Effect<HatchetModule, Error> =>
  Effect.tryPromise({
    try: () => import("@effectify/hatchet"),
    catch: (cause) =>
      new Error(
        `Failed to load @effectify/hatchet route helpers: ${cause instanceof Error ? cause.message : String(cause)}`,
      ),
  })
