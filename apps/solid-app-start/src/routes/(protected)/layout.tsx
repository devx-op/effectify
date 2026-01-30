import { MainNavbar } from "@effectify/solid-ui/components/navbar/main-navbar"
import { Navbar } from "@effectify/solid-ui/components/navbar/navbar"
import { Flex } from "@effectify/solid-ui/components/primitives/flex"
import { HStack } from "@effectify/solid-ui/components/primitives/stack"
import { Sidebar } from "@effectify/solid-ui/components/sidebar/sidebar"
import { SidebarContainer } from "@effectify/solid-ui/components/sidebar/sidebar-container"
import { createFileRoute, Outlet } from "@tanstack/solid-router"
import { authClient } from "@/libs/auth-client"

export const Route = createFileRoute("/(protected)")({
  component: RouteComponent,
})

function RouteComponent() {
  const handleLogout = async () => {
    try {
      await authClient.signOut()
      // Forzar navegación inmediata
      window.location.href = "/login"
    } catch {
      window.location.href = "/login"
    }
  }

  return (
    <HStack class="min-h-screen">
      <Flex class="w-full">
        <aside class="b-r-black dark:b-r-gray hidden w-64 border-1 md:block">
          <SidebarContainer>
            <Sidebar groups={[]} />
          </SidebarContainer>
        </aside>
        <main class="flex-1">
          <MainNavbar onLogout={handleLogout} />
          <Navbar />
          <div class="mx-auto max-w-7xl p-6">
            <Outlet />
          </div>
        </main>
      </Flex>
    </HStack>
  )
}
