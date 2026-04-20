import { Html, mount } from "@effectify/loom"
import { LoomVite } from "@effectify/loom-vite"
import { appBuildId, appPayloadElementId, appRootId } from "./app-config.js"
import { attachCounterDebugFlash } from "./counter-debug.js"
import { bodyForResult, resolveAppRequest, titleForResult } from "./router.js"
import { counterRoute } from "./routes/counter-route.js"

export const bootstrapClient = (
  document: Document,
  options?: LoomVite.LoomBootstrapOptions,
): Promise<LoomVite.LoomBootstrapResult> =>
  LoomVite.bootstrap(document, {
    ...options,
    expectedBuildId: options?.expectedBuildId ?? appBuildId,
    payloadElementId: options?.payloadElementId ?? appPayloadElementId,
  })

const defaultClientUrl = "https://effectify.dev/"

const renderClientFallback = (document: Document): boolean => {
  const root = document.getElementById(appRootId)

  if (!(root instanceof HTMLElement) || root.innerHTML.trim() !== "") {
    return false
  }

  const requestUrl = new URL(document.location?.href ?? defaultClientUrl, defaultClientUrl)
  const result = resolveAppRequest(requestUrl)

  if (requestUrl.pathname === "/") {
    root.innerHTML = '<main class="container" data-app-shell="loom-example-app"></main>'
    const shell = root.querySelector('[data-app-shell="loom-example-app"]')

    if (shell instanceof HTMLElement) {
      mount({ counterRoute }, { root: shell })
      attachCounterDebugFlash(document)
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
    renderClientFallback(document)
  }

  return result
}
