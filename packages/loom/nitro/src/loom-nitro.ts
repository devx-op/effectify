import {
  defaultLoomNitroBuildId,
  defaultLoomNitroClientEntry,
  defaultLoomNitroPayloadElementId,
  defaultLoomNitroRootId,
  type LoomBootstrapDefaults,
  type LoomNitroDocumentOptions,
  type LoomNitroOptions,
  type LoomNitroRenderOutput,
  type LoomNitroRenderResult,
  type LoomNitroRequest,
  renderLoomNitroResponse,
} from "./internal/ssr-adapter.js"
import type { LoomActivationPayload, LoomResumabilityPayload } from "./internal/payload.js"

/** Public option contract for the initial Loom Nitro integration. */
export type Options = LoomNitroOptions

export interface LoomNitroRenderer {
  readonly name: "effectify:loom-nitro"
  readonly render: (request: LoomNitroRequest) => Promise<LoomNitroRenderResult>
}

export type {
  LoomActivationPayload,
  LoomBootstrapDefaults,
  LoomNitroDocumentOptions,
  LoomNitroOptions,
  LoomNitroRenderOutput,
  LoomNitroRenderResult,
  LoomNitroRequest,
  LoomResumabilityPayload,
}

export {
  defaultLoomNitroBuildId,
  defaultLoomNitroClientEntry,
  defaultLoomNitroPayloadElementId,
  defaultLoomNitroRootId,
}

/** Create the initial Loom Nitro adapter surface. */
export const renderer = (options: Options): LoomNitroRenderer => ({
  name: "effectify:loom-nitro",
  render: (request) => renderLoomNitroResponse(options, request),
})
