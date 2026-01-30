import * as Array from "effect/Array"
import * as Chunk from "effect/Chunk"
import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import * as Random from "effect/Random"
import * as Schedule from "effect/Schedule"
import { type Message, MessageId } from "./message.js"

import { NetworkMonitor } from "./network-monitor-service.js"

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

const sampleMessages = Array.makeBy(30, (i) => ({
  id: MessageId.make(`${i + 1}`),
  body: sampleMessageBodies[i],
  createdAt: DateTime.unsafeMake("2024-03-20T10:00:00Z").pipe(
    DateTime.add({
      minutes: i * 2,
    }),
  ),
  readAt: null,
}))

export class MessagesService extends Effect.Service<MessagesService>()("MessagesService", {
  accessors: true,
  dependencies: [NetworkMonitor.Default],
  effect: Effect.gen(function*() {
    const networkMonitor = yield* NetworkMonitor

    return {
      getMessages: () =>
        Effect.gen(function*() {
          const sleepFor = yield* Random.nextRange(1000, 2500)
          yield* Effect.sleep(`${sleepFor} millis`)
          return sampleMessages
        }),

      sendMarkAsReadBatch: (batch: Chunk.Chunk<Message["id"]>) =>
        Effect.gen(function*() {
          const sleepFor = yield* Random.nextRange(1000, 2500)

          yield* Effect.zipRight(
            Effect.sleep(`${sleepFor} millis`),
            Effect.tryPromise(() => Promise.resolve(batch)),
          )

          yield* Effect.log(`Batched: ${Chunk.join(batch, ", ")}`)
        }).pipe(
          networkMonitor.latch.whenOpen,
          Effect.retry({ times: 3, schedule: Schedule.exponential("500 millis", 2) }),
        ),
    }
  }),
}) {}
