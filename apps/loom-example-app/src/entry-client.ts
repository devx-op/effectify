import "./app.css"
import { Html, mount } from "@effectify/loom"
import { LoomVite } from "@effectify/loom-vite"
import { bodyForResult, prepareAppRequest, resolveAppRequest, titleForResult, todoRoutePath } from "./router.js"
import * as counterRouteModule from "./routes/counter-route.js"
import * as todoRouteModule from "./routes/todo-route.js"

export const bootstrapClient = (
  document: Document,
  options?: LoomVite.LoomBootstrapOptions,
): Promise<LoomVite.LoomBootstrapResult> => LoomVite.bootstrap(document, options)

const defaultClientUrl = "https://effectify.dev/"

const mountClientRoute = (pathname: string, root: HTMLElement): boolean => {
  if (pathname === "/") {
    mount({ counterRoute: counterRouteModule.default }, { root })
    return true
  }

  if (pathname === todoRoutePath) {
    mount({ todoRoute: todoRouteModule.default }, { root })
    return true
  }

  return false
}

const renderClientFallback = async (document: Document): Promise<boolean> => {
  const root = document.getElementById(LoomVite.defaultLoomRootId)

  if (!(root instanceof HTMLElement) || root.innerHTML.trim() !== "") {
    return false
  }

  const requestUrl = new URL(document.location?.href ?? defaultClientUrl, defaultClientUrl)
  await prepareAppRequest(requestUrl)
  const result = resolveAppRequest(requestUrl)

  if (requestUrl.pathname === "/" || requestUrl.pathname === todoRoutePath) {
    root.innerHTML = '<main class="container" data-app-shell="loom-example-app"></main>'
    const shell = root.querySelector('[data-app-shell="loom-example-app"]')

    if (shell instanceof HTMLElement) {
      mountClientRoute(requestUrl.pathname, shell)
    }
  } else {
    root.innerHTML = Html.renderToString(bodyForResult(result))
  }

  document.title = `Loom Example App · ${titleForResult(result)}`

  return true
}

export const startClientApp = async (
  document: Document,
  options?: LoomVite.LoomBootstrapOptions,
): Promise<LoomVite.LoomBootstrapResult> => {
  const result = await bootstrapClient(document, options)

  if (result.status !== "resumed") {
    await renderClientFallback(document)
  }

  return result
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  void startClientApp(document)
}
