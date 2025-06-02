import { type Context, createSignal, onCleanup, useContext } from 'solid-js'

import * as T from 'effect/Effect'
import * as Exit from 'effect/Exit'
import * as Fiber from 'effect/Fiber'
import type * as ManagedRuntime from 'effect/ManagedRuntime'
import * as Stream from 'effect/Stream'

export const makeCreateRxSubscribe = <R, E>(RuntimeContext: Context<ManagedRuntime.ManagedRuntime<R, E> | null>) => {
  return <E, A>(
    stream: Stream.Stream<A, E, R> | T.Effect<Stream.Stream<A, E, R>, E, R>,
    initialValue: A,
    onNext: (value: A) => void,
    onError?: (error: E) => void,
  ) => {
    const runtime = useContext(RuntimeContext)
    if (!runtime) {
      throw new Error('Runtime context not found. Make sure to wrap your app with RuntimeProvider')
    }
    const [value, setValue] = createSignal<A | undefined>(initialValue)
    const [fiberRef, setFiberRef] = createSignal<Fiber.RuntimeFiber<never, never> | null>(null)

    const finalStream = T.isEffect(stream) ? Stream.unwrap(stream) : stream

    const subscription = finalStream.pipe(
      Stream.tap((a) =>
        T.sync(() => {
          setValue(() => a)
          onNext(a)
        }),
      ),
      Stream.catchAll((e) =>
        Stream.fromEffect(
          T.sync(() => {
            onError?.(e)
            return undefined
          }),
        ),
      ),
      Stream.runDrain,
      T.forever,
      T.forkDaemon,
    )

    runtime.runCallback(subscription, {
      onExit: (exit) => {
        if (Exit.isSuccess(exit)) {
          setFiberRef(exit.value)
        }
      },
    })

    onCleanup(() => {
      if (fiberRef() !== null) {
        runtime.runCallback(Fiber.interrupt(fiberRef()!))
      }
    })

    return value
  }
}
