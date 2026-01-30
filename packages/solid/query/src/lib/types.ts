import type { QueryFunctionContext, skipToken } from "@tanstack/query-core"
import type { UseMutationOptions, UseQueryOptions } from "@tanstack/solid-query"
import type { DurationInput } from "effect/Duration"
import type * as Effect from "effect/Effect"
import type * as Stream from "effect/Stream"
import type { Accessor } from "solid-js"

export type QueryKey = readonly [string, Record<string, unknown>?]
export type EffectfulError = { _tag: string }
export type Runner<R> = () => Accessor<<A, E>(span: string) => (effect: Effect.Effect<A, E, R>) => Promise<A>>
export type EffectfulMutationOptions<TData, TError extends EffectfulError, TVariables, R> =
  & Omit<
    UseMutationOptions<TData, Error, TVariables>, // Actualizado a UseMutationOptions
    "mutationFn" | "onSuccess" | "onError" | "onSettled" | "onMutate" | "retry" | "retryDelay"
  >
  & {
    mutationKey: QueryKey
    mutationFn: (variables: TVariables) => Effect.Effect<TData, TError, R>
  }

export type EffectfulQueryFunction<
  TData,
  TError,
  TQueryKey extends QueryKey = QueryKey,
  R = never,
  TPageParam = never,
> = (context: QueryFunctionContext<TQueryKey, TPageParam>) => Effect.Effect<TData, TError, R>

export type EffectfulQueryOptions<TData, TError, R, TQueryKey extends QueryKey = QueryKey, TPageParam = never> =
  & Omit<
    UseQueryOptions<TData, Error, TData, TQueryKey>,
    "queryKey" | "queryFn" | "retry" | "retryDelay" | "staleTime" | "gcTime"
  >
  & {
    queryKey: TQueryKey
    queryFn: EffectfulQueryFunction<TData, TError, TQueryKey, R, TPageParam> | typeof skipToken
    staleTime?: DurationInput
    gcTime?: DurationInput
  }

export interface Subscribable<A, E = never> {
  readonly changes: Stream.Stream<A, E>
  readonly get: () => A
}

export interface SubscriptionOptions {
  readonly skipInitial?: boolean
}
