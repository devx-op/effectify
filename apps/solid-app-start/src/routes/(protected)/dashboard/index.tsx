import { ChatContainer } from '@/components/chat/chat-container.jsx'
import { useSession } from '@/libs/auth-client'
import { createFileRoute, redirect } from '@tanstack/solid-router'

export const Route = createFileRoute('/(protected)/dashboard/')({
  component: RouteComponent,
  beforeLoad: () => {
    const session = useSession()
    if (!session().data?.session) {
      throw redirect({ to: '/login' })
    }
  },
})

function RouteComponent() {
  return (
    <div class="flex flex-col gap-4">
      <h1 class="text-2xl font-bold">Dashboard</h1>
      <ChatContainer />
    </div>
  )
}
