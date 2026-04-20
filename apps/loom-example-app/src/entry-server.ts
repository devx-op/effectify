import { LoomNitro } from "@effectify/loom-nitro"
import { Resumability } from "@effectify/loom"
import { appBuildId, appPayloadElementId, appRootId } from "./app-config.js"
import { bodyForResult, resolveAppRequest, statusForResult, titleForResult } from "./router.js"
import { createDocument } from "./document.js"

const applicationBaseUrl = "https://effectify.dev"

const normalizeRequestUrl = (input: string): URL => new URL(input, applicationBaseUrl)

const payloadPlaceholder = `<script type="application/json" id="${appPayloadElementId}"></script>`

const injectResumabilityPayload = (
  html: string,
  payload: LoomNitro.LoomResumabilityPayload | undefined,
): string => {
  if (payload === undefined) {
    return html
  }

  const encodedPayload = Resumability.encodeContract(payload)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029")

  return html.replace(
    payloadPlaceholder,
    `<script type="application/json" id="${appPayloadElementId}">${encodedPayload}</script>`,
  )
}

export const createServerRenderer = (): LoomNitro.LoomNitroRenderer => {
  const renderer = LoomNitro.renderer({
    buildId: appBuildId,
    rootId: appRootId,
    render: (request) => {
      const result = resolveAppRequest(normalizeRequestUrl(request.url))

      return createDocument({
        title: titleForResult(result),
        body: bodyForResult(result),
      })
    },
    response: (request) => {
      const result = resolveAppRequest(normalizeRequestUrl(request.url))

      return {
        status: statusForResult(result),
      }
    },
  })

  return {
    name: renderer.name,
    render: async (request) => {
      const result = await renderer.render(request)

      return {
        ...result,
        html: injectResumabilityPayload(result.html, result.resumability),
      }
    },
  }
}
