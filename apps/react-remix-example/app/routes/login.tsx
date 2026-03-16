import { useState } from "react"
import { authClient } from "./../lib/auth-client.js"
import { Link, useNavigate } from "@remix-run/react"

export default function Login() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    await authClient.signIn.email(
      {
        email,
        password,
      },
      {
        onSuccess: (ctx) => {
          console.log("Login successful")
          console.dir(ctx, { depth: null })
          navigate("/")
        },
        onError: (ctx) => {
          setError(ctx.error.message)
        },
      },
    )
  }

  return (
    <main className="container">
      <article>
        <h2>Sign in to your account</h2>
        <form onSubmit={handleLogin}>
          <div>
            <label htmlFor="email-address">Email address</label>
            <input
              id="email-address"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && (
            <small role="alert" aria-live="polite" style={{ color: "var(--pico-color-red-500)" }}>{error}</small>
          )}
          <button type="submit">Sign in</button>
        </form>
        <p>
          Don't have an account? <Link to="/signup">Sign up</Link>
        </p>
      </article>
    </main>
  )
}
