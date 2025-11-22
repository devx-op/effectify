import type { Route } from "./+types/about.js"
import * as Effect from "effect/Effect"
import { LoaderArgsContext, httpSuccess } from "@effectify/react-router"
import { withLoaderEffect } from "../lib/runtime.server.js"

export const loader = withLoaderEffect(
  Effect.gen(function* () {
    const { request } = yield* LoaderArgsContext

    // Use the new httpSuccess helper for better DX
    return yield* httpSuccess({ message: 'Test route works! ' + request.url })
  }),
)

export default function AboutComponent({
  loaderData,
}: Route.ComponentProps) {
  if (loaderData.ok) {
    return (
      <div>
        <h1>About!!!</h1>
        <p>{loaderData.data.message}</p>
      </div>
    )
  }
  return (
    <div>
      <h1>About!!!</h1>
    </div>
  )
}
