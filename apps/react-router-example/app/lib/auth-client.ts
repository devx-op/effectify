import { createAuthClient } from "better-auth/react"

// Create auth client - now using proxy (same origin)
export const authClient = createAuthClient({
  baseURL: "", // Empty = same origin, requests go through Vite proxy to localhost:3001
})

// Simple wrapper functions
export const handleSignIn = async (email: string, password: string) => {
  return authClient.signIn.email({ email, password })
}

export const handleSignUp = async (
  email: string,
  password: string,
  name?: string,
) => {
  return authClient.signUp.email({ email, password, name: name || "" })
}

export const handleSignOut = async () => {
  return authClient.signOut()
}

// Re-export hooks
export const { useSession, getSession } = authClient
