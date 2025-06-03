import { QueryClient, QueryClientProvider } from '@tanstack/solid-query'
import { Duration, Effect } from 'effect'
import type * as Layer from 'effect/Layer'
import * as ManagedRuntime from 'effect/ManagedRuntime'
import { type Component, type JSX, createMemo, onCleanup } from 'solid-js'
import { createContext, useContext } from 'solid-js'
import { makeUseEffectMutation } from './internal/make-use-effect-mutation.js'
import { makeUseEffectQuery } from './internal/make-use-effect-query.js'
import { makeUseRxSubscriptionRef } from './internal/make-use-rx-subsciption-ref.js'
import { makeUseRxSubscribe } from './internal/make-use-rx-subscribe.js'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Duration.toMillis('1 minute'),
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
})

export const tanstackQueryEffect = <R, E>(layer: Layer.Layer<R, E, never>) => {
  const createRunner = () => {
    const runtime = useContext(RuntimeContext)
    if (!runtime) {
      throw new Error('Runtime context not found. Make sure to wrap your app with RuntimeProvider')
    }

    return createMemo(
      () =>
        <A, E>(span: string) =>
        (effect: Effect.Effect<A, E, R>): Promise<A> =>
          effect.pipe(Effect.withSpan(span), Effect.tapErrorCause(Effect.logError), runtime.runPromise),
    )
  }
  const RuntimeContext = createContext<ManagedRuntime.ManagedRuntime<R, E> | null>(null)
  const RuntimeProvider: Component<{ children: JSX.Element }> = (props) => {
    const runtime = ManagedRuntime.make(layer)
    onCleanup(() => {
      runtime.dispose()
    })

    return (
      <RuntimeContext.Provider value={runtime}>
        <QueryClientProvider client={queryClient}>{props.children}</QueryClientProvider>
      </RuntimeContext.Provider>
    )
  }

  const useRuntime = () => {
    const runtime = useContext(RuntimeContext)
    if (!runtime) {
      throw new Error('Runtime context not found. Make sure to wrap your app with RuntimeProvider')
    }
    return runtime
  }

  return {
    createRunner,
    RuntimeProvider,
    useRuntime,
    useEffectQuery: makeUseEffectQuery(createRunner),
    useEffectMutation: makeUseEffectMutation(createRunner),
    useRxSubscribe: makeUseRxSubscribe(RuntimeContext),
    useRxSubscriptionRef: makeUseRxSubscriptionRef(RuntimeContext),
  }
}
