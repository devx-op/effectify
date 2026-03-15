import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node"
import * as ServiceMap from "effect/ServiceMap"
import * as Effect from "effect/Effect"

/**
 * ActionArgsContext provides access to Remix action arguments.
 *
 * In Effect v4, Context.Tag was replaced by ServiceMap.Service.
 */
export class ActionArgsContext extends ServiceMap.Service<ActionArgsContext>()(
  "ActionArgsContext",
  {
    make: Effect.succeed({} as ActionFunctionArgs),
  },
) {}

/**
 * LoaderArgsContext provides access to Remix loader arguments.
 */
export class LoaderArgsContext extends ServiceMap.Service<LoaderArgsContext>()(
  "LoaderArgsContext",
  {
    make: Effect.succeed({} as LoaderFunctionArgs),
  },
) {}
