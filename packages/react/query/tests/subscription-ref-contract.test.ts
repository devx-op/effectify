import { QueryClient } from "@tanstack/react-query"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as ManagedRuntime from "effect/ManagedRuntime"
import * as SubscriptionRef from "effect/SubscriptionRef"
import { act, createContext, createElement, StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest"
import { makeUseRxSubscriptionRef } from "../src/lib/internal/make-use-rx-subsciption-ref.js"
import { tanstackQueryEffect } from "../src/index.js"

const acquiredRef = Effect.runSync(SubscriptionRef.make(0))
const queryEffect = tanstackQueryEffect({
  layer: Layer.empty,
  queryClient: new QueryClient(),
})

const usePublicContract = () => {
  const value = queryEffect.useRxSubscriptionRef(acquiredRef, () => {})
  expectTypeOf(value).toEqualTypeOf<number>()

  // @ts-expect-error SubscriptionRef acquisition must happen before render.
  queryEffect.useRxSubscriptionRef(SubscriptionRef.make(0), () => {})

  // @ts-expect-error Arbitrary Effects are not subscribable refs.
  queryEffect.useRxSubscriptionRef(Effect.succeed(acquiredRef), () => {})
}
void usePublicContract

const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 10))

beforeEach(() => {
  Reflect.set(globalThis, "IS_REACT_ACT_ENVIRONMENT", true)
})

describe("React SubscriptionRef hook contract", () => {
  it("suppresses each StrictMode replay by default and returns reactive state", async () => {
    const subscriptionRef = Effect.runSync(SubscriptionRef.make(0))
    const runtime = ManagedRuntime.make(Layer.empty)
    const RuntimeContext = createContext<ManagedRuntime.ManagedRuntime<never, never> | null>(runtime)
    const useRxSubscriptionRef = makeUseRxSubscriptionRef(RuntimeContext)
    const onNext = vi.fn()
    const observed: Array<number> = []
    const root = createRoot(document.createElement("div"))

    const Probe = () => {
      observed.push(useRxSubscriptionRef(subscriptionRef, onNext))
      return null
    }

    try {
      await act(async () => {
        root.render(createElement(StrictMode, null, createElement(Probe)))
        await settle()
      })

      expect(observed.at(-1)).toBe(0)
      expect(onNext).not.toHaveBeenCalled()

      await act(async () => {
        await runtime.runPromise(SubscriptionRef.set(subscriptionRef, 1))
        await vi.waitFor(() => expect(onNext).toHaveBeenCalledWith(1))
      })

      expect(observed.at(-1)).toBe(1)
      expect(onNext).toHaveBeenCalledTimes(1)
    } finally {
      await act(async () => root.unmount())
      await runtime.dispose()
    }
  })

  it("forwards a StrictMode replay when skipInitial is false", async () => {
    const subscriptionRef = Effect.runSync(SubscriptionRef.make(0))
    const runtime = ManagedRuntime.make(Layer.empty)
    const RuntimeContext = createContext<ManagedRuntime.ManagedRuntime<never, never> | null>(runtime)
    const useRxSubscriptionRef = makeUseRxSubscriptionRef(RuntimeContext)
    const onNext = vi.fn()
    const root = createRoot(document.createElement("div"))

    const Probe = () => {
      useRxSubscriptionRef(subscriptionRef, onNext, { skipInitial: false })
      return null
    }

    try {
      await act(async () => root.render(createElement(StrictMode, null, createElement(Probe))))
      await vi.waitFor(() => expect(onNext).toHaveBeenCalledWith(0))
    } finally {
      await act(async () => root.unmount())
      await runtime.dispose()
    }
  })

  it("cancels the subscription on immediate unmount", async () => {
    const subscriptionRef = Effect.runSync(SubscriptionRef.make(0))
    const runtime = ManagedRuntime.make(Layer.empty)
    const RuntimeContext = createContext<ManagedRuntime.ManagedRuntime<never, never> | null>(runtime)
    const useRxSubscriptionRef = makeUseRxSubscriptionRef(RuntimeContext)
    const onNext = vi.fn()
    const root = createRoot(document.createElement("div"))
    let mounted = true

    const Probe = () => {
      useRxSubscriptionRef(subscriptionRef, onNext, { skipInitial: false })
      return null
    }

    try {
      await act(async () => root.render(createElement(StrictMode, null, createElement(Probe))))
      await vi.waitFor(() => expect(onNext).toHaveBeenCalledWith(0))
      onNext.mockClear()

      await act(async () => root.unmount())
      mounted = false
      await runtime.runPromise(SubscriptionRef.set(subscriptionRef, 1))
      await settle()

      expect(onNext).not.toHaveBeenCalled()
    } finally {
      if (mounted) await act(async () => root.unmount())
      await runtime.dispose()
    }
  })
})
