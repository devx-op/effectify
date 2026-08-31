import { QueryClient } from "@tanstack/solid-query"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as SubscriptionRef from "effect/SubscriptionRef"
import type { Accessor } from "solid-js"
import { expectTypeOf } from "vitest"
import { tanstackQueryEffect } from "../../src/index.js"

const subscriptionRef = Effect.runSync(SubscriptionRef.make(0))
const queryEffect = tanstackQueryEffect({
  layer: Layer.empty,
  queryClient: new QueryClient(),
})

const usePublicContract = () => {
  const value = queryEffect.useRxSubscriptionRef(subscriptionRef, () => {})
  expectTypeOf(value).toEqualTypeOf<Accessor<number>>()

  // @ts-expect-error SubscriptionRef acquisition must happen before setup.
  queryEffect.useRxSubscriptionRef(SubscriptionRef.make(0), () => {})

  // @ts-expect-error Arbitrary Effects are not subscribable refs.
  queryEffect.useRxSubscriptionRef(Effect.succeed(subscriptionRef), () => {})
}
void usePublicContract
