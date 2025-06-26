import type * as Message from '@/domain/Message'

import { VStack } from '@/components/ui/stack'
import { MessagesOperations } from '@/services/message-namespace'
import type { Component } from 'solid-js'
import { MessageBubble } from './message-bubble.js'

type Props = {
  messages: Message.Message[]
}

export const MessageList: Component<Props> = ({ messages }) => {
  const { observer } = MessagesOperations.useMarkMessagesAsRead(messages)

  return (
    <VStack gap="4" class="p-4">
      {messages.map((message) => (
        <MessageBubble
          message={message}
          data-message-id={message.id}
          ref={(el) => {
            if (el !== null && message.readAt === null) {
              requestAnimationFrame(() => {
                ;(observer as unknown as IntersectionObserver)?.observe(el)
              })
            }
          }}
        />
      ))}
    </VStack>
  )
}
