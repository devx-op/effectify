// FIXME: Temporary stub - Effect v4 API compatibility issues
// Original implementation commented out due to Effect v4 type changes
// TODO: Migrate to Effect v4 stable APIs when available

import type * as Message from "@effectify/chat-domain/message.js"
import { createQueryKey } from "@effectify/react-query"
import { useEffectQuery } from "./tanstack-query.js"
import * as Effect from "effect/Effect"

export namespace MessagesOperations {
  const messagesQueryKey = createQueryKey(
    "MessagesOperations.useMessagesQuery",
  )

  export const useMessagesQuery = () => {
    return useEffectQuery({
      queryKey: messagesQueryKey(),
      queryFn: () => {
        // FIXME: Implement with v4 compatible APIs
        console.warn(
          "MessagesOperations.useMessagesQuery - stub implementation",
        )
        return Effect.succeed([] as Message.Message[])
      },
      staleTime: 6500, // 6.5 seconds in millis
    })
  }

  export const useMarkMessagesAsRead = (_messages: Message.Message[]) => {
    // FIXME: Implement with v4 compatible APIs
    console.warn(
      "MessagesOperations.useMarkMessagesAsRead - stub implementation",
    )
    return { observer: null as IntersectionObserver | null }
  }
}
