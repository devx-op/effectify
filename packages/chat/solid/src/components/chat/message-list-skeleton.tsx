import { VStack } from "@effectify/solid-ui/components/primitives/stack"
import type { Component } from "solid-js"
import { MessageBubbleSkeleton } from "./mesage-bubble-skeleton.js"

export const MessageListSkeleton: Component = () => {
  const widths = [180, 260, 200, 180, 260, 200, 180, 260, 200]

  return (
    <VStack class="p-4" gap="4">
      {widths.map((width) => <MessageBubbleSkeleton width={width} />)}
    </VStack>
  )
}
