import { AtomRegistry } from "effect/unstable/reactivity"
import { Html } from "@effectify/loom"
import { LoomVite } from "@effectify/loom-vite"
import { appBuildId, appPayloadElementId, appRootId } from "./app-config.js"
import { activateLiveIslandFallback, applyCounterCommand, registerLiveIslandExecutables } from "./live-island-demo.js"
import { bodyForResult, resolveAppRequest, titleForResult } from "./router.js"

export const bootstrapClient = (
  document: Document,
  options?: LoomVite.LoomBootstrapOptions,
): Promise<LoomVite.LoomBootstrapResult> => {
  const registry = options?.registry ?? AtomRegistry.make()
  const localRegistry = registerLiveIslandExecutables(options?.localRegistry)

  return LoomVite.bootstrap(document, {
    ...options,
    expectedBuildId: options?.expectedBuildId ?? appBuildId,
    payloadElementId: options?.payloadElementId ?? appPayloadElementId,
    registry,
    localRegistry,
    onEffect: (effect, context) => {
      applyCounterCommand(effect, registry)
      options?.onEffect?.(effect, context)
    },
  })
}

const defaultClientUrl = "https://effectify.dev/"

const renderClientFallback = (document: Document, registry: AtomRegistry.AtomRegistry): boolean => {
  const root = document.getElementById(appRootId)

  if (!(root instanceof HTMLElement) || root.innerHTML.trim() !== "") {
    return false
  }

  const requestUrl = new URL(document.location?.href ?? defaultClientUrl, defaultClientUrl)
  const result = resolveAppRequest(requestUrl)

  root.innerHTML = Html.renderToString(bodyForResult(result))
  document.title = `Loom Example App · ${titleForResult(result)}`
  activateLiveIslandFallback(document, registry)

  return true
}

export const startClientApp = async (
  document: Document,
  options?: LoomVite.LoomBootstrapOptions,
): Promise<LoomVite.LoomBootstrapResult> => {
  const registry = options?.registry ?? AtomRegistry.make()
  const result = await bootstrapClient(document, {
    ...options,
    registry,
  })

  if (result.status !== "resumed") {
    renderClientFallback(document, registry)
  }

  return result
}
