import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router"
import * as ServiceMap from "effect/ServiceMap"

export class ActionArgsContext extends ServiceMap.Service<
  ActionArgsContext,
  ActionFunctionArgs
>()("ActionArgsContext") {}

export class LoaderArgsContext extends ServiceMap.Service<
  LoaderArgsContext,
  LoaderFunctionArgs
>()("LoaderArgsContext") {}
