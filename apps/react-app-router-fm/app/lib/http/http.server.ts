import { HttpApi, HttpApiBuilder, HttpApiEndpoint, HttpApiGroup, OpenApi } from "@effect/platform"
import { AuthService } from "@effectify/node-better-auth"
import { Effect, Layer, Schema } from "effect"
import { authOptions } from "../better-auth-options.server.js"
import { Authorization, AuthorizationLive } from "./auth-middleware.server.js"

class ApiGroup extends HttpApiGroup.make("api")
  .add(
    HttpApiEndpoint.get("getFirst", "/get-first")
      .annotate(OpenApi.Description, "Get the first note, if there is one.")
      .addSuccess(
        Schema.Struct({
          id: Schema.String,
          title: Schema.String,
          content: Schema.String,
        }),
      ),
  )
  .annotate(OpenApi.Title, "Notes")
  .annotate(OpenApi.Description, "Operations on notes.")
  .prefix("/api/notes")
{}

export class Api extends HttpApi.make("Api")
  .annotate(OpenApi.Title, "Confect Example")
  .annotate(
    OpenApi.Description,
    `
An example API built with Confect and powered by [Scalar](https://github.com/scalar/scalar). 

# Learn More

See Scalar's documentation on [markdown support](https://github.com/scalar/scalar/blob/main/documentation/markdown.md) and [OpenAPI spec extensions](https://github.com/scalar/scalar/blob/main/documentation/openapi.md).
	`,
  )
  .middleware(Authorization)
  .prefix("/api")
  .add(ApiGroup)
{}

const ApiGroupLive = HttpApiBuilder.group(
  Api,
  "api",
  (handlers) =>
    handlers.handle("getFirst", () =>
      Effect.gen(function*() {
        const { user } = yield* AuthService.AuthContext
        const firstNote = {
          id: "1",
          title: "First Note",
          content: `This is the first note ${user.id}`,
        }
        return yield* Effect.succeed(firstNote)
      })),
)

export const ApiLive = HttpApiBuilder.api(Api).pipe(
  Layer.provide(ApiGroupLive),
  Layer.provide(AuthorizationLive),
  Layer.provide(AuthService.layer(authOptions)),
)
