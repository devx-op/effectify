import type { ParentProps } from 'solid-js'
import { Flex } from '../ui/flex.jsx'

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
