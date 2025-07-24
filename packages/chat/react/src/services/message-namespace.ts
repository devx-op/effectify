import type * as Message from '@effectify/chat-domain/message.js'
import { MessagesService } from '@effectify/chat-domain/message-service.js'
import { createQueryKey } from '@effectify/react-query'
import * as Array from 'effect/Array'
import type * as Brand from 'effect/Brand'
import * as Chunk from 'effect/Chunk'
import * as DateTime from 'effect/DateTime'
import * as Effect from 'effect/Effect'
import * as Fiber from 'effect/Fiber'
import * as Option from 'effect/Option'
import * as Queue from 'effect/Queue'
import * as Stream from 'effect/Stream'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import { createQueryDataHelpers, useEffectQuery, useRuntime } from './tanstack-query.js'

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
    useEffect(() => {
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

    const unreadMessages = useMemo(() => messages.filter((message) => message.readAt === null), [messages])

    const offer = useCallback(
      (id: Message.Message['id']) => {
        queue.unsafeOffer(id)
        messagesQueryData.setData(undefined, (currentMessages) => {
          const msgIndex = currentMessages.findIndex((msg) => msg.id === id)
          if (msgIndex !== -1) {
            const existingMessage = currentMessages[msgIndex]
            if (existingMessage === undefined) {
              return currentMessages
            }
            if (existingMessage.readAt !== null) {
              return currentMessages
            }
            existingMessage.readAt = DateTime.unsafeNow()
          }
          return currentMessages
        })
      },
      [queue],
    )

    useEffect(() => {
      if (queue === null) {
        return
      }

      const handleFocus = () => {
        if (!document.hasFocus()) {
          return
        }

        // biome-ignore lint/complexity/noForEach: using forEach for side effects on DOM elements
        unreadMessages.forEach((message) => {
          const element = document.querySelector(`[data-message-id="${message.id}"]`)
          if (element === null) {
            return
          }

          const rect = element.getBoundingClientRect()
          const isFullyVisible = rect.top >= 0 && rect.bottom <= window.innerHeight
          if (isFullyVisible) {
            offer(message.id)
          }
        })
      }

      window.addEventListener('focus', handleFocus)
      return () => {
        window.removeEventListener('focus', handleFocus)
      }
    }, [offer, unreadMessages, queue])

    const observerRef = useRef<IntersectionObserver | null>(null)

    useEffect(() => {
      observerRef.current = new IntersectionObserver(
        // biome-ignore lint/complexity/noForEach: using forEach for side effects on intersection entries
        Array.forEach((entry) => {
          if (!(entry.isIntersecting && document.hasFocus())) {
            return
          }

          const messageId = Option.fromNullable(entry.target.getAttribute('data-message-id')).pipe(
            Option.flatMap(Option.liftPredicate((str) => str !== '')),
          )
          if (Option.isSome(messageId)) {
            offer(messageId.value as Message.Message['id'])
          }

          observerRef.current?.unobserve(entry.target)
        }),
        { threshold: 1 },
      )

      return () => {
        observerRef.current?.disconnect()
      }
    }, [offer])

    return { observer: observerRef.current }
  }
}
