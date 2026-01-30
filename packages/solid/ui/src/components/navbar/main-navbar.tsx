import { LogoutButton } from "@effectify/solid-ui/components/logout-button"
import { MobileNavbar } from "@effectify/solid-ui/components/navbar/mobile-navbar"
import { NavbarContainer } from "@effectify/solid-ui/components/navbar/navbar-container"
// import { ThemeSelector } from '@effectify/solid-ui/components/theme-selector'
import { Separator } from "@effectify/solid-ui/components/primitives/separator"
import { HStack, Stack } from "@effectify/solid-ui/components/primitives/stack"
import type { Component } from "solid-js"

// import { ThemeDrawer } from '../theming/ThemeDrawer'

export const MainNavbar: Component<{ onLogout: () => void }> = (props) => (
  <NavbarContainer>
    <HStack class="w-full p-2" justify="between">
      <a aria-label="Back to home" href="/">
        Logo + 1
      </a>
      <HStack class="hidden py-1 md:flex">
        <Separator class="h-6" orientation="vertical" />
        <HStack>
          {/* <ThemeDrawer /> */}
          {/* <ThemeSelector /> */}
          <Separator orientation="vertical" />
          <LogoutButton onClick={props.onLogout} />
        </HStack>
      </HStack>
      <HStack class="flex py-1 md:hidden">
        <MobileNavbar>
          <Stack class="w-full" gap="0">
            <Separator orientation="vertical" />
            <HStack class="" gap="3" justify="center">
              {/* <ThemeSelector /> */}
            </HStack>
            <Separator orientation="vertical" />
            <HStack class="" gap="3" justify="center">
              <LogoutButton onClick={props.onLogout} />
            </HStack>
          </Stack>
        </MobileNavbar>
      </HStack>
    </HStack>
  </NavbarContainer>
)
