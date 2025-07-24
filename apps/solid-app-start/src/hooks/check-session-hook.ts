import { useNavigate } from '@tanstack/solid-router'
import { createEffect } from 'solid-js'
import { useSession } from '@/libs/auth-client'

export const useCheckSession = () => {
  const navigate = useNavigate()
  const session = useSession()

  createEffect(() => {
    if (session().data?.session) {
      navigate({ to: '/dashboard' })
    } else if (!session().isPending) {
      navigate({ to: '/login' })
    }
  })
}
