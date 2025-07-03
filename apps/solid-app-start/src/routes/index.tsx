import { useCheckSession } from '@/hooks/check-session-hook'
import { createFileRoute } from '@tanstack/solid-router'

export const Route = createFileRoute('/')({
  component: IndexComponent,
})

function IndexComponent() {
  useCheckSession()

  return <div>Loading...</div>
}
