import { VStack } from '@/components/ui/stack'
import type { Component } from 'solid-js'
import { MessageBubbleSkeleton } from './mesage-bubble-skeleton.jsx'

export const MessageListSkeleton: Component = () => {
  const widths = [180, 260, 200, 180, 260, 200, 180, 260, 200]

  return (
    <VStack gap="4" class="p-4">
      {widths.map((width) => (
        <MessageBubbleSkeleton width={width} />
      ))}
    </VStack>
  )
}
