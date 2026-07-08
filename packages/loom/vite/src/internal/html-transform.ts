import { makeEnabledStateDiagnostics, renderDiagnosticsLogMessage } from "./diagnostics.js"
import type { LoomViteState } from "./plugin-state.js"

const injectBeforeClosingTag = (html: string, closingTag: string, fragment: string): string => {
  const index = html.indexOf(closingTag)
  return index === -1 ? `${html}${fragment}` : `${html.slice(0, index)}${fragment}${html.slice(index)}`
}

const renderClientEntryTag = (state: LoomViteState): string => {
  return `<script type="module" src="${state.options.clientEntry}"></script>`
}

const renderPayloadMarkerTag = (state: LoomViteState): string => {
  return `<script type="application/json" id="${state.options.payloadElementId}" data-loom-payload="${state.options.rootId}"></script>`
}

const renderRootContainer = (state: LoomViteState): string => `<div id="${state.options.rootId}"></div>`

const hasRootContainer = (html: string, state: LoomViteState): boolean => html.includes(`id="${state.options.rootId}"`)

export const transformLoomIndexHtml = (html: string, state: LoomViteState): string => {
  const withRoot = hasRootContainer(html, state)
    ? html
    : injectBeforeClosingTag(html, "</body>", renderRootContainer(state))

  if (!state.enabled) {
    return withRoot
  }

  return injectBeforeClosingTag(withRoot, "</body>", `${renderPayloadMarkerTag(state)}${renderClientEntryTag(state)}`)
}

export const logLoomDevDiagnostics = (
  info: (message: string) => void,
  state: LoomViteState,
): void => {
  if (!state.enabled) {
    return
  }

  info(renderDiagnosticsLogMessage(makeEnabledStateDiagnostics(state)))
}
