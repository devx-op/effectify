import { Links, type LinksFunction, Meta, type MetaFunction, Outlet, Scripts, ScrollRestoration } from "react-router"

export const meta: MetaFunction = () => [{ title: "Effect v4 Beta Demo" }]

export const links: LinksFunction = () => [
  {
    rel: "stylesheet",
    href: "https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.classless.min.css",
    integrity: "sha384-NZhm4G1I7BpEGdjDKnzEfy3d78xvy7ECKUwwnKTYi036z42IyF056PbHfpQLIYgL",
    crossOrigin: "anonymous",
  },
]

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta content="width=device-width, initial-scale=1" name="viewport" />
        <Meta />
        <Links />
      </head>
      <body>
        <main className="container">
          <header>
            <h1>Effect v4 Beta Demo</h1>
            <p>@effectify/react-query + @effectify/solid-query</p>
          </header>
          {children}
        </main>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

export default function App() {
  return <Outlet />
}
