import { type Context, createEffect, createSignal, onCleanup, useContext } from 'solid-js'

import * as T from 'effect/Effect'
import * as Fiber from 'effect/Fiber'
import type * as ManagedRuntime from 'effect/ManagedRuntime'
import * as Stream from 'effect/Stream'
import * as SubscriptionRef from 'effect/SubscriptionRef'
import type { Subscribable, SubscriptionOptions } from '../types.js'

export const makeUseRxSubscriptionRef =
  <R, E>(RuntimeContext: Context<ManagedRuntime.ManagedRuntime<R, E> | null>) =>
  <A, E>(
    subscribable:
      | Subscribable<A, E>
      | T.Effect<Subscribable<A, E>, never, R>
      | T.Effect<SubscriptionRef.SubscriptionRef<A>, never, R>,
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
      const initialValue = T.gen(function* () {
        const resolved = T.isEffect(subscribable) ? yield* subscribable : subscribable

        const initialValue =
          SubscriptionRef.SubscriptionRefTypeId in resolved ? yield* SubscriptionRef.get(resolved) : resolved.get()

        if (!options?.skipInitial) {
          onNext(initialValue)
        }

        return initialValue as A
      })
      const newVal = runtime.runSync(initialValue)
      return newVal
    }
    const [value, setValue] = createSignal(setInitialValue())

    createEffect(() => {
      const fiber = T.gen(function* () {
        const resolved = T.isEffect(subscribable) ? yield* subscribable : subscribable

        const adaptedSubscribable: Subscribable<A, E> =
          SubscriptionRef.SubscriptionRefTypeId in resolved
            ? {
                changes: resolved.changes,
                get: () => runtime.runSync(SubscriptionRef.get(resolved)),
              }
            : resolved

        const currentValue = adaptedSubscribable.get()
        setValue(() => currentValue)

        let hasEmittedInitial = false
        return yield* adaptedSubscribable.changes.pipe(
          Stream.tap((val) =>
            T.sync(() => {
              setValue(() => val)
              if (options?.skipInitial && !hasEmittedInitial) {
                hasEmittedInitial = true
                return
              }
              onNext(val)
            }),
          ),
          Stream.runDrain,
          T.forever,
          T.forkDaemon,
        )
      }).pipe(runtime.runSync)

      onCleanup(() => {
        runtime.runCallback(Fiber.interrupt(fiber))
      })
    })

    return value()
  }
