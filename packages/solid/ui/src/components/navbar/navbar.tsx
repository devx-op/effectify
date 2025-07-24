import { Breadcrumbs } from '@effectify/solid-ui/components/bread-crumbs'
import { HStack } from '@effectify/solid-ui/components/primitives/stack'
import { MobileSidebar } from '@effectify/solid-ui/components/sidebar/mobile-sidebar'
import { type Pages, Sidebar } from '../sidebar/sidebar.jsx'

export const Navbar = () => {
  const groups = [[]] as Pages[][]
  return (
    <HStack
      class="fixed top-16 right-0 left-0 flex h-12 border-gray-200 border-t-1 border-b-1 bg-accent px-2 md:hidden dark:border-gray-700"
      gap="2"
    >
      <MobileSidebar>
        <Sidebar groups={groups} />
      </MobileSidebar>
      <Breadcrumbs />
    </HStack>
  )
}
