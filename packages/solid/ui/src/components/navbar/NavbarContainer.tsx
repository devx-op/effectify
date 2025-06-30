import { Flex } from '@/components/primitives/flex'
import type { ParentProps } from 'solid-js'

export const NavbarContainer = (props: ParentProps) => (
  <Flex
    class="
      w-full
      z-sticky
      border-b
      border-[--border-subtle] dark:border-b-truegray
    "
  >
    {props.children}
  </Flex>
)
