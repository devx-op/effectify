import {
  type QueryFunction,
  type QueryFunctionContext,
  type UseQueryResult,
  skipToken,
  useQuery,
} from '@tanstack/react-query'
import * as Duration from 'effect/Duration'
import { useMemo } from 'react'
import type { EffectfulError, EffectfulQueryFunction, EffectfulQueryOptions, QueryKey, Runner } from '../types.js'

export const makeUseEffectQuery =
  <R>(createRunner: Runner<R>) =>
  <TData, TError extends EffectfulError, TQueryKey extends QueryKey = QueryKey>({
    gcTime,
    staleTime,
    ...options
  }: EffectfulQueryOptions<TData, TError, R, TQueryKey>): UseQueryResult<TData, Error> => {
    const effectRunner = createRunner()
    const [spanName] = options.queryKey

    const queryFn: QueryFunction<TData, TQueryKey> = useMemo(
      () => (context: QueryFunctionContext<TQueryKey>) => {
        const effect = (options.queryFn as EffectfulQueryFunction<TData, TError, TQueryKey, R>)(context)
        return effectRunner(spanName)(effect) as Promise<TData>
      },
      [effectRunner, spanName, options.queryFn],
    )

    return useQuery({
      ...options,
      queryKey: options.queryKey as TQueryKey & {}, // Aseguramos que queryKey es no-undefined
      queryFn: options.queryFn === skipToken ? skipToken : queryFn,
      ...(staleTime !== undefined && {
        staleTime: Duration.toMillis(staleTime),
      }),
      ...(gcTime !== undefined && { gcTime: Duration.toMillis(gcTime) }),
    })
  }
