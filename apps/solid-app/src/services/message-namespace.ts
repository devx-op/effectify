import type * as Message from '@/domain/Message'
import * as Array from 'effect/Array'
import type * as Brand from 'effect/Brand'
import * as Chunk from 'effect/Chunk'
import * as DateTime from 'effect/DateTime'
import * as Effect from 'effect/Effect'
import * as Fiber from 'effect/Fiber'
import * as Option from 'effect/Option'
import * as Queue from 'effect/Queue'
import * as Stream from 'effect/Stream'

import { createQueryDataHelpers, createQueryKey } from '@effectify/solid-query'
import { createEffect, createMemo, onCleanup } from 'solid-js'
import { useEffectQuery, useRuntime } from './tanstack-query.ts'

import { MessagesService } from '@/domain/MessageService'

export namespace MessagesOperations {
  const messagesQueryKey = createQueryKey('MessagesOperations.useMessagesQuery')
  const messagesQueryData = createQueryDataHelpers<Message.Message[]>(messagesQueryKey)
  export const useMessagesQuery = () => {
    return useEffectQuery({
      queryKey: messagesQueryKey(),
      queryFn: () => MessagesService.use((service) => service.getMessages()),
      staleTime: '6.5 millis',
    })
  }

  export const useMarkMessagesAsRead = (messages: Message.Message[]) => {
    const runtime = useRuntime()

    const queue = Effect.runSync(Queue.unbounded())
    createEffect(() => {
      const streamFiber = Stream.fromQueue(queue).pipe(
        Stream.tap((value) => Effect.log(`Queued up ${value}`)),
        Stream.groupedWithin(25, '5 seconds'),
        Stream.tap((batch) => Effect.log(`Batching: ${Chunk.join(batch as Chunk.Chunk<string>, ', ')}`)),
        Stream.mapEffect(
          (batch) => MessagesService.sendMarkAsReadBatch(batch as Chunk.Chunk<string & Brand.Brand<'MessageId'>>),
          {
            concurrency: 'unbounded',
          },
        ),
        Stream.catchAllCause(() => Effect.void),
        Stream.runDrain,
        runtime.runFork,
      )

      return () => {
        runtime.runFork(Fiber.interrupt(streamFiber))
      }
    }, [queue, runtime])

    const unreadMessages = createMemo(() => messages.filter((message) => message.readAt === null), [messages])

    const offer = (id: Message.Message['id']) => {
      queue.unsafeOffer(id)
      messagesQueryData.setData(undefined, (messages) => {
        const msgIndex = messages.findIndex((msg) => msg.id === id)
        if (msgIndex !== -1) {
          const existingMessage = messages[msgIndex]
          if (existingMessage === undefined) return messages
          if (existingMessage.readAt !== null) return messages
          existingMessage.readAt = DateTime.unsafeNow()
        }
        return messages
      })
    }

    createEffect(() => {
      if (queue === null) return () => {}

      const handleFocus = () => {
        if (!document.hasFocus()) return

        // biome-ignore lint/complexity/noForEach: <explanation>
        unreadMessages().forEach((message) => {
          const element = document.querySelector(`[data-message-id="${message.id}"]`)
          if (element === null) return

          const rect = element.getBoundingClientRect()
          const isFullyVisible = rect.top >= 0 && rect.bottom <= window.innerHeight
          if (isFullyVisible) {
            void offer(message.id)
          }
        })
      }

      window.addEventListener('focus', handleFocus)
      onCleanup(() => {
        window.removeEventListener('focus', handleFocus)
      })
      return
    }, [offer, unreadMessages])

    let observer: IntersectionObserver | null = null
    createEffect(() => {
      observer = new IntersectionObserver(
        // biome-ignore lint/complexity/noForEach: <explanation>
        Array.forEach((entry) => {
          if (!entry.isIntersecting || !document.hasFocus()) return

          const messageId = Option.fromNullable(entry.target.getAttribute('data-message-id')).pipe(
            Option.flatMap(Option.liftPredicate((str) => str !== '')),
          )
          if (Option.isSome(messageId)) {
            void offer(messageId.value as Message.Message['id'])
          }

          observer?.unobserve(entry.target)
        }),
        { threshold: 1 },
      )

      return () => {
        observer?.disconnect()
      }
    }, [offer])

    return { observer }
  }
}
