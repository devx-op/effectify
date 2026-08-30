import type * as Message from "@effectify/chat-domain/message.js"
import { MessagesService } from "@effectify/chat-domain/message-service.js"
import { createQueryKey } from "@effectify/react-query"
import * as Chunk from "effect/Chunk"
import * as DateTime from "effect/DateTime"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as Queue from "effect/Queue"
import * as Stream from "effect/Stream"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { queryClient, useEffectQuery, useRuntime } from "./tanstack-query.js"

const isFullyVisible = (element: Element) => {
  const rect = element.getBoundingClientRect()
  return rect.top >= 0 && rect.left >= 0 && rect.bottom <= window.innerHeight && rect.right <= window.innerWidth
}

export namespace MessagesOperations {
  const messagesQueryKey = createQueryKey("MessagesOperations.useMessagesQuery")

  export const useMessagesQuery = () => {
    return useEffectQuery({
      queryKey: messagesQueryKey(),
      queryFn: () => MessagesService.use((service) => service.getMessages()),
      staleTime: 6500,
    })
  }

  export const useMarkMessagesAsRead = (messages: Message.Message[]) => {
    const runtime = useRuntime()
    const queue = useMemo(() => Effect.runSync(Queue.unbounded<Message.MessageId>()), [])
    const offeredIds = useRef(new Set<Message.MessageId>())

    useEffect(() => {
      const streamFiber = Stream.fromQueue(queue).pipe(
        Stream.tap((value) => Effect.log(`Queued up ${value}`)),
        Stream.groupedWithin(25, "5 seconds"),
        Stream.tap((batch) => Effect.log(`Batching: ${batch.join(", ")}`)),
        Stream.mapEffect((batch) => MessagesService.sendMarkAsReadBatch(Chunk.fromIterable(batch))),
        Stream.runDrain,
        Effect.ignoreCause,
        runtime.runFork,
      )

      return () => {
        runtime.runFork(Fiber.interrupt(streamFiber))
      }
    }, [queue, runtime])

    const unreadMessages = useMemo(() => messages.filter((message) => message.readAt === null), [messages])

    const offer = useCallback(
      (id: Message.MessageId) => {
        if (offeredIds.current.has(id) || !Queue.offerUnsafe(queue, id)) {
          return false
        }

        offeredIds.current.add(id)
        const readAt: DateTime.Utc = DateTime.nowUnsafe()
        queryClient.setQueryData<Message.Message[]>(messagesQueryKey(), (currentMessages) => {
          if (currentMessages === undefined) {
            return currentMessages
          }

          return currentMessages.map((message) =>
            message.id === id && message.readAt === null ? { ...message, readAt } : message,
          )
        })
        return true
      },
      [queue],
    )

    const observerRef = useRef<IntersectionObserver | null>(null)

    useEffect(() => {
      const handleFocus = () => {
        if (!document.hasFocus()) {
          return
        }

        const elements = document.querySelectorAll("[data-message-id]")
        unreadMessages.forEach((message) => {
          const element = Array.from(elements).find(
            (candidate) => candidate.getAttribute("data-message-id") === message.id,
          )
          if (element !== undefined && isFullyVisible(element) && offer(message.id)) {
            observerRef.current?.unobserve(element)
          }
        })
      }

      window.addEventListener("focus", handleFocus)
      return () => {
        window.removeEventListener("focus", handleFocus)
      }
    }, [offer, unreadMessages])

    const [observer, setObserver] = useState<IntersectionObserver | null>(null)

    useEffect(() => {
      if (typeof IntersectionObserver === "undefined") {
        return
      }

      const nextObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!(entry.isIntersecting && entry.intersectionRatio >= 1 && document.hasFocus())) {
              return
            }

            const messageId = entry.target.getAttribute("data-message-id")
            const message = unreadMessages.find((candidate) => candidate.id === messageId)
            if (message !== undefined) {
              offer(message.id)
              nextObserver.unobserve(entry.target)
            }
          })
        },
        { threshold: 1 },
      )

      observerRef.current = nextObserver
      setObserver(nextObserver)

      return () => {
        nextObserver.disconnect()
        if (observerRef.current === nextObserver) {
          observerRef.current = null
        }
      }
    }, [offer, unreadMessages])

    return { observer }
  }
}
