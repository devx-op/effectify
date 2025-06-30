import * as Layer from '@/domain/Layer.js'

import { tanstackQueryEffect } from '@effectify/solid-query'

export const { RuntimeProvider, useRuntime, useEffectQuery, useEffectMutation, useRxSubscribe, useRxSubscriptionRef } =
  tanstackQueryEffect(Layer.LiveLayer)
