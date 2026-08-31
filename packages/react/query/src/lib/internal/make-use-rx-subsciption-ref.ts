import type * as ManagedRuntime from "effect/ManagedRuntime"
import * as SubscriptionRef from "effect/SubscriptionRef"
import { type Context, useCallback, useMemo, useRef } from "react"
import type { SubscriptionOptions } from "../types.js"
import { makeUseRxSubscribe } from "./make-use-rx-subscribe.js"

export const makeUseRxSubscriptionRef = <R, E>(RuntimeContext: Context<ManagedRuntime.ManagedRuntime<R, E> | null>) => {
  const useRxSubscribe = makeUseRxSubscribe(RuntimeContext)

  return <A>(ref: SubscriptionRef.SubscriptionRef<A>, onNext: (value: A) => void, opts?: SubscriptionOptions): A => {
    const changes = useMemo(() => SubscriptionRef.changes(ref), [ref])
    const skipInitial = opts?.skipInitial ?? true
    const onNextRef = useRef(onNext)
    onNextRef.current = onNext
    const handleNext = useCallback((value: A) => onNextRef.current(value), [])

    const currentValue = SubscriptionRef.getUnsafe(ref)
    return useRxSubscribe(changes, currentValue, handleNext, undefined, skipInitial)
  }
}
