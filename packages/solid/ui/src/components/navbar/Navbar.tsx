import { type Pages, Sidebar } from '@effectify/solid-ui/components/sidebar/Sidebar'

import { Breadcrumbs } from '@effectify/solid-ui/components/bread-crumbs'
import { HStack } from '@effectify/solid-ui/components/primitives/stack'
import { MobileSidebar } from '@effectify/solid-ui/components/sidebar/MobileSidebar'

export const Navbar = () => {
  const groups = [[]] as Pages[][]
  return (
    <HStack
      gap="2"
      class="fixed left-0 right-0 top-16 bg-accent  flex md:hidden h-12 px-2 border-t-1 border-b-1 border-gray-200 dark:border-gray-700"
    >
      <MobileSidebar>
        <Sidebar groups={groups} />
      </MobileSidebar>
      <Breadcrumbs />
    </HStack>
  )
}
