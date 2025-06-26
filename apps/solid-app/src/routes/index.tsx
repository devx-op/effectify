import { ChatContainer } from '@/components/chat'
import { createFileRoute } from '@tanstack/solid-router'

export const Route = createFileRoute('/')({
  component: IndexComponent,
})

function IndexComponent() {
  return (
    <div class="p-16">
      <ChatContainer />
    </div>
  )
}
