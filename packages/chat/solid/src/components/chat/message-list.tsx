import type * as Message from '@effectify/chat-domain/message.ts'

import { VStack } from '@effectify/solid-ui/components/primitives/stack'
import type { Component } from 'solid-js'
import { MessagesOperations } from './../../services/message-namespace.js'
import { MessageBubble } from './message-bubble.jsx'

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
