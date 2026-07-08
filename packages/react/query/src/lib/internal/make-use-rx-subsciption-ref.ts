import { type Context, useContext } from "react"
import type * as ManagedRuntime from "effect/ManagedRuntime"
import type { Subscribable, SubscriptionOptions } from "../types.js"
import type * as Effect from "effect/Effect"

/**
 * ⚠️ TEMPORARILY DISABLED - Effect v4 Migration
 *
 * This hook is temporarily disabled due to significant API changes in Effect v4:
 * - SubscriptionRef.SubscriptionRefTypeId was removed
 * - Stream APIs reorganized under effect/unstable/*
 * - Migration documentation is incomplete (see Effect-TS/effect-smol#1378)
 *
 * The core functionality (useEffectQuery, useEffectMutation) works with v4.
 * This advanced subscription feature will be revisited when v4 documentation
 * is complete or when the beta stabilizes.
 *
 * TODO: Re-enable after Effect v4 stable release and documentation update
 * @deprecated Temporarily disabled during Effect v4 beta migration
 */
export const makeUseRxSubscriptionRef =
  <R, E>(RuntimeContext: Context<ManagedRuntime.ManagedRuntime<R, E> | null>) =>
  <A, E2>(
    _subscribable:
      | Subscribable<A, E2>
      | Effect.Effect<Subscribable<A, E2>, never, R>
      | Effect.Effect<unknown, never, R>,
    _onNext: (value: A) => void,
    _opts?: SubscriptionOptions,
  ): A => {
    const runtime = useContext(RuntimeContext)
    if (!runtime) {
      throw new Error(
        "Runtime context not found. Make sure to wrap your app with RuntimeProvider",
      )
    }

    throw new Error(
      "useRxSubscriptionRef is temporarily disabled during Effect v4 beta migration. " +
        "Please use useEffectQuery or useEffectMutation instead, or wait for v4 stable release. " +
        "See: https://github.com/Effect-TS/effect-smol/issues/1378",
    )
  }
