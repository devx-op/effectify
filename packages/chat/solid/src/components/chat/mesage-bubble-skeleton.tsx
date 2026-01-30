import { Flex } from "@effectify/solid-ui/components/primitives/flex"
import { VStack } from "@effectify/solid-ui/components/primitives/stack"
import type { Component } from "solid-js"

interface MessageBubbleSkeletonProps {
  width?: number
}

export const MessageBubbleSkeleton: Component<MessageBubbleSkeletonProps> = ({ width = 200 }) => {
  return (
    <VStack>
      <Flex align="end" class="flex items-end gap-2" gap="2">
        <div class="animate-pulse rounded-2xl bg-muted px-4 py-2">
          <VStack gap="1">
            <div class="h-4 rounded bg-muted-foreground/20" style={{ width: `${width}px` }} />

            <Flex align="center" class="mt-1" gap="1" justify="end">
              <div class="h-3 w-12 rounded bg-muted-foreground/20" />
              <div class="h-4 w-4 rounded bg-muted-foreground/20" />
            </Flex>
          </VStack>
        </div>
      </Flex>
    </VStack>
  )
}
