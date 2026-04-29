import { type LoomResumabilityPayload, renderLoomPayloadElement } from "./payload.js"

export interface LoomNitroResolvedBootstrap {
  readonly buildId: string
  readonly clientEntry: string
  readonly payloadElementId: string
  readonly rootId: string
}

export interface LoomNitroDocumentShellInput {
  readonly title?: string
  readonly bodyHtml: string
  readonly payload: LoomResumabilityPayload | undefined
  readonly bootstrap: LoomNitroResolvedBootstrap
}

export const renderDefaultLoomNitroDocument = (input: LoomNitroDocumentShellInput): string => {
  const bodyHtml = input.bodyHtml ?? ""
  const payloadHtml = input.payload === undefined
    ? `<script type="application/json" id="${input.bootstrap.payloadElementId}"></script>`
    : renderLoomPayloadElement(input.payload, input.bootstrap.payloadElementId)

  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${
    input.title ?? "Loom"
  }</title></head><body><div id="${input.bootstrap.rootId}">${bodyHtml}</div>${payloadHtml}<script type="module" src="${input.bootstrap.clientEntry}"></script></body></html>`
}
