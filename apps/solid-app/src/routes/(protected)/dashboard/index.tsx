import { ChatContainer } from '@/components/chat/chat-container.jsx'
import { createFileRoute } from '@tanstack/solid-router'

export const Route = createFileRoute('/(protected)/dashboard/')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div class="flex flex-col gap-4">
      <h1 class="text-2xl font-bold">Dashboard</h1>
      <ChatContainer />
    </div>
  )
}
