import type * as Message from '@effectify/chat-domain/message.js'
import { cn } from '@effectify/solid-ui/lib/utils'
import { DateTime } from 'effect'
import { CheckCheckIcon } from 'lucide-solid'
import type { Component, JSX } from 'solid-js'

type Props = {
  message: Message.Message
}

export const MessageBubble: Component<Props & JSX.HTMLAttributes<HTMLDivElement>> = (props) => {
  return (
    <div {...props} class="flex items-end gap-2">
      <div class="rounded-2xl bg-muted px-4 py-2 text-foreground">
        <p class="text-sm">{props.message.body}</p>

        <div class="mt-1 flex items-center justify-end gap-1">
          <span class="text-muted-foreground text-xs">
            {props.message.createdAt.pipe(
              DateTime.formatLocal({
                hour: '2-digit',
                minute: '2-digit',
              }),
            )}
          </span>

          <CheckCheckIcon class={cn('size-4', props.message.readAt ? 'text-blue-500' : 'text-muted-foreground')} />
        </div>
      </div>
    </div>
  )
}
