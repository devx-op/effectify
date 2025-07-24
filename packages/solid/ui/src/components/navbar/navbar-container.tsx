import { Flex } from '@effectify/solid-ui/components/primitives/flex'
import type { ParentProps } from 'solid-js'

export const NavbarContainer = (props: ParentProps) => (
  <Flex class="z-sticky w-full border-[--border-subtle] border-b dark:border-b-truegray ">{props.children}</Flex>
)
