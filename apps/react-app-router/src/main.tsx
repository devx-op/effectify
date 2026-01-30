import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { createBrowserRouter, RouterProvider } from "react-router"
import { routes } from "./routes"

const router = createBrowserRouter(routes)

const rootElement = document.getElementById("root")
if (!rootElement) {
  throw new Error("Root element not found")
}
createRoot(rootElement).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
