import { Button } from '@effectify/solid-ui/components/primitives/button'
import { LogOutIcon } from 'lucide-solid'
import type { Component } from 'solid-js'

export const LogoutButton: Component<{ onClick: () => void }> = (props) => {
  return (
    <Button {...props} variant="ghost" size={'sm'}>
      <LogOutIcon class="h-4" />
    </Button>
  )
}
