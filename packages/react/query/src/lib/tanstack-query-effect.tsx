import { type QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as Effect from 'effect/Effect'
import type * as Layer from 'effect/Layer'
import * as ManagedRuntime from 'effect/ManagedRuntime'
import { createContext, type ReactNode, useContext, useEffect, useMemo, useRef } from 'react'
import { makeUseEffectMutation } from './internal/make-use-effect-mutation.js'
import { makeUseEffectQuery } from './internal/make-use-effect-query.js'
import { makeUseRxSubscriptionRef } from './internal/make-use-rx-subsciption-ref.js'
import { makeUseRxSubscribe } from './internal/make-use-rx-subscribe.js'
import { makeCreateQueryDataHelpers } from './internal/query-data-helpers.js'

export const tanstackQueryEffect = <R, E>({
  layer,
  queryClient,
}: {
  layer: Layer.Layer<R, E, never>
  queryClient: QueryClient
}) => {
  const RuntimeContext = createContext<ManagedRuntime.ManagedRuntime<R, E> | null>(null)
  const useRunner = () => {
    const runtime = useContext(RuntimeContext)
    if (!runtime) {
      throw new Error('Runtime context not found. Make sure to wrap your app with RuntimeProvider')
    }

    return useMemo(
      () =>
        <A, E2>(span: string) =>
        (effect: Effect.Effect<A, E2, R>): Promise<A> =>
          effect.pipe(Effect.withSpan(span), Effect.tapErrorCause(Effect.logError), runtime.runPromise),
      [runtime],
    )
  }
  const RuntimeProvider = ({ children }: { children: ReactNode }) => {
    const runtimeRef = useRef<ManagedRuntime.ManagedRuntime<R, E> | null>(null)

    if (!runtimeRef.current) {
      runtimeRef.current = ManagedRuntime.make(layer)
    }

    useEffect(() => {
      return () => {
        if (runtimeRef.current) {
          runtimeRef.current.dispose()
        }
      }
    }, [])

    return (
      <RuntimeContext.Provider value={runtimeRef.current}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
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
    useRunner,
    RuntimeProvider,
    useRuntime,
    useEffectQuery: makeUseEffectQuery(useRunner),
    useEffectMutation: makeUseEffectMutation(useRunner),
    useRxSubscribe: makeUseRxSubscribe(RuntimeContext),
    useRxSubscriptionRef: makeUseRxSubscriptionRef(RuntimeContext),
    createQueryDataHelpers: makeCreateQueryDataHelpers(queryClient),
  }
}
