import { Button } from '@/components/primitives/button'
import * as Drawer from '@/components/primitives/drawer'
import { AlignLeftIcon } from 'lucide-solid'
import { type JSX, createSignal } from 'solid-js'

export const MobileSidebar = (props: { children: JSX.Element }) => {
  const [isOpen, setIsOpen] = createSignal(false)
  // const { pathname } = useLocation()

  // createEffect(() => {
  //   if (pathname) {
  //     setIsOpen(false)
  //   }
  // }, [pathname])

  return (
    <Drawer.Root open={isOpen()} onOpenChange={(e) => setIsOpen(e)} side="left">
      <Drawer.Trigger>
        <Button aria-label="Open Sidebar" variant="link" class="min-h-8" size="sm">
          <AlignLeftIcon />
        </Button>
      </Drawer.Trigger>
      <Drawer.Body>{props.children}</Drawer.Body>
    </Drawer.Root>
  )
}
