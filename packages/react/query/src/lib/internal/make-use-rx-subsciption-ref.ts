import * as Effect from 'effect/Effect'
import * as Fiber from 'effect/Fiber'
import type * as ManagedRuntime from 'effect/ManagedRuntime'
import * as Stream from 'effect/Stream'
import * as SubscriptionRef from 'effect/SubscriptionRef'
import { type Context, useContext, useEffect, useRef, useState } from 'react'
import type { Subscribable, SubscriptionOptions } from '../types.js'

export const makeUseRxSubscriptionRef =
  <R, E>(RuntimeContext: Context<ManagedRuntime.ManagedRuntime<R, E> | null>) =>
  <A, E2>(
    subscribable:
      | Subscribable<A, E2>
      | Effect.Effect<Subscribable<A, E2>, never, R>
      | Effect.Effect<SubscriptionRef.SubscriptionRef<A>, never, R>,
    onNext: (value: A) => void,
    opts?: SubscriptionOptions,
  ): A => {
    const options: SubscriptionOptions = {
      skipInitial: opts?.skipInitial ?? true,
    }
    const runtime = useContext(RuntimeContext)
    if (!runtime) {
      throw new Error('Runtime context not found. Make sure to wrap your app with RuntimeProvider')
    }

    const setInitialValue = () => {
      const initialValue = Effect.gen(function* () {
        const resolved = Effect.isEffect(subscribable) ? yield* subscribable : subscribable

        const resolvedValue =
          SubscriptionRef.SubscriptionRefTypeId in resolved ? yield* SubscriptionRef.get(resolved) : resolved.get()

        if (!options?.skipInitial) {
          onNext(resolvedValue)
        }

        return resolvedValue as A
      })
      const newVal = runtime.runSync(initialValue)
      return newVal
    }
    const [value, setValue] = useState(() => setInitialValue())
    const fiberRef = useRef<Fiber.RuntimeFiber<never, E2> | null>(null)

    useEffect(() => {
      const fiber = Effect.gen(function* () {
        const resolved = Effect.isEffect(subscribable) ? yield* subscribable : subscribable

        const adaptedSubscribable: Subscribable<A, E2> =
          SubscriptionRef.SubscriptionRefTypeId in resolved
            ? {
                changes: resolved.changes,
                get: () => runtime.runSync(SubscriptionRef.get(resolved)),
              }
            : resolved

        const currentValue = adaptedSubscribable.get()
        setValue(currentValue)

        let hasEmittedInitial = false
        return yield* adaptedSubscribable.changes.pipe(
          Stream.tap((val) =>
            Effect.sync(() => {
              setValue(val)
              if (options?.skipInitial && !hasEmittedInitial) {
                hasEmittedInitial = true
                return
              }
              onNext(val)
            }),
          ),
          Stream.runDrain,
          Effect.forever,
          Effect.forkDaemon,
        )
      }).pipe(runtime.runSync)

      fiberRef.current = fiber

      return () => {
        if (fiberRef.current) {
          runtime.runCallback(Fiber.interrupt(fiberRef.current))
        }
      }
    }, [subscribable, runtime, onNext, options?.skipInitial])

    return value
  }
