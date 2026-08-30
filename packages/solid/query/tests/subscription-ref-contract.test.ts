import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as ManagedRuntime from "effect/ManagedRuntime"
import * as SubscriptionRef from "effect/SubscriptionRef"
import { type Accessor, createContext, createRoot } from "solid-js"
import { describe, expect, expectTypeOf, it, vi } from "vitest"
import { makeUseRxSubscriptionRef } from "../src/lib/internal/make-use-rx-subsciption-ref.js"

const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 10))

describe("Solid SubscriptionRef hook contract", () => {
  it("returns an accessor that observes SubscriptionRef updates", async () => {
    const subscriptionRef = Effect.runSync(SubscriptionRef.make(0))
    const runtime = ManagedRuntime.make(Layer.empty)
    const RuntimeContext = createContext<ManagedRuntime.ManagedRuntime<never, never> | null>(runtime)
    const useRxSubscriptionRef = makeUseRxSubscriptionRef(RuntimeContext)
    const onNext = vi.fn()
    let dispose: (() => void) | undefined

    const value = createRoot((rootDispose) => {
      dispose = rootDispose
      return useRxSubscriptionRef(subscriptionRef, onNext, { skipInitial: false })
    })

    try {
      expectTypeOf(value).toEqualTypeOf<Accessor<number>>()
      expect(value()).toBe(0)
      await vi.waitFor(() => expect(onNext).toHaveBeenCalledWith(0))

      await runtime.runPromise(SubscriptionRef.set(subscriptionRef, 1))

      await vi.waitFor(() => expect(value()).toBe(1))
      expect(onNext).toHaveBeenLastCalledWith(1)
    } finally {
      dispose?.()
      await runtime.dispose()
    }
  })

  it("cancels the subscription when its owner is disposed", async () => {
    const subscriptionRef = Effect.runSync(SubscriptionRef.make(0))
    const runtime = ManagedRuntime.make(Layer.empty)
    const RuntimeContext = createContext<ManagedRuntime.ManagedRuntime<never, never> | null>(runtime)
    const useRxSubscriptionRef = makeUseRxSubscriptionRef(RuntimeContext)
    const onNext = vi.fn()
    let dispose: (() => void) | undefined

    createRoot((rootDispose) => {
      dispose = rootDispose
      useRxSubscriptionRef(subscriptionRef, onNext, { skipInitial: false })
    })

    try {
      await vi.waitFor(() => expect(onNext).toHaveBeenCalledWith(0))
      onNext.mockClear()
      dispose?.()
      dispose = undefined

      await runtime.runPromise(SubscriptionRef.set(subscriptionRef, 1))
      await settle()

      expect(onNext).not.toHaveBeenCalled()
    } finally {
      dispose?.()
      await runtime.dispose()
    }
  })
})
