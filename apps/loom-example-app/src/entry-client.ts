import { Html, mount } from "@effectify/loom"
import { LoomVite } from "@effectify/loom-vite"
import { appBuildId, appPayloadElementId, appRootId } from "./app-config.js"
import { bodyForResult, resolveAppRequest, titleForResult } from "./router.js"
import { counterRoute } from "./routes/counter-route.js"

type MountedCounterHandle = {
  readonly actions: Readonly<Record<string, unknown>>
}

const isCounterActionName = (value: string): value is "decrement" | "increment" | "reset" =>
  value === "decrement" || value === "increment" || value === "reset"

const wireCounterControls = (root: HTMLElement, handle: MountedCounterHandle): void => {
  if (root.dataset.counterControlsBound === "true") {
    return
  }

  root.dataset.counterControlsBound = "true"

  root.addEventListener("click", (event) => {
    const target = event.target
    const targetElement = target instanceof Element
      ? target
      : target instanceof Node
      ? target.parentElement
      : null

    if (targetElement === null) {
      return
    }

    const button = targetElement.closest("[data-counter-action]")

    if (!(button instanceof HTMLButtonElement)) {
      return
    }

    const actionName = button.dataset.counterAction

    if (actionName === undefined || !isCounterActionName(actionName)) {
      return
    }

    const action = handle.actions[actionName]

    if (typeof action !== "function") {
      return
    }

    action()
  })
}

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
    root.innerHTML = '<main data-app-shell="loom-example-app"></main>'
    const shell = root.querySelector('[data-app-shell="loom-example-app"]')

    if (shell instanceof HTMLElement) {
      const handle = mount({ counterRoute }, { root: shell })

      wireCounterControls(shell, handle)
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
