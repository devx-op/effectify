// app.tsx - TanStack Start root component

import { queryClient, RuntimeProvider } from '@effectify/chat-solid/services/tanstack-query'
import { createRouter, RouterProvider } from '@tanstack/solid-router'
import { routeTree } from './routeTree.gen.ts'
import './styles.css'

const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
  defaultPendingComponent: () => <div>Loading...</div>,
  scrollRestoration: true,
  defaultPreloadStaleTime: 0,
  Wrap: ({ children }) => <RuntimeProvider>{children}</RuntimeProvider>,
})

declare module '@tanstack/solid-router' {
  interface Register {
    router: typeof router
  }
}

export default function App() {
  return <RouterProvider router={router} />
}
