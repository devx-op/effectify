import { NavLink } from 'react-router'

export function AppNav() {
  return (
    <nav>
      <NavLink end to="/">
        Home
      </NavLink>
      <NavLink end to="/about">
        About
      </NavLink>
    </nav>
  )
}
