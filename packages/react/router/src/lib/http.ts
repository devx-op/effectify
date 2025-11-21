/** biome-ignore-all lint/suspicious/noConsole: <debug> */
import type * as HttpApi from '@effect/platform/HttpApi'
import * as HttpApiBuilder from '@effect/platform/HttpApiBuilder'
import * as HttpApiScalar from '@effect/platform/HttpApiScalar'
import * as HttpServer from '@effect/platform/HttpServer'
import * as Layer from 'effect/Layer'

export type HttpApiOptions = {
  apiLive: Layer.Layer<HttpApi.Api, never, never>
  scalar?: HttpApiScalar.ScalarConfig
}

export type RoutePath = '/' | `/${string}/`

const makeHttpRouterHandler = (options: HttpApiOptions & { pathPrefix?: RoutePath }) => {
  const pathPrefix = options.pathPrefix || '/api/'

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: <todo remove>
  return async (arg: Request | { request: Request }): Promise<Response> => {
    // biome-ignore lint/suspicious/noExplicitAny: <debuug>
    const request = arg && typeof arg === 'object' && 'request' in arg ? (arg as any).request : (arg as Request)
    // Crear documentación OpenAPI si se especifica

    // DEBUG: ver qué URL recibe el handler
    // Remove or guard this in production
    // eslint-disable-next-line no-console
    console.debug('[makeHttpRouterHandler] incoming url ->', request.url)

    const ApiDocsLive = options.scalar
      ? HttpApiScalar.layer({
          path: `${pathPrefix}docs`,
          scalar: {
            baseServerURL: `${pathPrefix}`,
            ...options.scalar,
          },
        }).pipe(Layer.provide(options.apiLive))
      : Layer.empty

    // Crear el entorno con las dependencias necesarias
    const EnvLive = Layer.mergeAll(options.apiLive, ApiDocsLive, HttpServer.layerContext)

    // Crear el handler de Effect
    const { handler } = HttpApiBuilder.toWebHandler(EnvLive)

    // Ejecutar el handler con la request y capturar errores/respuestas inesperadas
    try {
      // eslint-disable-next-line no-console
      console.debug('[makeHttpRouterHandler] invoking handler')

      const resp = await handler(request)
      // eslint-disable-next-line no-console
      console.debug(
        '[makeHttpRouterHandler] handler returned ->',
        resp && typeof (resp as Response).status === 'number'
          ? `Response(status=${(resp as Response).status})`
          : typeof resp,
      )

      // biome-ignore lint/suspicious/noExplicitAny: <explanation>
      if (!resp || typeof (resp as any).status !== 'number') {
        // Handler didn't return a proper Response object
        // eslint-disable-next-line no-console
        console.error('[makeHttpRouterHandler] handler did not return a Response. Returning 500.')
        return new Response('Internal Server Error: handler did not return a Response', { status: 500 })
      }

      return resp as Response
    } catch (err) {
      // debug and convert to HTTP 500
      // eslint-disable-next-line no-console
      console.error('[makeHttpRouterHandler] handler threw an error:', err)
      const body = err instanceof Error ? err.stack || err.message : String(err)
      return new Response(`Internal Server Error\n\n${body}`, { status: 500 })
    }
  }
}

export { makeHttpRouterHandler }
