import { NavLink } from "@remix-run/react"

export function Nav() {
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
      </ul>
    </nav>
  )
}
