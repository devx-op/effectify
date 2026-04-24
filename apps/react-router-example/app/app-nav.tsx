import { NavLink, useNavigate } from "react-router"
import { authClient } from "./lib/auth-client.js"

export const NAV_ITEMS = [
  { to: "/", label: "Home" },
  { to: "/login", label: "Login" },
  { to: "/signup", label: "Sign Up" },
  { to: "/todo-app", label: "Todo App" },
  { to: "/chat", label: "Chat Demo" },
  { to: "/hatchet-demo", label: "Hatchet Demo" },
] as const

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
          <NavLink discover="none" end to="/" style={{ fontWeight: 600 }}>
            Effectify
          </NavLink>
        </li>
      </ul>
      <ul>
        {NAV_ITEMS.map((item) => (
          <li key={item.to}>
            <NavLink discover="none" end to={item.to}>
              {item.label}
            </NavLink>
          </li>
        ))}
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
