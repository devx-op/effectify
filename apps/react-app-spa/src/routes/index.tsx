import { useCheckSession } from '@/hooks/check-session-hook'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: App,
})

function App() {
  useCheckSession()
  return <div className="text-center">loading..</div>
}
