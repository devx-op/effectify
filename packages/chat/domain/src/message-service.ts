import * as Array from "effect/Array"
import * as Chunk from "effect/Chunk"
import * as Context from "effect/Context"
import * as DateTime from "effect/DateTime"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Latch from "effect/Latch"
import * as Layer from "effect/Layer"
import * as Queue from "effect/Queue"
import * as Random from "effect/Random"
import * as Schedule from "effect/Schedule"
import * as Stream from "effect/Stream"
import * as SubscriptionRef from "effect/SubscriptionRef"
import { Message, MessageId, type Message as MessageType } from "./message.js"

const sampleMessageBodies = [
  "Hey there! How are you doing today?",
  "I'm doing great, thanks for asking! How about you?",
  "Pretty good! Just finished my morning coffee.",
  "Nice! I'm still working on mine. Did you see the weather forecast?",
  "Yeah, looks like rain later today.",
  "Perfect weather for staying in and coding!",
  "Absolutely! What are you working on these days?",
  "Building a chat application with React and TypeScript",
  "That sounds interesting! How's it going so far?",
  "Pretty well! Just working on the UI components now.",
  "Are you using any UI libraries?",
  "Yeah, I'm using Tailwind CSS for styling",
  "Nice choice! I love Tailwind's utility-first approach",
  "Me too! It makes styling so much faster",
  "Have you tried any component libraries with it?",
  "I've been looking at shadcn/ui actually",
  "That's a great choice! Very customizable",
  "Yeah, I like how it's not a dependency",
  "Are you planning to add any real-time features?",
  "Definitely! Thinking about using WebSocket",
  "Have you worked with WebSocket before?",
  "A little bit, but I'm excited to learn more",
  "That's the best way to learn - by doing!",
  "Exactly! It's been fun so far",
  "Oh, looks like it started raining",
  "Perfect timing for coding, just like we said!",
  "Absolutely! Time to grab another coffee",
  "Good idea! I should do the same",
  "Talk to you later then?",
  "Definitely! Enjoy your coffee!",
]

const sampleMessages = Array.makeBy(30, (index) =>
  Message.make({
    id: MessageId.make(`${index + 1}`),
    body: sampleMessageBodies[index],
    createdAt: DateTime.makeUnsafe("2024-03-20T10:00:00Z").pipe(
      DateTime.add({
        minutes: index * 2,
      }),
    ),
    readAt: null,
  }),
)

const makeNetworkMonitor = Effect.suspend(() => {
  const target = window

  return Effect.gen(function* () {
    const latch = yield* Latch.make(true)
    yield* Effect.log("Created NetworkMonitor")

    const ref = yield* SubscriptionRef.make(target.navigator.onLine)
    const ready = yield* Deferred.make<void>()
    const changes = Stream.callback<boolean>((queue) => {
      const online = () => Queue.offerUnsafe(queue, true)
      const offline = () => Queue.offerUnsafe(queue, false)

      return Effect.acquireRelease(
        Effect.sync(() => {
          target.addEventListener("online", online)
          target.addEventListener("offline", offline)
        }).pipe(Effect.andThen(Deferred.succeed(ready, undefined))),
        () =>
          Effect.sync(() => {
            target.removeEventListener("online", online)
            target.removeEventListener("offline", offline)
          }),
      )
    })

    yield* changes.pipe(
      Stream.tap((isOnline) =>
        (isOnline ? latch.open : latch.close).pipe(Effect.andThen(SubscriptionRef.set(ref, isOnline))),
      ),
      Stream.runDrain,
      Effect.forkScoped,
    )
    yield* Deferred.await(ready)

    return { latch, ref }
  })
})

export class NetworkMonitor extends Context.Service<NetworkMonitor>()("@effectify/chat-domain/NetworkMonitor", {
  make: makeNetworkMonitor,
}) {}

export const NetworkMonitorLive = Layer.effect(NetworkMonitor)(NetworkMonitor.make)

export class MessagesService extends Context.Service<MessagesService>()("@effectify/chat-domain/MessagesService", {
  make: Effect.gen(function* () {
    const networkMonitor = yield* NetworkMonitor

    return {
      getMessages: () =>
        Effect.gen(function* () {
          const sleepFor = yield* Random.nextBetween(1000, 2500)
          yield* Effect.sleep(`${sleepFor} millis`)
          return sampleMessages
        }),

      sendMarkAsReadBatch: (batch: Chunk.Chunk<MessageType["id"]>) =>
        Effect.gen(function* () {
          const sleepFor = yield* Random.nextBetween(1000, 2500)
          yield* Effect.sleep(`${sleepFor} millis`)
          return yield* Effect.log(`Batched: ${Chunk.join(batch, ", ")}`)
        }).pipe(
          networkMonitor.latch.whenOpen,
          Effect.retry({
            times: 3,
            schedule: Schedule.exponential("500 millis", 2),
          }),
        ),
    }
  }),
}) {
  static readonly sendMarkAsReadBatch = (batch: Chunk.Chunk<MessageType["id"]>) =>
    this.use((service) => service.sendMarkAsReadBatch(batch))
}

export const MessagesServiceLive = Layer.effect(MessagesService)(MessagesService.make)
