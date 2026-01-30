import { Button } from "@effectify/solid-ui/components/primitives/button"
import * as Drawer from "@effectify/solid-ui/components/primitives/drawer"
import { AlignLeftIcon } from "lucide-solid"
import { createSignal, type JSX } from "solid-js"

export const MobileSidebar = (props: { children: JSX.Element }) => {
  const [isOpen, setIsOpen] = createSignal(false)
  // const { pathname } = useLocation()

  // createEffect(() => {
  //   if (pathname) {
  //     setIsOpen(false)
  //   }
  // }, [pathname])

  return (
    <Drawer.Root onOpenChange={(e) => setIsOpen(e)} open={isOpen()} side="left">
      <Drawer.Trigger>
        <Button aria-label="Open Sidebar" class="min-h-8" size="sm" variant="link">
          <AlignLeftIcon />
        </Button>
      </Drawer.Trigger>
      <Drawer.Body>{props.children}</Drawer.Body>
    </Drawer.Root>
  )
}
