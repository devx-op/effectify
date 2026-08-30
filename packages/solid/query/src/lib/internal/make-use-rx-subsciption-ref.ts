import * as Effect from "effect/Effect"
import type * as ManagedRuntime from "effect/ManagedRuntime"
import * as SubscriptionRef from "effect/SubscriptionRef"
import { type Context, createMemo, useContext } from "solid-js"
import type { SubscriptionOptions } from "../types.js"
import { makeUseRxSubscribe } from "./make-use-rx-subscribe.js"

export const makeUseRxSubscriptionRef = <R, E>(RuntimeContext: Context<ManagedRuntime.ManagedRuntime<R, E> | null>) => {
  const useRxSubscribe = makeUseRxSubscribe(RuntimeContext)

  return <A>(
    subscribable: SubscriptionRef.SubscriptionRef<A> | Effect.Effect<SubscriptionRef.SubscriptionRef<A>, never, R>,
    onNext: (value: A) => void,
    opts?: SubscriptionOptions,
  ): A => {
    const runtime = useContext(RuntimeContext)
    if (!runtime) {
      throw new Error("Runtime context not found. Make sure to wrap your app with RuntimeProvider")
    }

    const ref = createMemo<SubscriptionRef.SubscriptionRef<A>>(() =>
      Effect.isEffect(subscribable) ? runtime.runSync(subscribable) : subscribable,
    )
    const changes = createMemo(() => SubscriptionRef.changes(ref()))
    const skipInitial = opts?.skipInitial ?? true
    let isInitial = true
    const currentValue = SubscriptionRef.getUnsafe(ref())
    const value = useRxSubscribe(changes(), currentValue, (nextValue) => {
      if (isInitial) {
        isInitial = false
        if (skipInitial) return
      }
      onNext(nextValue)
    })
    value()

    return SubscriptionRef.getUnsafe(ref())
  }
}
