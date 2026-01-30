import type * as HttpApi from "@effect/platform/HttpApi"
import * as HttpApiBuilder from "@effect/platform/HttpApiBuilder"
import * as HttpApiScalar from "@effect/platform/HttpApiScalar"
import * as HttpServer from "@effect/platform/HttpServer"
import { Option } from "effect"
import { pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router"

export type HttpApiOptions = {
  apiLive: Layer.Layer<HttpApi.Api, never, never>
  scalar?: HttpApiScalar.ScalarConfig
}

export type RoutePath = "/" | `/${string}/`

export const make =
  (options: HttpApiOptions & { pathPrefix?: RoutePath }) => ({ request }: ActionFunctionArgs | LoaderFunctionArgs) =>
    pipe(
      Option.fromNullable(options.scalar),
      Option.map((scalar) =>
        HttpApiScalar.layer({
          path: `${options.pathPrefix || "/api/"}docs`,
          scalar: {
            ...scalar,
            baseServerURL: new URL(request.url).origin,
          },
        }).pipe(Layer.provide(options.apiLive))
      ),
      Option.getOrElse(() => Layer.empty),
      (ApiDocsLive) => {
        const EnvLive = Layer.mergeAll(options.apiLive, ApiDocsLive, HttpServer.layerContext)
        const { handler } = HttpApiBuilder.toWebHandler(EnvLive)
        return handler(request)
      },
    )
