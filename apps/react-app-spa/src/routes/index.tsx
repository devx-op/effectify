import { createFileRoute } from '@tanstack/react-router'
import { useCheckSession } from '@/hooks/check-session-hook'

export const Route = createFileRoute('/')({
  component: App,
})

function App() {
  useCheckSession()
  return <div className="text-center">loading..</div>
}
