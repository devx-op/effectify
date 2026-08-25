import { NavLink } from "react-router"
import { authClient } from "../lib/auth-client.js"
import { useNavigate } from "react-router"

export function Nav() {
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
          <NavLink end to="/todos">
            Todos
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
