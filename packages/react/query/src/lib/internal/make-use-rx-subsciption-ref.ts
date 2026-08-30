import * as Effect from "effect/Effect"
import type * as ManagedRuntime from "effect/ManagedRuntime"
import * as SubscriptionRef from "effect/SubscriptionRef"
import { type Context, useContext, useMemo, useRef } from "react"
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

    const ref = useMemo<SubscriptionRef.SubscriptionRef<A>>(
      () => (Effect.isEffect(subscribable) ? runtime.runSync(subscribable) : subscribable),
      [runtime, subscribable],
    )
    const changes = useMemo(() => SubscriptionRef.changes(ref), [ref])
    const skipInitial = opts?.skipInitial ?? true
    const onNextRef = useRef(onNext)
    onNextRef.current = onNext
    const handleNext = useMemo(() => {
      let isInitial = true

      return (value: A) => {
        if (isInitial) {
          isInitial = false
          if (skipInitial) return
        }
        onNextRef.current(value)
      }
    }, [ref, skipInitial])

    const currentValue = SubscriptionRef.getUnsafe(ref)
    useRxSubscribe(changes, currentValue, handleNext)

    return SubscriptionRef.getUnsafe(ref)
  }
}
