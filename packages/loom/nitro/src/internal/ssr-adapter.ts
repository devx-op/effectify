import { Html } from "@effectify/loom"
import type * as Loom from "@effectify/loom"
import { type LoomNitroResolvedBootstrap, renderDefaultLoomNitroDocument } from "./document-shell.js"
import { createLoomResumabilityPayload, type LoomResumabilityPayload, renderLoomPayloadElement } from "./payload.js"

export const defaultLoomNitroRootId = "loom-root"
export const defaultLoomNitroBuildId = "loom-dev"
export const defaultLoomNitroPayloadElementId = "__loom_payload__"
export const defaultLoomNitroClientEntry = "/src/entry-client.ts"

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

export interface LoomBootstrapDefaults {
  readonly buildId?: string
  readonly clientEntry?: string
  readonly payloadElementId?: string
  readonly rootId?: string
}

export interface LoomNitroRenderOutputShape {
  readonly body?: Html.Child
  readonly title?: string
}

export type LoomNitroRenderOutput = Html.Child | LoomNitroRenderOutputShape

export interface LoomNitroDocumentRenderInput {
  readonly title?: string
  readonly bodyHtml: string
  readonly payloadHtml: string
  readonly payload: LoomResumabilityPayload | undefined
  readonly bootstrap: LoomNitroResolvedBootstrap
}

export interface LoomNitroDocumentOptions {
  readonly render: (input: LoomNitroDocumentRenderInput) => string
}

export interface LoomNitroOptions {
  readonly bootstrap?: LoomBootstrapDefaults
  readonly rootId?: string
  readonly buildId?: string
  readonly clientEntry?: string
  readonly payloadElementId?: string
  readonly document?: LoomNitroDocumentOptions
  readonly render: (request: LoomNitroRequest) => LoomNitroRenderOutput | Promise<LoomNitroRenderOutput>
  readonly response?: (request: LoomNitroRequest) => LoomNitroResponseInit | Promise<LoomNitroResponseInit>
  readonly ssr?: Html.SsrOptions | ((request: LoomNitroRequest) => Html.SsrOptions | Promise<Html.SsrOptions>)
}

const isRenderOutputShape = (value: LoomNitroRenderOutput): value is LoomNitroRenderOutputShape =>
  typeof value === "object" && value !== null && ("body" in value || "title" in value)

const resolveBootstrap = (options: LoomNitroOptions): LoomNitroResolvedBootstrap => ({
  buildId: options.bootstrap?.buildId ?? options.buildId ?? defaultLoomNitroBuildId,
  clientEntry: options.bootstrap?.clientEntry ?? options.clientEntry ?? defaultLoomNitroClientEntry,
  payloadElementId: options.bootstrap?.payloadElementId ?? options.payloadElementId ?? defaultLoomNitroPayloadElementId,
  rootId: options.bootstrap?.rootId ?? options.rootId ?? defaultLoomNitroRootId,
})

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
  const output = await options.render(request)
  const response = options.response === undefined ? undefined : await options.response(request)
  const resolved = isRenderOutputShape(output) ? output : { body: output }
  const body = resolved.body
  const ssrOptions = await resolveSsrOptions(request, options)
  const render = body === undefined ? Html.ssr(Html.fragment(), ssrOptions) : Html.ssr(body, ssrOptions)
  const bodyHtml = body === undefined ? "" : render.html
  const bootstrap = resolveBootstrap(options)

  const resumability = await createLoomResumabilityPayload(
    { buildId: bootstrap.buildId, rootId: bootstrap.rootId },
    render,
  )
  const payloadHtml = resumability === undefined
    ? `<script type="application/json" id="${bootstrap.payloadElementId}"></script>`
    : renderLoomPayloadElement(resumability, bootstrap.payloadElementId)
  const html = options.document?.render({
    title: resolved.title,
    bodyHtml,
    payloadHtml,
    payload: resumability,
    bootstrap,
  }) ?? renderDefaultLoomNitroDocument({
    title: resolved.title,
    bodyHtml,
    payload: resumability,
    bootstrap,
  })

  return {
    html,
    status: response?.status,
    headers: response?.headers,
    activation: resumability,
    resumability,
    diagnostics: render.diagnostics,
    diagnosticSummary: render.diagnosticSummary,
  }
}
