import * as Context from 'effect/Context'
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router'

export class ActionArgsContext extends Context.Tag('ActionArgsContext')<ActionArgsContext, ActionFunctionArgs>() {}
export class LoaderArgsContext extends Context.Tag('LoaderArgsContext')<LoaderArgsContext, LoaderFunctionArgs>() {}
