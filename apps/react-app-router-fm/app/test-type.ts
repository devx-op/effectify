import * as Effect from "effect/Effect"
import { withLoaderEffect } from "./app/lib/runtime.server.js"

// This should fail if withLoaderEffect enforces R
const _test = withLoaderEffect(
  Effect.gen(function*() {
    yield* Effect.fail("error")
    // Introduce a requirement not in R (assuming R is just Auth)
    // We need a dummy tag
    const _MyTag = yield* Effect.tag<string>("MyTag")
  }),
)
