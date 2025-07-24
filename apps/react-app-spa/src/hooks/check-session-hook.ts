import { useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useSession } from '@/libs/auth-client'

export const useCheckSession = () => {
  const navigate = useNavigate()
  const session = useSession()

  useEffect(() => {
    if (session.data?.session) {
      navigate({ to: '/dashboard' })
    } else if (!session.isPending) {
      navigate({ to: '/login' })
    }
  }, [session, navigate])
}
