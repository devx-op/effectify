import { Form, redirect, useNavigation } from "react-router"
import { createAuthClient } from "better-auth/react"
import * as React from "react"

export function Login() {
  const [authClient] = React.useState(() => {
    if (typeof window !== "undefined") {
      return createAuthClient({ baseURL: "/api/auth" })
    }
    return null
  })
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const navigation = useNavigation()

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!authClient) {
      setError("Auth client not initialized")
      return
    }

    setIsLoading(true)
    setError(null)
    const formData = new FormData(event.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    try {
      await authClient.signIn.emailAndPassword({ email, password })
      // Redirect handled by signIn success
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      console.error("Login failed:", err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container">
      <h1>Login</h1>
      {error && <div className="error">{error}</div>}
      <Form method="post" onSubmit={handleLogin}>
        <div className="form-group">
          <label htmlFor="email">Email:</label>
          <input
            type="email"
            id="email"
            name="email"
            required
            className="input"
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password:</label>
          <input
            type="password"
            id="password"
            name="password"
            required
            className="input"
          />
        </div>
        <button
          type="submit"
          className="button"
          disabled={isLoading || navigation.state === "loading"}
        >
          {isLoading || navigation.state === "loading" ? "Logging in..." : "Login"}
        </button>
      </Form>
    </div>
  )
}
