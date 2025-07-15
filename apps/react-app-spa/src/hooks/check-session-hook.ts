import { useSession } from '@/libs/auth-client'
import { useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'

export const useCheckSession = () => {
  const navigate = useNavigate()
  const session = useSession()

  useEffect(() => {
    console.log('session', session)
    if (session.data?.session) {
      navigate({ to: '/dashboard' })
    } else if (!session.isPending) {
      navigate({ to: '/login' })
    }
  }, [session, navigate])
}
