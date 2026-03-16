import { NavLink, useNavigate } from "react-router"
import { authClient } from "./lib/auth-client.js"

export function AppNav() {
  const navigate = useNavigate()
  return (
    <nav
      className="container-fluid"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        backdropFilter: "saturate(180%) blur(6px)",
      }}
    >
      <ul>
        <li>
          <NavLink end to="/" style={{ fontWeight: 600 }}>
            Effectify
          </NavLink>
        </li>
      </ul>
      <ul>
        <li>
          <NavLink end to="/">
            Home
          </NavLink>
        </li>
        <li>
          <NavLink end to="/chat">
            Chat Demo
          </NavLink>
        </li>
        <li>
          <button
            type="button"
            onClick={async () => {
              try {
                await authClient.signOut()
                navigate("/login")
              } catch {
                navigate("/login")
              }
            }}
          >
            Sign Out
          </button>
        </li>
      </ul>
    </nav>
  )
}
