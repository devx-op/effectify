import * as Effect from "effect/Effect"

export const runTestEffect = <A, E>(effect: Effect.Effect<A, E, unknown>) =>
  Effect.runPromise(effect as Effect.Effect<A, E, never>)
