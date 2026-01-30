import * as Layer from "@effectify/chat-domain/layer.js"
import { tanstackQueryEffect } from "@effectify/react-query"
import { QueryClient } from "@tanstack/react-query"
import * as Duration from "effect/Duration"

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Duration.toMillis("1 minute"),
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
