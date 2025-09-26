import { createRouter } from '@tanstack/solid-router'
import { DefaultCatchBoundary } from './components/default-error-bundaries'
import { routeTree } from './routeTree.gen'

import './styles.css'

export function getRouter() {
  const router = createRouter({
    routeTree,
    defaultPreload: 'intent',
    defaultErrorComponent: DefaultCatchBoundary,
    defaultNotFoundComponent: () => <>error</>,
    scrollRestoration: true,
  })

  return router
}
