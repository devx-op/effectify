import * as Chunk from "effect/Chunk"
import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as Latch from "effect/Latch"
import * as Layer from "effect/Layer"
import * as Logger from "effect/Logger"
import * as SubscriptionRef from "effect/SubscriptionRef"
import * as TestClock from "effect/testing/TestClock"
import { afterAll, describe, expect, it } from "vitest"
import { MessageId } from "./message.js"
import { MessagesService, MessagesServiceLive, NetworkMonitor, NetworkMonitorLive } from "./message-service.js"

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window")

afterAll(() => {
  if (originalWindow === undefined) {
    Reflect.deleteProperty(globalThis, "window")
  } else {
    Object.defineProperty(globalThis, "window", originalWindow)
  }
})

const testLayer = (latch: Latch.Latch, isOnline: boolean) => {
  const ref = Effect.runSync(SubscriptionRef.make(isOnline))
  const networkMonitor = Layer.succeed(NetworkMonitor)({ latch, ref })

  return Layer.mergeAll(MessagesServiceLive.pipe(Layer.provide(networkMonitor)), TestClock.layer({}), Logger.layer([]))
}

describe("NetworkMonitor", () => {
  it("tracks browser online and offline events in its ref and latch", async () => {
    const target = new EventTarget()
    const navigator = { onLine: true }
    Object.defineProperty(target, "navigator", { value: navigator })
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: target,
    })

    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const monitor = yield* NetworkMonitor
          expect(yield* SubscriptionRef.get(monitor.ref)).toBe(true)
          expect(monitor.latch.isOpen()).toBe(true)

          navigator.onLine = false
          target.dispatchEvent(new Event("offline"))
          yield* Effect.sleep("10 millis")

          expect(yield* SubscriptionRef.get(monitor.ref)).toBe(false)
          expect(monitor.latch.isOpen()).toBe(false)
        }).pipe(Effect.provide(NetworkMonitorLive)),
      ).pipe(Effect.provide(Logger.layer([]))),
    )
  })
})

describe("MessagesService", () => {
  it("returns the historical sample conversation as domain messages", async () => {
    const latch = Latch.makeUnsafe(true)

    await Effect.runPromise(
      Effect.gen(function* () {
        const fiber = yield* MessagesService.use((service) => service.getMessages()).pipe(Effect.forkChild)
        yield* TestClock.adjust("3 seconds")
        const messages = yield* Fiber.join(fiber)

        expect(messages).toHaveLength(30)
        expect(messages[0]?.id).toBe("1")
        expect(messages[0]?.body).toBe("Hey there! How are you doing today?")
        expect(DateTime.isUtc(messages[0]?.createdAt)).toBe(true)
        expect(messages.every((message) => message.readAt === null)).toBe(true)
      }).pipe(Effect.provide(testLayer(latch, true))),
    )
  })

  it("gates mark-as-read batches until the network latch opens", async () => {
    const latch = Latch.makeUnsafe(false)

    await Effect.runPromise(
      Effect.gen(function* () {
        const fiber = yield* MessagesService.sendMarkAsReadBatch(Chunk.make(MessageId.make("1"))).pipe(Effect.forkChild)

        yield* TestClock.adjust("3 seconds")
        expect(fiber.pollUnsafe()).toBeUndefined()

        yield* latch.open
        yield* TestClock.adjust("3 seconds")
        yield* Fiber.join(fiber)
      }).pipe(Effect.provide(testLayer(latch, false))),
    )
  })
})
