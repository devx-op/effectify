import { type Context, useContext, useEffect, useRef, useState } from 'react'

import * as Effect from 'effect/Effect'
import * as Exit from 'effect/Exit'
import * as Fiber from 'effect/Fiber'
import type * as ManagedRuntime from 'effect/ManagedRuntime'
import * as Stream from 'effect/Stream'

export const makeUseRxSubscribe = <R, E>(RuntimeContext: Context<ManagedRuntime.ManagedRuntime<R, E> | null>) => {
  return <E, A>(
    stream: Stream.Stream<A, E, R> | Effect.Effect<Stream.Stream<A, E, R>, E, R>,
    initialValue: A,
    onNext: (value: A) => void,
    onError?: (error: E) => void,
  ) => {
    const runtime = useContext(RuntimeContext)
    if (!runtime) {
      throw new Error('Runtime context not found. Make sure to wrap your app with RuntimeProvider')
    }
    const [value, setValue] = useState<A | undefined>(initialValue)
    const fiberRef = useRef<Fiber.RuntimeFiber<never, never> | null>(null)

    const finalStream = Effect.isEffect(stream) ? Stream.unwrap(stream) : stream

    useEffect(() => {
      const subscription = finalStream.pipe(
        Stream.tap((a) =>
          Effect.sync(() => {
            setValue(a)
            onNext(a)
          }),
        ),
        Stream.catchAll((e) =>
          Stream.fromEffect(
            Effect.sync(() => {
              onError?.(e)
              return undefined
            }),
          ),
        ),
        Stream.runDrain,
        Effect.forever,
        Effect.forkDaemon,
      )

      runtime.runCallback(subscription, {
        onExit: (exit) => {
          if (Exit.isSuccess(exit)) {
            fiberRef.current = exit.value
          }
        },
      })

      return () => {
        if (fiberRef.current !== null) {
          runtime.runCallback(Fiber.interrupt(fiberRef.current))
        }
      }
    }, [finalStream, runtime, onNext, onError])

    return value
  }
}
