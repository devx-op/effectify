import { createRouter as createTanstackRouter } from '@tanstack/solid-router'
import { routeTree } from './routeTree.gen.ts'

import './styles.css'
import { queryClient, RuntimeProvider } from '@effectify/chat-solid/services/tanstack-query'

export const createRouter = () => {
  const router = createTanstackRouter({
    routeTree,
    context: { queryClient },
    defaultPreload: 'intent',
    defaultPendingComponent: () => <div>Loading...</div>,
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    Wrap: ({ children }) => <RuntimeProvider>{children}</RuntimeProvider>,
  })
  // TODO: implement routerWithQueryClient when is available for solid
  //https://github.com/TanStack/router/issues/4325
  return router
}

const router = createRouter()
declare module '@tanstack/solid-router' {
  interface Register {
    router: typeof router
  }
}
