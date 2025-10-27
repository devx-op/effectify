import { makeHttpRouterHandler } from '@effectify/react-router'
import { ApiLive } from '../lib/http.server'

export const loader = makeHttpRouterHandler({
  apiLive: ApiLive,
  scalar: {
    baseServerURL: 'http://localhost:3000/api',
  },
})

export const action = makeHttpRouterHandler({
  apiLive: ApiLive,
})
