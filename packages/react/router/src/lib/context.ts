import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router"
import * as ServiceMap from "effect/ServiceMap"

/**
 * ActionArgsContext provides access to React Router action arguments.
 * Used in Effect handlers to access request data.
 *
 * In Effect v4, Context.Tag was replaced by ServiceMap.Service.
 * For request-scoped contexts that are provided at runtime, we use
 * ServiceMap.Service with a minimal make constructor.
 */
export class ActionArgsContext extends ServiceMap.Service<
  ActionArgsContext,
  ActionFunctionArgs
>()("ActionArgsContext") {}

/**
 * LoaderArgsContext provides access to React Router loader arguments.
 * Used in Effect handlers to access request data during route loading.
 */
export class LoaderArgsContext extends ServiceMap.Service<
  LoaderArgsContext,
  LoaderFunctionArgs
>()("LoaderArgsContext") {}
