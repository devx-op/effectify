import { Button } from '@/components/primitives/button'
import { LogOutIcon } from 'lucide-solid'

export const LogoutButton = () => {
  // const navigate = useNavigate()
  // const handleClick = async () => {
  //   navigate('/logout')
  // }
  return (
    <Button variant="ghost" size={'sm'}>
      <LogOutIcon class="h-4" />
    </Button>
  )
}
