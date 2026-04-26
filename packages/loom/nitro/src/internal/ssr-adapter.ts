import { Html } from "@effectify/loom"
import type * as Loom from "@effectify/loom"
import { createLoomResumabilityPayload, type LoomResumabilityPayload } from "./payload.js"

export const defaultLoomNitroRootId = "loom-root"
export const defaultLoomNitroBuildId = "loom-dev"

export interface LoomNitroRequest {
  readonly method: string
  readonly url: string
  readonly headers: Readonly<Record<string, string>>
}

export interface LoomNitroResponseInit {
  readonly status?: number
  readonly headers?: Readonly<Record<string, string>>
}

export interface LoomNitroRenderResult {
  readonly html: string
  readonly status?: number
  readonly headers?: Readonly<Record<string, string>>
  readonly activation?: LoomResumabilityPayload
  readonly resumability?: LoomResumabilityPayload
  readonly diagnostics: ReadonlyArray<Loom.Diagnostics.Report>
  readonly diagnosticSummary: ReadonlyArray<Loom.Diagnostics.Summary>
}

export interface LoomNitroOptions {
  readonly rootId?: string
  readonly buildId?: string
  readonly render: (request: LoomNitroRequest) => Html.Child | Promise<Html.Child>
  readonly response?: (request: LoomNitroRequest) => LoomNitroResponseInit | Promise<LoomNitroResponseInit>
  readonly ssr?: Html.SsrOptions | ((request: LoomNitroRequest) => Html.SsrOptions | Promise<Html.SsrOptions>)
}

const resolveSsrOptions = async (
  request: LoomNitroRequest,
  options: LoomNitroOptions,
): Promise<Html.SsrOptions | undefined> => {
  if (typeof options.ssr === "function") {
    return await options.ssr(request)
  }

  return options.ssr
}

export const renderLoomNitroResponse = async (
  options: LoomNitroOptions,
  request: LoomNitroRequest,
): Promise<LoomNitroRenderResult> => {
  const root = await options.render(request)
  const response = options.response === undefined ? undefined : await options.response(request)
  const render = Html.ssr(root, await resolveSsrOptions(request, options))
  const rootId = options.rootId ?? defaultLoomNitroRootId
  const buildId = options.buildId ?? defaultLoomNitroBuildId

  const resumability = await createLoomResumabilityPayload({ buildId, rootId }, render)

  return {
    html: render.html,
    status: response?.status,
    headers: response?.headers,
    activation: resumability,
    resumability,
    diagnostics: render.diagnostics,
    diagnosticSummary: render.diagnosticSummary,
  }
}
