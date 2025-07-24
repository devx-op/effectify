import { Button } from '@effectify/solid-ui/components/primitives/button'
import * as Popover from '@effectify/solid-ui/components/primitives/popover'
import { AlignRightIcon, XIcon } from 'lucide-solid'
import { createSignal, type JSX } from 'solid-js'

export const MobileNavbar = (props: { children: JSX.Element }) => {
  // const { pathname } = useLocation()
  const [open, setOpen] = createSignal(false)

  // createEffect(() => {
  //   if (pathname) {
  //     setOpen(false)
  //   }
  // }, [pathname])

  return (
    <Popover.Root onOpenChange={(e) => setOpen(e)} open={open()} overflowPadding={0} overlap={true} placement="bottom">
      <Popover.Trigger>
        <Button aria-label="Open Menu" variant="ghost">
          {open() ? <XIcon /> : <AlignRightIcon />}
        </Button>
      </Popover.Trigger>
      <Popover.Body class="w-screen" showClose={false}>
        {props.children}
      </Popover.Body>
    </Popover.Root>
  )
}
