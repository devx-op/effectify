import type { HtmlLinkDescriptor } from "@remix-run/react"
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "@remix-run/react"
import { Nav } from "./components/Nav.js"

export default function App() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <Nav />
        <main className="container">
          <Outlet />
        </main>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

export function links(): HtmlLinkDescriptor[] {
  return [
    { rel: "icon", href: "data:image/x-icon;base64,AA" },
    {
      rel: "stylesheet",
      href: "https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.classless.min.css",
      integrity: "sha384-NZhm4G1I7BpEGdjDKnzEfy3d78xvy7ECKUwwnKTYi036z42IyF056PbHfpQLIYgL",
      crossOrigin: "anonymous",
    },
  ]
}
