import { AlignRightIcon, XIcon } from 'lucide-solid'

import { Button } from '@/components/primitives/button'
import * as Popover from '@/components/primitives/popover'
import { type JSX, createSignal } from 'solid-js'

export const MobileNavbar = (props: { children: JSX.Element }) => {
  // const { pathname } = useLocation()
  const [open, setOpen] = createSignal(false)

  // createEffect(() => {
  //   if (pathname) {
  //     setOpen(false)
  //   }
  // }, [pathname])

  return (
    <Popover.Root open={open()} onOpenChange={(e) => setOpen(e)} placement="bottom" overflowPadding={0} overlap={true}>
      <Popover.Trigger>
        <Button aria-label="Open Menu" variant="ghost">
          {open() ? <XIcon /> : <AlignRightIcon />}
        </Button>
      </Popover.Trigger>
      <Popover.Body showClose={false} class="w-screen">
        {props.children}
      </Popover.Body>
    </Popover.Root>
  )
}
