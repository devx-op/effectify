import { LoomNitro } from "@effectify/loom-nitro"
import { prepareRouteRuntime } from "./router-runtime.js"
import { bodyForResult, resolveAppRequest, statusForResult, titleForResult } from "./router.js"

const applicationBaseUrl = "https://effectify.dev"

const normalizeRequestUrl = (input: string): URL => new URL(input, applicationBaseUrl)

export const createServerRenderer = (): LoomNitro.LoomNitroRenderer =>
  LoomNitro.renderer({
    render: (request) => {
      const requestUrl = normalizeRequestUrl(request.url)

      return prepareRouteRuntime(requestUrl).then(() => {
        const result = resolveAppRequest(requestUrl)

        return {
          title: `Loom Example App · ${titleForResult(result)}`,
          body: bodyForResult(result),
        }
      })
    },
    response: (request) => {
      const result = resolveAppRequest(normalizeRequestUrl(request.url))

      return {
        status: statusForResult(result),
      }
    },
  })
