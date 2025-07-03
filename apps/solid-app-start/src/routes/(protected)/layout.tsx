import { Outlet, createFileRoute } from '@tanstack/solid-router'

import { authClient } from '@/libs/auth-client'
import { MainNavbar } from '@effectify/solid-ui/components/navbar/MainNavbar'
import { Navbar } from '@effectify/solid-ui/components/navbar/Navbar'
import { Flex } from '@effectify/solid-ui/components/primitives/flex'
import { HStack } from '@effectify/solid-ui/components/primitives/stack'
import { Sidebar } from '@effectify/solid-ui/components/sidebar/Sidebar'
import { SidebarContainer } from '@effectify/solid-ui/components/sidebar/SidebarContainer'

export const Route = createFileRoute('/(protected)')({
  component: RouteComponent,
})

function RouteComponent() {
  const handleLogout = async () => {
    console.log('logout')
    try {
      await authClient.signOut()
      // Forzar navegación inmediata
      window.location.href = '/login'
    } catch (error) {
      console.error('Error during logout:', error)
    }
  }

  return (
    <HStack class="min-h-screen">
      <Flex class=" w-full">
        <aside class="w-64 hidden md:block border-1 b-r-black dark:b-r-gray">
          <SidebarContainer>
            <Sidebar groups={[]} />
          </SidebarContainer>
        </aside>
        <main class="flex-1">
          <MainNavbar onLogout={handleLogout} />
          <Navbar />
          <div class="max-w-7xl mx-auto p-6">
            <Outlet />
          </div>
        </main>
      </Flex>
    </HStack>
  )
}
