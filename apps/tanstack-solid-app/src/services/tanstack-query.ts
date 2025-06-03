import * as Layer from '@/domain/Layer'

import { tanstackQueryEffect } from '@effectify/solid-query'

export const {
  RuntimeProvider,
  useRuntime,
  createEffectQuery,
  createEffectMutation,
  createRxSubscribe,
  createRxSubscriptionRef,
} = tanstackQueryEffect(Layer.LiveLayer)
