import { buttonVariants } from '@/components/ui/button'
import { useSession } from '@/libs/auth-client'
import { createFileRoute } from '@tanstack/solid-router'

export const Route = createFileRoute('/')({
  component: IndexComponent,
})

function IndexComponent() {
  const session = useSession()
  const navigate = Route.useNavigate()
  if (!session) {
    return (
      <div>
        Not logged in
        <a href="/login" class={buttonVariants()}>
          Login
        </a>
      </div>
    )
  } else {
    navigate({ to: '/dashboard' })
  }
  return <></>
}
