import { createAuthClient } from 'better-auth/solid'

export const authClient = createAuthClient({
  /** The base URL of the server (optional if you're using the same domain) */
  baseURL: 'http://localhost:3001/api/auth',
})

export const { useSession } = authClient
