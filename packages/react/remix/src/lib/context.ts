import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node"
import * as Context from "effect/Context"

export class ActionArgsContext extends Context.Tag("ActionArgsContext")<ActionArgsContext, ActionFunctionArgs>() {}
export class LoaderArgsContext extends Context.Tag("LoaderArgsContext")<LoaderArgsContext, LoaderFunctionArgs>() {}
