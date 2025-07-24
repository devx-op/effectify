import { RuntimeProvider } from '@effectify/chat-solid/services/tanstack-query'
import { createRootRouteWithContext, Outlet } from '@tanstack/solid-router'
import { TanStackRouterDevtools } from '@tanstack/solid-router-devtools'

export const Route = createRootRouteWithContext()({
  component: RootComponent,
})

function RootComponent() {
  return (
    <RuntimeProvider>
      <Outlet />
      <TanStackRouterDevtools />
    </RuntimeProvider>
  )
}
