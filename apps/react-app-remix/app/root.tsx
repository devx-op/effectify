import type { HtmlLinkDescriptor } from "@remix-run/react"
import { Links, Meta, Outlet, Scripts } from "@remix-run/react"

export default function App() {
  return (
    <html>
      <head>
        <Meta />
        <Links />
      </head>
      <body>
        <h1>Hello world!</h1>
        <Outlet />
        <Scripts />
      </body>
    </html>
  )
}

export function links(): HtmlLinkDescriptor[] {
  return [{ rel: "icon", href: "data:image/x-icon;base64,AA" }]
}
