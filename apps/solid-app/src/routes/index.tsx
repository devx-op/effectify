import { createFileRoute, redirect } from '@tanstack/solid-router'

import { useSession } from '@/libs/auth-client'

export const Route = createFileRoute('/')({
  component: IndexComponent,
  beforeLoad: () => {
    const session = useSession()
    console.log('session', session())
    if (!session().data?.session) {
      return redirect({ to: '/login' })
    }
    return redirect({ to: '/dashboard' })
  },
})

function IndexComponent() {
  return <></>
}
