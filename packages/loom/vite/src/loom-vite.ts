import type { Plugin } from "vite"
import { bootstrapLoomBrowser, type LoomBootstrapOptions, type LoomBootstrapResult } from "./internal/bootstrap.js"
import { logLoomDevDiagnostics, transformLoomIndexHtml } from "./internal/html-transform.js"
import {
  type LoomActivationPayload,
  type LoomResumabilityPayload,
  type LoomViteOptions,
  resolveLoomViteState,
} from "./internal/plugin-state.js"

/** Public option contract for the initial Loom Vite integration. */
export type Options = LoomViteOptions

export type {
  LoomActivationPayload,
  LoomBootstrapOptions,
  LoomBootstrapResult,
  LoomResumabilityPayload,
  LoomViteOptions,
}

const assertWebOnlyRenderer = (options: Options): void => {
  if (!("renderer" in options)) {
    return
  }

  const renderer = Reflect.get(options, "renderer")

  if (renderer !== undefined) {
    throw new Error("Loom Vite only supports the web renderer in this slice")
  }
}

/** Activate Loom SSR activation handoff from the current browser document. */
export const bootstrap = (document: Document, options?: LoomBootstrapOptions): Promise<LoomBootstrapResult> =>
  bootstrapLoomBrowser(document, options)

/**
 * Create the initial Loom Vite plugin surface.
 * This batch only covers option normalization, HTML handoff markers, and dev diagnostics.
 */
export const loom = (options: Options = {}): Plugin => {
  assertWebOnlyRenderer(options)
  let state = resolveLoomViteState({ root: "" }, options)

  return {
    name: "effectify:loom-vite",
    configResolved(config) {
      state = resolveLoomViteState({ root: config.root }, options)
    },
    transformIndexHtml(html) {
      return transformLoomIndexHtml(html, state)
    },
    configureServer(server) {
      logLoomDevDiagnostics((message) => server.config.logger.info(message), state)
    },
  }
}
