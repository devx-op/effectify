import * as Effect from "effect/Effect"
import { Catalog, Planner } from "@effectify/app-builder-generation"
import { type CliFailure, type CliRequest, type CliTerminal, InputError, success, unavailable } from "./protocol.js"

export interface CommandDispatcher {
  readonly dispatch: (request: CliRequest) => Effect.Effect<CliTerminal, CliFailure>
}

const catalogResult = () => ({
  version: Catalog.TodoCatalog.version,
  capabilities: Catalog.TodoCatalog.entries.map((entry) => entry.capability),
})

/** Dispatches only the finite command map; no payload can name executable code or a plugin. */
export const commandDispatcher: CommandDispatcher = {
  dispatch: (request) => {
    switch (request.command) {
      case "catalog":
        return Effect.succeed(success(request.command, catalogResult()))
      case "plan":
        return Planner.planTodo(request.payload).pipe(
          Effect.map((plan) => success(request.command, plan)),
          Effect.catchTags({
            InvalidCreationIntent: () =>
              Effect.fail(new InputError({ reason: "plan payload is not a valid CreationIntent" })),
            CatalogResolutionError: () =>
              Effect.fail(new InputError({ reason: "plan payload is not a valid CreationIntent" })),
          }),
        )
      case "generate":
      case "verify":
      case "replay":
      case "explain":
      case "doctor":
        return Effect.succeed(unavailable(request.command))
    }
  },
}
