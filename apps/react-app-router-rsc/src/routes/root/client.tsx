'use client'

import { isRouteErrorResponse, Link, NavLink, useNavigation, useRouteError } from 'react-router'

export function Layout({ children }: { children: React.ReactNode }) {
  const navigation = useNavigation()
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta content="width=device-width, initial-scale=1" name="viewport" />
        <link href="/favicon.ico" rel="icon" type="image/x-icon" />
      </head>
      <body className="font-sans antialiased">
        <header className="sticky inset-x-0 top-0 z-50 border-b bg-background">
          <div className="relative mx-auto flex h-16 max-w-screen-xl items-center justify-between gap-4 px-4 sm:gap-8">
            <div className="flex items-center gap-4">
              <Link to="/">React Router 🚀</Link>
              <nav>
                <ul className="flex gap-4">
                  <li>
                    <NavLink className="font-medium text-sm hover:opacity-75 aria-[current]:opacity-75" to="/">
                      Home
                    </NavLink>
                  </li>
                  <li>
                    <NavLink className="font-medium text-sm hover:opacity-75 aria-[current]:opacity-75" to="/about">
                      About
                    </NavLink>
                  </li>
                  <li>
                    <NavLink className="font-medium text-sm hover:opacity-75 aria-[current]:opacity-75" to="/test">
                      Test
                    </NavLink>
                  </li>
                </ul>
              </nav>
              <div>{navigation.state !== 'idle' && <p>Loading...</p>}</div>
            </div>
          </div>
        </header>
        {children}
      </body>
    </html>
  )
}

export function ErrorBoundary() {
  const error = useRouteError()
  let status = 500
  let message = 'An unexpected error occurred.'

  if (isRouteErrorResponse(error)) {
    status = error.status
    message = status === 404 ? 'Page not found.' : error.statusText || message
  }

  return (
    <main className="mx-auto max-w-screen-xl px-4 py-8 lg:py-12">
      <article className="prose mx-auto">
        <h1>{status}</h1>
        <p>{message}</p>
      </article>
    </main>
  )
}
