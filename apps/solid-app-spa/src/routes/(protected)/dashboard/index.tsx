import { ChatContainer } from '@effectify/chat-solid/components/chat/chat-container'
import { createFileRoute } from '@tanstack/solid-router'

export const Route = createFileRoute('/(protected)/dashboard/')({
  component: RouteComponent,
  beforeLoad: () => {
    // const session = useSession()
    // if (!session().data?.session) {
    //   throw redirect({ to: '/login' })
    // }
  },
})

function RouteComponent() {
  return (
    <div class="flex flex-col gap-4">
      <h1 class="font-bold text-2xl">Dashboard</h1>
      <ChatContainer />
    </div>
  )
}
