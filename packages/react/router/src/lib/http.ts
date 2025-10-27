import { type HttpApi, HttpApiBuilder, HttpApiScalar, HttpServer } from '@effect/platform'
import { Layer } from 'effect'

export type HttpApiOptions = {
  apiLive: Layer.Layer<HttpApi.Api, never, never>
  scalar?: HttpApiScalar.ScalarConfig
}

export type RoutePath = '/' | `/${string}/`

const makeHttpRouterHandler = (options: HttpApiOptions & { pathPrefix?: RoutePath }) => {
  const pathPrefix = options.pathPrefix || '/api/'

  return (request: Request): Promise<Response> => {
    // Crear documentación OpenAPI si se especifica
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

    // Ejecutar el handler con la request
    return handler(request)
  }
}

export { makeHttpRouterHandler }
