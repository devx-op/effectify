import type * as Message from '@/domain/Message'

import { Button } from '@/components/ui/button'
import { Center } from '@/components/ui/center'
import { Flex } from '@/components/ui/flex'
import { VStack } from '@/components/ui/stack'
import { MessagesOperations } from '@/services/message-namespace'
import type { UseQueryResult } from '@tanstack/solid-query'
import { AlertCircle } from 'lucide-solid'
import type { Component } from 'solid-js'
import { MessageListSkeleton } from './message-list-skeleton.jsx'
import { MessageList } from './message-list.jsx'

const ErrorState: Component<{ messagesQuery: UseQueryResult<Message.Message[]> }> = ({ messagesQuery }) => {
  return (
    <VStack align="center" justify="center" gap="4" class="p-4">
      <AlertCircle class="size-12 text-destructive" />

      <Center>
        <p class="font-semibold text-destructive">Error loading messages</p>
        <p class="text-sm text-muted-foreground">Something went wrong. Please try again.</p>
      </Center>

      <Button variant="outline" onClick={() => messagesQuery.refetch()}>
        <AlertCircle class="size-4" />
        Retry
      </Button>
    </VStack>
  )
}

export const ChatContainer: Component = () => {
  const messagesQuery = MessagesOperations.useMessagesQuery()

  return (
    <VStack class="rounded-lg border bg-card h-[calc(100vh-4rem)]">
      <div class="border-b p-4">
        <h2 class="text-lg font-semibold">Messages</h2>
      </div>

      <Flex class="flex-1 overflow-y-auto scroll-smooth scrollbar-thin scrollbar-thumb-rounded-lg scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
        {messagesQuery.isLoading ? (
          <MessageListSkeleton />
        ) : !messagesQuery.isSuccess ? (
          <ErrorState messagesQuery={messagesQuery as UseQueryResult<Message.Message[]>} />
        ) : (
          <MessageList messages={messagesQuery.data} />
        )}
      </Flex>
    </VStack>
  )
}
