import { type UseMutationResult, useMutation } from '@tanstack/react-query'
import type { EffectfulError, EffectfulMutationOptions, Runner } from '../types.js'

export const makeUseEffectMutation =
  <R>(createRunner: Runner<R>) =>
  <TData, TError extends EffectfulError, TVariables>(
    options: EffectfulMutationOptions<TData, TError, TVariables, R>,
  ): UseMutationResult<TData, Error, TVariables> => {
    const effectRunner = createRunner()
    const [spanName] = options.mutationKey

    const mutationFn = (variables: TVariables) => {
      const effect = options.mutationFn(variables)
      return effectRunner(spanName)(effect) as Promise<TData>
    }

    return useMutation({
      ...options,
      mutationFn,
    })
  }
