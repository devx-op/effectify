import { HStack, Stack } from '@/components/primitives/stack'

import { LogoutButton } from '@/components/logout-button'
import { MobileNavbar } from '@/components/navbar/MobileNavbar'
import { NavbarContainer } from '@/components/navbar/NavbarContainer'
// import { ThemeSelector } from '@/components/theme-selector'
import { Separator } from '@/components/primitives/separator'
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
