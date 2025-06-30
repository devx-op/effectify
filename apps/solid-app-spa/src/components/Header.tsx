import { Link } from '@tanstack/solid-router'

import TanStackQueryHeaderUser from '../integrations/tanstack-query/header-user.tsx'

export default function Header() {
  return (
    <header class="p-2 flex gap-2 bg-white text-black justify-between">
      <nav class="flex flex-row">
        <div class="px-2 font-bold">
          <Link to="/">Home</Link>
        </div>

        <div class="px-2 font-bold">
          <Link to="/demo/form">Form</Link>
        </div>

        <div class="px-2 font-bold">
          <Link to="/demo/tanstack-query">TanStack Query</Link>
        </div>
      </nav>

      <div>
        <TanStackQueryHeaderUser />
      </div>
    </header>
  )
}
