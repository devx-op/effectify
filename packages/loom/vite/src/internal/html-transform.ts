import type { LoomViteState } from "./plugin-state.js"

const injectBeforeClosingTag = (html: string, closingTag: string, fragment: string): string => {
  const index = html.indexOf(closingTag)
  return index === -1 ? `${html}${fragment}` : `${html.slice(0, index)}${fragment}${html.slice(index)}`
}

const renderClientEntryTag = (state: LoomViteState): string => {
  if (state.options.root === undefined) {
    return ""
  }

  return `<script type="module" src="${state.options.clientEntry}" data-loom-client-entry="${state.options.root}"></script>`
}

const renderPayloadMarkerTag = (state: LoomViteState): string => {
  if (state.options.root === undefined) {
    return ""
  }

  return `<script type="application/json" id="${state.options.payloadElementId}" data-loom-payload="${state.options.root}"></script>`
}

export const transformLoomIndexHtml = (html: string, state: LoomViteState): string => {
  if (!state.enabled) {
    return html
  }

  return injectBeforeClosingTag(html, "</body>", `${renderClientEntryTag(state)}${renderPayloadMarkerTag(state)}`)
}

export const logLoomDevDiagnostics = (
  info: (message: string) => void,
  state: LoomViteState,
): void => {
  if (!state.enabled || state.options.root === undefined) {
    return
  }

  info(
    `[loom] enabled root=${state.options.root} client=${state.options.clientEntry} payload=${state.options.payloadElementId}`,
  )
}
