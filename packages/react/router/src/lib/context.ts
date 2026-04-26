import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router"
import * as Context from "effect/Context"

export class ActionArgsContext extends Context.Service<
  ActionArgsContext,
  ActionFunctionArgs
>()("ActionArgsContext") {}

export class LoaderArgsContext extends Context.Service<
  LoaderArgsContext,
  LoaderFunctionArgs
>()("LoaderArgsContext") {}
