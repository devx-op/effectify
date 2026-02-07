import { useState } from "react"
import { authClient } from "./../lib/auth-client.js"
import { Link, useNavigate } from "react-router"

export default function SignUp() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    console.log("[SignUp] Attempting to sign up with email:", email)
    await authClient.signUp.email(
      {
        email,
        password,
        name,
      },
      {
        onSuccess: () => {
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
        <h2>Create an account</h2>
        <form onSubmit={handleSignUp}>
          <div>
            <label htmlFor="name">Full Name</label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              required
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
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
              autoComplete="new-password"
              required
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && (
            <small role="alert" aria-live="polite" style={{ color: "var(--pico-color-red-500)" }}>{error}</small>
          )}
          <button type="submit">Sign up</button>
        </form>
        <p>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </article>
    </main>
  )
}
