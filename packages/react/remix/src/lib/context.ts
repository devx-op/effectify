import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node"
import * as Context from "effect/Context"

/**
 * ActionArgsContext provides access to React Router action arguments.
 * Used in Effect handlers to access request data.
 *
 * In Effect v4 beta57, request-scoped services use Context.Service.
 * For request-scoped contexts that are provided at runtime, we use
 * Context.Service with a minimal make constructor.
 */
export class ActionArgsContext extends Context.Service<
  ActionArgsContext,
  ActionFunctionArgs
>()("ActionArgsContext") {}

/**
 * LoaderArgsContext provides access to React Router loader arguments.
 * Used in Effect handlers to access request data during route loading.
 */
export class LoaderArgsContext extends Context.Service<
  LoaderArgsContext,
  LoaderFunctionArgs
>()("LoaderArgsContext") {}
