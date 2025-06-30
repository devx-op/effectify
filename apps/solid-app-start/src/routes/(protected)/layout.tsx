import { MainNavbar } from '@/components/navbar/MainNavbar'
import { Navbar } from '@/components/navbar/Navbar'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { SidebarContainer } from '@/components/sidebar/SidebarContainer'
import { Flex } from '@/components/ui/flex'
import { HStack } from '@/components/ui/stack'
import { Outlet, createFileRoute } from '@tanstack/solid-router'

export const Route = createFileRoute('/(protected)')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <HStack class="min-h-screen">
      <Flex class=" w-full">
        <aside class="w-64 hidden md:block border-1 b-r-black dark:b-r-gray">
          <SidebarContainer>
            <Sidebar groups={[]} />
          </SidebarContainer>
        </aside>
        <main class="flex-1">
          <MainNavbar />
          <Navbar />
          <div class="max-w-7xl mx-auto p-6">
            <Outlet />
          </div>
        </main>
      </Flex>
    </HStack>
  )
}
