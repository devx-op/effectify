import {
  type LoomNitroOptions,
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
  LoomNitroOptions,
  LoomNitroRenderResult,
  LoomNitroRequest,
  LoomResumabilityPayload,
}

/** Create the initial Loom Nitro adapter surface. */
export const renderer = (options: Options): LoomNitroRenderer => ({
  name: "effectify:loom-nitro",
  render: (request) => renderLoomNitroResponse(options, request),
})
