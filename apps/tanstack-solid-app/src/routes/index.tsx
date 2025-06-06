import { ChatContainer } from '@/components/chat'
import { createFileRoute } from '@tanstack/solid-router'
import logo from '../logo.svg'

export const Route = createFileRoute('/')({
  component: IndexComponent,
})

function IndexComponent() {
  return (
    <div class="text-center">
      <header class="min-h-20 flex flex-col items-center justify-center bg-[#282c34] text-white text-[calc(10px+2vmin)]">
        <img src={logo} class="h-[12vmin] pointer-events-none animate-[spin_20s_linear_infinite]" alt="logo" />
        <p>
          Edit <code>src/routes/index.tsx</code> and save to reload.
        </p>
      </header>
      <div class="p-16">
        <ChatContainer />
      </div>
    </div>
  )
}
