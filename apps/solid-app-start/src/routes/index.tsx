import { createFileRoute } from '@tanstack/solid-router'
import { createEffect } from 'solid-js'

import { useSession } from '@/libs/auth-client'

export const Route = createFileRoute('/')({
  component: IndexComponent,
})

function IndexComponent() {
  const navigate = Route.useNavigate()
  const session = useSession()

  createEffect(() => {
    console.log('session', session())
    if (session().data?.session) {
      navigate({ to: '/dashboard' })
    } else if (!session().isPending) {
      navigate({ to: '/login' })
    }
  })

  return <div>Loading...</div>
}
