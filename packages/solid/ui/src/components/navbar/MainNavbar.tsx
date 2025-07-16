import { HStack, Stack } from '@effectify/solid-ui/components/primitives/stack'

import { LogoutButton } from '@effectify/solid-ui/components/logout-button'
import { MobileNavbar } from '@effectify/solid-ui/components/navbar/MobileNavbar'
import { NavbarContainer } from '@effectify/solid-ui/components/navbar/NavbarContainer'
// import { ThemeSelector } from '@effectify/solid-ui/components/theme-selector'
import { Separator } from '@effectify/solid-ui/components/primitives/separator'
import type { Component } from 'solid-js'

// import { ThemeDrawer } from '../theming/ThemeDrawer'

export const MainNavbar: Component<{ onLogout: () => void }> = (props) => (
  <NavbarContainer>
    <HStack justify="between" class="w-full p-2">
      <a href="/" aria-label="Back to home">
        Logo + 1
      </a>
      <HStack class="py-1 hidden md:flex">
        <Separator orientation="vertical" class="h-6" />
        <HStack>
          {/* <ThemeDrawer /> */}
          {/* <ThemeSelector /> */}
          <Separator orientation="vertical" />
          <LogoutButton onClick={props.onLogout} />
        </HStack>
      </HStack>
      <HStack class="py-1 flex md:hidden">
        <MobileNavbar>
          <Stack gap="0" class="w-full">
            <Separator orientation="vertical" />
            <HStack gap="3" justify="center" class="">
              {/* <ThemeSelector /> */}
            </HStack>
            <Separator orientation="vertical" />
            <HStack gap="3" justify="center" class="">
              <LogoutButton onClick={props.onLogout} />
            </HStack>
          </Stack>
        </MobileNavbar>
      </HStack>
    </HStack>
  </NavbarContainer>
)
