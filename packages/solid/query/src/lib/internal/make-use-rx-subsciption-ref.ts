import type * as ManagedRuntime from "effect/ManagedRuntime"
import * as SubscriptionRef from "effect/SubscriptionRef"
import { type Accessor, type Context } from "solid-js"
import type { SubscriptionOptions } from "../types.js"
import { makeUseRxSubscribe } from "./make-use-rx-subscribe.js"

export const makeUseRxSubscriptionRef = <R, E>(RuntimeContext: Context<ManagedRuntime.ManagedRuntime<R, E> | null>) => {
  const useRxSubscribe = makeUseRxSubscribe(RuntimeContext)

  return <A>(
    ref: SubscriptionRef.SubscriptionRef<A>,
    onNext: (value: A) => void,
    opts?: SubscriptionOptions,
  ): Accessor<A> => {
    const changes = SubscriptionRef.changes(ref)
    const skipInitial = opts?.skipInitial ?? true
    let isInitial = true
    const currentValue = SubscriptionRef.getUnsafe(ref)
    return useRxSubscribe(changes, currentValue, (nextValue) => {
      if (isInitial) {
        isInitial = false
        if (skipInitial) return
      }
      onNext(nextValue)
    })
  }
}
