import { authClient } from '@/libs/auth-client.js'
import { useNavigate } from '@tanstack/solid-router'
import { LogOutIcon } from 'lucide-solid'
import { Button } from './ui/button.jsx'

export const LogoutButton = () => {
  const navigate = useNavigate()
  const handleLogout = async () => {
    const res = await authClient.signOut()
    if (res.error) {
      console.error('Error signing out', res.error)
      return
    }
    navigate({ to: '/login' })
  }

  return (
    <Button onClick={handleLogout} variant="ghost" size={'sm'}>
      <LogOutIcon class="h-4" />
    </Button>
  )
}
