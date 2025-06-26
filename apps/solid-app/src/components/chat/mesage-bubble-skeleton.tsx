import { Flex } from '@/components/ui/flex'
import { VStack } from '@/components/ui/stack'
import type { Component } from 'solid-js'

interface MessageBubbleSkeletonProps {
  width?: number
}

export const MessageBubbleSkeleton: Component<MessageBubbleSkeletonProps> = ({ width = 200 }) => {
  return (
    <VStack>
      <Flex align="end" gap="2" class="flex items-end gap-2">
        <div class="bg-muted animate-pulse rounded-2xl px-4 py-2">
          <VStack gap="1">
            <div class="bg-muted-foreground/20 h-4 rounded" style={{ width: `${width}px` }} />

            <Flex align="center" justify="end" gap="1" class="mt-1">
              <div class="bg-muted-foreground/20 h-3 w-12 rounded" />
              <div class="bg-muted-foreground/20 h-4 w-4 rounded" />
            </Flex>
          </VStack>
        </div>
      </Flex>
    </VStack>
  )
}
