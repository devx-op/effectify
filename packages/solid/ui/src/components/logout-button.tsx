import { Button } from "@effectify/solid-ui/components/primitives/button"
import { LogOutIcon } from "lucide-solid"
import type { Component } from "solid-js"

export const LogoutButton: Component<{ onClick: () => void }> = (props) => {
  return (
    <Button {...props} size={"sm"} variant="ghost">
      <LogOutIcon class="h-4" />
    </Button>
  )
}
