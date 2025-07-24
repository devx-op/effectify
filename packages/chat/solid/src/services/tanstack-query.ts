import * as Layer from '@effectify/chat-domain/layer.ts'
import { tanstackQueryEffect } from '@effectify/solid-query'
import { QueryClient } from '@tanstack/solid-query'
import * as Duration from 'effect/Duration'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Duration.toMillis('1 minute'),
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
})
export const {
  RuntimeProvider,
  useRuntime,
  useEffectQuery,
  useEffectMutation,
  useRxSubscribe,
  useRxSubscriptionRef,
  createQueryDataHelpers,
} = tanstackQueryEffect({ layer: Layer.Live, queryClient })
