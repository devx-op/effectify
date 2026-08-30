import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as HttpRouter from "effect/unstable/http/HttpRouter"
import * as HttpServer from "effect/unstable/http/HttpServer"
import type * as HttpApi from "effect/unstable/httpapi/HttpApi"
import * as HttpApiBuilder from "effect/unstable/httpapi/HttpApiBuilder"
import type * as HttpApiGroup from "effect/unstable/httpapi/HttpApiGroup"
import * as HttpApiScalar from "effect/unstable/httpapi/HttpApiScalar"
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router"

export type HttpApiOptions<Id extends string, Groups extends HttpApiGroup.Constraint> = {
  readonly api: HttpApi.HttpApi<Id, Groups>
  readonly apiLive: Layer.Layer<HttpApiGroup.ToService<Id, Groups>, never, never>
  readonly scalar?: HttpApiScalar.ScalarConfig
}

export type RoutePath = "/" | `/${string}/`

export type HttpApiHandler = {
  (args: ActionFunctionArgs | LoaderFunctionArgs): Promise<Response>
  readonly dispose: () => Promise<void>
}

const prefixRoutes = (
  routes: Layer.Layer<never, never, HttpRouter.HttpRouter>,
  pathPrefix: RoutePath,
): Layer.Layer<never, never, HttpRouter.HttpRouter> =>
  Layer.unwrap(
    Effect.map(HttpRouter.HttpRouter, (router) =>
      Layer.provide(routes, Layer.succeed(HttpRouter.HttpRouter, router.prefixed(pathPrefix))),
    ),
  )

export const make = <Id extends string, Groups extends HttpApiGroup.Constraint>(
  options: HttpApiOptions<Id, Groups> & { readonly pathPrefix?: RoutePath },
): HttpApiHandler => {
  const createWebHandler = (request: Request) => {
    const ApiRoutes = HttpApiBuilder.layer(options.api).pipe(
      Layer.provide(options.apiLive),
      Layer.provide(HttpServer.layerServices),
    )
    const ScalarRoutes =
      options.scalar === undefined
        ? Layer.empty
        : HttpApiScalar.layer(options.api, {
            path: options.pathPrefix === undefined ? "/api/docs" : "/docs",
            scalar: {
              ...options.scalar,
              baseServerURL: options.scalar.baseServerURL ?? new URL(request.url).origin,
            },
          })
    const Routes = Layer.merge(ApiRoutes, ScalarRoutes)
    const AppRoutes = options.pathPrefix === undefined ? Routes : prefixRoutes(Routes, options.pathPrefix)
    return HttpRouter.toWebHandler(AppRoutes)
  }

  let webHandler: ReturnType<typeof createWebHandler> | undefined
  let disposal: Promise<void> | undefined
  let disposed = false

  const dispose = () => {
    if (disposal !== undefined) return disposal
    disposed = true
    disposal = webHandler === undefined ? Promise.resolve() : webHandler.dispose()
    return disposal
  }
  const handler = (args: ActionFunctionArgs | LoaderFunctionArgs) => {
    if (disposed) return Promise.reject(new Error("HTTP API handler has been disposed"))
    const live = (webHandler ??= createWebHandler(args.request))
    return live.handler(args.request)
  }

  return Object.assign(handler, { dispose })
}
