import { createAuthClient } from "better-auth/react"

// Empty baseURL keeps better-auth on the current app origin.
export const authClient = createAuthClient({
  baseURL: "",
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
