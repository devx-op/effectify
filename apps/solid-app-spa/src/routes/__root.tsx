import { Outlet, createRootRouteWithContext } from '@tanstack/solid-router'

import { TanStackRouterDevtools } from '@tanstack/solid-router-devtools'
import Header from '../components/Header.js'
import TanStackQueryProvider from '../integrations/tanstack-query/provider.tsx'

export const Route = createRootRouteWithContext()({
  component: RootComponent,
})

function RootComponent() {
  return (
    <>
      <TanStackQueryProvider>
        <Header />

        <Outlet />
        <TanStackRouterDevtools />
      </TanStackQueryProvider>
    </>
  )
}
