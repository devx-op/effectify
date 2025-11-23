import { NavLink } from 'react-router'
import { authClient } from './lib/auth-client.js'

export function AppNav() {
  return (
    <nav>
      <NavLink end to="/">
        Home
      </NavLink>
      <NavLink end to="/about">
        About
      </NavLink>
      <button onClick={() => authClient.signOut()}>Sign Out</button>
    </nav>
  )
}
