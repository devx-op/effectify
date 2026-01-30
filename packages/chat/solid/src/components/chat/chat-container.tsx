import type * as Message from "@effectify/chat-domain/message.js"
import { Button } from "@effectify/solid-ui/components/primitives/button"
import { Center } from "@effectify/solid-ui/components/primitives/center"
import { Flex } from "@effectify/solid-ui/components/primitives/flex"
import { VStack } from "@effectify/solid-ui/components/primitives/stack"
import type { UseQueryResult } from "@tanstack/solid-query"
import { AlertCircle } from "lucide-solid"
import type { Component } from "solid-js"
import { MessagesOperations } from "./../../services/message-namespace.js"
import { MessageList } from "./message-list.js"
import { MessageListSkeleton } from "./message-list-skeleton.js"

const ErrorState: Component<{ messagesQuery: UseQueryResult<Message.Message[]> }> = ({ messagesQuery }) => {
  return (
    <VStack align="center" class="p-4" gap="4" justify="center">
      <AlertCircle class="size-12 text-destructive" />

      <Center>
        <p class="font-semibold text-destructive">Error loading messages</p>
        <p class="text-muted-foreground text-sm">Something went wrong. Please try again.</p>
      </Center>

      <Button onClick={() => messagesQuery.refetch()} variant="outline">
        <AlertCircle class="size-4" />
        Retry
      </Button>
    </VStack>
  )
}

export const ChatContainer: Component = () => {
  const messagesQuery = MessagesOperations.useMessagesQuery()

  return (
    <VStack class="h-[calc(100vh-4rem)] rounded-lg border bg-card">
      <div class="border-b p-4">
        <h2 class="font-semibold text-lg">Messages</h2>
      </div>

      <Flex class="scrollbar-thin scrollbar-thumb-rounded-lg scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent flex-1 overflow-y-auto scroll-smooth">
        {(() => {
          if (messagesQuery.isLoading) {
            return <MessageListSkeleton />
          }

          if (messagesQuery.isSuccess) {
            return <MessageList messages={messagesQuery.data as Message.Message[]} />
          }

          return <ErrorState messagesQuery={messagesQuery as UseQueryResult<Message.Message[]>} />
        })()}
      </Flex>
    </VStack>
  )
}
