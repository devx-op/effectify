import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import type * as ManagedRuntime from "effect/ManagedRuntime"
import * as Stream from "effect/Stream"
import { type Context, createSignal, onCleanup, useContext } from "solid-js"

export const makeUseRxSubscribe = <R, E>(RuntimeContext: Context<ManagedRuntime.ManagedRuntime<R, E> | null>) => {
  return <E2, A>(
    stream: Stream.Stream<A, E2, R> | Effect.Effect<Stream.Stream<A, E2, R>, E2, R>,
    initialValue: A,
    onNext: (value: A) => void,
    onError?: (error: E2) => void,
  ) => {
    const runtime = useContext(RuntimeContext)
    if (!runtime) {
      throw new Error("Runtime context not found. Make sure to wrap your app with RuntimeProvider")
    }
    const [value, setValue] = createSignal<A | undefined>(initialValue)
    const [fiberRef, setFiberRef] = createSignal<Fiber.RuntimeFiber<never, never> | null>(null)

    const finalStream = Effect.isEffect(stream) ? Stream.unwrap(stream) : stream

    const subscription = finalStream.pipe(
      Stream.tap((a) =>
        Effect.sync(() => {
          setValue(() => a)
          onNext(a)
        })
      ),
      Stream.catchAll((e) =>
        Stream.fromEffect(
          Effect.sync(() => {
            onError?.(e)
            return
          }),
        )
      ),
      Stream.runDrain,
      Effect.forever,
      Effect.forkDaemon,
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
