import { useSession } from '@/libs/auth-client'
import { useNavigate } from '@tanstack/solid-router'
import { createEffect } from 'solid-js'

export const useCheckSession = () => {
  const navigate = useNavigate()
  const session = useSession()

  createEffect(() => {
    console.log('session', session())
    if (session().data?.session) {
      navigate({ to: '/dashboard' })
    } else if (!session().isPending) {
      navigate({ to: '/login' })
    }
  })
}
